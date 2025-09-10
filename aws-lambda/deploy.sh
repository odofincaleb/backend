#!/bin/bash

# AWS Lambda Deployment Script for Fiddy AutoPublisher

echo "🚀 Deploying Fiddy AutoPublisher AWS Lambda Functions..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Set variables
REGION=${AWS_REGION:-us-east-1}
FUNCTION_NAME_PREFIX="fiddy-autopublisher"
ROLE_NAME="fiddy-autopublisher-lambda-role"

echo "📍 Region: $REGION"
echo "🏷️  Function prefix: $FUNCTION_NAME_PREFIX"

# Create IAM role for Lambda if it doesn't exist
echo "🔐 Creating IAM role for Lambda functions..."
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null)

if [ "$ROLE_ARN" = "None" ] || [ -z "$ROLE_ARN" ]; then
    echo "Creating new IAM role..."
    
    # Create trust policy
    cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json

    # Attach basic execution policy
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    # Get role ARN
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
    
    echo "✅ IAM role created: $ROLE_ARN"
    
    # Clean up
    rm trust-policy.json
else
    echo "✅ IAM role exists: $ROLE_ARN"
fi

# Wait for role to be ready
echo "⏳ Waiting for IAM role to be ready..."
sleep 10

# Deploy Content Publisher Lambda
echo "📝 Deploying Content Publisher Lambda function..."
cd content-publisher

# Install dependencies
npm install --production

# Create deployment package
zip -r content-publisher.zip . -x "*.git*" "*.test*" "*.md" "node_modules/.cache/*"

# Deploy function
aws lambda create-function \
    --function-name ${FUNCTION_NAME_PREFIX}-content-publisher \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler content-publisher.handler \
    --zip-file fileb://content-publisher.zip \
    --timeout 300 \
    --memory-size 512 \
    --environment Variables='{
        "NODE_ENV":"production",
        "DATABASE_URL":"'$DATABASE_URL'",
        "OPENAI_API_KEY":"'$OPENAI_API_KEY'",
        "DALLE_API_KEY":"'$DALLE_API_KEY'",
        "JWT_SECRET":"'$JWT_SECRET'",
        "ENCRYPTION_KEY":"'$ENCRYPTION_KEY'"
    }' \
    --region $REGION 2>/dev/null || \
aws lambda update-function-code \
    --function-name ${FUNCTION_NAME_PREFIX}-content-publisher \
    --zip-file fileb://content-publisher.zip \
    --region $REGION

echo "✅ Content Publisher Lambda deployed"

# Deploy Monthly Reset Lambda
echo "🔄 Deploying Monthly Reset Lambda function..."
cd ../monthly-reset

# Install dependencies
npm install --production

# Create deployment package
zip -r monthly-reset.zip . -x "*.git*" "*.test*" "*.md" "node_modules/.cache/*"

# Deploy function
aws lambda create-function \
    --function-name ${FUNCTION_NAME_PREFIX}-monthly-reset \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler monthly-reset.handler \
    --zip-file fileb://monthly-reset.zip \
    --timeout 60 \
    --memory-size 256 \
    --environment Variables='{
        "NODE_ENV":"production",
        "DATABASE_URL":"'$DATABASE_URL'",
        "JWT_SECRET":"'$JWT_SECRET'"
    }' \
    --region $REGION 2>/dev/null || \
aws lambda update-function-code \
    --function-name ${FUNCTION_NAME_PREFIX}-monthly-reset \
    --zip-file fileb://monthly-reset.zip \
    --region $REGION

echo "✅ Monthly Reset Lambda deployed"

# Create EventBridge rules for scheduling
echo "⏰ Setting up EventBridge scheduling rules..."

# Content Publisher schedule (every hour)
aws events put-rule \
    --name ${FUNCTION_NAME_PREFIX}-content-publisher-schedule \
    --schedule-expression "rate(1 hour)" \
    --description "Trigger content publisher every hour" \
    --region $REGION 2>/dev/null || echo "Rule already exists"

# Add permission for EventBridge to invoke Lambda
aws lambda add-permission \
    --function-name ${FUNCTION_NAME_PREFIX}-content-publisher \
    --statement-id ${FUNCTION_NAME_PREFIX}-content-publisher-eventbridge \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:$REGION:$(aws sts get-caller-identity --query Account --output text):rule/${FUNCTION_NAME_PREFIX}-content-publisher-schedule \
    --region $REGION 2>/dev/null || echo "Permission already exists"

# Add target to rule
aws events put-targets \
    --rule ${FUNCTION_NAME_PREFIX}-content-publisher-schedule \
    --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:${FUNCTION_NAME_PREFIX}-content-publisher" \
    --region $REGION 2>/dev/null || echo "Target already exists"

# Monthly Reset schedule (1st of every month at 2 AM UTC)
aws events put-rule \
    --name ${FUNCTION_NAME_PREFIX}-monthly-reset-schedule \
    --schedule-expression "cron(0 2 1 * ? *)" \
    --description "Reset monthly post counts on 1st of every month" \
    --region $REGION 2>/dev/null || echo "Rule already exists"

# Add permission for EventBridge to invoke Lambda
aws lambda add-permission \
    --function-name ${FUNCTION_NAME_PREFIX}-monthly-reset \
    --statement-id ${FUNCTION_NAME_PREFIX}-monthly-reset-eventbridge \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:$REGION:$(aws sts get-caller-identity --query Account --output text):rule/${FUNCTION_NAME_PREFIX}-monthly-reset-schedule \
    --region $REGION 2>/dev/null || echo "Permission already exists"

# Add target to rule
aws events put-targets \
    --rule ${FUNCTION_NAME_PREFIX}-monthly-reset-schedule \
    --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:${FUNCTION_NAME_PREFIX}-monthly-reset" \
    --region $REGION 2>/dev/null || echo "Target already exists"

echo "✅ EventBridge scheduling rules created"

# Clean up
cd ..
rm -f content-publisher/content-publisher.zip
rm -f monthly-reset/monthly-reset.zip

echo ""
echo "🎉 AWS Lambda deployment completed successfully!"
echo ""
echo "📋 Deployed functions:"
echo "  - ${FUNCTION_NAME_PREFIX}-content-publisher (runs every hour)"
echo "  - ${FUNCTION_NAME_PREFIX}-monthly-reset (runs 1st of every month)"
echo ""
echo "🔗 Function ARNs:"
echo "  Content Publisher: arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:${FUNCTION_NAME_PREFIX}-content-publisher"
echo "  Monthly Reset: arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:${FUNCTION_NAME_PREFIX}-monthly-reset"
echo ""
echo "⏰ Schedules:"
echo "  - Content Publisher: Every hour"
echo "  - Monthly Reset: 1st of every month at 2 AM UTC"
echo ""
echo "🚀 Lambda functions are now running in production!"

