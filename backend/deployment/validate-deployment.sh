#!/bin/bash
# Validate deployment prerequisites and configuration

set -e

echo "🔍 Validating Rift Rewind Backend deployment prerequisites..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0

# Check AWS CLI
echo "Checking AWS CLI..."
if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d/ -f2 | cut -d' ' -f1)
    echo -e "${GREEN}✅ AWS CLI installed: $AWS_VERSION${NC}"
    
    # Check AWS configuration
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        REGION=$(aws configure get region)
        echo -e "${GREEN}✅ AWS configured - Account: $ACCOUNT_ID, Region: $REGION${NC}"
    else
        echo -e "${RED}❌ AWS CLI not configured. Run: aws configure${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ AWS CLI not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${GREEN}✅ Docker installed: $DOCKER_VERSION${NC}"
    
    # Check if Docker is running
    if docker info &> /dev/null; then
        echo -e "${GREEN}✅ Docker daemon is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker daemon not running. Start Docker for ECS deployment.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not installed. Required for ECS deployment only.${NC}"
fi

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js not installed. Required for Lambda deployment only.${NC}"
fi

# Check Git
echo "Checking Git..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    echo -e "${GREEN}✅ Git installed: $GIT_VERSION${NC}"
    
    # Check if in git repository
    if git rev-parse --git-dir &> /dev/null; then
        echo -e "${GREEN}✅ In Git repository${NC}"
        
        # Check for remote origin
        if git remote get-url origin &> /dev/null; then
            ORIGIN=$(git remote get-url origin)
            echo -e "${GREEN}✅ Git remote origin: $ORIGIN${NC}"
        else
            echo -e "${YELLOW}⚠️  No git remote 'origin'. Required for App Runner deployment.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Not in a Git repository. Required for App Runner deployment.${NC}"
    fi
else
    echo -e "${RED}❌ Git not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Python
echo "Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✅ Python installed: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ Python3 not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check environment variables
echo "Checking environment variables..."
if [ -f "../.env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
    
    if grep -q "RIOT_API_KEY" ../.env; then
        API_KEY=$(grep "RIOT_API_KEY" ../.env | cut -d'=' -f2)
        if [ "$API_KEY" != "RGAPI-REPLACE_ME" ] && [ ! -z "$API_KEY" ]; then
            echo -e "${GREEN}✅ RIOT_API_KEY configured in .env${NC}"
        else
            echo -e "${RED}❌ RIOT_API_KEY not properly set in .env${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${RED}❌ RIOT_API_KEY not found in .env${NC}"
        ERRORS=$((ERRORS + 1))
    fi
elif [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
    
    if grep -q "RIOT_API_KEY" .env; then
        API_KEY=$(grep "RIOT_API_KEY" .env | cut -d'=' -f2)
        if [ "$API_KEY" != "RGAPI-REPLACE_ME" ] && [ ! -z "$API_KEY" ]; then
            echo -e "${GREEN}✅ RIOT_API_KEY configured in .env${NC}"
        else
            echo -e "${RED}❌ RIOT_API_KEY not properly set in .env${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${RED}❌ RIOT_API_KEY not found in .env${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    
    if [ ! -z "$RIOT_API_KEY" ]; then
        echo -e "${GREEN}✅ RIOT_API_KEY found in environment${NC}"
    else
        echo -e "${RED}❌ RIOT_API_KEY not found in environment or .env${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check required files
echo "Checking required files..."
REQUIRED_FILES=(
    "../main.py"
    "../requirements.txt"
    "../lambda_handler.py"
    "../serverless.yml"
    "../apprunner.yaml"
    "../DOCKERFILE"
    "../ecs-task-definition.json"
    "../cloudformation/ecs-infrastructure.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check deployment scripts
echo "Checking deployment scripts..."
DEPLOY_SCRIPTS=(
    "deploy-lambda-free.sh"
    "deploy-apprunner.sh"
    "deploy-ecs.sh"
)

for script in "${DEPLOY_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}✅ $script exists and is executable${NC}"
        else
            echo -e "${YELLOW}⚠️  $script exists but not executable. Run: chmod +x $script${NC}"
        fi
    else
        echo -e "${RED}❌ $script missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# Summary
echo ""
echo "📋 Validation Summary:"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
    echo ""
    echo -e "${BLUE}🚀 Available deployment options:${NC}"
    echo -e "${BLUE}  1. Lambda (FREE): ./deploy-lambda-free.sh${NC}"
    echo -e "${BLUE}  2. App Runner: ./deploy-apprunner.sh${NC}"
    echo -e "${BLUE}  3. ECS Fargate: ./deploy-ecs.sh${NC}"
    echo ""
    echo -e "${BLUE}📖 For detailed instructions: see DEPLOYMENT.md${NC}"
else
    echo -e "${RED}❌ $ERRORS error(s) found. Please fix before deploying.${NC}"
    exit 1
fi