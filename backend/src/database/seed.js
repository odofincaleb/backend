require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { generateLicenseKey } = require('../utils/encryption');
const logger = require('../utils/logger');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
  try {
    logger.info('🌱 Starting database seeding...');
    
    const client = await pool.connect();
    
    // Check if admin user already exists
    const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['admin@fiddy.com']);
    
    if (adminCheck.rows.length === 0) {
      // Create admin user
      const adminPassword = await bcrypt.hash('admin123', 12);
      await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin@fiddy.com', adminPassword, 'Admin', 'User', 'professional', true]
      );
      logger.info('✅ Created admin user (admin@fiddy.com / admin123)');
    } else {
      logger.info('✅ Admin user already exists');
    }
    
    // Check if license keys already exist
    const licenseCheck = await client.query('SELECT COUNT(*) FROM license_keys');
    
    if (parseInt(licenseCheck.rows[0].count) === 0) {
      // Create sample license keys
      const sampleKeys = [
        {
          license_key: generateLicenseKey(),
          subscription_tier: 'hobbyist',
          posts_per_month: 25,
          max_campaigns: 1,
          support_tier: 'basic'
        },
        {
          license_key: generateLicenseKey(),
          subscription_tier: 'professional',
          posts_per_month: null, // unlimited
          max_campaigns: 10,
          support_tier: 'priority'
        }
      ];
      
      for (const keyData of sampleKeys) {
        await client.query(
          `INSERT INTO license_keys (license_key, subscription_tier, posts_per_month, max_campaigns, support_tier)
           VALUES ($1, $2, $3, $4, $5)`,
          [keyData.license_key, keyData.subscription_tier, keyData.posts_per_month, keyData.max_campaigns, keyData.support_tier]
        );
      }
      logger.info('✅ Created sample license keys');
    } else {
      logger.info('✅ License keys already exist');
    }
    
    client.release();
    await pool.end();
    
    logger.info('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Export the function
module.exports = { seedDatabase };

// Run if called directly
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  }).catch(error => {
    logger.error('Seeding failed:', error);
    process.exit(1);
  });
}

