const { execSync } = require('child_process');
const path = require('path');

async function startApplication() {
  console.log('🚀 Starting Fiddy AutoPublisher Backend...');

  // Run safe migrations (preserves existing data)
  try {
    console.log('🔄 Running safe database migrations...');
    const { safeMigrate } = require('./src/database/safe-migrate.js');
    await safeMigrate();
    console.log('✅ Safe database migrations completed - all data preserved!');
  } catch (error) {
    console.error('❌ Safe migration failed:', error.message);
    console.log('⚠️ Continuing without migration - database might already be set up');
    // DO NOT fall back to force migration as it deletes all data!
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
  const { startServer } = require('./src/server.js');
  await startServer();
  console.log('✅ Server startup completed');
}

startApplication().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});