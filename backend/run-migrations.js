#!/usr/bin/env node

const { testConnection } = require('./src/database/connection');
const { runMigrations } = require('./src/database/migrate');
const logger = require('./src/utils/logger');

async function main() {
  console.log('🚀 Starting database migration process...');
  
  // Test connection first
  console.log('📡 Testing database connection...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('❌ Database connection failed. Please check your DATABASE_URL environment variable.');
    process.exit(1);
  }
  
  console.log('✅ Database connection successful');
  
  // Run migrations
  console.log('🔄 Running database migrations...');
  try {
    await runMigrations();
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
  
  console.log('🎉 Database setup complete!');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
