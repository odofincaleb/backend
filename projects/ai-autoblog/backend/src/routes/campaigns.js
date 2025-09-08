const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken, checkCampaignLimit } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const createCampaignSchema = Joi.object({
  topic: Joi.string().min(3).max(255).required(),
  context: Joi.string().min(10).max(2000).required(),
  toneOfVoice: Joi.string().valid('conversational', 'formal', 'humorous', 'storytelling').default('conversational'),
  writingStyle: Joi.string().valid('pas', 'aida', 'listicle').default('pas'),
  imperfectionList: Joi.array().items(Joi.string()).default([]),
  schedule: Joi.string().valid('24h', '48h', '72h').default('24h'),
  wordpressSiteId: Joi.string().uuid().optional()
});

const updateCampaignSchema = Joi.object({
  topic: Joi.string().min(3).max(255),
  context: Joi.string().min(10).max(2000),
  toneOfVoice: Joi.string().valid('conversational', 'formal', 'humorous', 'storytelling'),
  writingStyle: Joi.string().valid('pas', 'aida', 'listicle'),
  imperfectionList: Joi.array().items(Joi.string()),
  schedule: Joi.string().valid('24h', '48h', '72h'),
  wordpressSiteId: Joi.string().uuid().optional(),
  status: Joi.string().valid('active', 'paused', 'completed', 'error')
});

/**
 * GET /api/campaigns
 * Get all campaigns for the user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT c.id, c.topic, c.context, c.tone_of_voice, c.writing_style, 
              c.imperfection_list, c.schedule, c.status, c.next_publish_at,
              c.created_at, c.updated_at,
              ws.site_name, ws.site_url,
              COUNT(cq.id) as posts_published
       FROM campaigns c
       LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
       LEFT JOIN content_queue cq ON c.id = cq.campaign_id AND cq.status = 'completed'
       WHERE c.user_id = $1
       GROUP BY c.id, ws.site_name, ws.site_url
       ORDER BY c.created_at DESC`,
      [userId]
    );

    const campaigns = result.rows.map(campaign => ({
      id: campaign.id,
      topic: campaign.topic,
      context: campaign.context,
      toneOfVoice: campaign.tone_of_voice,
      writingStyle: campaign.writing_style,
      imperfectionList: campaign.imperfection_list,
      schedule: campaign.schedule,
      status: campaign.status,
      nextPublishAt: campaign.next_publish_at,
      wordpressSite: campaign.site_name ? {
        name: campaign.site_name,
        url: campaign.site_url
      } : null,
      postsPublished: parseInt(campaign.posts_published),
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at
    }));

    res.json({
      campaigns
    });

  } catch (error) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get campaigns'
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get a specific campaign
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const result = await query(
      `SELECT c.*, ws.site_name, ws.site_url
       FROM campaigns c
       LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [campaignId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    const campaign = result.rows[0];

    res.json({
      campaign: {
        id: campaign.id,
        topic: campaign.topic,
        context: campaign.context,
        toneOfVoice: campaign.tone_of_voice,
        writingStyle: campaign.writing_style,
        imperfectionList: campaign.imperfection_list,
        schedule: campaign.schedule,
        status: campaign.status,
        nextPublishAt: campaign.next_publish_at,
        wordpressSite: campaign.site_name ? {
          id: campaign.wordpress_site_id,
          name: campaign.site_name,
          url: campaign.site_url
        } : null,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at
      }
    });

  } catch (error) {
    logger.error('Get campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get campaign'
    });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', authenticateToken, checkCampaignLimit, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const {
      topic,
      context,
      toneOfVoice,
      writingStyle,
      imperfectionList,
      schedule,
      wordpressSiteId
    } = value;

    // Validate WordPress site if provided
    if (wordpressSiteId) {
      const siteResult = await query(
        'SELECT id FROM wordpress_sites WHERE id = $1 AND user_id = $2',
        [wordpressSiteId, userId]
      );
      if (siteResult.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found',
          message: 'The specified WordPress site does not exist or does not belong to you'
        });
      }
    }

    // Calculate next publish time
    const scheduleHours = parseInt(schedule.replace('h', ''));
    const nextPublishAt = new Date(Date.now() + scheduleHours * 60 * 60 * 1000);

    // Create campaign
    const result = await query(
      `INSERT INTO campaigns (
        user_id, topic, context, tone_of_voice, writing_style, 
        imperfection_list, schedule, wordpress_site_id, next_publish_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, topic, context, tone_of_voice, writing_style, 
                imperfection_list, schedule, status, next_publish_at, created_at`,
      [
        userId, topic, context, toneOfVoice, writingStyle,
        JSON.stringify(imperfectionList), schedule, wordpressSiteId, nextPublishAt
      ]
    );

    const campaign = result.rows[0];

    // Log campaign creation
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity, metadata)
       VALUES ($1, $2, 'campaign_created', 'New campaign created', 'info', $3)`,
      [userId, campaign.id, JSON.stringify({ topic, schedule })]
    );

    logger.info('Campaign created:', { userId, campaignId: campaign.id, topic });

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign: {
        id: campaign.id,
        topic: campaign.topic,
        context: campaign.context,
        toneOfVoice: campaign.tone_of_voice,
        writingStyle: campaign.writing_style,
        imperfectionList: campaign.imperfection_list,
        schedule: campaign.schedule,
        status: campaign.status,
        nextPublishAt: campaign.next_publish_at,
        createdAt: campaign.created_at
      }
    });

  } catch (error) {
    logger.error('Create campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create campaign'
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update a campaign
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const campaignId = req.params.id;

    // Check if campaign exists and belongs to user
    const existingCampaign = await query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (existingCampaign.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (value.topic) {
      updates.push(`topic = $${paramCount++}`);
      values.push(value.topic);
    }
    if (value.context) {
      updates.push(`context = $${paramCount++}`);
      values.push(value.context);
    }
    if (value.toneOfVoice) {
      updates.push(`tone_of_voice = $${paramCount++}`);
      values.push(value.toneOfVoice);
    }
    if (value.writingStyle) {
      updates.push(`writing_style = $${paramCount++}`);
      values.push(value.writingStyle);
    }
    if (value.imperfectionList) {
      updates.push(`imperfection_list = $${paramCount++}`);
      values.push(JSON.stringify(value.imperfectionList));
    }
    if (value.schedule) {
      updates.push(`schedule = $${paramCount++}`);
      values.push(value.schedule);
    }
    if (value.wordpressSiteId) {
      // Validate WordPress site
      const siteResult = await query(
        'SELECT id FROM wordpress_sites WHERE id = $1 AND user_id = $2',
        [value.wordpressSiteId, userId]
      );
      if (siteResult.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }
      updates.push(`wordpress_site_id = $${paramCount++}`);
      values.push(value.wordpressSiteId);
    }
    if (value.status) {
      updates.push(`status = $${paramCount++}`);
      values.push(value.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(campaignId);

    const updateQuery = `
      UPDATE campaigns 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);
    const campaign = result.rows[0];

    // Log campaign update
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity, metadata)
       VALUES ($1, $2, 'campaign_updated', 'Campaign updated', 'info', $3)`,
      [userId, campaignId, JSON.stringify(Object.keys(value))]
    );

    logger.info('Campaign updated:', { userId, campaignId, updates: Object.keys(value) });

    res.json({
      message: 'Campaign updated successfully',
      campaign: {
        id: campaign.id,
        topic: campaign.topic,
        context: campaign.context,
        toneOfVoice: campaign.tone_of_voice,
        writingStyle: campaign.writing_style,
        imperfectionList: campaign.imperfection_list,
        schedule: campaign.schedule,
        status: campaign.status,
        nextPublishAt: campaign.next_publish_at,
        updatedAt: campaign.updated_at
      }
    });

  } catch (error) {
    logger.error('Update campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update campaign'
    });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    // Check if campaign exists and belongs to user
    const existingCampaign = await query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (existingCampaign.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // Delete campaign (content_queue will be deleted via CASCADE)
    await query('DELETE FROM campaigns WHERE id = $1', [campaignId]);

    // Log campaign deletion
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'campaign_deleted', 'Campaign deleted', 'info')`,
      [userId, campaignId]
    );

    logger.info('Campaign deleted:', { userId, campaignId });

    res.json({
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    logger.error('Delete campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete campaign'
    });
  }
});

/**
 * POST /api/campaigns/:id/start
 * Start a campaign
 */
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    // Update campaign status to active and set next_publish_at to now for immediate processing
    const result = await query(
      `UPDATE campaigns 
       SET status = 'active', next_publish_at = NOW(), updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [campaignId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // Log campaign start
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'campaign_started', 'Campaign started and scheduled for immediate processing', 'info')`,
      [userId, campaignId]
    );

    logger.info('Campaign started with immediate processing:', { userId, campaignId });

    res.json({
      message: 'Campaign started successfully and scheduled for immediate processing'
    });

  } catch (error) {
    logger.error('Start campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to start campaign'
    });
  }
});

/**
 * POST /api/campaigns/:id/stop
 * Stop a campaign
 */
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    // Update campaign status to paused
    const result = await query(
      `UPDATE campaigns 
       SET status = 'paused', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [campaignId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // Log campaign stop
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'campaign_stopped', 'Campaign stopped', 'info')`,
      [userId, campaignId]
    );

    logger.info('Campaign stopped:', { userId, campaignId });

    res.json({
      message: 'Campaign stopped successfully'
    });

  } catch (error) {
    logger.error('Stop campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to stop campaign'
    });
  }
});

module.exports = router;

