@echo off
echo 🚂 Railway Deployment for Fiddy AutoPublisher (Windows)
echo =====================================================

echo.
echo Step 1: Login to Railway
echo ------------------------
npx @railway/cli login
if %errorlevel% neq 0 (
    echo ❌ Failed to login to Railway
    pause
    exit /b 1
)

echo.
echo Step 2: Initialize Railway Project
echo ----------------------------------
npx @railway/cli init
if %errorlevel% neq 0 (
    echo ❌ Failed to initialize Railway project
    pause
    exit /b 1
)

echo.
echo Step 3: Add PostgreSQL Database
echo --------------------------------
npx @railway/cli add postgresql
if %errorlevel% neq 0 (
    echo ❌ Failed to add PostgreSQL database
    pause
    exit /b 1
)

echo.
echo Step 4: Set Environment Variables
echo ---------------------------------
echo Setting production environment variables...

npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set PORT=5000
npx @railway/cli variables set JWT_SECRET=your-super-secure-jwt-secret-change-this
npx @railway/cli variables set ENCRYPTION_KEY=your-32-character-encryption-key
npx @railway/cli variables set CORS_ORIGIN=https://your-domain.com
npx @railway/cli variables set LOG_LEVEL=info
npx @railway/cli variables set RATE_LIMIT_WINDOW_MS=900000
npx @railway/cli variables set RATE_LIMIT_MAX_REQUESTS=100

echo.
echo ⚠️  IMPORTANT: You need to set these environment variables manually:
echo    - OPENAI_API_KEY=your-openai-api-key
echo    - DALLE_API_KEY=your-dalle-api-key
echo    - AWS_REGION=us-east-1
echo    - AWS_ACCESS_KEY_ID=your-aws-access-key
echo    - AWS_SECRET_ACCESS_KEY=your-aws-secret-key
echo.
echo You can set them using: npx @railway/cli variables set VARIABLE_NAME=value

echo.
echo Step 5: Deploy Backend
echo ----------------------
npx @railway/cli up
if %errorlevel% neq 0 (
    echo ❌ Failed to deploy backend
    pause
    exit /b 1
)

echo.
echo Step 6: Get Deployment Information
echo ----------------------------------
echo Getting deployment URL...
npx @railway/cli domain

echo.
echo Getting database URL...
npx @railway/cli variables | findstr DATABASE_URL

echo.
echo 🎉 Railway deployment completed!
echo.
echo Next steps:
echo 1. Copy the DATABASE_URL above
echo 2. Run database migrations: cd backend ^&^& npm run migrate
echo 3. Test your API endpoints
echo 4. Deploy AWS Lambda functions
echo.
pause

