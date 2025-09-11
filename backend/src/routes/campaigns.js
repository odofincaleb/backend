const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
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
  imperfectionList: Joi.array().items(Joi.string()).default([]),
  schedule: Joi.string()
    .optional()
    .description('Schedule in hours with optional h suffix (e.g., 0.10, 0.50, 1.00, 24.00)')
    .custom((value, helpers) => {
      if (!value) return value;
      // Remove 'h' suffix if present
      const cleanValue = value.toLowerCase().replace(/h$/, '');
      const hours = Number(cleanValue);
      if (isNaN(hours)) {
        return helpers.error('string.schedule');
      }
      if (hours < 0.1 || hours > 168) {
        return helpers.error('string.schedule');
      }
      // Format with exactly 2 decimal places
      return hours.toFixed(2) + 'h';
    }),
  scheduleHours: Joi.number()
    .min(0.1)
    .max(168)
    .custom((value, helpers) => {
      if (value === undefined || value === null) return value;
      const hours = Number(Number(value).toFixed(2));
      if (isNaN(hours)) {
        return helpers.error('number.base');
      }
      if (hours < 0.1) {
        return helpers.error('number.min', { limit: 0.1 });
      }
      if (hours > 168) {
        return helpers.error('number.max', { limit: 168 });
      }
      return hours;
    }, 'validate schedule hours')
    .optional()
    .description('Custom schedule in hours (0.10 to 168.00). Supports fractional hours like 0.10, 0.50, 1.00, etc.'),
  numberOfTitles: Joi.number().min(1).max(20).default(5), // Number of titles to generate
  wordpressSiteId: Joi.string().uuid().optional(),
  contentTypes: Joi.array().items(Joi.string()).max(5).optional(),
  contentTypeVariables: Joi.object().optional()
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
  'string.schedule': 'Invalid schedule format or value. Must be a number between 0.10 and 168.00 with optional "h" suffix.',
  'number.min': 'Schedule hours must be at least {{limit}}',
  'number.max': 'Schedule hours cannot exceed {{limit}}',
  'custom.contentTypesInvalid': '{{#message}}'
});

const updateCampaignSchema = Joi.object({
  topic: Joi.string().min(3).max(255),
  context: Joi.string().min(10).max(2000),
  toneOfVoice: Joi.string().valid('conversational', 'formal', 'humorous', 'storytelling'),
  writingStyle: Joi.string().valid('pas', 'aida', 'listicle'),
  imperfectionList: Joi.array().items(Joi.string()),
  schedule: Joi.string()
    .optional()
    .description('Schedule in hours with optional h suffix (e.g., 0.10, 0.50, 1.00, 24.00)')
    .custom((value, helpers) => {
      if (!value) return value;
      // Remove 'h' suffix if present
      const cleanValue = value.toLowerCase().replace(/h$/, '');
      const hours = Number(cleanValue);
      if (isNaN(hours)) {
        return helpers.error('string.schedule');
      }
      if (hours < 0.1 || hours > 168) {
        return helpers.error('string.schedule');
      }
      // Format with exactly 2 decimal places
      return hours.toFixed(2) + 'h';
    }),
  scheduleHours: Joi.number()
    .min(0.1)
    .max(168)
    .custom((value, helpers) => {
      if (value === undefined || value === null) return value;
      const hours = Number(Number(value).toFixed(2));
      if (isNaN(hours)) {
        return helpers.error('number.base');
      }
      if (hours < 0.1) {
        return helpers.error('number.min', { limit: 0.1 });
      }
      if (hours > 168) {
        return helpers.error('number.max', { limit: 168 });
      }
      return hours;
    }, 'validate schedule hours')
    .optional()
    .description('Custom schedule in hours (0.10 to 168.00). Supports fractional hours like 0.10, 0.50, 1.00, etc.'),
  numberOfTitles: Joi.number().min(1).max(20).optional(), // Number of titles to generate
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
  'string.schedule': 'Invalid schedule format or value. Must be a number between 0.10 and 168.00 with optional "h" suffix.',
  'number.min': 'Schedule hours must be at least {{limit}}',
  'number.max': 'Schedule hours cannot exceed {{limit}}',
  'custom.contentTypesInvalid': '{{#message}}'
});

// Get all campaigns for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT c.*, 
        w.site_name as wordpress_site_name,
        w.site_url as wordpress_site_url
      FROM campaigns c
      LEFT JOIN wordpress_sites w ON c.wordpress_site_id = w.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      campaigns: result.rows
    });
  } catch (error) {
    logger.error('Error getting campaigns:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to get campaigns'
    });
  }
});

// Get a specific campaign by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    const result = await query(
      `SELECT c.*, 
        w.site_name as wordpress_site_name,
        w.site_url as wordpress_site_url
      FROM campaigns c
      LEFT JOIN wordpress_sites w ON c.wordpress_site_id = w.id
      WHERE c.id = $1 AND c.user_id = $2`,
      [campaignId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: result.rows[0]
    });
  } catch (error) {
    logger.error('Error getting campaign:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to get campaign'
    });
  }
});

// Create a new campaign
router.post('/', authenticateToken, checkCampaignLimit, async (req, res) => {
  try {
    logger.info('Creating new campaign with data:', req.body);
    
    // Validate input
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) {
      logger.error('Campaign validation error:', error);
      logger.error('Validation error details:', error.details);
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message,
        details: error.details
      });
    }
    
    logger.info('Campaign validation passed:', value);

    const userId = req.user.id;
    const {
      topic,
      context,
      toneOfVoice,
      writingStyle,
      imperfectionList,
      schedule,
      scheduleHours,
      numberOfTitles,
      wordpressSiteId,
      contentTypes,
      contentTypeVariables
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

    // Process schedule values
    let finalScheduleHours;
    let finalSchedule;
    
    try {
      // Get hours from either scheduleHours or schedule
      let hours;
      if (scheduleHours !== undefined) {
        hours = Number(scheduleHours);
        if (isNaN(hours)) {
          throw new Error('Invalid schedule hours: not a number');
        }
      } else if (schedule) {
        // Remove 'h' suffix if present
        const cleanSchedule = schedule.toLowerCase().replace(/h$/, '');
        hours = Number(cleanSchedule);
        if (isNaN(hours)) {
          throw new Error('Invalid schedule format. Must be a number like "0.10", "1.00", "24.00"');
        }
      } else {
        throw new Error('Either schedule or scheduleHours must be provided');
      }

      // Validate hours range
      if (hours < 0.1 || hours > 168) {
        throw new Error(`Invalid hours: ${hours} (must be between 0.10 and 168.00)`);
      }

      // Format with exactly 2 decimal places
      finalScheduleHours = Number(hours.toFixed(2));
      finalSchedule = finalScheduleHours.toFixed(2) + 'h';

      logger.info('Processed schedule:', {
        input: { scheduleHours, schedule },
        hours,
        finalScheduleHours,
        finalSchedule
      });
    } catch (error) {
      logger.error('Schedule processing error:', error);
      return res.status(400).json({
        error: 'Validation error',
        message: error.message
      });
    }
    
    // Set default content types if none provided (all 15 types)
    let finalContentTypes = contentTypes;
    if (!finalContentTypes || finalContentTypes.length === 0) {
      finalContentTypes = Object.keys(contentTypeTemplates.getAllContentTypes());
    }
    
    // Set default content type variables if none provided
    let finalContentTypeVariables = contentTypeVariables || {};
    
    const nextPublishAt = new Date(Date.now() + finalScheduleHours * 60 * 60 * 1000);
    logger.info('Calculated next publish time:', nextPublishAt);

    // Start a transaction
    const client = await query.getClient();
    try {
      await client.query('BEGIN');

      // Insert the campaign
      const campaignResult = await client.query(
        `INSERT INTO campaigns (
          user_id, wordpress_site_id, topic, context, tone_of_voice, writing_style,
          imperfection_list, schedule, schedule_hours, number_of_titles,
          content_types, content_type_variables, next_publish_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          userId,
          wordpressSiteId || null,
          topic,
          context,
          toneOfVoice,
          writingStyle,
          JSON.stringify(imperfectionList),
          finalSchedule,
          finalScheduleHours,
          numberOfTitles,
          JSON.stringify(finalContentTypes),
          JSON.stringify(finalContentTypeVariables),
          nextPublishAt
        ]
      );

      // Create initial title queue entries
      const campaign = campaignResult.rows[0];
      const titleQueueValues = Array(numberOfTitles).fill(null).map(() => (
        `('${campaign.id}', 'pending', NOW(), NOW())`
      )).join(',');

      await client.query(`
        INSERT INTO title_queue (campaign_id, status, created_at, updated_at)
        VALUES ${titleQueueValues}
      `);

      await client.query('COMMIT');

      logger.info('Campaign created successfully:', campaign);

      res.status(201).json({
        success: true,
        campaign
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error creating campaign:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to create campaign',
      details: error.message
    });
  }
});

// Update a campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    // Validate input
    const { error, value } = updateCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const {
      topic,
      context,
      toneOfVoice,
      writingStyle,
      imperfectionList,
      schedule,
      scheduleHours,
      numberOfTitles,
      wordpressSiteId,
      status,
      contentTypes,
      contentTypeVariables
    } = value;

    // Build update query dynamically
    const updates = [];
    const values = [campaignId, userId];
    let paramCount = 3;

    if (topic !== undefined) {
      updates.push(`topic = $${paramCount++}`);
      values.push(topic);
    }
    if (context !== undefined) {
      updates.push(`context = $${paramCount++}`);
      values.push(context);
    }
    if (toneOfVoice !== undefined) {
      updates.push(`tone_of_voice = $${paramCount++}`);
      values.push(toneOfVoice);
    }
    if (writingStyle !== undefined) {
      updates.push(`writing_style = $${paramCount++}`);
      values.push(writingStyle);
    }
    if (imperfectionList !== undefined) {
      updates.push(`imperfection_list = $${paramCount++}`);
      values.push(JSON.stringify(imperfectionList));
    }
    if (schedule !== undefined) {
      updates.push(`schedule = $${paramCount++}`);
      values.push(schedule);
    }
    if (scheduleHours !== undefined) {
      updates.push(`schedule_hours = $${paramCount++}`);
      values.push(scheduleHours);
    }
    if (numberOfTitles !== undefined) {
      updates.push(`number_of_titles = $${paramCount++}`);
      values.push(numberOfTitles);
    }
    if (wordpressSiteId !== undefined) {
      updates.push(`wordpress_site_id = $${paramCount++}`);
      values.push(wordpressSiteId || null);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (contentTypes !== undefined) {
      updates.push(`content_types = $${paramCount++}`);
      values.push(JSON.stringify(contentTypes));
    }
    if (contentTypeVariables !== undefined) {
      updates.push(`content_type_variables = $${paramCount++}`);
      values.push(JSON.stringify(contentTypeVariables));
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No fields to update'
      });
    }

    const result = await query(
      `UPDATE campaigns 
      SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating campaign:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to update campaign'
    });
  }
});

// Delete a campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  const client = await query.getClient();
  try {
    await client.query('BEGIN');

    const userId = req.user.id;
    const campaignId = req.params.id;

    // Log the deletion attempt
    logger.info(`Attempting to delete campaign ${campaignId} for user ${userId}`);

    // First, update any references to this campaign to NULL
    await client.query(
      'UPDATE title_queue SET campaign_id = NULL WHERE campaign_id = $1',
      [campaignId]
    );

    // Then delete the campaign
    const result = await client.query(
      'DELETE FROM campaigns WHERE id = $1 AND user_id = $2 RETURNING id',
      [campaignId, userId]
    );

    await client.query('COMMIT');

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Campaign not found'
      });
    }

    logger.info(`Successfully deleted campaign ${campaignId}`);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting campaign:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to delete campaign'
    });
  } finally {
    client.release();
  }
});

// Get available content types
router.get('/content-types', authenticateToken, async (req, res) => {
  try {
    const contentTypes = contentTypeTemplates.getAllContentTypes();
    res.json({
      success: true,
      contentTypes
    });
  } catch (error) {
    logger.error('Error getting content types:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to get content types'
    });
  }
});

module.exports = router;