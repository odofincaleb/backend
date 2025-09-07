#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Fiddy AutoPublisher...\n');

// Check if Node.js is installed
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

// Install root dependencies
console.log('\n📦 Installing root dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Root dependencies installed');
} catch (error) {
  console.error('❌ Failed to install root dependencies');
  process.exit(1);
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
  execSync('cd backend && npm install', { stdio: 'inherit' });
  console.log('✅ Backend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  execSync('cd frontend && npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Create environment files
console.log('\n⚙️  Setting up environment files...');

// Backend environment
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  const backendEnvExample = path.join(__dirname, '..', 'backend', 'env.example');
  if (fs.existsSync(backendEnvExample)) {
    fs.copyFileSync(backendEnvExample, backendEnvPath);
    console.log('📝 Created backend/.env file');
  }
} else {
  console.log('📝 Backend .env file already exists');
}

// Frontend environment
const frontendEnvPath = path.join(__dirname, '..', 'frontend', '.env');
if (!fs.existsSync(frontendEnvPath)) {
  const frontendEnvContent = 'REACT_APP_API_URL=http://localhost:5000/api\n';
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('📝 Created frontend/.env file');
} else {
  console.log('📝 Frontend .env file already exists');
}

// Create logs directory
console.log('\n📁 Creating logs directory...');
const logsDir = path.join(__dirname, '..', 'backend', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Logs directory created');
} else {
  console.log('✅ Logs directory already exists');
}

// Create AWS Lambda deployment package
console.log('\n📦 Creating AWS Lambda deployment package...');
try {
  execSync('cd aws-lambda && npm install', { stdio: 'inherit' });
  console.log('✅ AWS Lambda dependencies installed');
} catch (error) {
  console.error('❌ Failed to install AWS Lambda dependencies');
  process.exit(1);
}

console.log('\n🎉 Setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Update backend/.env with your database and API keys');
console.log('2. Set up your PostgreSQL database on Railway');
console.log('3. Run database migrations: cd backend && npm run migrate');
console.log('4. Start development: npm run dev');
console.log('\nFor production deployment, see docs/DEPLOYMENT.md');
console.log('\nHappy coding! 🚀');

