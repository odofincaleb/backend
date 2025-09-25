const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const createTitleSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
  title: Joi.string().min(5).max(500).required()
});

const updateTitleStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required()
});

/**
 * GET /api/title-queue/:campaignId
 * Get all titles in queue for a specific campaign
 */
router.get('/:campaignId', authenticateToken, async (req, res) => {
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

    // Get titles for the campaign
    const result = await query(
      `SELECT id, title, status, created_at, updated_at
       FROM title_queue
       WHERE campaign_id = $1
       ORDER BY created_at DESC`,
      [campaignId]
    );

    res.json({
      titles: result.rows
    });

  } catch (error) {
    logger.error('Get title queue error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get title queue'
    });
  }
});

/**
 * POST /api/title-queue
 * Add a new title to the queue
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createTitleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const { campaignId, title } = value;

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

    // Create title in queue
    const result = await query(
      `INSERT INTO title_queue (campaign_id, title, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, title, status, created_at`,
      [campaignId, title]
    );

    const newTitle = result.rows[0];

    // Log the event
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'title_added', 'Title added to queue: "${title}"', 'info')`,
      [userId, campaignId]
    );

    logger.info('Title added to queue:', { userId, campaignId, titleId: newTitle.id });

    res.status(201).json({
      message: 'Title added to queue successfully',
      title: newTitle
    });

  } catch (error) {
    logger.error('Add title to queue error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add title to queue'
    });
  }
});

/**
 * PUT /api/title-queue/:titleId/status
 * Update title status (approve/reject)
 */
router.put('/:titleId/status', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateTitleStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const titleId = req.params.titleId;
    const { status } = value;

    // Verify title belongs to user's campaign
    const titleResult = await query(
      `SELECT tq.id, tq.title, tq.campaign_id, c.user_id
       FROM title_queue tq
       JOIN campaigns c ON tq.campaign_id = c.id
       WHERE tq.id = $1 AND c.user_id = $2`,
      [titleId, userId]
    );

    if (titleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Title not found',
        message: 'The specified title does not exist or does not belong to you'
      });
    }

    const title = titleResult.rows[0];

    // Update title status
    const result = await query(
      `UPDATE title_queue 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, title, status, updated_at`,
      [status, titleId]
    );

    const updatedTitle = result.rows[0];

    // Log the event
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'title_${status}', 'Title ${status}: "${title.title}"', 'info')`,
      [userId, title.campaign_id]
    );

    logger.info('Title status updated:', { userId, titleId, status });

    res.json({
      message: `Title ${status} successfully`,
      title: updatedTitle
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
    const titleResult = await query(
      `SELECT tq.id, tq.title, tq.campaign_id, c.user_id
       FROM title_queue tq
       JOIN campaigns c ON tq.campaign_id = c.id
       WHERE tq.id = $1 AND c.user_id = $2`,
      [titleId, userId]
    );

    if (titleResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Title not found',
        message: 'The specified title does not exist or does not belong to you'
      });
    }

    const title = titleResult.rows[0];

    // Delete the title
    await query(
      'DELETE FROM title_queue WHERE id = $1',
      [titleId]
    );

    // Log the event
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'title_deleted', 'Title deleted from queue: "${title.title}"', 'info')`,
      [userId, title.campaign_id]
    );

    logger.info('Title deleted from queue:', { userId, titleId });

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

/**
 * POST /api/title-queue/:campaignId/generate
 * Generate titles for a campaign
 */
router.post('/:campaignId/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.campaignId;
    const { count = 5 } = req.body; // Default to 5 titles

    // Verify campaign belongs to user
    const campaignResult = await query(
      `SELECT c.*, ws.site_name, ws.site_url
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

    const campaign = campaignResult.rows[0];

    // Import content generator
    const contentGenerator = require('../services/contentGenerator');
    
    // Generate titles
    logger.info(`Attempting to generate ${count} titles for campaign: ${campaign.topic}`);
    const titles = await contentGenerator.generateTitles(campaign, count);
    logger.info(`Successfully generated ${titles.length} titles`);

    // Add titles to queue
    const titlePromises = titles.map(title => 
      query(
        `INSERT INTO title_queue (campaign_id, title, status)
         VALUES ($1, $2, 'pending')
         RETURNING id, title, status, created_at`,
        [campaignId, title]
      )
    );

    const results = await Promise.all(titlePromises);
    const newTitles = results.map(result => result.rows[0]);

    // Log the event
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'titles_generated', 'Generated ${titles.length} titles for campaign', 'info')`,
      [userId, campaignId]
    );

    logger.info('Titles generated for campaign:', { userId, campaignId, count: titles.length });

    res.json({
      message: `Generated ${titles.length} titles successfully`,
      titles: newTitles
    });

  } catch (error) {
    logger.error('Generate titles error:', error);
    
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
      message: 'Failed to generate titles',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
