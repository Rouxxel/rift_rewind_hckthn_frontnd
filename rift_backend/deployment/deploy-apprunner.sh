#!/bin/bash
# Deploy Rift Rewind Backend to AWS App Runner

set -e

echo "🚀 Deploying Rift Rewind Backend to AWS App Runner"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="rift-rewind-backend"
REGION="us-east-1"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install AWS CLI first.${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Run: aws configure${NC}"
    exit 1
fi

# Check if git repo is set up
if ! git remote -v | grep -q origin; then
    echo -e "${RED}❌ No git remote 'origin' found. Please push your code to GitHub first.${NC}"
    echo -e "${YELLOW}Run: git remote add origin <your-github-repo-url>${NC}"
    exit 1
fi

# Get GitHub repository URL
GITHUB_REPO=$(git remote get-url origin)
echo -e "${BLUE}📂 Using repository: $GITHUB_REPO${NC}"

# Check if RIOT_API_KEY is set
if [ -z "$RIOT_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  RIOT_API_KEY not found in environment. Checking .env file...${NC}"
    if [ -f "../.env" ]; then
        export $(grep -v '^#' ../.env | xargs)
        echo -e "${GREEN}✅ Loaded environment variables from .env${NC}"
    elif [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
        echo -e "${GREEN}✅ Loaded environment variables from .env${NC}"
    else
        echo -e "${RED}❌ RIOT_API_KEY not found. Please set it in .env file or environment.${NC}"
        exit 1
    fi
fi

# Create IAM role for App Runner if it doesn't exist
echo "🔐 Setting up IAM role for App Runner..."
ROLE_NAME="AppRunnerECRAccessRole"

if ! aws iam get-role --role-name $ROLE_NAME &> /dev/null; then
    echo "Creating IAM role for App Runner..."
    
    # Create trust policy
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json

    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

    rm trust-policy.json
    echo -e "${GREEN}✅ IAM role created${NC}"
else
    echo -e "${GREEN}✅ IAM role already exists${NC}"
fi

# Get account ID and role ARN
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

# Create App Runner service configuration
echo "📝 Creating App Runner service configuration..."
cat > apprunner-service.json << EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "AutoDeploymentsEnabled": true,
    "CodeRepository": {
      "RepositoryUrl": "$GITHUB_REPO",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY",
        "CodeConfigurationValues": {
          "Runtime": "PYTHON_3",
          "BuildCommand": "pip install -r requirements.txt",
          "StartCommand": "uvicorn main:app --host 0.0.0.0 --port 8000",
          "RuntimeEnvironmentVariables": {
            "RIOT_API_KEY": "$RIOT_API_KEY",
            "PYTHONUNBUFFERED": "1"
          }
        }
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/",
    "Interval": 20,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
EOF

# Check if service already exists
if aws apprunner describe-service --service-arn "arn:aws:apprunner:$REGION:$ACCOUNT_ID:service/$SERVICE_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Service already exists. Updating...${NC}"
    
    # Update the service
    aws apprunner update-service \
        --service-arn "arn:aws:apprunner:$REGION:$ACCOUNT_ID:service/$SERVICE_NAME" \
        --source-configuration file://apprunner-service.json \
        --instance-configuration Cpu="0.25 vCPU",Memory="0.5 GB"
        
    echo -e "${GREEN}✅ Service updated${NC}"
else
    echo "🚀 Creating App Runner service..."
    
    # Create the service
    aws apprunner create-service \
        --cli-input-json file://apprunner-service.json \
        --region $REGION
        
    echo -e "${GREEN}✅ Service created${NC}"
fi

# Clean up
rm apprunner-service.json

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
aws apprunner wait service-running \
    --service-arn "arn:aws:apprunner:$REGION:$ACCOUNT_ID:service/$SERVICE_NAME"

# Get service URL
SERVICE_URL=$(aws apprunner describe-service \
    --service-arn "arn:aws:apprunner:$REGION:$ACCOUNT_ID:service/$SERVICE_NAME" \
    --query 'Service.ServiceUrl' \
    --output text)

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your API is live at: https://$SERVICE_URL${NC}"
echo -e "${GREEN}📚 API Documentation: https://$SERVICE_URL/docs${NC}"
echo -e "${GREEN}📊 Monitor at: https://console.aws.amazon.com/apprunner/home?region=$REGION#/services${NC}"
echo -e "${YELLOW}💰 Cost: ~\$25-50/month depending on usage${NC}"

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10  # Give it a moment to fully start
if curl -f "https://$SERVICE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding correctly!${NC}"
else
    echo -e "${YELLOW}⚠️  API might still be starting up. Try again in a few minutes.${NC}"
fi