# Railway Manual Setup Guide

Since the automated Railway setup encountered issues, here's a manual step-by-step guide to deploy Fiddy AutoPublisher to Railway.

## 🚂 Railway Manual Deployment Steps

### Step 1: Install Railway CLI

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Verify installation
railway --version
```

### Step 2: Login to Railway

```bash
# Login to Railway (will open browser)
railway login
```

### Step 3: Create New Project

```bash
# Navigate to your project directory
cd C:\projects\ai-autoblog

# Initialize Railway project
railway init

# Follow the prompts:
# - Project name: fiddy-autopublisher
# - Environment: production
```

### Step 4: Add PostgreSQL Database

```bash
# Add PostgreSQL database service
railway add postgresql
```

### Step 5: Set Environment Variables

```bash
# Set production environment variables
railway variables set NODE_ENV=production
railway variables set PORT=5000
railway variables set JWT_SECRET="your-super-secure-jwt-secret-here"
railway variables set ENCRYPTION_KEY="your-32-character-encryption-key"
railway variables set CORS_ORIGIN="https://your-domain.com"
railway variables set LOG_LEVEL=info
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set RATE_LIMIT_MAX_REQUESTS=100

# Add your API keys (replace with actual keys)
railway variables set OPENAI_API_KEY="your-openai-api-key"
railway variables set DALLE_API_KEY="your-dalle-api-key"

# Add AWS credentials for Lambda functions
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_ACCESS_KEY_ID="your-aws-access-key"
railway variables set AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

### Step 6: Get Database URL

```bash
# View all environment variables
railway variables

# Copy the DATABASE_URL value
# Format: postgresql://username:password@host:port/database
```

### Step 7: Run Database Migrations

```bash
# Set DATABASE_URL environment variable
set DATABASE_URL="your-railway-database-url"

# Run migrations
cd backend
npm run migrate

# Seed initial data
npm run seed
```

### Step 8: Deploy Backend

```bash
# Deploy to Railway
railway up

# Check deployment status
railway status

# View logs
railway logs
```

### Step 9: Get Deployment URL

```bash
# Get your deployment URL
railway domain

# Test health endpoint
curl https://your-app.railway.app/api/health
```

## 🔧 Railway Dashboard Configuration

### Access Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Login with your account
3. Select your `fiddy-autopublisher` project

### Configure Services

#### Backend Service
- **Name**: `backend`
- **Source**: Connect to your GitHub repository
- **Build Command**: `cd backend && npm install`
- **Start Command**: `npm start`
- **Port**: `5000`

#### Database Service
- **Name**: `postgresql`
- **Type**: PostgreSQL
- **Plan**: Hobby (free tier)

### Environment Variables

In the Railway dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secure-jwt-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key
OPENAI_API_KEY=your-openai-api-key
DALLE_API_KEY=your-dalle-api-key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ Database Setup

### Connect to Database

```bash
# Get database connection string
railway variables | grep DATABASE_URL

# Connect using psql (if installed)
psql "your-database-url"

# Or use Railway's built-in database browser
railway open postgresql
```

### Run Migrations

```bash
# Set database URL
export DATABASE_URL="your-railway-database-url"

# Run migrations
cd backend
npm run migrate

# Seed database
npm run seed
```

### Verify Database

```sql
-- Check if tables were created
\dt

-- Check users table
SELECT * FROM users LIMIT 5;

-- Check license_keys table
SELECT * FROM license_keys LIMIT 5;
```

## 🚀 Deployment Verification

### Test API Endpoints

```bash
# Health check
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

# Test login
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Monitor Deployment

```bash
# View real-time logs
railway logs --follow

# Check deployment status
railway status

# View service metrics
railway metrics
```

## 🔒 Security Configuration

### SSL Certificates

Railway automatically provides SSL certificates for your domain. Your API will be available at:
- `https://your-app.railway.app`

### CORS Configuration

Update the `CORS_ORIGIN` environment variable with your frontend domain:
```bash
railway variables set CORS_ORIGIN="https://your-frontend-domain.com"
```

### Database Security

- Railway provides automatic database backups
- SSL connections are enabled by default
- Database access is restricted to your Railway services

## 📊 Monitoring & Logs

### View Logs

```bash
# View recent logs
railway logs

# Follow logs in real-time
railway logs --follow

# View logs for specific service
railway logs --service backend
```

### Monitor Performance

1. Go to Railway dashboard
2. Select your project
3. Click on the backend service
4. View metrics tab for:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

## 🔄 Updates & Maintenance

### Deploy Updates

```bash
# Deploy latest changes
railway up

# Deploy specific service
railway up --service backend
```

### Database Backups

Railway automatically creates database backups. To restore:

1. Go to Railway dashboard
2. Select your PostgreSQL service
3. Go to Backups tab
4. Select a backup to restore

### Environment Variable Updates

```bash
# Update environment variable
railway variables set VARIABLE_NAME="new-value"

# Remove environment variable
railway variables unset VARIABLE_NAME
```

## 🆘 Troubleshooting

### Common Issues

#### Deployment Fails
```bash
# Check logs for errors
railway logs

# Verify environment variables
railway variables

# Check build logs
railway logs --service backend
```

#### Database Connection Issues
```bash
# Verify database URL
railway variables | grep DATABASE_URL

# Test database connection
railway open postgresql
```

#### API Not Responding
```bash
# Check service status
railway status

# View service logs
railway logs --service backend

# Restart service
railway restart
```

### Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Railway Status: [status.railway.app](https://status.railway.app)

## 🎉 Next Steps

After successful Railway deployment:

1. **Test API endpoints** - Verify all endpoints work correctly
2. **Deploy AWS Lambda functions** - Set up automated content publishing
3. **Configure frontend** - Update API URL in frontend
4. **Set up monitoring** - Configure alerts and monitoring
5. **Deploy Electron app** - Build and distribute desktop application

Your Fiddy AutoPublisher backend is now running in production on Railway! 🚀

