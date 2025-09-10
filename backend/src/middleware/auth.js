const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await query(
      'SELECT id, email, subscription_tier, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token - user not found'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscription_tier
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Check if user has required subscription tier
 */
const requireSubscription = (requiredTier) => {
  const tierLevels = {
    'trial': 0,
    'hobbyist': 1,
    'professional': 2
  };

  return (req, res, next) => {
    const userTier = req.user.subscriptionTier;
    const userLevel = tierLevels[userTier] || 0;
    const requiredLevel = tierLevels[requiredTier] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient subscription',
        message: `This feature requires ${requiredTier} subscription or higher`,
        currentTier: userTier,
        requiredTier: requiredTier
      });
    }

    next();
  };
};

/**
 * Check if user has reached their post limit
 */
const checkPostLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user's subscription details
    const result = await query(
      `SELECT subscription_tier, posts_published_this_month, total_posts_published 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check trial limit (5 posts total)
    if (user.subscription_tier === 'trial' && user.total_posts_published >= 5) {
      return res.status(403).json({
        error: 'Trial limit reached',
        message: 'You have reached your trial limit of 5 posts. Please upgrade to continue.',
        totalPosts: user.total_posts_published,
        limit: 5
      });
    }

    // Check monthly limit for paid tiers
    if (user.subscription_tier === 'hobbyist' && user.posts_published_this_month >= 25) {
      return res.status(403).json({
        error: 'Monthly limit reached',
        message: 'You have reached your monthly limit of 25 posts.',
        postsThisMonth: user.posts_published_this_month,
        limit: 25
      });
    }

    next();
  } catch (error) {
    logger.error('Post limit check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check post limits'
    });
  }
};

/**
 * Check if user has reached their campaign limit
 */
const checkCampaignLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user's campaign count and limits
    const result = await query(
      `SELECT u.subscription_tier, u.max_concurrent_campaigns,
              COUNT(c.id) as active_campaigns
       FROM users u
       LEFT JOIN campaigns c ON u.id = c.user_id AND c.status = 'active'
       WHERE u.id = $1
       GROUP BY u.id, u.subscription_tier, u.max_concurrent_campaigns`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    if (user.active_campaigns >= user.max_concurrent_campaigns) {
      return res.status(403).json({
        error: 'Campaign limit reached',
        message: `You can have a maximum of ${user.max_concurrent_campaigns} active campaigns with your ${user.subscription_tier} subscription.`,
        activeCampaigns: user.active_campaigns,
        maxCampaigns: user.max_concurrent_campaigns
      });
    }

    next();
  } catch (error) {
    logger.error('Campaign limit check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check campaign limits'
    });
  }
};

module.exports = {
  authenticateToken,
  requireSubscription,
  checkPostLimit,
  checkCampaignLimit
};

