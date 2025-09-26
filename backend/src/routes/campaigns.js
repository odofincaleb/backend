const express = require('express');
const Joi = require('joi');
const { query, pool } = require('../database/connection');
const { authenticateToken, checkCampaignLimit } = require('../middleware/auth');
const logger = require('../utils/logger');
const contentTypeTemplates = require('../services/contentTypeTemplates');

const router = express.Router();

// Validation schemas
const createCampaignSchema = Joi.object({
  topic: Joi.string().min(3).max(255).required(),
  context: Joi.string().min(10).max(2000).required(),
  toneOfVoice: Joi.string().valid('conversational', 'formal', 'humorous', 'storytelling').default('conversational'),
  writingStyle: Joi.string().valid('pas', 'aida', 'listicle').default('pas'),
  imperfectionList: Joi.array().items(Joi.string().min(1)).default([]),
  schedule: Joi.string().pattern(/^\d+(\.\d+)?h$/).optional(), // Accept any decimal hours format like "24.00h", "0.50h", etc.
  scheduleHours: Joi.alternatives().try(
    Joi.number().min(0.1).max(168),
    Joi.string().pattern(/^\d+(\.\d+)?$/).custom((value, helpers) => {
      const num = parseFloat(value);
      if (num < 0.1 || num > 168) {
        return helpers.error('number.min');
      }
      return num;
    })
  ).optional(), // New custom hours field
  wordpressSiteId: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.string().allow(''),
    Joi.valid(null)
  ).optional(),
  contentTypes: Joi.array().items(Joi.string()).max(5).optional(),
  contentTypeVariables: Joi.object().allow(null).optional(),
  titleCount: Joi.number().min(1).max(20).default(5),
  numberOfTitles: Joi.number().min(1).max(20).default(5) // Support both field names
}).custom((value, helpers) => {
  // Ensure at least one schedule option is provided
  if (!value.schedule && (value.scheduleHours === undefined || value.scheduleHours === null)) {
    return helpers.error('custom.scheduleRequired');
  }
  
  // Validate content types if provided
  if (value.contentTypes) {
    const validation = contentTypeTemplates.validateContentTypes(value.contentTypes);
    if (!validation.valid) {
      return helpers.error('custom.contentTypesInvalid', { message: validation.error });
    }
  }
  
  return value;
}, 'Campaign validation').messages({
  'custom.scheduleRequired': 'Either schedule or scheduleHours must be provided',
  'custom.contentTypesInvalid': 'Content types validation failed: {#message}'
});

const updateCampaignSchema = Joi.object({
  topic: Joi.string().min(3).max(255),
  context: Joi.string().min(10).max(2000),
  toneOfVoice: Joi.string().valid('conversational', 'formal', 'humorous', 'storytelling'),
  writingStyle: Joi.string().valid('pas', 'aida', 'listicle'),
  imperfectionList: Joi.array().items(Joi.string()),
  schedule: Joi.string().valid('24h', '48h', '72h').optional(), // Keep for backward compatibility
  scheduleHours: Joi.alternatives().try(
    Joi.number().min(0.1).max(168),
    Joi.string().pattern(/^\d+(\.\d+)?$/).custom((value, helpers) => {
      const num = parseFloat(value);
      if (num < 0.1 || num > 168) {
        return helpers.error('number.min');
      }
      return num;
    })
  ).optional(), // New custom hours field
  wordpressSiteId: Joi.string().uuid().optional(),
  status: Joi.string().valid('active', 'paused', 'completed', 'error'),
  contentTypes: Joi.array().items(Joi.string()).max(5).optional(),
  contentTypeVariables: Joi.object().optional()
}).custom((value, helpers) => {
  // Validate content types if provided
  if (value.contentTypes) {
    const validation = contentTypeTemplates.validateContentTypes(value.contentTypes);
    if (!validation.valid) {
      return helpers.error('custom.contentTypesInvalid', { message: validation.error });
    }
  }
  return value;
}, 'Campaign validation').messages({
  'custom.contentTypesInvalid': 'Content types validation failed: {#message}'
});

/**
 * GET /api/campaigns/content-types
 * Get all available content types
 */
router.get('/content-types', authenticateToken, async (req, res) => {
  try {
    const contentTypes = contentTypeTemplates.getAllContentTypes();
    res.json({
      success: true,
      contentTypes
    });
  } catch (error) {
    logger.error('Get content types error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get content types'
    });
  }
});

/**
 * GET /api/campaigns
 * Get all campaigns for the user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let result;
    try {
      // Try with all new columns first (after migration)
      result = await query(
        `SELECT c.id, c.topic, c.context, c.tone_of_voice, c.writing_style, 
                c.imperfection_list, c.schedule, c.schedule_hours, c.status, c.next_publish_at,
                c.created_at, c.updated_at, c.content_types, c.content_type_variables,
                ws.site_name, ws.site_url,
                COUNT(cq.id) as posts_published,
                COUNT(tq.id) as titles_in_queue,
                COUNT(CASE WHEN tq.status = 'approved' THEN 1 END) as approved_titles
         FROM campaigns c
         LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
         LEFT JOIN content_queue cq ON c.id = cq.campaign_id AND cq.status = 'completed'
         LEFT JOIN title_queue tq ON c.id = tq.campaign_id
         WHERE c.user_id = $1
         GROUP BY c.id, c.topic, c.context, c.tone_of_voice, c.writing_style, 
                  c.imperfection_list, c.schedule, c.schedule_hours, c.status, c.next_publish_at,
                  c.created_at, c.updated_at, c.content_types, c.content_type_variables,
                  ws.site_name, ws.site_url
         ORDER BY c.created_at DESC`,
        [userId]
      );
    } catch (error) {
      // Fallback to legacy format if new columns don't exist yet
      if (error.message.includes('schedule_hours') || error.message.includes('content_types')) {
        result = await query(
      `SELECT c.id, c.topic, c.context, c.tone_of_voice, c.writing_style, 
              c.imperfection_list, c.schedule, c.status, c.next_publish_at,
              c.created_at, c.updated_at,
              ws.site_name, ws.site_url,
              COUNT(cq.id) as posts_published,
              COUNT(tq.id) as titles_in_queue,
              COUNT(CASE WHEN tq.status = 'approved' THEN 1 END) as approved_titles
       FROM campaigns c
       LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
       LEFT JOIN content_queue cq ON c.id = cq.campaign_id AND cq.status = 'completed'
       LEFT JOIN title_queue tq ON c.id = tq.campaign_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.topic, c.context, c.tone_of_voice, c.writing_style, 
                c.imperfection_list, c.schedule, c.status, c.next_publish_at,
                c.created_at, c.updated_at, ws.site_name, ws.site_url
       ORDER BY c.created_at DESC`,
      [userId]
    );
      } else {
        throw error;
      }
    }

    const campaigns = result.rows.map(campaign => ({
      id: campaign.id,
      topic: campaign.topic,
      context: campaign.context,
      toneOfVoice: campaign.tone_of_voice,
      writingStyle: campaign.writing_style,
      imperfectionList: campaign.imperfection_list,
      schedule: campaign.schedule,
      scheduleHours: campaign.schedule_hours || (campaign.schedule ? parseInt(campaign.schedule.replace('h', '')) : 24),
      status: campaign.status,
      nextPublishAt: campaign.next_publish_at,
      wordpressSite: campaign.site_name ? {
        name: campaign.site_name,
        url: campaign.site_url
      } : null,
      postsPublished: parseInt(campaign.posts_published),
      titlesInQueue: parseInt(campaign.titles_in_queue),
      approvedTitles: parseInt(campaign.approved_titles),
      contentTypes: campaign.content_types || Object.keys(contentTypeTemplates.getAllContentTypes()),
      contentTypeVariables: campaign.content_type_variables || {},
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at
    }));

    res.json({
      success: true,
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
      success: true,
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
      logger.error('Campaign validation error:', error);
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
      scheduleHours,
      wordpressSiteId,
      contentTypes,
      contentTypeVariables,
      titleCount
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

    // Calculate next publish time and determine schedule values
    let finalScheduleHours;
    let finalSchedule;
    
    if (scheduleHours !== undefined) {
      // Use custom hours
      finalScheduleHours = scheduleHours;
      // For custom hours, use a default legacy schedule that passes the constraint
      finalSchedule = '24h'; // Default legacy value that passes the constraint
    } else {
      // Use legacy schedule format
      finalScheduleHours = parseInt(schedule.replace('h', ''));
      finalSchedule = schedule;
    }
    
    // Set default content types if none provided (all 15 types)
    let finalContentTypes = contentTypes;
    if (!finalContentTypes || finalContentTypes.length === 0) {
      finalContentTypes = Object.keys(contentTypeTemplates.getAllContentTypes());
    }
    
    // Set default content type variables if none provided
    let finalContentTypeVariables = contentTypeVariables || {};
    
    const nextPublishAt = new Date(Date.now() + finalScheduleHours * 60 * 60 * 1000);

    // Create campaign
    let result;
    try {
      // Try with all new columns first (after migration)
      result = await query(
        `INSERT INTO campaigns (
          user_id, topic, context, tone_of_voice, writing_style, 
          imperfection_list, schedule, schedule_hours, wordpress_site_id, next_publish_at,
          content_types, content_type_variables, title_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, topic, context, tone_of_voice, writing_style, 
                  imperfection_list, schedule, schedule_hours, status, next_publish_at, created_at,
                  content_types, content_type_variables, title_count`,
        [
          userId, topic, context, toneOfVoice, writingStyle,
          JSON.stringify(imperfectionList), finalSchedule, finalScheduleHours, wordpressSiteId, nextPublishAt,
          JSON.stringify(finalContentTypes), JSON.stringify(finalContentTypeVariables), titleCount
        ]
      );
    } catch (error) {
      // Fallback to legacy format if new columns don't exist yet
      if (error.message.includes('schedule_hours') || error.message.includes('content_types')) {
        result = await query(
      `INSERT INTO campaigns (
        user_id, topic, context, tone_of_voice, writing_style, 
        imperfection_list, schedule, wordpress_site_id, next_publish_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, topic, context, tone_of_voice, writing_style, 
                imperfection_list, schedule, status, next_publish_at, created_at`,
      [
        userId, topic, context, toneOfVoice, writingStyle,
            JSON.stringify(imperfectionList), finalSchedule, wordpressSiteId, nextPublishAt
      ]
    );
      } else {
        throw error;
      }
    }

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
      message: 'Failed to create campaign',
      details: error.message
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
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    // Start transaction
    await client.query('BEGIN');

    // Check if campaign exists and belongs to user
    const existingCampaign = await client.query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (existingCampaign.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // Manually delete related records first to avoid constraint issues
    try {
      // Delete from logs table
      await client.query('DELETE FROM logs WHERE campaign_id = $1', [campaignId]);
      logger.info('Deleted logs for campaign:', campaignId);
    } catch (error) {
      logger.warn('Could not delete logs:', error.message);
    }

    try {
      // Delete from content_queue table
      await client.query('DELETE FROM content_queue WHERE campaign_id = $1', [campaignId]);
      logger.info('Deleted content_queue for campaign:', campaignId);
    } catch (error) {
      logger.warn('Could not delete content_queue:', error.message);
    }

    try {
      // Delete from title_queue table
      await client.query('DELETE FROM title_queue WHERE campaign_id = $1', [campaignId]);
      logger.info('Deleted title_queue for campaign:', campaignId);
    } catch (error) {
      logger.warn('Could not delete title_queue:', error.message);
    }

    // Now delete the campaign itself
    await client.query('DELETE FROM campaigns WHERE id = $1', [campaignId]);
    logger.info('Deleted campaign:', campaignId);

    // Log the deletion
    try {
      await client.query(
        `INSERT INTO logs (user_id, event_type, message, severity)
         VALUES ($1, 'campaign_deleted', 'Campaign deleted', 'info')`,
        [userId]
      );
    } catch (error) {
      logger.warn('Could not log campaign deletion:', error.message);
    }

    // Commit transaction
    await client.query('COMMIT');

    logger.info('Campaign deleted successfully:', { userId, campaignId });

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('Delete campaign error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete campaign',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
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
 * POST /api/campaigns/:id/trigger
 * Manually trigger campaign processing
 */
router.post('/:id/trigger', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    // Get campaign details
    const campaignResult = await query(
      `SELECT c.*, ws.site_name, ws.site_url, ws.username, ws.password_encrypted, ws.api_endpoint
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

    // Import queue processor
    const queueProcessor = require('../services/queueProcessor');
    
    // Process the campaign immediately
    await queueProcessor.processCampaign(campaign);

    // Log manual trigger
    await query(
      `INSERT INTO logs (user_id, campaign_id, event_type, message, severity)
       VALUES ($1, $2, 'manual_trigger', 'Campaign manually triggered for processing', 'info')`,
      [userId, campaignId]
    );

    logger.info('Campaign manually triggered:', { userId, campaignId });

    res.json({
      message: 'Campaign processing triggered successfully'
    });

  } catch (error) {
    logger.error('Manual trigger error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to trigger campaign processing',
      details: error.message
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
