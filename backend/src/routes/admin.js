const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken, requireSubscription } = require('../middleware/auth');
const { generateLicenseKey } = require('../utils/encryption');
const campaignScheduler = require('../services/campaignScheduler');
const queueProcessor = require('../services/queueProcessor');
const logger = require('../utils/logger');

const router = express.Router();

// Admin middleware - check if user is admin (for now, we'll use a simple check)
const requireAdmin = (req, res, next) => {
  // In a real app, you'd check for admin role in the database
  if (req.user.email === 'admin@fiddy.com') {
    next();
  } else {
    res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }
};

// Validation schemas
const generateLicenseSchema = Joi.object({
  subscriptionTier: Joi.string().valid('hobbyist', 'professional').required(),
  postsPerMonth: Joi.number().integer().min(1).when('subscriptionTier', {
    is: 'professional',
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  maxCampaigns: Joi.number().integer().min(1).required(),
  supportTier: Joi.string().valid('basic', 'priority').required(),
  expiresAt: Joi.date().optional()
});

const updateLicenseSchema = Joi.object({
  status: Joi.string().valid('active', 'used', 'expired', 'revoked').optional(),
  expiresAt: Joi.date().optional()
});

const updateUserSchema = Joi.object({
  subscriptionTier: Joi.string().valid('trial', 'hobbyist', 'professional').optional(),
  maxConcurrentCampaigns: Joi.number().integer().min(1).optional(),
  supportTier: Joi.string().valid('basic', 'priority').optional(),
  isActive: Joi.boolean().optional()
});

/**
 * POST /api/admin/license-keys
 * Generate a new license key
 */
router.post('/license-keys', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = generateLicenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { subscriptionTier, postsPerMonth, maxCampaigns, supportTier, expiresAt } = value;

    // Generate unique license key
    let licenseKey;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      licenseKey = generateLicenseKey();
      const existingKey = await query(
        'SELECT id FROM license_keys WHERE license_key = $1',
        [licenseKey]
      );
      isUnique = existingKey.rows.length === 0;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        error: 'Failed to generate unique license key',
        message: 'Please try again'
      });
    }

    // Create license key
    const result = await query(
      `INSERT INTO license_keys (
        license_key, subscription_tier, posts_per_month, max_campaigns, support_tier, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [licenseKey, subscriptionTier, postsPerMonth, maxCampaigns, supportTier, expiresAt]
    );

    const newLicense = result.rows[0];

    // Log license key generation
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity, metadata)
       VALUES ($1, 'license_key_generated', 'Admin generated license key', 'info', $2)`,
      [req.user.id, JSON.stringify({ 
        licenseKey: licenseKey.substring(0, 8) + '...', 
        subscriptionTier, 
        maxCampaigns 
      })]
    );

    logger.info('License key generated:', { 
      adminId: req.user.id, 
      licenseId: newLicense.id, 
      subscriptionTier 
    });

    res.status(201).json({
      message: 'License key generated successfully',
      license: {
        id: newLicense.id,
        licenseKey: newLicense.license_key,
        subscriptionTier: newLicense.subscription_tier,
        postsPerMonth: newLicense.posts_per_month,
        maxCampaigns: newLicense.max_campaigns,
        supportTier: newLicense.support_tier,
        status: newLicense.status,
        expiresAt: newLicense.expires_at,
        createdAt: newLicense.created_at
      }
    });

  } catch (error) {
    logger.error('Generate license key error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate license key'
    });
  }
});

/**
 * GET /api/admin/license-keys
 * Get all license keys
 */
router.get('/license-keys', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT lk.*, u.email as user_email, u.first_name, u.last_name
       FROM license_keys lk
       LEFT JOIN users u ON lk.user_id = u.id
       ORDER BY lk.created_at DESC`
    );

    const licenses = result.rows.map(license => ({
      id: license.id,
      licenseKey: license.license_key,
      subscriptionTier: license.subscription_tier,
      postsPerMonth: license.posts_per_month,
      maxCampaigns: license.max_campaigns,
      supportTier: license.support_tier,
      status: license.status,
      user: license.user_email ? {
        email: license.user_email,
        name: `${license.first_name} ${license.last_name}`
      } : null,
      usedAt: license.used_at,
      expiresAt: license.expires_at,
      createdAt: license.created_at
    }));

    res.json({
      licenses
    });

  } catch (error) {
    logger.error('Get license keys error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get license keys'
    });
  }
});

/**
 * PUT /api/admin/license-keys/:id
 * Update a license key
 */
router.put('/license-keys/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateLicenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const licenseId = req.params.id;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build update query
    if (value.status) {
      updates.push(`status = $${paramCount++}`);
      values.push(value.status);
    }
    if (value.expiresAt) {
      updates.push(`expires_at = $${paramCount++}`);
      values.push(value.expiresAt);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided'
      });
    }

    values.push(licenseId);

    const updateQuery = `
      UPDATE license_keys 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'License key not found'
      });
    }

    const license = result.rows[0];

    // Log license update
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity, metadata)
       VALUES ($1, 'license_key_updated', 'Admin updated license key', 'info', $2)`,
      [req.user.id, JSON.stringify({ licenseId, updates: Object.keys(value) })]
    );

    logger.info('License key updated:', { 
      adminId: req.user.id, 
      licenseId, 
      updates: Object.keys(value) 
    });

    res.json({
      message: 'License key updated successfully',
      license: {
        id: license.id,
        licenseKey: license.license_key,
        subscriptionTier: license.subscription_tier,
        status: license.status,
        expiresAt: license.expires_at
      }
    });

  } catch (error) {
    logger.error('Update license key error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update license key'
    });
  }
});

/**
 * DELETE /api/admin/license-keys/:id
 * Delete a license key
 */
router.delete('/license-keys/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const licenseId = req.params.id;

    // Check if license exists
    const existingLicense = await query(
      'SELECT license_key, status FROM license_keys WHERE id = $1',
      [licenseId]
    );

    if (existingLicense.rows.length === 0) {
      return res.status(404).json({
        error: 'License key not found'
      });
    }

    const license = existingLicense.rows[0];

    // Don't allow deletion of used licenses
    if (license.status === 'used') {
      return res.status(409).json({
        error: 'Cannot delete used license',
        message: 'Used licenses cannot be deleted. Revoke them instead.'
      });
    }

    // Delete license key
    await query('DELETE FROM license_keys WHERE id = $1', [licenseId]);

    // Log license deletion
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity, metadata)
       VALUES ($1, 'license_key_deleted', 'Admin deleted license key', 'info', $2)`,
      [req.user.id, JSON.stringify({ 
        licenseKey: license.license_key.substring(0, 8) + '...' 
      })]
    );

    logger.info('License key deleted:', { 
      adminId: req.user.id, 
      licenseId 
    });

    res.json({
      message: 'License key deleted successfully'
    });

  } catch (error) {
    logger.error('Delete license key error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete license key'
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.subscription_tier,
              u.posts_published_this_month, u.total_posts_published, u.is_active,
              u.created_at, lk.license_key
       FROM users u
       LEFT JOIN license_keys lk ON u.license_key_id = lk.id
       ORDER BY u.created_at DESC`
    );

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      subscriptionTier: user.subscription_tier,
      postsPublishedThisMonth: user.posts_published_this_month,
      totalPostsPublished: user.total_posts_published,
      isActive: user.is_active,
      licenseKey: user.license_key ? user.license_key.substring(0, 8) + '...' : null,
      createdAt: user.created_at
    }));

    res.json({
      users
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get users'
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get a specific user
 */
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await query(
      `SELECT u.*, lk.license_key, lk.subscription_tier as license_tier
       FROM users u
       LEFT JOIN license_keys lk ON u.license_key_id = lk.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get user's campaigns
    const campaignsResult = await query(
      `SELECT id, topic, status, created_at FROM campaigns WHERE user_id = $1`,
      [userId]
    );

    // Get user's WordPress sites
    const sitesResult = await query(
      `SELECT id, site_name, site_url, is_active FROM wordpress_sites WHERE user_id = $1`,
      [userId]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        postsPublishedThisMonth: user.posts_published_this_month,
        totalPostsPublished: user.total_posts_published,
        maxConcurrentCampaigns: user.max_concurrent_campaigns,
        supportTier: user.support_tier,
        isActive: user.is_active,
        licenseKey: user.license_key ? user.license_key.substring(0, 8) + '...' : null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        campaigns: campaignsResult.rows,
        wordpressSites: sitesResult.rows
      }
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user'
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update a user
 */
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.params.id;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build update query
    if (value.subscriptionTier) {
      updates.push(`subscription_tier = $${paramCount++}`);
      values.push(value.subscriptionTier);
    }
    if (value.maxConcurrentCampaigns) {
      updates.push(`max_concurrent_campaigns = $${paramCount++}`);
      values.push(value.maxConcurrentCampaigns);
    }
    if (value.supportTier) {
      updates.push(`support_tier = $${paramCount++}`);
      values.push(value.supportTier);
    }
    if (value.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(value.isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Log user update
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity, metadata)
       VALUES ($1, 'user_updated', 'Admin updated user', 'info', $2)`,
      [req.user.id, JSON.stringify({ targetUserId: userId, updates: Object.keys(value) })]
    );

    logger.info('User updated:', { 
      adminId: req.user.id, 
      targetUserId: userId, 
      updates: Object.keys(value) 
    });

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        maxConcurrentCampaigns: user.max_concurrent_campaigns,
        supportTier: user.support_tier,
        isActive: user.is_active,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user'
    });
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get user statistics
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_tier = 'trial' THEN 1 END) as trial_users,
        COUNT(CASE WHEN subscription_tier = 'hobbyist' THEN 1 END) as hobbyist_users,
        COUNT(CASE WHEN subscription_tier = 'professional' THEN 1 END) as professional_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
      FROM users
    `);

    // Get campaign statistics
    const campaignStats = await query(`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_campaigns
      FROM campaigns
    `);

    // Get content statistics
    const contentStats = await query(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as published_posts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_posts
      FROM content_queue
    `);

    // Get license statistics
    const licenseStats = await query(`
      SELECT 
        COUNT(*) as total_licenses,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_licenses,
        COUNT(CASE WHEN status = 'used' THEN 1 END) as used_licenses
      FROM license_keys
    `);

    // Get recent activity
    const recentActivity = await query(`
      SELECT event_type, message, created_at, severity
      FROM logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      users: userStats.rows[0],
      campaigns: campaignStats.rows[0],
      content: contentStats.rows[0],
      licenses: licenseStats.rows[0],
      recentActivity: recentActivity.rows
    });

  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get system statistics'
    });
  }
});

/**
 * GET /api/admin/queue/stats
 * Get content queue statistics
 */
router.get('/queue/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await queueProcessor.getQueueStats();
    
    res.json({
      message: 'Queue statistics retrieved successfully',
      stats
    });

  } catch (error) {
    logger.error('Get queue stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get queue statistics'
    });
  }
});

/**
 * GET /api/admin/queue/activity
 * Get recent queue activity
 */
router.get('/queue/activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activity = await queueProcessor.getRecentActivity(limit);
    
    res.json({
      message: 'Queue activity retrieved successfully',
      activity
    });

  } catch (error) {
    logger.error('Get queue activity error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get queue activity'
    });
  }
});

/**
 * POST /api/admin/queue/process
 * Manually trigger queue processing
 */
router.post('/queue/process', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await campaignScheduler.triggerCampaignProcessing();
    
    if (result.success) {
      res.json({
        message: 'Queue processing triggered successfully',
        result
      });
    } else {
      res.status(500).json({
        error: 'Queue processing failed',
        message: result.message
      });
    }

  } catch (error) {
    logger.error('Trigger queue processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to trigger queue processing'
    });
  }
});

/**
 * GET /api/admin/scheduler/status
 * Get campaign scheduler status
 */
router.get('/scheduler/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = campaignScheduler.getStatus();
    
    res.json({
      message: 'Scheduler status retrieved successfully',
      status
    });

  } catch (error) {
    logger.error('Get scheduler status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get scheduler status'
    });
  }
});

/**
 * POST /api/admin/scheduler/start
 * Start the campaign scheduler
 */
router.post('/scheduler/start', authenticateToken, requireAdmin, async (req, res) => {
  try {
    campaignScheduler.start();
    
    res.json({
      message: 'Campaign scheduler started successfully'
    });

  } catch (error) {
    logger.error('Start scheduler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to start scheduler'
    });
  }
});

/**
 * POST /api/admin/scheduler/stop
 * Stop the campaign scheduler
 */
router.post('/scheduler/stop', authenticateToken, requireAdmin, async (req, res) => {
  try {
    campaignScheduler.stop();
    
    res.json({
      message: 'Campaign scheduler stopped successfully'
    });

  } catch (error) {
    logger.error('Stop scheduler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to stop scheduler'
    });
  }
});

module.exports = router;

