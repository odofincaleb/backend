#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('🚀 Setting up Fiddy AutoPublisher for Production...\n');

// Generate secure random keys
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Check if required tools are installed
function checkRequirements() {
  console.log('🔍 Checking requirements...');
  
  // Check Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const version = nodeVersion.replace('v', '').split('.')[0];
    
    if (parseInt(version) < 18) {
      console.error('❌ Node.js version 18+ is required. Current version:', nodeVersion);
      process.exit(1);
    }
    
    console.log('✅ Node.js', nodeVersion, 'detected');
  } catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js 18+ first.');
    process.exit(1);
  }

  // Check if Railway CLI is installed
  try {
    execSync('railway --version', { stdio: 'pipe' });
    console.log('✅ Railway CLI detected');
  } catch (error) {
    console.log('⚠️  Railway CLI not found. Installing...');
    try {
      execSync('npm install -g @railway/cli', { stdio: 'inherit' });
      console.log('✅ Railway CLI installed');
    } catch (installError) {
      console.error('❌ Failed to install Railway CLI. Please install manually: npm install -g @railway/cli');
      process.exit(1);
    }
  }

  // Check if AWS CLI is installed
  try {
    execSync('aws --version', { stdio: 'pipe' });
    console.log('✅ AWS CLI detected');
  } catch (error) {
    console.log('⚠️  AWS CLI not found. Please install AWS CLI for Lambda deployment.');
    console.log('   Download from: https://aws.amazon.com/cli/');
  }
}

// Create production environment file
function createProductionEnv() {
  console.log('\n⚙️  Creating production environment configuration...');
  
  const envPath = path.join(__dirname, '..', 'backend', '.env.production');
  const envExamplePath = path.join(__dirname, '..', 'backend', 'env.production.example');
  
  if (fs.existsSync(envPath)) {
    console.log('📝 Production .env file already exists');
    return;
  }
  
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Generate secure keys
    const jwtSecret = generateJWTSecret();
    const encryptionKey = generateSecureKey(16); // 32 characters
    const sessionSecret = generateSecureKey(32);
    
    // Replace placeholder values
    envContent = envContent.replace('your-super-secure-jwt-secret-key-here-change-this-in-production', jwtSecret);
    envContent = envContent.replace('your-32-character-encryption-key-here', encryptionKey);
    envContent = envContent.replace('your-session-secret-key-here', sessionSecret);
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Production .env file created with secure keys');
  } else {
    console.error('❌ Production environment example file not found');
    process.exit(1);
  }
}

// Install production dependencies
function installDependencies() {
  console.log('\n📦 Installing production dependencies...');
  
  try {
    // Root dependencies
    execSync('npm install --production', { stdio: 'inherit' });
    console.log('✅ Root dependencies installed');
    
    // Backend dependencies
    execSync('cd backend && npm install --production', { stdio: 'inherit' });
    console.log('✅ Backend dependencies installed');
    
    // Frontend dependencies
    execSync('cd frontend && npm install --production', { stdio: 'inherit' });
    console.log('✅ Frontend dependencies installed');
    
    // AWS Lambda dependencies
    execSync('cd aws-lambda && npm install --production', { stdio: 'inherit' });
    console.log('✅ AWS Lambda dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

// Create production build
function createProductionBuild() {
  console.log('\n🏗️  Creating production build...');
  
  try {
    // Build frontend
    execSync('cd frontend && npm run build', { stdio: 'inherit' });
    console.log('✅ Frontend build completed');
    
    // Build backend (if needed)
    console.log('✅ Backend ready for production');
  } catch (error) {
    console.error('❌ Failed to create production build');
    process.exit(1);
  }
}

// Create production directories
function createProductionDirectories() {
  console.log('\n📁 Creating production directories...');
  
  const directories = [
    'backend/logs',
    'backend/uploads',
    'backend/temp',
    'frontend/build',
    'aws-lambda/dist'
  ];
  
  directories.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`✅ Directory exists: ${dir}`);
    }
  });
}

// Create production startup script
function createStartupScript() {
  console.log('\n🚀 Creating production startup script...');
  
  const startupScript = `#!/bin/bash

# Fiddy AutoPublisher Production Startup Script

echo "🚀 Starting Fiddy AutoPublisher in Production Mode..."

# Set production environment
export NODE_ENV=production

# Start backend
echo "📡 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend (if needed)
echo "🖥️  Starting frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Start Electron app
echo "⚡ Starting Electron app..."
cd ..
npm start &
ELECTRON_PID=$!

echo "✅ Fiddy AutoPublisher started successfully!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Electron PID: $ELECTRON_PID"

# Keep script running
wait
`;

  const scriptPath = path.join(__dirname, '..', 'start-production.sh');
  fs.writeFileSync(scriptPath, startupScript);
  
  // Make script executable on Unix systems
  try {
    execSync('chmod +x start-production.sh', { stdio: 'pipe' });
  } catch (error) {
    // Ignore on Windows
  }
  
  console.log('✅ Production startup script created');
}

// Create production monitoring script
function createMonitoringScript() {
  console.log('\n📊 Creating production monitoring script...');
  
  const monitoringScript = `#!/bin/bash

# Fiddy AutoPublisher Production Monitoring Script

echo "📊 Fiddy AutoPublisher Production Monitoring"
echo "============================================="

# Check if processes are running
echo "🔍 Checking running processes..."

# Check backend
if pgrep -f "node.*backend" > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running"
fi

# Check frontend
if pgrep -f "node.*frontend" > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running"
fi

# Check Electron
if pgrep -f "electron" > /dev/null; then
    echo "✅ Electron app is running"
else
    echo "❌ Electron app is not running"
fi

# Check disk usage
echo "💾 Disk usage:"
df -h

# Check memory usage
echo "🧠 Memory usage:"
free -h

# Check log files
echo "📝 Recent log entries:"
if [ -f "backend/logs/app.log" ]; then
    tail -n 10 backend/logs/app.log
else
    echo "No log file found"
fi

echo "============================================="
`;

  const scriptPath = path.join(__dirname, '..', 'monitor-production.sh');
  fs.writeFileSync(scriptPath, monitoringScript);
  
  try {
    execSync('chmod +x monitor-production.sh', { stdio: 'pipe' });
  } catch (error) {
    // Ignore on Windows
  }
  
  console.log('✅ Production monitoring script created');
}

// Main execution
async function main() {
  try {
    checkRequirements();
    createProductionEnv();
    installDependencies();
    createProductionDirectories();
    createProductionBuild();
    createStartupScript();
    createMonitoringScript();
    
    console.log('\n🎉 Production setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure Railway database:');
    console.log('   - Run: railway login');
    console.log('   - Run: railway init');
    console.log('   - Run: railway add postgresql');
    console.log('   - Update DATABASE_URL in backend/.env.production');
    console.log('');
    console.log('2. Configure AWS Lambda:');
    console.log('   - Run: aws configure');
    console.log('   - Deploy Lambda functions: npm run deploy:lambda');
    console.log('');
    console.log('3. Update API keys in backend/.env.production:');
    console.log('   - OpenAI API Key');
    console.log('   - DALL-E API Key');
    console.log('   - AWS credentials');
    console.log('');
    console.log('4. Run database migrations:');
    console.log('   - cd backend && npm run migrate');
    console.log('');
    console.log('5. Start production:');
    console.log('   - ./start-production.sh (Unix)');
    console.log('   - npm run start:production (Windows)');
    console.log('');
    console.log('6. Monitor production:');
    console.log('   - ./monitor-production.sh (Unix)');
    console.log('   - npm run monitor (Windows)');
    console.log('\n🚀 Ready for production deployment!');
    
  } catch (error) {
    console.error('❌ Production setup failed:', error.message);
    process.exit(1);
  }
}

main();

