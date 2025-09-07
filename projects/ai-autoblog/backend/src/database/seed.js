require('dotenv').config();
const { seedDatabase } = require('./migrate');
const logger = require('../utils/logger');

/**
 * Seed the database with initial data
 */
const main = async () => {
  try {
    logger.info('Starting database seeding...');
    await seedDatabase();
    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
};

main();

