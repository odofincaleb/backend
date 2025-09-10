const { execSync } = require('child_process');
const path = require('path');

async function startApplication() {
  console.log('🚀 Starting Fiddy AutoPublisher Backend...');

  // Run regular migrations (preserves existing data)
  try {
    console.log('🔄 Running database migrations...');
    const { runMigrations } = require('./src/database/migrate.js');
    await runMigrations();
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('⚠️  Skipping force migration to preserve existing data');
    console.log('🔄 Database might already be set up, continuing...');
    // Don't run force migration as it deletes all data!
  }

  // Add missing columns to existing database
  try {
    console.log('🔄 Adding missing columns...');
    const addMissingColumns = require('./add-missing-columns.js');
    await addMissingColumns();
    console.log('✅ Missing columns added');
  } catch (error) {
    console.error('❌ Adding columns failed:', error.message);
    // Continue anyway - columns might already exist
  }

  // Run seed data (only if needed)
  try {
    console.log('🌱 Checking if database seeding is needed...');
    const { seedDatabase } = require('./src/database/seed.js');
    await seedDatabase();
    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    // Continue anyway - seeding might already be run or not needed
  }

  // Start the server
  console.log('📡 Starting server...');
  require('./src/server.js');
}

startApplication().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});