const { query } = require('../database/connection');
const contentGenerator = require('./contentGenerator');
const wordpressPublisher = require('./wordpressPublisher');
const logger = require('../utils/logger');

class QueueProcessor {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
  }

  /**
   * Start the queue processing system
   */
  start() {
    if (this.processingInterval) {
      logger.warn('Queue processor is already running');
      return;
    }

    logger.info('Starting content queue processor...');
    
    // Process queue every 5 minutes
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5 * 60 * 1000);

    // Process immediately on start
    this.processQueue();
  }

  /**
   * Stop the queue processing system
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Content queue processor stopped');
    }
  }

  /**
   * Process the content queue
   */
  async processQueue() {
    if (this.isProcessing) {
      logger.debug('Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      logger.debug('Processing content queue...');

      // Get campaigns that are ready to publish
      const readyCampaigns = await this.getReadyCampaigns();
      
      if (readyCampaigns.length === 0) {
        logger.debug('No campaigns ready for processing');
        return;
      }

      logger.info(`Found ${readyCampaigns.length} campaigns ready for processing`);

      // Process each campaign
      for (const campaign of readyCampaigns) {
        await this.processCampaign(campaign);
      }

    } catch (error) {
      logger.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get campaigns that are ready to publish
   */
  async getReadyCampaigns() {
    try {
      const result = await query(`
        SELECT c.*, ws.site_name, ws.site_url, ws.username, ws.password_encrypted, ws.api_endpoint
        FROM campaigns c
        LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
        WHERE c.status = 'active' 
        AND c.next_publish_at <= NOW()
        AND c.wordpress_site_id IS NOT NULL
        ORDER BY c.next_publish_at ASC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting ready campaigns:', error);
      return [];
    }
  }

  /**
   * Process a single campaign
   */
  async processCampaign(campaign) {
    const queueId = await this.createQueueEntry(campaign);
    
    try {
      logger.info(`Processing campaign: ${campaign.topic} (Queue ID: ${queueId})`);

      // Update queue status to in_progress
      await this.updateQueueStatus(queueId, 'in_progress');

      // Generate content
      const generatedContent = await contentGenerator.generateBlogPost(campaign);
      
      // Update queue with generated content
      await this.updateQueueContent(queueId, generatedContent);

      // Generate featured image if OpenAI key is available
      if (process.env.OPENAI_API_KEY) {
        try {
          const imageUrl = await contentGenerator.generateFeaturedImage(generatedContent.imagePrompt);
          if (imageUrl) {
            await this.updateQueueImage(queueId, imageUrl);
            generatedContent.featuredImageUrl = imageUrl;
            logger.info(`Featured image generated: ${imageUrl}`);
          }
        } catch (imageError) {
          logger.warn('Image generation failed, continuing without image:', imageError.message);
        }
      }

      // Publish to WordPress
      const publishResult = await wordpressPublisher.publishContent(campaign, generatedContent);
      
      // Update queue with publishing results
      await this.updateQueuePublishing(queueId, publishResult);

      // Update campaign's next publish time
      await this.updateCampaignSchedule(campaign.id, campaign.schedule, campaign.schedule_hours);

      // Log success
      await this.logCampaignEvent(campaign.id, 'content_published', 
        `Successfully published "${generatedContent.title}" to ${campaign.site_name}`);

      logger.info(`Campaign processed successfully: ${campaign.topic}`);

    } catch (error) {
      logger.error(`Campaign processing failed: ${campaign.topic}`, error);
      
      // Update queue with error
      await this.updateQueueError(queueId, error.message);
      
      // Log error
      await this.logCampaignEvent(campaign.id, 'content_generation_failed', 
        `Failed to generate/publish content: ${error.message}`);
    }
  }

  /**
   * Create a new queue entry
   */
  async createQueueEntry(campaign) {
    try {
      const result = await query(`
        INSERT INTO content_queue (campaign_id, status, scheduled_for)
        VALUES ($1, 'pending', NOW())
        RETURNING id
      `, [campaign.id]);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Error creating queue entry:', error);
      throw error;
    }
  }

  /**
   * Update queue status
   */
  async updateQueueStatus(queueId, status) {
    try {
      await query(`
        UPDATE content_queue 
        SET status = $1, started_at = CASE WHEN $1 = 'in_progress' THEN NOW() ELSE started_at END
        WHERE id = $2
      `, [status, queueId]);
    } catch (error) {
      logger.error('Error updating queue status:', error);
    }
  }

  /**
   * Update queue with generated content
   */
  async updateQueueContent(queueId, content) {
    try {
      await query(`
        UPDATE content_queue 
        SET title = $1, generated_content = $2, keywords = $3
        WHERE id = $4
      `, [content.title, JSON.stringify(content), JSON.stringify(content.keywords), queueId]);
    } catch (error) {
      logger.error('Error updating queue content:', error);
    }
  }

  /**
   * Update queue with featured image
   */
  async updateQueueImage(queueId, imageUrl) {
    try {
      await query(`
        UPDATE content_queue 
        SET featured_image_url = $1
        WHERE id = $2
      `, [imageUrl, queueId]);
    } catch (error) {
      logger.error('Error updating queue image:', error);
    }
  }

  /**
   * Update queue with publishing results
   */
  async updateQueuePublishing(queueId, publishResult) {
    try {
      await query(`
        UPDATE content_queue 
        SET status = 'completed', 
            wordpress_post_id = $1, 
            wordpress_post_url = $2,
            completed_at = NOW()
        WHERE id = $3
      `, [publishResult.postId, publishResult.postUrl, queueId]);
    } catch (error) {
      logger.error('Error updating queue publishing:', error);
    }
  }

  /**
   * Update queue with error
   */
  async updateQueueError(queueId, errorMessage) {
    try {
      await query(`
        UPDATE content_queue 
        SET status = 'failed', 
            error_message = $1,
            completed_at = NOW()
        WHERE id = $2
      `, [errorMessage, queueId]);
    } catch (error) {
      logger.error('Error updating queue error:', error);
    }
  }

  /**
   * Update campaign's next publish time
   */
  async updateCampaignSchedule(campaignId, schedule, scheduleHours) {
    try {
      let finalScheduleHours;
      
      if (scheduleHours !== undefined && scheduleHours !== null) {
        // Use the custom schedule_hours field
        finalScheduleHours = scheduleHours;
      } else {
        // Fallback to legacy schedule format
        finalScheduleHours = parseInt(schedule.replace('h', ''));
      }
      
      const nextPublishAt = new Date(Date.now() + finalScheduleHours * 60 * 60 * 1000);

      await query(`
        UPDATE campaigns 
        SET next_publish_at = $1, updated_at = NOW()
        WHERE id = $2
      `, [nextPublishAt, campaignId]);
    } catch (error) {
      logger.error('Error updating campaign schedule:', error);
    }
  }

  /**
   * Log campaign event
   */
  async logCampaignEvent(campaignId, eventType, message) {
    try {
      await query(`
        INSERT INTO logs (campaign_id, event_type, message, severity)
        VALUES ($1, $2, $3, 'info')
      `, [campaignId, eventType, message]);
    } catch (error) {
      logger.error('Error logging campaign event:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const result = await query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM content_queue
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY status
      `);

      const stats = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };

      result.rows.forEach(row => {
        stats[row.status] = parseInt(row.count);
      });

      return stats;
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return {};
    }
  }

  /**
   * Get recent queue activity
   */
  async getRecentActivity(limit = 10) {
    try {
      const result = await query(`
        SELECT 
          cq.id,
          cq.status,
          cq.title,
          cq.created_at,
          cq.completed_at,
          cq.error_message,
          c.topic as campaign_topic,
          ws.site_name
        FROM content_queue cq
        JOIN campaigns c ON cq.campaign_id = c.id
        LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
        ORDER BY cq.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      return [];
    }
  }
}

module.exports = new QueueProcessor();
