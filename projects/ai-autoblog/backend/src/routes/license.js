const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const activateLicenseSchema = Joi.object({
  licenseKey: Joi.string().required()
});

/**
 * POST /api/license/activate
 * Activate a license key
 */
router.post('/activate', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = activateLicenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const { licenseKey } = value;

    // Find the license key
    const licenseResult = await query(
      `SELECT id, subscription_tier, posts_per_month, max_campaigns, support_tier, status, user_id
       FROM license_keys WHERE license_key = $1`,
      [licenseKey]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invalid license key',
        message: 'The provided license key does not exist'
      });
    }

    const license = licenseResult.rows[0];

    // Check if license is already used
    if (license.status === 'used') {
      return res.status(409).json({
        error: 'License already used',
        message: 'This license key has already been activated'
      });
    }

    // Check if license is expired
    if (license.status === 'expired') {
      return res.status(410).json({
        error: 'License expired',
        message: 'This license key has expired'
      });
    }

    // Check if license is revoked
    if (license.status === 'revoked') {
      return res.status(403).json({
        error: 'License revoked',
        message: 'This license key has been revoked'
      });
    }

    // Check if user already has a license
    const userResult = await query(
      'SELECT license_key_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].license_key_id) {
      return res.status(409).json({
        error: 'License already active',
        message: 'You already have an active license. Please contact support to change your license.'
      });
    }

    // Activate the license
    const client = await query.getClient();
    try {
      await client.query('BEGIN');

      // Update user's subscription
      await client.query(
        `UPDATE users 
         SET subscription_tier = $1, 
             max_concurrent_campaigns = $2, 
             support_tier = $3,
             license_key_id = $4,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $5`,
        [license.subscription_tier, license.max_campaigns, license.support_tier, license.id, userId]
      );

      // Mark license as used
      await client.query(
        `UPDATE license_keys 
         SET status = 'used', 
             user_id = $1, 
             used_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [userId, license.id]
      );

      await client.query('COMMIT');

      // Log license activation
      await query(
        `INSERT INTO logs (user_id, event_type, message, severity, metadata)
         VALUES ($1, 'license_activated', 'User activated license key', 'info', $2)`,
        [userId, JSON.stringify({ 
          licenseKey: licenseKey.substring(0, 8) + '...', 
          subscriptionTier: license.subscription_tier 
        })]
      );

      logger.info('License activated:', { 
        userId, 
        licenseId: license.id, 
        subscriptionTier: license.subscription_tier 
      });

      res.json({
        message: 'License activated successfully',
        subscription: {
          tier: license.subscription_tier,
          maxCampaigns: license.max_campaigns,
          supportTier: license.support_tier,
          postsPerMonth: license.posts_per_month
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('License activation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to activate license'
    });
  }
});

/**
 * GET /api/license/status
 * Get current license status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT u.subscription_tier, u.max_concurrent_campaigns, u.support_tier,
              lk.license_key, lk.subscription_tier as license_tier, lk.used_at, lk.expires_at
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

    res.json({
      subscription: {
        tier: user.subscription_tier,
        maxCampaigns: user.max_concurrent_campaigns,
        supportTier: user.support_tier
      },
      license: user.license_key ? {
        key: user.license_key.substring(0, 8) + '...',
        tier: user.license_tier,
        activatedAt: user.used_at,
        expiresAt: user.expires_at
      } : null
    });

  } catch (error) {
    logger.error('Get license status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get license status'
    });
  }
});

/**
 * GET /api/subscription/status
 * Get detailed subscription status and usage
 */
router.get('/subscription/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT subscription_tier, posts_published_this_month, total_posts_published,
              max_concurrent_campaigns, support_tier, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get active campaigns count
    const campaignResult = await query(
      `SELECT COUNT(*) as count FROM campaigns WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const activeCampaigns = parseInt(campaignResult.rows[0].count);

    // Calculate usage and limits
    let usage = {
      postsPublishedThisMonth: user.posts_published_this_month,
      totalPostsPublished: user.total_posts_published,
      activeCampaigns,
      maxCampaigns: user.max_concurrent_campaigns
    };

    // Add tier-specific limits
    if (user.subscription_tier === 'trial') {
      usage.postsLimit = 5;
      usage.postsRemaining = Math.max(0, 5 - user.total_posts_published);
      usage.isTrial = true;
    } else if (user.subscription_tier === 'hobbyist') {
      usage.postsLimit = 25;
      usage.postsRemaining = Math.max(0, 25 - user.posts_published_this_month);
      usage.isTrial = false;
    } else if (user.subscription_tier === 'professional') {
      usage.postsLimit = null; // unlimited
      usage.postsRemaining = null;
      usage.isTrial = false;
    }

    res.json({
      subscription: {
        tier: user.subscription_tier,
        supportTier: user.support_tier,
        createdAt: user.created_at
      },
      usage
    });

  } catch (error) {
    logger.error('Get subscription status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get subscription status'
    });
  }
});

module.exports = router;

