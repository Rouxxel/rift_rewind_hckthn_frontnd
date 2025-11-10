#!/bin/bash
# Deploy Rift Rewind Backend to AWS Lambda (FREE)

set -e

echo "🚀 Deploying Rift Rewind Backend to AWS Lambda (FREE)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install AWS CLI first.${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Run: aws configure${NC}"
    exit 1
fi

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

# Install Serverless Framework if not installed
if ! command -v serverless &> /dev/null; then
    echo "📦 Installing Serverless Framework..."
    npm install -g serverless
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
if [ ! -f "package.json" ]; then
    npm init -y
fi
npm install serverless-python-requirements

# Store API key in AWS Systems Manager (optional but recommended)
echo "🔐 Storing API key in AWS Systems Manager..."
aws ssm put-parameter \
    --name "/rift-rewind/riot-api-key" \
    --value "$RIOT_API_KEY" \
    --type "SecureString" \
    --description "Riot Games API Key for Rift Rewind Backend" \
    --overwrite || echo -e "${YELLOW}⚠️  Parameter might already exist${NC}"

# Deploy to AWS Lambda
echo "🚀 Deploying to AWS Lambda..."
serverless deploy --verbose

# Get the deployed endpoint
ENDPOINT=$(serverless info --verbose | grep -o 'https://[^[:space:]]*')

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your API is now live at: $ENDPOINT${NC}"
echo -e "${GREEN}📚 API Documentation: $ENDPOINT/docs${NC}"
echo -e "${GREEN}📊 Monitor usage at: https://console.aws.amazon.com/lambda/${NC}"
echo -e "${GREEN}💰 This deployment is FREE within AWS Free Tier limits!${NC}"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -f "$ENDPOINT" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding correctly!${NC}"
else
    echo -e "${YELLOW}⚠️  API might still be starting up. Try again in a few seconds.${NC}"
fi