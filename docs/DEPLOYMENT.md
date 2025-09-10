# Fiddy AutoPublisher - Deployment Guide

This guide covers deploying the Fiddy AutoPublisher system to production.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Railway recommended)
- AWS account for Lambda functions
- OpenAI API account
- Domain name (optional)

## 1. Database Setup (Railway)

### Step 1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### Step 2: Add PostgreSQL Database
1. Click "New" → "Database" → "PostgreSQL"
2. Wait for database to be provisioned
3. Copy the `DATABASE_URL` from the database settings

### Step 3: Run Database Migrations
```bash
cd backend
npm install
npm run migrate
```

## 2. Backend Deployment (Railway)

### Step 1: Connect Repository
1. In Railway dashboard, click "New" → "GitHub Repo"
2. Select your Fiddy AutoPublisher repository
3. Choose the `backend` folder as the root directory

### Step 2: Configure Environment Variables
Add these environment variables in Railway:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=your-railway-database-url
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-openai-org-id
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Step 3: Deploy
1. Railway will automatically deploy when you push to main branch
2. Monitor the deployment logs
3. Test the health endpoint: `https://your-app.railway.app/health`

## 3. Frontend Deployment (Electron)

### Step 1: Build Frontend
```bash
cd frontend
npm install
npm run build
```

### Step 2: Package Electron App
```bash
cd ..
npm install
npm run build
```

### Step 3: Create Installer
```bash
# For Windows
npx electron-builder --win

# For macOS
npx electron-builder --mac

# For Linux
npx electron-builder --linux
```

## 4. AWS Lambda Setup

### Step 1: Create Lambda Functions
1. Go to AWS Lambda console
2. Create two new functions:
   - `fiddy-content-publisher`
   - `fiddy-monthly-reset`

### Step 2: Configure Content Publisher Lambda
1. Upload the `content-publisher.js` file
2. Set runtime to Node.js 18.x
3. Set timeout to 15 minutes
4. Add environment variables:
   ```env
   DATABASE_URL=your-railway-database-url
   OPENAI_API_KEY=your-openai-api-key
   ```

### Step 3: Configure Monthly Reset Lambda
1. Upload the `monthly-reset.js` file
2. Set runtime to Node.js 18.x
3. Set timeout to 5 minutes
4. Add environment variables:
   ```env
   DATABASE_URL=your-railway-database-url
   ```

### Step 4: Set Up CloudWatch Events
1. Create EventBridge rules for:
   - Content Publisher: Every hour
   - Monthly Reset: First day of each month at 00:00 UTC

## 5. Environment Configuration

### Backend Environment Variables
```env
# Server
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# OpenAI (Internal)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_ORG_ID=your-openai-org-id-here

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# AWS Lambda
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables
```env
REACT_APP_API_URL=https://your-backend.railway.app/api
```

## 6. SSL/HTTPS Setup

### Railway (Automatic)
Railway provides automatic SSL certificates for all deployments.

### Custom Domain (Optional)
1. Add your domain in Railway dashboard
2. Update DNS records as instructed
3. SSL certificate will be automatically provisioned

## 7. Monitoring and Logging

### Railway Logs
- View application logs in Railway dashboard
- Set up log retention policies

### AWS CloudWatch
- Monitor Lambda function executions
- Set up alarms for errors
- View execution logs

### Database Monitoring
- Monitor database performance in Railway
- Set up connection pooling
- Monitor query performance

## 8. Security Considerations

### API Security
- All API endpoints require authentication
- Rate limiting is enabled
- CORS is configured for specific origins
- Input validation on all endpoints

### Data Security
- User API keys are encrypted at rest
- Passwords are hashed with bcrypt
- JWT tokens have expiration
- Database connections use SSL

### Environment Security
- Never commit secrets to version control
- Use environment variables for all sensitive data
- Regularly rotate API keys and secrets
- Monitor for unauthorized access

## 9. Backup and Recovery

### Database Backups
Railway automatically backs up PostgreSQL databases:
- Daily backups retained for 7 days
- Weekly backups retained for 4 weeks
- Monthly backups retained for 12 months

### Application Backups
- Source code is in Git repository
- Environment variables are stored in Railway
- Lambda function code is in repository

## 10. Scaling Considerations

### Database Scaling
- Railway PostgreSQL can be scaled up as needed
- Consider read replicas for high traffic
- Monitor connection limits

### Application Scaling
- Railway automatically scales based on traffic
- Consider horizontal scaling for high load
- Monitor memory and CPU usage

### Lambda Scaling
- AWS Lambda automatically scales
- Monitor concurrent executions
- Consider reserved concurrency for critical functions

## 11. Troubleshooting

### Common Issues

#### Database Connection Errors
- Check DATABASE_URL format
- Verify database is running
- Check connection limits

#### Lambda Timeout Errors
- Increase timeout duration
- Optimize function code
- Check database query performance

#### API Authentication Errors
- Verify JWT_SECRET is set
- Check token expiration
- Validate user permissions

### Log Analysis
- Check Railway application logs
- Review AWS CloudWatch logs
- Monitor database query logs

## 12. Maintenance

### Regular Tasks
- Monitor system performance
- Update dependencies
- Review security logs
- Backup verification

### Monthly Tasks
- Review user growth
- Analyze usage patterns
- Update documentation
- Security audit

### Quarterly Tasks
- Performance optimization
- Feature planning
- Infrastructure review
- Disaster recovery testing

## Support

For deployment issues:
1. Check the logs first
2. Review this documentation
3. Check Railway and AWS status pages
4. Contact support if needed

## Cost Optimization

### Railway
- Monitor usage and optimize resource allocation
- Use appropriate instance sizes
- Clean up unused resources

### AWS Lambda
- Monitor execution duration
- Optimize function code
- Use appropriate memory allocation

### Database
- Monitor query performance
- Optimize database schema
- Use appropriate instance sizes

