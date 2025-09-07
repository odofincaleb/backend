const { execSync } = require('child_process');
const path = require('path');

async function startApplication() {
  console.log('🚀 Starting Fiddy AutoPublisher Backend...');

  // Run force migrations first
  try {
    console.log('🔄 Running database migrations...');
    const { forceCreateTables } = require('./src/database/force-migrate.js');
    await forceCreateTables();
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('🔄 Trying manual database setup...');
    try {
      require('./manual-setup.js');
      console.log('✅ Manual database setup completed');
    } catch (setupError) {
      console.error('❌ Manual setup also failed:', setupError.message);
      // Continue anyway - database might already be set up
    }
  }

  // Run seed data
  try {
    console.log('🌱 Seeding database...');
    const { seedDatabase } = require('./src/database/seed.js');
    await seedDatabase();
    console.log('✅ Database seeded');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    // Continue anyway - seeding might already be run
  }

  // Start the server
  console.log('📡 Starting server...');
  require('./src/server.js');
}

startApplication().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});