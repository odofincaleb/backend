const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken, checkCampaignLimit } = require('../middleware/auth');
const logger = require('../utils/logger');
const contentTypeTemplates = require('../services/contentTypeTemplates');

const router = express.Router();

// Get available content types
router.get('/content-types', authenticateToken, (req, res) => {
  try {
    logger.info('Getting content types');
    const contentTypes = contentTypeTemplates.getAllContentTypes();
    
    if (!contentTypes || Object.keys(contentTypes).length === 0) {
      logger.error('No content types found');
      return res.status(500).json({
        error: 'Server error',
        message: 'No content types available'
      });
    }

    logger.info(`Found ${Object.keys(contentTypes).length} content types`);
    res.json({
      success: true,
      contentTypes
    });
  } catch (error) {
    logger.error('Error getting content types:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to get content types',
      details: error.message
    });
  }
});

// Rest of the file remains the same...

// Export the router
module.exports = router;