const express = require('express');
const Joi = require('joi');
const axios = require('axios');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const imageStorage = require('../services/imageStorage');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const addSiteSchema = Joi.object({
  siteName: Joi.string().min(2).max(255).required(),
  siteUrl: Joi.string().uri().required(),
  username: Joi.string().min(1).max(255).required(),
  password: Joi.string().min(1).max(255).required(),
  skipConnectionTest: Joi.boolean().optional()
});

const updateSiteSchema = Joi.object({
  siteName: Joi.string().min(2).max(255),
  siteUrl: Joi.string().uri(),
  username: Joi.string().min(1).max(255),
  password: Joi.string().min(1).max(255)
});

/**
 * GET /api/wordpress/sites
 * Get all WordPress sites for the user
 */
router.get('/sites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, site_name, site_url, username, is_active, created_at, updated_at
       FROM wordpress_sites 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const sites = result.rows.map(site => ({
      id: site.id,
      siteName: site.site_name,
      siteUrl: site.site_url,
      username: site.username,
      isActive: site.is_active,
      createdAt: site.created_at,
      updatedAt: site.updated_at
    }));

    res.json({
      sites
    });

  } catch (error) {
    logger.error('Get WordPress sites error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get WordPress sites'
    });
  }
});

/**
 * GET /api/wordpress/sites/:id
 * Get a specific WordPress site
 */
router.get('/sites/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const siteId = req.params.id;

    const result = await query(
      `SELECT id, site_name, site_url, username, is_active, created_at, updated_at
       FROM wordpress_sites 
       WHERE id = $1 AND user_id = $2`,
      [siteId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'WordPress site not found'
      });
    }

    const site = result.rows[0];

    res.json({
      site: {
        id: site.id,
        siteName: site.site_name,
        siteUrl: site.site_url,
        username: site.username,
        isActive: site.is_active,
        createdAt: site.created_at,
        updatedAt: site.updated_at
      }
    });

  } catch (error) {
    logger.error('Get WordPress site error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get WordPress site'
    });
  }
});

/**
 * POST /api/wordpress/sites
 * Add a new WordPress site
 */
router.post('/sites', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = addSiteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const { siteName, siteUrl, username, password } = value;

    // Normalize URL
    const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    const apiEndpoint = `${normalizedUrl}/wp-json/wp/v2`;

    // Test WordPress connection (optional - can be skipped for testing)
    const skipConnectionTest = req.body.skipConnectionTest === true;
    
    if (!skipConnectionTest) {
    try {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      const response = await axios.get(`${apiEndpoint}/users/me`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (!response.data || !response.data.id) {
        throw new Error('Invalid WordPress credentials');
      }

    } catch (connectionError) {
      logger.error('WordPress connection test failed:', connectionError.message);
      return res.status(400).json({
        error: 'Connection failed',
          message: 'Unable to connect to WordPress site. Please check your credentials and site URL. You can skip this test by setting skipConnectionTest: true in the request body.'
      });
      }
    } else {
      logger.info('Skipping WordPress connection test as requested');
    }

    // Encrypt password
    const encryptedPassword = encrypt(password);

    // Create WordPress site
    const result = await query(
      `INSERT INTO wordpress_sites (
        user_id, site_name, site_url, username, password_encrypted, api_endpoint
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, site_name, site_url, username, is_active, created_at`,
      [userId, siteName, normalizedUrl, username, encryptedPassword, apiEndpoint]
    );

    const site = result.rows[0];

    // Log site addition
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity, metadata)
       VALUES ($1, 'wordpress_site_added', 'WordPress site added', 'info', $2)`,
      [userId, JSON.stringify({ siteName, siteUrl: normalizedUrl })]
    );

    logger.info('WordPress site added:', { userId, siteId: site.id, siteName });

    res.status(201).json({
      message: 'WordPress site added successfully',
      site: {
        id: site.id,
        siteName: site.site_name,
        siteUrl: site.site_url,
        username: site.username,
        isActive: site.is_active,
        createdAt: site.created_at
      }
    });

  } catch (error) {
    logger.error('Add WordPress site error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add WordPress site'
    });
  }
});

/**
 * PUT /api/wordpress/sites/:id
 * Update a WordPress site
 */
router.put('/sites/:id', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateSiteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const userId = req.user.id;
    const siteId = req.params.id;

    // Check if site exists and belongs to user
    const existingSite = await query(
      'SELECT id, site_url, username FROM wordpress_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (existingSite.rows.length === 0) {
      return res.status(404).json({
        error: 'WordPress site not found'
      });
    }

    const currentSite = existingSite.rows[0];
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build update query
    if (value.siteName) {
      updates.push(`site_name = $${paramCount++}`);
      values.push(value.siteName);
    }
    if (value.siteUrl) {
      const normalizedUrl = value.siteUrl.endsWith('/') ? value.siteUrl.slice(0, -1) : value.siteUrl;
      updates.push(`site_url = $${paramCount++}`);
      values.push(normalizedUrl);
      updates.push(`api_endpoint = $${paramCount++}`);
      values.push(`${normalizedUrl}/wp-json/wp/v2`);
    }
    if (value.username) {
      updates.push(`username = $${paramCount++}`);
      values.push(value.username);
    }
    if (value.password) {
      const encryptedPassword = encrypt(value.password);
      updates.push(`password_encrypted = $${paramCount++}`);
      values.push(encryptedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided'
      });
    }

    // Test connection if credentials were updated
    if (value.username || value.password || value.siteUrl) {
      const testUrl = value.siteUrl ? 
        (value.siteUrl.endsWith('/') ? value.siteUrl.slice(0, -1) : value.siteUrl) : 
        currentSite.site_url;
      const testUsername = value.username || currentSite.username;
      const testPassword = value.password || '';

      if (value.password) { // Only test if password was provided
        try {
          const auth = Buffer.from(`${testUsername}:${testPassword}`).toString('base64');
          const response = await axios.get(`${testUrl}/wp-json/wp/v2/users/me`, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          if (!response.data || !response.data.id) {
            throw new Error('Invalid WordPress credentials');
          }

        } catch (connectionError) {
          logger.error('WordPress connection test failed:', connectionError.message);
          return res.status(400).json({
            error: 'Connection failed',
            message: 'Unable to connect to WordPress site. Please check your credentials and site URL.'
          });
        }
      }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(siteId);

    const updateQuery = `
      UPDATE wordpress_sites 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, site_name, site_url, username, is_active, updated_at
    `;

    const result = await query(updateQuery, values);
    const site = result.rows[0];

    // Log site update
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity, metadata)
       VALUES ($1, 'wordpress_site_updated', 'WordPress site updated', 'info', $2)`,
      [userId, JSON.stringify({ siteId, updates: Object.keys(value) })]
    );

    logger.info('WordPress site updated:', { userId, siteId, updates: Object.keys(value) });

    res.json({
      message: 'WordPress site updated successfully',
      site: {
        id: site.id,
        siteName: site.site_name,
        siteUrl: site.site_url,
        username: site.username,
        isActive: site.is_active,
        updatedAt: site.updated_at
      }
    });

  } catch (error) {
    logger.error('Update WordPress site error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update WordPress site'
    });
  }
});

/**
 * DELETE /api/wordpress/sites/:id
 * Delete a WordPress site
 */
router.delete('/sites/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const siteId = req.params.id;

    // Check if site exists and belongs to user
    const existingSite = await query(
      'SELECT id, site_name FROM wordpress_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (existingSite.rows.length === 0) {
      return res.status(404).json({
        error: 'WordPress site not found'
      });
    }

    // Check if site is used by any campaigns
    const campaignCheck = await query(
      'SELECT COUNT(*) as count FROM campaigns WHERE wordpress_site_id = $1',
      [siteId]
    );

    if (parseInt(campaignCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Site in use',
        message: 'This WordPress site is being used by one or more campaigns. Please remove it from campaigns first.'
      });
    }

    // Delete site
    await query('DELETE FROM wordpress_sites WHERE id = $1', [siteId]);

    // Log site deletion
    await query(
      `INSERT INTO logs (user_id, event_type, message, severity, metadata)
       VALUES ($1, 'wordpress_site_deleted', 'WordPress site deleted', 'info', $2)`,
      [userId, JSON.stringify({ siteId, siteName: existingSite.rows[0].site_name })]
    );

    logger.info('WordPress site deleted:', { userId, siteId });

    res.json({
      message: 'WordPress site deleted successfully'
    });

  } catch (error) {
    logger.error('Delete WordPress site error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete WordPress site'
    });
  }
});

/**
 * POST /api/wordpress/sites/:id/test
 * Test WordPress site connection
 */
router.post('/sites/:id/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const siteId = req.params.id;

    // Get site details
    const result = await query(
      `SELECT site_url, username, password_encrypted, api_endpoint
       FROM wordpress_sites 
       WHERE id = $1 AND user_id = $2`,
      [siteId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'WordPress site not found'
      });
    }

    const site = result.rows[0];
    const password = decrypt(site.password_encrypted);

    // Test connection
    try {
      const auth = Buffer.from(`${site.username}:${password}`).toString('base64');
      const response = await axios.get(`${site.api_endpoint}/users/me`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.id) {
        res.json({
          message: 'Connection successful',
          user: {
            id: response.data.id,
            name: response.data.name,
            email: response.data.email
          }
        });
      } else {
        throw new Error('Invalid response from WordPress');
      }

    } catch (connectionError) {
      logger.error('WordPress connection test failed:', connectionError.message);
      res.status(400).json({
        error: 'Connection failed',
        message: 'Unable to connect to WordPress site. Please check your credentials and site URL.'
      });
    }

  } catch (error) {
    logger.error('Test WordPress connection error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to test WordPress connection'
    });
  }
});

/**
 * POST /api/wordpress/sites/:id/test-image-upload
 * Test image upload to WordPress media library
 */
router.post('/sites/:id/test-image-upload', authenticateToken, async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;

    // Get WordPress site
    const siteResult = await query(
      'SELECT * FROM wordpress_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'WordPress site not found',
        message: 'The specified WordPress site does not exist or does not belong to you'
      });
    }

    const wordpressSite = siteResult.rows[0];

    // Test image upload with a sample image
    const testImageUrl = 'https://picsum.photos/800/600'; // Random test image
    const filename = `test-upload-${Date.now()}.jpg`;

    try {
      const uploadResult = await imageStorage.uploadToWordPress(
        testImageUrl,
        wordpressSite,
        filename
      );

      res.json({
        message: 'Image upload test successful',
        result: uploadResult
      });

    } catch (uploadError) {
      res.status(400).json({
        error: 'Image upload test failed',
        message: uploadError.message
      });
    }

  } catch (error) {
    logger.error('Test image upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to test image upload'
    });
  }
});

/**
 * GET /api/wordpress/sites/:id/media-info
 * Get WordPress media library information
 */
router.get('/sites/:id/media-info', authenticateToken, async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;

    // Get WordPress site
    const siteResult = await query(
      'SELECT * FROM wordpress_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'WordPress site not found',
        message: 'The specified WordPress site does not exist or does not belong to you'
      });
    }

    const wordpressSite = siteResult.rows[0];

    // Get media library info
    const mediaInfo = await imageStorage.getMediaLibraryInfo(wordpressSite);

    res.json({
      message: 'Media library info retrieved successfully',
      mediaInfo
    });

  } catch (error) {
    logger.error('Get media info error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get media library information'
    });
  }
});

module.exports = router;

