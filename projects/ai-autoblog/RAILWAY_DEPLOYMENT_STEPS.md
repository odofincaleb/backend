# Railway Deployment Steps for Fiddy AutoPublisher

## 🚂 **Step-by-Step Railway Deployment Guide**

Since the Railway CLI is installed but needs to be run with `npx`, here are the exact commands to deploy your Fiddy AutoPublisher to Railway.

## **Step 1: Login to Railway**

```bash
npx @railway/cli login
```
- This will open your browser to login to Railway
- Follow the authentication process

## **Step 2: Initialize Railway Project**

```bash
npx @railway/cli init
```
- Choose project name: `fiddy-autopublisher`
- Select environment: `production`

## **Step 3: Add PostgreSQL Database**

```bash
npx @railway/cli add postgresql
```
- This will add a PostgreSQL database to your project

## **Step 4: Set Environment Variables**

```bash
# Basic environment variables
npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set PORT=5000
npx @railway/cli variables set JWT_SECRET="your-super-secure-jwt-secret-here"
npx @railway/cli variables set ENCRYPTION_KEY="your-32-character-encryption-key"
npx @railway/cli variables set CORS_ORIGIN="https://your-domain.com"
npx @railway/cli variables set LOG_LEVEL=info
npx @railway/cli variables set RATE_LIMIT_WINDOW_MS=900000
npx @railway/cli variables set RATE_LIMIT_MAX_REQUESTS=100

# API Keys (replace with your actual keys)
npx @railway/cli variables set OPENAI_API_KEY="your-openai-api-key"
npx @railway/cli variables set DALLE_API_KEY="your-dalle-api-key"

# AWS Credentials (for Lambda functions)
npx @railway/cli variables set AWS_REGION="us-east-1"
npx @railway/cli variables set AWS_ACCESS_KEY_ID="your-aws-access-key"
npx @railway/cli variables set AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

## **Step 5: Deploy Backend**

```bash
npx @railway/cli up
```
- This will deploy your backend to Railway
- Wait for deployment to complete

## **Step 6: Get Database URL**

```bash
npx @railway/cli variables | findstr DATABASE_URL
```
- Copy the DATABASE_URL value
- You'll need this for running migrations

## **Step 7: Run Database Migrations**

```bash
# Set the DATABASE_URL environment variable
set DATABASE_URL="your-railway-database-url"

# Run migrations
cd backend
npm run migrate

# Seed initial data
npm run seed
```

## **Step 8: Get Deployment URL**

```bash
npx @railway/cli domain
```
- This will show your deployed API URL
- Test it: `https://your-app.railway.app/api/health`

## **Step 9: Test Your Deployment**

```bash
# Test health endpoint
curl https://your-app.railway.app/api/health

# Test registration
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## **Alternative: Use the Windows Batch Script**

You can also run the automated script:

```bash
scripts\railway-deploy-windows.bat
```

## **Troubleshooting**

### If Railway CLI Commands Don't Work:
```bash
# Try with full path
npx @railway/cli@latest --version

# Or reinstall
npm uninstall -g @railway/cli
npm install -g @railway/cli
```

### If Deployment Fails:
```bash
# Check logs
npx @railway/cli logs

# Check status
npx @railway/cli status

# Restart deployment
npx @railway/cli up
```

### If Database Connection Fails:
```bash
# Verify database URL
npx @railway/cli variables | findstr DATABASE_URL

# Test database connection
npx @railway/cli open postgresql
```

## **Next Steps After Railway Deployment**

1. **Deploy AWS Lambda Functions**
   ```bash
   cd aws-lambda
   aws configure
   ./deploy.sh
   ```

2. **Update Frontend Configuration**
   ```bash
   echo "REACT_APP_API_URL=https://your-app.railway.app/api" > frontend/.env.production
   ```

3. **Test Complete System**
   - Test API endpoints
   - Test database operations
   - Test Lambda functions
   - Test frontend connection

## **Production URLs**

After successful deployment, you'll have:
- **API URL**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/api/health`
- **Database**: Accessible via Railway dashboard

## **Monitoring**

```bash
# View logs
npx @railway/cli logs --follow

# Check status
npx @railway/cli status

# View metrics
npx @railway/cli metrics
```

---

**Ready to deploy? Start with Step 1! 🚀**

