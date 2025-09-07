const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  email: Joi.string().email()
});

const apiKeysSchema = Joi.object({
  openaiKey: Joi.string().required(),
  dalleKey: Joi.string().optional()
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    if (value.firstName) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(value.firstName);
    }
    if (value.lastName) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(value.lastName);
    }
    if (value.email) {
      // Check if email is already taken
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [value.email, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'This email is already associated with another account'
        });
      }
      updates.push(`email = $${paramCount++}`);
      values.push(value.email);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'At least one field must be provided for update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, subscription_tier, created_at, updated_at
    `;

    const result = await query(updateQuery, values);
    const user = result.rows[0];

    // Log profile update
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity)
       VALUES ($1, 'profile_updated', 'User updated profile', 'info')`,
      [userId]
    );

    logger.info('User profile updated:', { userId, updates: Object.keys(value) });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * POST /api/users/api-keys
 * Add or update user API keys
 */
router.post('/api-keys', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = apiKeysSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const { openaiKey, dalleKey } = value;

    // Encrypt API keys
    const encryptedOpenaiKey = encrypt(openaiKey);
    const encryptedDalleKey = dalleKey ? encrypt(dalleKey) : null;

    // Update user's API keys
    await query(
      `UPDATE users 
       SET openai_key_encrypted = $1, 
           dalle_key_encrypted = $2, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [encryptedOpenaiKey, encryptedDalleKey, userId]
    );

    // Log API key update
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity)
       VALUES ($1, 'api_keys_updated', 'User updated API keys', 'info')`,
      [userId]
    );

    logger.info('User API keys updated:', { userId });

    res.json({
      message: 'API keys updated successfully'
    });

  } catch (error) {
    logger.error('Update API keys error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update API keys'
    });
  }
});

/**
 * GET /api/users/api-keys
 * Get user's API key status (without revealing the keys)
 */
router.get('/api-keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT openai_key_encrypted, dalle_key_encrypted 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const hasOpenaiKey = !!user.openai_key_encrypted;
    const hasDalleKey = !!user.dalle_key_encrypted;

    res.json({
      hasOpenaiKey,
      hasDalleKey,
      keysConfigured: hasOpenaiKey && hasDalleKey
    });

  } catch (error) {
    logger.error('Get API keys error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get API key status'
    });
  }
});

/**
 * DELETE /api/users/api-keys
 * Remove user's API keys
 */
router.delete('/api-keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove API keys
    await query(
      `UPDATE users 
       SET openai_key_encrypted = NULL, 
           dalle_key_encrypted = NULL, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [userId]
    );

    // Log API key removal
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity)
       VALUES ($1, 'api_keys_removed', 'User removed API keys', 'info')`,
      [userId]
    );

    logger.info('User API keys removed:', { userId });

    res.json({
      message: 'API keys removed successfully'
    });

  } catch (error) {
    logger.error('Remove API keys error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove API keys'
    });
  }
});

/**
 * GET /api/users/subscription-status
 * Get user's subscription status and usage
 */
router.get('/subscription-status', authenticateToken, async (req, res) => {
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

    // Calculate limits based on subscription tier
    let postsLimit, postsRemaining;
    if (user.subscription_tier === 'trial') {
      postsLimit = 5;
      postsRemaining = Math.max(0, postsLimit - user.total_posts_published);
    } else if (user.subscription_tier === 'hobbyist') {
      postsLimit = 25;
      postsRemaining = Math.max(0, postsLimit - user.posts_published_this_month);
    } else {
      postsLimit = null; // unlimited
      postsRemaining = null;
    }

    res.json({
      subscription: {
        tier: user.subscription_tier,
        supportTier: user.support_tier,
        maxCampaigns: user.max_concurrent_campaigns,
        createdAt: user.created_at
      },
      usage: {
        postsPublishedThisMonth: user.posts_published_this_month,
        totalPostsPublished: user.total_posts_published,
        activeCampaigns,
        postsLimit,
        postsRemaining
      }
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

