const { execSync } = require('child_process');
const path = require('path');

async function startApplication() {
  console.log('🚀 Starting Fiddy AutoPublisher Backend...');

  // Run regular migrations (preserves existing data)
  try {
    console.log('🔄 Running database migrations...');
    const { migrate } = require('./src/database/migrate.js');
    await migrate();
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('🔄 Trying force migration as fallback...');
    try {
      const { forceCreateTables } = require('./src/database/force-migrate.js');
      await forceCreateTables();
      console.log('✅ Force migration completed (data was reset)');
    } catch (forceError) {
      console.error('❌ Force migration also failed:', forceError.message);
      // Continue anyway - database might already be set up
    }
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