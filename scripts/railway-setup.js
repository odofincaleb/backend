#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Setting up Railway deployment for Fiddy AutoPublisher...\n');

// Check if Railway CLI is installed
function checkRailwayCLI() {
  try {
    execSync('railway --version', { stdio: 'pipe' });
    console.log('✅ Railway CLI detected');
    return true;
  } catch (error) {
    console.log('❌ Railway CLI not found. Installing...');
    try {
      execSync('npm install -g @railway/cli', { stdio: 'inherit' });
      console.log('✅ Railway CLI installed');
      return true;
    } catch (installError) {
      console.error('❌ Failed to install Railway CLI. Please install manually: npm install -g @railway/cli');
      return false;
    }
  }
}

// Login to Railway
function loginToRailway() {
  console.log('\n🔐 Logging into Railway...');
  try {
    execSync('railway login', { stdio: 'inherit' });
    console.log('✅ Successfully logged into Railway');
    return true;
  } catch (error) {
    console.error('❌ Failed to login to Railway. Please login manually: railway login');
    return false;
  }
}

// Create Railway project
function createRailwayProject() {
  console.log('\n📦 Creating Railway project...');
  try {
    // Check if project already exists
    try {
      execSync('railway status', { stdio: 'pipe' });
      console.log('✅ Railway project already exists');
      return true;
    } catch (error) {
      // Project doesn't exist, create it
      execSync('railway init', { stdio: 'inherit' });
      console.log('✅ Railway project created');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to create Railway project');
    return false;
  }
}

// Add PostgreSQL database
function addPostgreSQLDatabase() {
  console.log('\n🗄️  Adding PostgreSQL database...');
  try {
    execSync('railway add postgresql', { stdio: 'inherit' });
    console.log('✅ PostgreSQL database added');
    return true;
  } catch (error) {
    console.error('❌ Failed to add PostgreSQL database');
    return false;
  }
}

// Get database URL
function getDatabaseURL() {
  console.log('\n🔗 Getting database connection string...');
  try {
    const output = execSync('railway variables', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('DATABASE_URL')) {
        const url = line.split('=')[1]?.trim();
        if (url) {
          console.log('✅ Database URL found');
          return url;
        }
      }
    }
    
    console.log('⚠️  DATABASE_URL not found in Railway variables');
    return null;
  } catch (error) {
    console.error('❌ Failed to get database URL');
    return null;
  }
}

// Set environment variables
function setEnvironmentVariables() {
  console.log('\n⚙️  Setting environment variables...');
  
  const envVars = [
    'NODE_ENV=production',
    'PORT=5000',
    'JWT_SECRET=' + generateSecureKey(64),
    'ENCRYPTION_KEY=' + generateSecureKey(32),
    'CORS_ORIGIN=https://your-domain.com',
    'LOG_LEVEL=info',
    'RATE_LIMIT_WINDOW_MS=900000',
    'RATE_LIMIT_MAX_REQUESTS=100'
  ];
  
  try {
    for (const envVar of envVars) {
      execSync(`railway variables set ${envVar}`, { stdio: 'inherit' });
    }
    console.log('✅ Environment variables set');
    return true;
  } catch (error) {
    console.error('❌ Failed to set environment variables');
    return false;
  }
}

// Generate secure key
function generateSecureKey(length = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

// Deploy backend
function deployBackend() {
  console.log('\n🚀 Deploying backend to Railway...');
  try {
    execSync('railway up', { stdio: 'inherit' });
    console.log('✅ Backend deployed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to deploy backend');
    return false;
  }
}

// Run database migrations
function runMigrations(databaseUrl) {
  console.log('\n🔄 Running database migrations...');
  try {
    // Set DATABASE_URL environment variable
    process.env.DATABASE_URL = databaseUrl;
    
    // Run migrations
    execSync('cd backend && npm run migrate', { stdio: 'inherit' });
    console.log('✅ Database migrations completed');
    return true;
  } catch (error) {
    console.error('❌ Failed to run database migrations');
    return false;
  }
}

// Seed database
function seedDatabase(databaseUrl) {
  console.log('\n🌱 Seeding database...');
  try {
    // Set DATABASE_URL environment variable
    process.env.DATABASE_URL = databaseUrl;
    
    // Run seed
    execSync('cd backend && npm run seed', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to seed database');
    return false;
  }
}

// Get deployment URL
function getDeploymentURL() {
  console.log('\n🌐 Getting deployment URL...');
  try {
    const output = execSync('railway domain', { encoding: 'utf8' });
    const url = output.trim();
    console.log(`✅ Deployment URL: ${url}`);
    return url;
  } catch (error) {
    console.error('❌ Failed to get deployment URL');
    return null;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Railway deployment process...\n');
    
    // Step 1: Check Railway CLI
    if (!checkRailwayCLI()) {
      process.exit(1);
    }
    
    // Step 2: Login to Railway
    if (!loginToRailway()) {
      process.exit(1);
    }
    
    // Step 3: Create project
    if (!createRailwayProject()) {
      process.exit(1);
    }
    
    // Step 4: Add PostgreSQL
    if (!addPostgreSQLDatabase()) {
      process.exit(1);
    }
    
    // Step 5: Set environment variables
    if (!setEnvironmentVariables()) {
      process.exit(1);
    }
    
    // Step 6: Get database URL
    const databaseUrl = getDatabaseURL();
    if (!databaseUrl) {
      console.log('⚠️  Please set DATABASE_URL manually in Railway dashboard');
    }
    
    // Step 7: Deploy backend
    if (!deployBackend()) {
      process.exit(1);
    }
    
    // Step 8: Run migrations (if database URL is available)
    if (databaseUrl) {
      if (!runMigrations(databaseUrl)) {
        console.log('⚠️  Migrations failed, please run manually');
      }
      
      if (!seedDatabase(databaseUrl)) {
        console.log('⚠️  Seeding failed, please run manually');
      }
    }
    
    // Step 9: Get deployment URL
    const deploymentUrl = getDeploymentURL();
    
    console.log('\n🎉 Railway deployment completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update CORS_ORIGIN in Railway variables with your frontend domain');
    console.log('2. Add your OpenAI API keys to Railway variables:');
    console.log('   - OPENAI_API_KEY');
    console.log('   - DALLE_API_KEY');
    console.log('3. Add AWS credentials for Lambda functions:');
    console.log('   - AWS_REGION');
    console.log('   - AWS_ACCESS_KEY_ID');
    console.log('   - AWS_SECRET_ACCESS_KEY');
    console.log('4. Test your API endpoints');
    console.log('5. Deploy AWS Lambda functions');
    
    if (deploymentUrl) {
      console.log(`\n🌐 Your API is available at: ${deploymentUrl}`);
      console.log(`🔗 Health check: ${deploymentUrl}/api/health`);
    }
    
    console.log('\n🚀 Ready for production!');
    
  } catch (error) {
    console.error('❌ Railway deployment failed:', error.message);
    process.exit(1);
  }
}

main();

