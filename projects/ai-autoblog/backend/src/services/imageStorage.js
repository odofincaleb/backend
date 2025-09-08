const axios = require('axios');
const FormData = require('form-data');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

class ImageStorage {
  /**
   * Download image from URL and upload to WordPress media library
   * @param {string} imageUrl - URL of the image to download
   * @param {Object} wordpressSite - WordPress site configuration
   * @param {string} filename - Desired filename for the image
   * @returns {Object} Upload result with WordPress media ID and URL
   */
  async uploadToWordPress(imageUrl, wordpressSite, filename = 'featured-image.jpg') {
    try {
      logger.info(`Uploading image to WordPress: ${wordpressSite.site_name}`);

      // Download the image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'stream',
        timeout: 30000
      });

      // Create form data for WordPress upload
      const formData = new FormData();
      formData.append('file', imageResponse.data, {
        filename: filename,
        contentType: imageResponse.headers['content-type'] || 'image/jpeg'
      });

      // Decrypt WordPress credentials
      const decryptedPassword = decrypt(wordpressSite.password_encrypted);

      // Upload to WordPress media library
      const uploadResponse = await axios.post(
        `${wordpressSite.api_endpoint}/media`,
        formData,
        {
          auth: {
            username: wordpressSite.username,
            password: decryptedPassword
          },
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000
        }
      );

      const mediaData = uploadResponse.data;
      
      logger.info(`Successfully uploaded image to WordPress: ${mediaData.source_url}`);

      return {
        success: true,
        mediaId: mediaData.id,
        mediaUrl: mediaData.source_url,
        thumbnailUrl: mediaData.media_details?.sizes?.medium?.source_url || mediaData.source_url,
        altText: mediaData.alt_text || filename,
        uploadedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('WordPress image upload failed:', error);
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        
        if (status === 401) {
          throw new Error('WordPress authentication failed for image upload');
        } else if (status === 413) {
          throw new Error('Image file too large for WordPress upload');
        } else {
          throw new Error(`WordPress upload error (${status}): ${message}`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to WordPress for image upload');
      } else {
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate a unique filename for the image
   * @param {string} campaignTopic - Campaign topic for filename
   * @param {string} extension - File extension (default: jpg)
   * @returns {string} Unique filename
   */
  generateFilename(campaignTopic, extension = 'jpg') {
    const timestamp = Date.now();
    const sanitizedTopic = campaignTopic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    return `featured-${sanitizedTopic}-${timestamp}.${extension}`;
  }

  /**
   * Get image metadata from URL
   * @param {string} imageUrl - URL of the image
   * @returns {Object} Image metadata
   */
  async getImageMetadata(imageUrl) {
    try {
      const response = await axios.head(imageUrl, { timeout: 10000 });
      
      return {
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        lastModified: response.headers['last-modified']
      };
    } catch (error) {
      logger.warn('Could not get image metadata:', error.message);
      return {
        contentType: 'image/jpeg',
        contentLength: null,
        lastModified: null
      };
    }
  }

  /**
   * Validate image before upload
   * @param {string} imageUrl - URL of the image
   * @returns {Object} Validation result
   */
  async validateImage(imageUrl) {
    try {
      const metadata = await this.getImageMetadata(imageUrl);
      
      // Check if it's a valid image type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(metadata.contentType)) {
        return {
          valid: false,
          error: `Invalid image type: ${metadata.contentType}`
        };
      }

      // Check file size (WordPress typically limits to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (metadata.contentLength && parseInt(metadata.contentLength) > maxSize) {
        return {
          valid: false,
          error: 'Image file too large (max 10MB)'
        };
      }

      return {
        valid: true,
        metadata
      };

    } catch (error) {
      return {
        valid: false,
        error: `Image validation failed: ${error.message}`
      };
    }
  }

  /**
   * Delete image from WordPress media library
   * @param {number} mediaId - WordPress media ID
   * @param {Object} wordpressSite - WordPress site configuration
   * @returns {Object} Deletion result
   */
  async deleteFromWordPress(mediaId, wordpressSite) {
    try {
      const decryptedPassword = decrypt(wordpressSite.password_encrypted);

      await axios.delete(
        `${wordpressSite.api_endpoint}/media/${mediaId}?force=true`,
        {
          auth: {
            username: wordpressSite.username,
            password: decryptedPassword
          },
          timeout: 30000
        }
      );

      logger.info(`Successfully deleted image from WordPress: ${mediaId}`);

      return {
        success: true,
        message: 'Image deleted successfully'
      };

    } catch (error) {
      logger.error('WordPress image deletion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get WordPress media library info
   * @param {Object} wordpressSite - WordPress site configuration
   * @returns {Object} Media library info
   */
  async getMediaLibraryInfo(wordpressSite) {
    try {
      const decryptedPassword = decrypt(wordpressSite.password_encrypted);

      const response = await axios.get(
        `${wordpressSite.api_endpoint}/media?per_page=1`,
        {
          auth: {
            username: wordpressSite.username,
            password: decryptedPassword
          },
          timeout: 10000
        }
      );

      const totalMedia = response.headers['x-wp-total'] || 0;
      const totalPages = response.headers['x-wp-totalpages'] || 0;

      return {
        success: true,
        totalMedia: parseInt(totalMedia),
        totalPages: parseInt(totalPages)
      };

    } catch (error) {
      logger.error('Failed to get WordPress media library info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ImageStorage();
