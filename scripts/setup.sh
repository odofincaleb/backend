#!/bin/bash

# Fiddy AutoPublisher Setup Script
echo "🚀 Setting up Fiddy AutoPublisher..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files
echo "⚙️  Setting up environment files..."

# Backend environment
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file..."
    cp backend/env.example backend/.env
    echo "⚠️  Please update backend/.env with your actual values"
fi

# Frontend environment
if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend/.env file..."
    cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
EOF
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p backend/logs

# Create AWS Lambda deployment package
echo "📦 Creating AWS Lambda deployment package..."
cd aws-lambda
npm install
cd ..

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your database and API keys"
echo "2. Set up your PostgreSQL database on Railway"
echo "3. Run database migrations: cd backend && npm run migrate"
echo "4. Start development: npm run dev"
echo ""
echo "For production deployment, see docs/DEPLOYMENT.md"
echo ""
echo "Happy coding! 🚀"

