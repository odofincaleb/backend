const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const contentTypeTemplates = require('../services/contentTypeTemplates');

const router = express.Router();

// Validation schemas
const addTitleSchema = Joi.object({
  title: Joi.string().min(5).max(500).required(),
  keywords: Joi.array().items(Joi.string()).default([])
});

const generateTitlesSchema = Joi.object({
  count: Joi.number().min(1).max(10).default(5)
});

/**
 * GET /api/title-queue/:campaignId
 * Get all titles for a specific campaign
 */
router.get('/:campaignId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.campaignId;

    // Verify campaign belongs to user
    const campaignCheck = await query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // Get titles for the campaign
    const result = await query(
      `SELECT id, title, status, keywords, generated_at, approved_at, used_at, created_at
       FROM title_queue
       WHERE campaign_id = $1
       ORDER BY created_at DESC`,
      [campaignId]
    );

    const titles = result.rows.map(title => ({
      id: title.id,
      title: title.title,
      status: title.status,
      keywords: title.keywords,
      generatedAt: title.generated_at,
      approvedAt: title.approved_at,
      usedAt: title.used_at,
      createdAt: title.created_at
    }));

    res.json({
      titles
    });

  } catch (error) {
    logger.error('Get titles error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get titles'
    });
  }
});

/**
 * POST /api/title-queue/:campaignId
 * Add a custom title to the queue
 */
router.post('/:campaignId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.campaignId;

    // Validate input
    const { error, value } = addTitleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    // Verify campaign belongs to user
    const campaignCheck = await query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    const { title, keywords } = value;

    // Add title to queue
    const result = await query(
      `INSERT INTO title_queue (campaign_id, title, status, keywords)
       VALUES ($1, $2, 'pending', $3)
       RETURNING id, title, status, keywords, created_at`,
      [campaignId, title, JSON.stringify(keywords)]
    );

    const newTitle = result.rows[0];

    // Log title addition
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity, metadata)
       VALUES ($1, $2, 'title_added', 'Custom title added to queue', 'info', $3)`,
      [userId, campaignId, JSON.stringify({ title, keywords })]
    );

    logger.info('Title added to queue:', { userId, campaignId, titleId: newTitle.id });

    res.status(201).json({
      message: 'Title added successfully',
      title: {
        id: newTitle.id,
        title: newTitle.title,
        status: newTitle.status,
        keywords: newTitle.keywords,
        createdAt: newTitle.created_at
      }
    });

  } catch (error) {
    logger.error('Add title error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add title'
    });
  }
});

/**
 * POST /api/title-queue/:campaignId/generate
 * Generate titles using AI
 */
router.post('/:campaignId/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.campaignId;

    // Validate input
    const { error, value } = generateTitlesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { count } = value;

    // Get campaign details
    const campaignResult = await query(
      `SELECT c.*, ws.site_name, ws.site_url
       FROM campaigns c
       LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [campaignId, userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    const campaign = campaignResult.rows[0];

    // Generate titles using AI
    let generatedTitles = [];
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured in environment variables');
      }
      
      const ContentGenerator = require('../services/contentGenerator');
      const contentGenerator = new ContentGenerator();
      
      generatedTitles = await contentGenerator.generateTitles(campaign, count);
      
      if (!generatedTitles || generatedTitles.length === 0) {
        throw new Error('AI service returned no titles');
      }
      
      logger.info(`AI generated ${generatedTitles.length} titles successfully`);
    } catch (aiError) {
      logger.error('AI title generation failed:', aiError);
      
      // Fallback to intelligent placeholder titles if AI fails
      logger.info('Falling back to intelligent placeholder titles');
      generatedTitles = [];
      for (let i = 0; i < count; i++) {
        const variations = [
          `How to Master ${campaign.topic} for Business Growth`,
          `The Complete Guide to ${campaign.topic} Success`,
          `10 Proven ${campaign.topic} Strategies That Work`,
          `Why ${campaign.topic} is Essential for Your Business`,
          `Transform Your Business with ${campaign.topic}`
        ];
        
        const title = variations[i % variations.length];
        generatedTitles.push(title);
      }
    }

    // Insert generated titles
    const insertedTitles = [];
    for (const title of generatedTitles) {
      // Extract keywords from the title for better organization
      const keywords = title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5); // Limit to 5 keywords
      
      const result = await query(
        `INSERT INTO title_queue (campaign_id, title, status, keywords)
         VALUES ($1, $2, 'pending', $3)
         RETURNING id, title, status, keywords, created_at`,
        [campaignId, title, JSON.stringify(keywords)]
      );
      
      insertedTitles.push({
        id: result.rows[0].id,
        title: result.rows[0].title,
        status: result.rows[0].status,
        keywords: result.rows[0].keywords,
        createdAt: result.rows[0].created_at
      });
    }

    // Log title generation
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity, metadata)
       VALUES ($1, $2, 'titles_generated', 'Generated ${count} titles', 'info', $3)`,
      [userId, campaignId, JSON.stringify({ count, titles: generatedTitles })]
    );

    logger.info('Titles generated:', { userId, campaignId, count });

    res.status(201).json({
      message: `${count} titles generated successfully`,
      titles: insertedTitles
    });

  } catch (error) {
    logger.error('Generate titles error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate titles'
    });
  }
});

/**
 * PUT /api/title-queue/:titleId/status
 * Update title status (approve/reject)
 */
router.put('/:titleId/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const titleId = req.params.titleId;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be approved, rejected, or pending'
      });
    }

    // Verify title belongs to user's campaign
    const titleCheck = await query(
      `SELECT tq.id, tq.campaign_id, c.user_id
       FROM title_queue tq
       JOIN campaigns c ON tq.campaign_id = c.id
       WHERE tq.id = $1 AND c.user_id = $2`,
      [titleId, userId]
    );

    if (titleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Title not found'
      });
    }

    const campaignId = titleCheck.rows[0].campaign_id;

    // Update title status
    const updateFields = ['status = $1'];
    const updateValues = [status];

    if (status === 'approved') {
      updateFields.push('approved_at = CURRENT_TIMESTAMP');
    }

    const result = await query(
      `UPDATE title_queue 
       SET ${updateFields.join(', ')}
       WHERE id = $${updateValues.length + 1}
       RETURNING id, title, status, approved_at`,
      [...updateValues, titleId]
    );

    const updatedTitle = result.rows[0];

    // Log status update
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity, metadata)
       VALUES ($1, $2, 'title_status_updated', 'Title status updated to ${status}', 'info', $3)`,
      [userId, campaignId, JSON.stringify({ titleId, status })]
    );

    logger.info('Title status updated:', { userId, campaignId, titleId, status });

    res.json({
      message: 'Title status updated successfully',
      title: {
        id: updatedTitle.id,
        title: updatedTitle.title,
        status: updatedTitle.status,
        approvedAt: updatedTitle.approved_at
      }
    });

  } catch (error) {
    logger.error('Update title status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update title status'
    });
  }
});

/**
 * DELETE /api/title-queue/:titleId
 * Delete a title from the queue
 */
router.delete('/:titleId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const titleId = req.params.titleId;

    // Verify title belongs to user's campaign
    const titleCheck = await query(
      `SELECT tq.id, tq.campaign_id, c.user_id
       FROM title_queue tq
       JOIN campaigns c ON tq.campaign_id = c.id
       WHERE tq.id = $1 AND c.user_id = $2`,
      [titleId, userId]
    );

    if (titleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Title not found'
      });
    }

    const campaignId = titleCheck.rows[0].campaign_id;

    // Delete title
    await query('DELETE FROM title_queue WHERE id = $1', [titleId]);

    // Log title deletion
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'title_deleted', 'Title deleted from queue', 'info')`,
      [userId, campaignId]
    );

    logger.info('Title deleted:', { userId, campaignId, titleId });

    res.json({
      message: 'Title deleted successfully'
    });

  } catch (error) {
    logger.error('Delete title error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete title'
    });
  }
});

module.exports = router;