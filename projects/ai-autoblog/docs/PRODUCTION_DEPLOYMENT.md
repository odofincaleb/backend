# Fiddy AutoPublisher - Production Deployment Guide

This guide covers the complete production deployment process for Fiddy AutoPublisher, including database setup, backend deployment, and AWS Lambda configuration.

## 🚀 Production Deployment Overview

The production deployment consists of:
1. **Railway Database** - PostgreSQL database hosting
2. **Railway Backend** - Node.js API server
3. **AWS Lambda** - Automated content publishing functions
4. **Electron App** - Desktop application distribution

## 📋 Prerequisites

### Required Tools
- Node.js 18+ installed
- Railway CLI: `npm install -g @railway/cli`
- AWS CLI: [Download from AWS](https://aws.amazon.com/cli/)
- Git for version control

### Required Accounts
- Railway.com account (free tier available)
- AWS account (free tier available)
- OpenAI account with API access
- Domain name (optional, for custom domain)

## 🗄️ Step 1: Database Setup (Railway)

### 1.1 Create Railway Project

```bash
# Login to Railway
railway login

# Create new project
railway init

# Add PostgreSQL database
railway add postgresql
```

### 1.2 Configure Database

```bash
# Get database connection string
railway variables

# Copy the DATABASE_URL value
# Format: postgresql://username:password@host:port/database
```

### 1.3 Run Database Migrations

```bash
# Set database URL
export DATABASE_URL="your-railway-database-url"

# Run migrations
cd backend
npm run migrate

# Seed initial data
npm run seed
```

## 🖥️ Step 2: Backend Deployment (Railway)

### 2.1 Configure Environment Variables

```bash
# Set Railway environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="your-super-secure-jwt-secret"
railway variables set ENCRYPTION_KEY="your-32-character-encryption-key"
railway variables set OPENAI_API_KEY="your-openai-api-key"
railway variables set DALLE_API_KEY="your-dalle-api-key"
railway variables set CORS_ORIGIN="https://your-domain.com"
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_ACCESS_KEY_ID="your-aws-access-key"
railway variables set AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

### 2.2 Deploy Backend

```bash
# Deploy to Railway
railway up

# Check deployment status
railway status

# View logs
railway logs
```

### 2.3 Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-railway-app.railway.app/api/health

# Test API endpoints
curl https://your-railway-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

## ☁️ Step 3: AWS Lambda Deployment

### 3.1 Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your default output format (json)
```

### 3.2 Deploy Lambda Functions

```bash
# Set environment variables
export DATABASE_URL="your-railway-database-url"
export OPENAI_API_KEY="your-openai-api-key"
export DALLE_API_KEY="your-dalle-api-key"
export JWT_SECRET="your-jwt-secret"
export ENCRYPTION_KEY="your-encryption-key"

# Deploy Lambda functions
cd aws-lambda
chmod +x deploy.sh
./deploy.sh
```

### 3.3 Verify Lambda Deployment

```bash
# List deployed functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `fiddy-autopublisher`)]'

# Test content publisher function
aws lambda invoke \
  --function-name fiddy-autopublisher-content-publisher \
  --payload '{}' \
  response.json

# Check response
cat response.json
```

## 🖥️ Step 4: Frontend Configuration

### 4.1 Update API Endpoint

```bash
# Update frontend environment
cd frontend

# Create production environment file
echo "REACT_APP_API_URL=https://your-railway-app.railway.app/api" > .env.production
```

### 4.2 Build Frontend

```bash
# Build for production
npm run build

# Verify build
ls -la build/
```

## ⚡ Step 5: Electron App Distribution

### 5.1 Install Electron Builder

```bash
# Install electron-builder
npm install --save-dev electron-builder
```

### 5.2 Configure Build Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dist": "electron-builder",
    "dist:win": "electron-builder --win",
    "dist:mac": "electron-builder --mac",
    "dist:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.fiddy.autopublisher",
    "productName": "Fiddy AutoPublisher",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "frontend/build/**/*",
      "backend/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

### 5.3 Build Distribution

```bash
# Build for all platforms
npm run dist

# Build for specific platform
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## 🔒 Step 6: Security Configuration

### 6.1 SSL/TLS Setup

Railway provides automatic SSL certificates. For custom domains:

```bash
# Add custom domain in Railway dashboard
# Railway will automatically provision SSL certificate
```

### 6.2 Environment Security

```bash
# Generate secure keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Use strong passwords for database
# Enable database SSL connections
# Set up proper CORS origins
```

### 6.3 API Security

```bash
# Enable rate limiting
# Set up API key rotation
# Monitor for suspicious activity
# Enable request logging
```

## 📊 Step 7: Monitoring & Logging

### 7.1 Railway Monitoring

```bash
# View application logs
railway logs

# Monitor resource usage
railway status

# Set up alerts in Railway dashboard
```

### 7.2 AWS CloudWatch

```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/fiddy-autopublisher"

# Set up CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "fiddy-lambda-errors" \
  --alarm-description "Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold
```

### 7.3 Application Monitoring

```bash
# Enable Winston logging
# Set up log rotation
# Monitor database performance
# Track API response times
```

## 🔄 Step 8: Backup & Recovery

### 8.1 Database Backup

```bash
# Railway provides automatic backups
# Manual backup command
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_file.sql
```

### 8.2 Application Backup

```bash
# Backup configuration files
tar -czf config_backup_$(date +%Y%m%d).tar.gz backend/.env.production

# Backup Lambda functions
aws lambda get-function --function-name fiddy-autopublisher-content-publisher
```

## 🚀 Step 9: Production Launch

### 9.1 Pre-Launch Checklist

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] SSL certificates active
- [ ] Lambda functions deployed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security measures in place
- [ ] Performance testing completed

### 9.2 Launch Process

```bash
# 1. Deploy backend
railway up

# 2. Verify deployment
curl https://your-app.railway.app/api/health

# 3. Deploy Lambda functions
cd aws-lambda && ./deploy.sh

# 4. Build and distribute Electron app
npm run dist

# 5. Monitor initial traffic
railway logs --follow
```

### 9.3 Post-Launch Monitoring

```bash
# Monitor application health
railway status

# Check Lambda function performance
aws lambda get-function --function-name fiddy-autopublisher-content-publisher

# Monitor database performance
railway logs --service postgresql

# Check error rates
railway logs | grep ERROR
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database URL
railway variables | grep DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### Lambda Function Issues
```bash
# Check function logs
aws logs tail /aws/lambda/fiddy-autopublisher-content-publisher --follow

# Test function manually
aws lambda invoke --function-name fiddy-autopublisher-content-publisher response.json
```

#### Backend Deployment Issues
```bash
# Check deployment logs
railway logs

# Restart service
railway restart

# Check environment variables
railway variables
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_content_queue_campaign_id ON content_queue(campaign_id);
```

#### Lambda Optimization
```bash
# Increase memory for better performance
aws lambda update-function-configuration \
  --function-name fiddy-autopublisher-content-publisher \
  --memory-size 1024
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Check logs for errors
2. **Monthly**: Review performance metrics
3. **Quarterly**: Update dependencies
4. **Annually**: Security audit

### Support Channels

- **Documentation**: `docs/` directory
- **Logs**: Railway and AWS CloudWatch
- **Monitoring**: Railway dashboard and AWS console

## 🎉 Production Ready!

Your Fiddy AutoPublisher is now running in production with:

- ✅ **Scalable Database** - Railway PostgreSQL
- ✅ **Reliable Backend** - Railway Node.js API
- ✅ **Automated Publishing** - AWS Lambda functions
- ✅ **Secure Deployment** - SSL certificates and encryption
- ✅ **Monitoring** - Comprehensive logging and alerts
- ✅ **Backup Strategy** - Automated database backups

**Happy publishing! 🚀**

