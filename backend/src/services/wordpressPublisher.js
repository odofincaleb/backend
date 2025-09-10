const axios = require('axios');
const { decrypt } = require('../utils/encryption');
const imageStorage = require('./imageStorage');
const logger = require('../utils/logger');

class WordPressPublisher {
  /**
   * Publish content to WordPress site
   * @param {Object} wordpressSite - WordPress site configuration
   * @param {Object} content - Generated content to publish
   * @returns {Object} Publishing result
   */
  async publishContent(wordpressSite, content) {
    try {
      logger.info(`Publishing content to WordPress site: ${wordpressSite.site_name}`);

      // Decrypt the password
      const decryptedPassword = decrypt(wordpressSite.password_encrypted);
      
      // Upload featured image if available
      let featuredImageId = null;
      if (content.featuredImageUrl) {
        try {
          const filename = imageStorage.generateFilename(content.title);
          const uploadResult = await imageStorage.uploadToWordPress(
            content.featuredImageUrl, 
            wordpressSite, 
            filename
          );
          
          if (uploadResult.success) {
            featuredImageId = uploadResult.mediaId;
            logger.info(`Featured image uploaded: ${uploadResult.mediaUrl}`);
          }
        } catch (imageError) {
          logger.warn('Featured image upload failed, continuing without image:', imageError.message);
        }
      }
      
      // Prepare the post data
      const postData = {
        title: content.title,
        content: this.formatContentForWordPress(content.content),
        status: 'publish',
        format: 'standard',
        categories: [1], // Default category
        tags: content.keywords || [],
        featured_media: featuredImageId, // WordPress featured image ID
        meta: {
          _featured_image_url: content.featuredImageUrl || '',
          _generated_at: content.generatedAt,
          _word_count: content.wordCount
        }
      };

      // Make the API request to WordPress
      const response = await axios.post(
        `${wordpressSite.api_endpoint}/posts`,
        postData,
        {
          auth: {
            username: wordpressSite.username,
            password: decryptedPassword
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const publishedPost = response.data;
      
      logger.info(`Successfully published post to WordPress: ${publishedPost.link}`);

      return {
        success: true,
        postId: publishedPost.id,
        postUrl: publishedPost.link,
        postTitle: publishedPost.title.rendered,
        publishedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('WordPress publishing failed:', error);
      
      // Handle specific WordPress errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        
        if (status === 401) {
          throw new Error('WordPress authentication failed. Please check your credentials.');
        } else if (status === 403) {
          throw new Error('WordPress access denied. Please check your permissions.');
        } else if (status === 404) {
          throw new Error('WordPress API endpoint not found. Please check your site URL.');
        } else {
          throw new Error(`WordPress API error (${status}): ${message}`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to WordPress site. Please check your site URL.');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('WordPress site not found. Please check your site URL.');
      } else {
        throw new Error(`Publishing failed: ${error.message}`);
      }
    }
  }

  /**
   * Format content for WordPress (add HTML formatting)
   */
  formatContentForWordPress(content) {
    // Convert markdown-style formatting to HTML
    let formattedContent = content
      // Convert headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert line breaks to paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap in paragraph tags
    formattedContent = `<p>${formattedContent}</p>`;
    
    // Clean up empty paragraphs
    formattedContent = formattedContent
      .replace(/<p><\/p>/g, '')
      .replace(/<p><br><\/p>/g, '');

    return formattedContent;
  }

  /**
   * Test WordPress site connection
   * @param {Object} wordpressSite - WordPress site configuration
   * @returns {Object} Test result
   */
  async testConnection(wordpressSite) {
    try {
      logger.info(`Testing WordPress connection: ${wordpressSite.site_name}`);

      const decryptedPassword = decrypt(wordpressSite.password_encrypted);
      
      const response = await axios.get(
        `${wordpressSite.api_endpoint}/users/me`,
        {
          auth: {
            username: wordpressSite.username,
            password: decryptedPassword
          },
          timeout: 10000
        }
      );

      const user = response.data;
      
      logger.info(`WordPress connection test successful for user: ${user.name}`);

      return {
        success: true,
        message: `Connected successfully as ${user.name}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          capabilities: user.capabilities
        }
      };

    } catch (error) {
      logger.error('WordPress connection test failed:', error);
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        
        if (status === 401) {
          return {
            success: false,
            message: 'Authentication failed. Please check your username and password.'
          };
        } else if (status === 403) {
          return {
            success: false,
            message: 'Access denied. Please check your user permissions.'
          };
        } else {
          return {
            success: false,
            message: `API error (${status}): ${message}`
          };
        }
      } else if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Cannot connect to the site. Please check your site URL.'
        };
      } else if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: 'Site not found. Please check your site URL.'
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${error.message}`
        };
      }
    }
  }

  /**
   * Get WordPress site info
   * @param {Object} wordpressSite - WordPress site configuration
   * @returns {Object} Site info
   */
  async getSiteInfo(wordpressSite) {
    try {
      const decryptedPassword = decrypt(wordpressSite.password_encrypted);
      
      const [siteResponse, categoriesResponse] = await Promise.all([
        axios.get(`${wordpressSite.api_endpoint}`, {
          auth: {
            username: wordpressSite.username,
            password: decryptedPassword
          },
          timeout: 10000
        }),
        axios.get(`${wordpressSite.api_endpoint}/categories`, {
          auth: {
            username: wordpressSite.username,
            password: decryptedPassword
          },
          timeout: 10000
        })
      ]);

      return {
        success: true,
        site: {
          name: siteResponse.data.name,
          description: siteResponse.data.description,
          url: siteResponse.data.url,
          language: siteResponse.data.language
        },
        categories: categoriesResponse.data.map(cat => ({
          id: cat.id,
          name: cat.name,
          count: cat.count
        }))
      };

    } catch (error) {
      logger.error('Failed to get WordPress site info:', error);
      return {
        success: false,
        message: `Failed to get site info: ${error.message}`
      };
    }
  }
}

module.exports = new WordPressPublisher();
