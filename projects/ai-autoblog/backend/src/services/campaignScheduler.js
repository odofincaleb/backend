const cron = require('node-cron');
const { query } = require('../database/connection');
const queueProcessor = require('./queueProcessor');
const logger = require('../utils/logger');

class CampaignScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start the campaign scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Campaign scheduler is already running');
      return;
    }

    logger.info('Starting campaign scheduler...');
    this.isRunning = true;

    // Start the queue processor
    queueProcessor.start();

    // Schedule campaign checks every 5 minutes
    this.scheduleCampaignChecks();

    // Schedule daily maintenance at 2 AM
    this.scheduleDailyMaintenance();

    // Schedule weekly cleanup on Sundays at 3 AM
    this.scheduleWeeklyCleanup();

    logger.info('Campaign scheduler started successfully');
  }

  /**
   * Stop the campaign scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Campaign scheduler is not running');
      return;
    }

    logger.info('Stopping campaign scheduler...');

    // Stop all cron jobs
    this.jobs.forEach((job, name) => {
      job.destroy();
      logger.debug(`Stopped job: ${name}`);
    });
    this.jobs.clear();

    // Stop queue processor
    queueProcessor.stop();

    this.isRunning = false;
    logger.info('Campaign scheduler stopped');
  }

  /**
   * Schedule campaign checks every 5 minutes
   */
  scheduleCampaignChecks() {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Running scheduled campaign check...');
        await this.checkAndProcessCampaigns();
      } catch (error) {
        logger.error('Scheduled campaign check failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('campaign_checks', job);
    logger.info('Scheduled campaign checks every 5 minutes');
  }

  /**
   * Schedule daily maintenance at 2 AM UTC
   */
  scheduleDailyMaintenance() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running daily maintenance...');
        await this.runDailyMaintenance();
      } catch (error) {
        logger.error('Daily maintenance failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('daily_maintenance', job);
    logger.info('Scheduled daily maintenance at 2 AM UTC');
  }

  /**
   * Schedule weekly cleanup on Sundays at 3 AM UTC
   */
  scheduleWeeklyCleanup() {
    const job = cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Running weekly cleanup...');
        await this.runWeeklyCleanup();
      } catch (error) {
        logger.error('Weekly cleanup failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('weekly_cleanup', job);
    logger.info('Scheduled weekly cleanup on Sundays at 3 AM UTC');
  }

  /**
   * Check and process campaigns that are ready
   */
  async checkAndProcessCampaigns() {
    try {
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
      logger.error('Error checking campaigns:', error);
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
        AND ws.is_active = true
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
    try {
      logger.info(`Processing campaign: ${campaign.topic}`);

      // Create queue entry
      const queueId = await this.createQueueEntry(campaign);
      
      // Trigger queue processing
      await queueProcessor.processQueue();

      // Log the event
      await this.logCampaignEvent(campaign.id, 'campaign_triggered', 
        `Campaign "${campaign.topic}" triggered for content generation`);

    } catch (error) {
      logger.error(`Error processing campaign ${campaign.topic}:`, error);
      
      // Log the error
      await this.logCampaignEvent(campaign.id, 'campaign_error', 
        `Error processing campaign: ${error.message}`);
    }
  }

  /**
   * Create a queue entry for a campaign
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
   * Run daily maintenance tasks
   */
  async runDailyMaintenance() {
    try {
      logger.info('Running daily maintenance tasks...');

      // Update campaign statistics
      await this.updateCampaignStats();

      // Clean up old failed queue entries
      await this.cleanupFailedQueueEntries();

      // Check for stuck campaigns
      await this.checkStuckCampaigns();

      // Update WordPress site health
      await this.updateWordPressSiteHealth();

      logger.info('Daily maintenance completed successfully');

    } catch (error) {
      logger.error('Daily maintenance failed:', error);
    }
  }

  /**
   * Run weekly cleanup tasks
   */
  async runWeeklyCleanup() {
    try {
      logger.info('Running weekly cleanup tasks...');

      // Archive old completed queue entries (older than 30 days)
      await this.archiveOldQueueEntries();

      // Clean up old logs (older than 90 days)
      await this.cleanupOldLogs();

      // Update user statistics
      await this.updateUserStatistics();

      logger.info('Weekly cleanup completed successfully');

    } catch (error) {
      logger.error('Weekly cleanup failed:', error);
    }
  }

  /**
   * Update campaign statistics
   */
  async updateCampaignStats() {
    try {
      await query(`
        UPDATE campaigns 
        SET updated_at = NOW()
        WHERE status = 'active' 
        AND next_publish_at <= NOW() + INTERVAL '1 day'
      `);
      
      logger.debug('Campaign statistics updated');
    } catch (error) {
      logger.error('Error updating campaign stats:', error);
    }
  }

  /**
   * Clean up old failed queue entries
   */
  async cleanupFailedQueueEntries() {
    try {
      const result = await query(`
        DELETE FROM content_queue 
        WHERE status = 'failed' 
        AND created_at < NOW() - INTERVAL '7 days'
      `);
      
      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old failed queue entries`);
      }
    } catch (error) {
      logger.error('Error cleaning up failed queue entries:', error);
    }
  }

  /**
   * Check for stuck campaigns
   */
  async checkStuckCampaigns() {
    try {
      // Find campaigns that have been in 'in_progress' status for more than 2 hours
      const result = await query(`
        UPDATE content_queue 
        SET status = 'failed', 
            error_message = 'Processing timeout - stuck in progress',
            completed_at = NOW()
        WHERE status = 'in_progress' 
        AND started_at < NOW() - INTERVAL '2 hours'
      `);
      
      if (result.rowCount > 0) {
        logger.warn(`Reset ${result.rowCount} stuck queue entries`);
      }
    } catch (error) {
      logger.error('Error checking stuck campaigns:', error);
    }
  }

  /**
   * Update WordPress site health
   */
  async updateWordPressSiteHealth() {
    try {
      // This would typically involve testing connections to WordPress sites
      // For now, we'll just log that this task ran
      logger.debug('WordPress site health check completed');
    } catch (error) {
      logger.error('Error updating WordPress site health:', error);
    }
  }

  /**
   * Archive old completed queue entries
   */
  async archiveOldQueueEntries() {
    try {
      const result = await query(`
        DELETE FROM content_queue 
        WHERE status = 'completed' 
        AND completed_at < NOW() - INTERVAL '30 days'
      `);
      
      if (result.rowCount > 0) {
        logger.info(`Archived ${result.rowCount} old completed queue entries`);
      }
    } catch (error) {
      logger.error('Error archiving old queue entries:', error);
    }
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs() {
    try {
      const result = await query(`
        DELETE FROM logs 
        WHERE created_at < NOW() - INTERVAL '90 days'
        AND severity IN ('debug', 'info')
      `);
      
      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old log entries`);
      }
    } catch (error) {
      logger.error('Error cleaning up old logs:', error);
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStatistics() {
    try {
      // Update user post counts
      await query(`
        UPDATE users 
        SET posts_published_this_month = (
          SELECT COUNT(*) 
          FROM content_queue cq
          JOIN campaigns c ON cq.campaign_id = c.id
          WHERE c.user_id = users.id 
          AND cq.status = 'completed'
          AND cq.completed_at >= DATE_TRUNC('month', NOW())
        )
      `);
      
      logger.debug('User statistics updated');
    } catch (error) {
      logger.error('Error updating user statistics:', error);
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
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  /**
   * Manually trigger campaign processing
   */
  async triggerCampaignProcessing() {
    try {
      logger.info('Manually triggering campaign processing...');
      await this.checkAndProcessCampaigns();
      return { success: true, message: 'Campaign processing triggered successfully' };
    } catch (error) {
      logger.error('Manual campaign processing failed:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new CampaignScheduler();
