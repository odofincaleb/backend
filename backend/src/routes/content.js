const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const contentGenerator = require('../services/contentGenerator');

const router = express.Router();

// Validation schemas
const generateContentSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
  titleId: Joi.string().uuid().required(),
  contentType: Joi.string().required(),
  wordCount: Joi.number().min(100).max(5000).default(1000),
  tone: Joi.string().valid('conversational', 'formal', 'humorous', 'storytelling').default('conversational'),
  includeKeywords: Joi.boolean().default(true),
  includeImages: Joi.boolean().default(false)
});

const generateKeywordsSchema = Joi.object({
  topic: Joi.string().min(3).max(255).required(),
  content: Joi.string().min(100).required()
});

/**
 * POST /api/content/generate
 * Generate blog post content for a title
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { error, value } = generateContentSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { campaignId, titleId, contentType, wordCount, tone, includeKeywords, includeImages } = value;

    // Verify campaign belongs to user
    const campaignResult = await query(
      `SELECT c.*, ws.site_name, ws.site_url, ws.username, ws.password_encrypted
       FROM campaigns c
       LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [campaignId, userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'The specified campaign does not exist or does not belong to you'
      });
    }

    // Get the title
    const titleResult = await query(
      'SELECT * FROM title_queue WHERE id = $1 AND campaign_id = $2',
      [titleId, campaignId]
    );

    if (titleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Title not found',
        message: 'The specified title does not exist for this campaign'
      });
    }

    const campaign = campaignResult.rows[0];
    const title = titleResult.rows[0];

    logger.info(`Generating content for title: ${title.title}`);

    // Generate the blog post content
    const contentOptions = {
      contentType,
      wordCount,
      tone,
      includeKeywords,
      includeImages
    };

    const blogPost = await contentGenerator.generateBlogPost(campaign, contentOptions);
    
    // Generate keywords if requested
    let keywords = [];
    if (includeKeywords) {
      keywords = await contentGenerator.generateKeywords(campaign.topic, blogPost.content);
    }

    // Generate featured image if requested
    let featuredImage = null;
    if (includeImages) {
      const imagePrompt = `${campaign.topic}: ${title.title}`;
      featuredImage = await contentGenerator.generateFeaturedImage(imagePrompt);
    }

    // Save the generated content to database
    const contentResult = await query(
      `INSERT INTO content_queue (campaign_id, title, generated_content, status)
       VALUES ($1, $2, $3, 'generated')
       RETURNING id, title, generated_content, status, created_at`,
      [campaignId, title.title, JSON.stringify({
        content: blogPost.content,
        contentType,
        wordCount,
        tone,
        keywords,
        featuredImage
      })]
    );

    const generatedContent = contentResult.rows[0];

    // Log the event
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'content_generated', 'Generated content for title: ${title.title}', 'info')`,
      [userId, campaignId]
    );

    logger.info('Content generated successfully:', { userId, campaignId, titleId });

    const contentData = JSON.parse(generatedContent.generated_content);
    
    res.json({
      success: true,
      message: 'Content generated successfully',
      content: {
        id: generatedContent.id,
        title: generatedContent.title,
        content: contentData.content,
        contentType: contentData.contentType,
        wordCount: contentData.wordCount,
        tone: contentData.tone,
        keywords: contentData.keywords || [],
        featuredImage: contentData.featuredImage,
        status: generatedContent.status,
        createdAt: generatedContent.created_at
      }
    });

  } catch (error) {
    logger.error('Generate content error:', error);
    
    // Check if it's an OpenAI API error
    if (error.message && error.message.includes('OpenAI API key')) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI API key not configured. Please contact support.'
      });
    }
    
    // Check if it's an OpenAI API call error
    if (error.message && error.message.includes('API')) {
      return res.status(500).json({
        error: 'AI service error',
        message: 'Failed to connect to AI service. Please try again later.'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate content',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/content/test-db-public
 * Test database connection and content_queue table (no auth required)
 */
router.get('/test-db-public', async (req, res) => {
  try {
    logger.info('=== DATABASE TEST START ===');
    
    // Check if content_queue table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_queue'
      );
    `);
    
    logger.info('Table exists check:', tableCheck.rows[0]);
    
    if (!tableCheck.rows[0].exists) {
      logger.info('content_queue table does not exist, attempting to create it...');
      
      await query(`
        CREATE TABLE content_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          title_id UUID NOT NULL REFERENCES title_queue(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          content_type VARCHAR(100) NOT NULL DEFAULT 'blog-post',
          word_count INTEGER NOT NULL DEFAULT 0,
          tone VARCHAR(50) NOT NULL DEFAULT 'conversational',
          keywords JSONB DEFAULT '[]'::jsonb,
          featured_image JSONB DEFAULT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'generated',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await query(`
        CREATE INDEX idx_content_queue_campaign_id ON content_queue(campaign_id);
        CREATE INDEX idx_content_queue_title_id ON content_queue(title_id);
        CREATE INDEX idx_content_queue_status ON content_queue(status);
        CREATE INDEX idx_content_queue_created_at ON content_queue(created_at);
      `);
      
      logger.info('content_queue table created successfully');
    }
    
    // Check table structure
    const structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'content_queue'
      ORDER BY ordinal_position;
    `);
    
    logger.info('=== DATABASE TEST SUCCESS ===');
    res.json({
      success: true,
      message: 'Database connection successful',
      tableExists: true,
      tableStructure: structure.rows
    });
    
  } catch (error) {
    logger.error('=== DATABASE TEST ERROR ===');
    logger.error('Database test error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * GET /api/content/test-generator
 * Test content generator service (no auth required)
 */
router.get('/test-generator', async (req, res) => {
  try {
    logger.info('=== CONTENT GENERATOR TEST START ===');
    
    // Test if contentGenerator module can be loaded
    const contentGenerator = require('../services/contentGenerator');
    logger.info('Content generator module loaded successfully');
    
    // Test OpenAI API key
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    logger.info('OpenAI API key present:', hasApiKey);
    
    if (!hasApiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        message: 'OPENAI_API_KEY environment variable is not set'
      });
    }
    
    // Test a simple OpenAI call
    logger.info('Testing OpenAI API connection...');
    const testResult = await contentGenerator.generateBlogPost({
      id: 'test',
      topic: 'Test Topic',
      context: 'Test Context'
    }, {
      contentType: 'blog-post',
      wordCount: 100,
      tone: 'conversational'
    });
    
    logger.info('OpenAI API test successful:', { contentLength: testResult.content.length });
    
    res.json({
      success: true,
      message: 'Content generator test successful',
      hasApiKey,
      testContentLength: testResult.content.length
    });
    
  } catch (error) {
    logger.error('=== CONTENT GENERATOR TEST ERROR ===');
    logger.error('Content generator test error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Content generator test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * GET /api/content/test-db
 * Test database connection and content_queue table
 */
router.get('/test-db', authenticateToken, async (req, res) => {
  try {
    // Check if content_queue table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_queue'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Try to create the table
      logger.info('content_queue table does not exist, attempting to create it...');
      
      await query(`
        CREATE TABLE content_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          title_id UUID NOT NULL REFERENCES title_queue(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          content_type VARCHAR(100) NOT NULL DEFAULT 'blog-post',
          word_count INTEGER NOT NULL DEFAULT 0,
          tone VARCHAR(50) NOT NULL DEFAULT 'conversational',
          keywords JSONB DEFAULT '[]'::jsonb,
          featured_image JSONB DEFAULT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'generated',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await query(`
        CREATE INDEX idx_content_queue_campaign_id ON content_queue(campaign_id);
        CREATE INDEX idx_content_queue_title_id ON content_queue(title_id);
        CREATE INDEX idx_content_queue_status ON content_queue(status);
        CREATE INDEX idx_content_queue_created_at ON content_queue(created_at);
      `);
      
      logger.info('content_queue table created successfully');
    }
    
    // Check table structure
    const structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'content_queue'
      ORDER BY ordinal_position;
    `);
    
    res.json({
      success: true,
      message: 'Database connection successful',
      tableExists: true,
      tableStructure: structure.rows
    });
    
  } catch (error) {
    logger.error('Database test error:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message
    });
  }
});

/**
 * POST /api/content/bulk-generate
 * Generate content for multiple approved titles
 */
router.post('/bulk-generate', authenticateToken, async (req, res) => {
  try {
    logger.info('=== BULK CONTENT GENERATION START ===');
    const userId = req.user.id;
    const { campaignId, titleIds, contentType = 'blog-post', wordCount = 1000, tone = 'conversational', includeKeywords = true, includeImages = false } = req.body;

    logger.info('Bulk content generation request:', { userId, campaignId, titleIds, contentType, wordCount, tone });

    // Validate input
    if (!campaignId || !titleIds || !Array.isArray(titleIds) || titleIds.length === 0) {
      logger.error('Validation error in bulk-generate:', { campaignId, titleIds });
      return res.status(400).json({
        error: 'Validation error',
        message: 'campaignId and titleIds (non-empty array) are required'
      });
    }

    // Verify campaign belongs to user
    logger.info('Checking campaign ownership...');
    const campaignResult = await query(
      `SELECT c.*, ws.site_name, ws.site_url, ws.username, ws.password_encrypted
       FROM campaigns c
       LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [campaignId, userId]
    );
    logger.info('Campaign query result:', { rowCount: campaignResult.rows.length });

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'The specified campaign does not exist or does not belong to you'
      });
    }

    // Verify all titles belong to user's campaign and are approved
    logger.info('Checking title ownership and approval...');
    const titleResult = await query(
      `SELECT tq.id, tq.title, tq.campaign_id, c.user_id
       FROM title_queue tq
       JOIN campaigns c ON tq.campaign_id = c.id
       WHERE tq.id = ANY($1) AND c.user_id = $2 AND tq.status = 'approved'`,
      [titleIds, userId]
    );
    logger.info('Title query result:', { rowCount: titleResult.rows.length, requestedCount: titleIds.length });

    if (titleResult.rows.length !== titleIds.length) {
      return res.status(404).json({
        error: 'Some titles not found or not approved',
        message: 'One or more titles do not exist, do not belong to you, or are not approved'
      });
    }

    const campaign = campaignResult.rows[0];
    const titles = titleResult.rows;

    logger.info(`Bulk generating content for ${titles.length} titles in campaign: ${campaign.topic}`);

    // Generate content for each title
    logger.info('Starting content generation loop...');
    const contentPromises = titles.map(async (title) => {
      try {
        const contentOptions = {
          contentType,
          wordCount,
          tone,
          includeKeywords,
          includeImages
        };

        const blogPost = await contentGenerator.generateBlogPost(campaign, contentOptions);
        
        // Generate keywords if requested
        let keywords = [];
        if (includeKeywords) {
          keywords = await contentGenerator.generateKeywords(campaign.topic, blogPost.content);
        }

        // Generate featured image if requested
        let featuredImage = null;
        if (includeImages) {
          const imagePrompt = `${campaign.topic}: ${title.title}`;
          featuredImage = await contentGenerator.generateFeaturedImage(imagePrompt);
        }

        // Save the generated content to database
        logger.info(`Saving content to database for title: ${title.title}`);
        try {
          const contentResult = await query(
            `INSERT INTO content_queue (campaign_id, title, generated_content, status)
             VALUES ($1, $2, $3, 'generated')
             RETURNING id, title, generated_content, status, created_at`,
            [campaignId, title.title, JSON.stringify({
              content: blogPost.content,
              contentType,
              wordCount,
              tone,
              keywords,
              featuredImage
            })]
          );
          logger.info(`Content saved successfully for title: ${title.title}`);
        } catch (dbError) {
          logger.error(`Database error saving content for title ${title.id}:`, dbError);
          throw dbError;
        }

        return contentResult.rows[0];
      } catch (error) {
        logger.error(`Error generating content for title ${title.id}:`, error);
        return { error: error.message, titleId: title.id };
      }
    });

    logger.info('Waiting for all content generation promises to complete...');
    const results = await Promise.all(contentPromises);
    const successfulContent = results.filter(result => !result.error);
    const failedContent = results.filter(result => result.error);

    logger.info('Content generation results:', { 
      successful: successfulContent.length, 
      failed: failedContent.length,
      total: results.length 
    });

    // Log the event
    logger.info('Logging the event to database...');
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'content_bulk_generated', 'Generated content for ${successfulContent.length} titles', 'info')`,
      [userId, campaignId]
    );

    logger.info('Bulk content generation completed:', { 
      userId, 
      campaignId, 
      successful: successfulContent.length, 
      failed: failedContent.length 
    });

    res.json({
      success: true,
      message: `Generated content for ${successfulContent.length} titles successfully`,
      content: successfulContent,
      errors: failedContent.length > 0 ? failedContent : undefined
    });

  } catch (error) {
    logger.error('=== BULK CONTENT GENERATION ERROR ===');
    logger.error('Bulk generate content error:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error message:', error.message);
    logger.error('Error code:', error.code);
    
    // Check if it's an OpenAI API error
    if (error.message && error.message.includes('OpenAI API key')) {
      logger.error('OpenAI API key error detected');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI API key not configured. Please contact support.'
      });
    }
    
    // Check if it's an OpenAI API call error
    if (error.message && error.message.includes('API')) {
      logger.error('OpenAI API call error detected');
      return res.status(500).json({
        error: 'AI service error',
        message: 'Failed to connect to AI service. Please try again later.'
      });
    }
    
    logger.error('Generic error, returning 500');
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate content',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/content/campaign/:campaignId
 * Get all generated content for a campaign
 */
router.get('/campaign/:campaignId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.campaignId;

    // Verify campaign belongs to user
    const campaignResult = await query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'The specified campaign does not exist or does not belong to you'
      });
    }

    // Get all content for the campaign
    const contentResult = await query(
      `SELECT cq.*, tq.title as original_title
       FROM content_queue cq
       LEFT JOIN title_queue tq ON cq.title_id = tq.id
       WHERE cq.campaign_id = $1
       ORDER BY cq.created_at DESC`,
      [campaignId]
    );

    const content = contentResult.rows.map(item => ({
      id: item.id,
      title: item.title,
      originalTitle: item.original_title,
      content: item.content,
      contentType: item.content_type,
      wordCount: item.word_count,
      tone: item.tone,
      keywords: JSON.parse(item.keywords || '[]'),
      featuredImage: item.featured_image,
      status: item.status,
      createdAt: item.created_at
    }));

    res.json({
      success: true,
      content
    });

  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get content'
    });
  }
});

/**
 * PUT /api/content/:id/status
 * Update content status (approve/reject)
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = req.params.id;
    const { status } = req.body;

    if (!status || !['approved', 'rejected', 'published'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be approved, rejected, or published'
      });
    }

    // Verify content belongs to user's campaign
    const contentResult = await query(
      `UPDATE content_queue 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND campaign_id IN (
         SELECT id FROM campaigns WHERE user_id = $3
       )
       RETURNING id, title, status`,
      [status, contentId, userId]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Content not found',
        message: 'The specified content does not exist or does not belong to you'
      });
    }

    const updatedContent = contentResult.rows[0];

    logger.info('Content status updated:', { userId, contentId, status });

    res.json({
      success: true,
      message: 'Content status updated successfully',
      content: updatedContent
    });

  } catch (error) {
    logger.error('Update content status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update content status'
    });
  }
});

/**
 * DELETE /api/content/:id
 * Delete generated content
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = req.params.id;

    // Verify content belongs to user's campaign
    const contentResult = await query(
      `DELETE FROM content_queue 
       WHERE id = $1 AND campaign_id IN (
         SELECT id FROM campaigns WHERE user_id = $2
       )
       RETURNING id, title`,
      [contentId, userId]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Content not found',
        message: 'The specified content does not exist or does not belong to you'
      });
    }

    const deletedContent = contentResult.rows[0];

    logger.info('Content deleted:', { userId, contentId });

    res.json({
      success: true,
      message: 'Content deleted successfully',
      content: deletedContent
    });

  } catch (error) {
    logger.error('Delete content error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete content'
    });
  }
});

module.exports = router;
