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
      `SELECT c.*, ws.site_name, ws.site_url, ws.username, ws.password
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
      `INSERT INTO content_queue (campaign_id, title_id, title, content, content_type, word_count, tone, keywords, featured_image, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'generated', NOW())
       RETURNING id, title, content, content_type, word_count, tone, keywords, featured_image, status, created_at`,
      [campaignId, titleId, title.title, blogPost.content, contentType, wordCount, tone, JSON.stringify(keywords), featuredImage]
    );

    const generatedContent = contentResult.rows[0];

    // Log the event
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'content_generated', 'Generated content for title: ${title.title}', 'info')`,
      [userId, campaignId]
    );

    logger.info('Content generated successfully:', { userId, campaignId, titleId });

    res.json({
      success: true,
      message: 'Content generated successfully',
      content: {
        id: generatedContent.id,
        title: generatedContent.title,
        content: generatedContent.content,
        contentType: generatedContent.content_type,
        wordCount: generatedContent.word_count,
        tone: generatedContent.tone,
        keywords: JSON.parse(generatedContent.keywords || '[]'),
        featuredImage: generatedContent.featured_image,
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
