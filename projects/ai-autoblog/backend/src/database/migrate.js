require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./connection');
const logger = require('../utils/logger');

/**
 * Run database migrations
 */
const runMigrations = async () => {
  try {
    logger.info('Starting database migration...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement);
          logger.info('Executed migration statement');
        } catch (error) {
          // Skip if table/extension already exists
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist')) {
            logger.warn('Skipping existing object:', error.message);
            continue;
          }
          throw error;
        }
      }
    }

    logger.info('Database migration completed successfully');
    return true;

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Create initial admin user and license keys
 */
const seedDatabase = async () => {
  try {
    logger.info('Seeding database...');

    // Check if admin user exists
    const adminCheck = await query('SELECT id FROM users WHERE email = $1', ['admin@fiddy.com']);
    
    if (adminCheck.rows.length === 0) {
      // Create admin user
      const bcrypt = require('bcryptjs');
      const adminPassword = await bcrypt.hash('admin123', 12);
      
      await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin@fiddy.com', adminPassword, 'Admin', 'User', 'professional', true]
      );
      
      logger.info('Admin user created');
    }

    // Create sample license keys
    const { generateLicenseKey } = require('../utils/encryption');
    
    // Check if license keys exist
    const keyCheck = await query('SELECT COUNT(*) as count FROM license_keys');
    const keyCount = parseInt(keyCheck.rows[0].count);

    if (keyCount === 0) {
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
        await query(
          `INSERT INTO license_keys (license_key, subscription_tier, posts_per_month, max_campaigns, support_tier)
           VALUES ($1, $2, $3, $4, $5)`,
          [keyData.license_key, keyData.subscription_tier, keyData.posts_per_month, keyData.max_campaigns, keyData.support_tier]
        );
      }

      logger.info('Sample license keys created');
    }

    logger.info('Database seeding completed successfully');
    return true;

  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  }
};

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => seedDatabase())
    .then(() => {
      logger.info('Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  seedDatabase
};

