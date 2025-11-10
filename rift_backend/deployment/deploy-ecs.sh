#!/bin/bash
# Deploy Rift Rewind Backend to AWS ECS Fargate

set -e

echo "🚀 Deploying Rift Rewind Backend to AWS ECS Fargate"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="rift-rewind"
ENVIRONMENT="dev"
REGION="us-east-1"
IMAGE_TAG="latest"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install AWS CLI first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
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

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${BLUE}🔍 AWS Account ID: $ACCOUNT_ID${NC}"

# Step 1: Deploy Infrastructure
echo "🏗️  Deploying ECS infrastructure..."
aws cloudformation deploy \
    --template-file ../cloudformation/ecs-infrastructure.yaml \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --parameter-overrides \
        ProjectName=$PROJECT_NAME \
        Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION

echo -e "${GREEN}✅ Infrastructure deployed${NC}"

# Get infrastructure outputs
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text)

CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
    --output text)

TARGET_GROUP_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`TargetGroupArn`].OutputValue' \
    --output text)

SUBNET_1=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet1Id`].OutputValue' \
    --output text)

SUBNET_2=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet2Id`].OutputValue' \
    --output text)

SECURITY_GROUP=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSSecurityGroupId`].OutputValue' \
    --output text)

EXECUTION_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskExecutionRoleArn`].OutputValue' \
    --output text)

TASK_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskRoleArn`].OutputValue' \
    --output text)

echo -e "${BLUE}📦 ECR Repository: $ECR_URI${NC}"

# Step 2: Store API key in Systems Manager
echo "🔐 Storing API key in AWS Systems Manager..."
aws ssm put-parameter \
    --name "/rift-rewind/riot-api-key" \
    --value "$RIOT_API_KEY" \
    --type "SecureString" \
    --description "Riot Games API Key for Rift Rewind Backend" \
    --overwrite || echo -e "${YELLOW}⚠️  Parameter might already exist${NC}"

# Step 3: Build and push Docker image
echo "🐳 Building and pushing Docker image..."

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Build image (from parent directory)
cd ..
docker build -t $PROJECT_NAME-backend .
cd deployment

# Tag image
docker tag $PROJECT_NAME-backend:latest $ECR_URI:$IMAGE_TAG

# Push image
docker push $ECR_URI:$IMAGE_TAG

echo -e "${GREEN}✅ Docker image pushed to ECR${NC}"

# Step 4: Update task definition with actual values
echo "📝 Creating ECS task definition..."
cat > ecs-task-definition-final.json << EOF
{
  "family": "$PROJECT_NAME-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "$PROJECT_NAME-backend",
      "image": "$ECR_URI:$IMAGE_TAG",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp",
          "name": "http"
        }
      ],
      "environment": [
        {
          "name": "PYTHONUNBUFFERED",
          "value": "1"
        },
        {
          "name": "PYTHONPATH",
          "value": "/app"
        }
      ],
      "secrets": [
        {
          "name": "RIOT_API_KEY",
          "valueFrom": "arn:aws:ssm:$REGION:$ACCOUNT_ID:parameter/rift-rewind/riot-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$PROJECT_NAME-backend",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8000/ || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Step 5: Register task definition
echo "📋 Registering ECS task definition..."
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definition-final.json \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo -e "${GREEN}✅ Task definition registered: $TASK_DEFINITION_ARN${NC}"

# Step 6: Create or update ECS service
echo "🚀 Creating ECS service..."

SERVICE_EXISTS=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services "$PROJECT_NAME-service" \
    --query 'services[0].status' \
    --output text 2>/dev/null || echo "MISSING")

if [ "$SERVICE_EXISTS" = "MISSING" ] || [ "$SERVICE_EXISTS" = "None" ]; then
    # Create new service
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name "$PROJECT_NAME-service" \
        --task-definition "$PROJECT_NAME-backend" \
        --desired-count 1 \
        --launch-type FARGATE \
        --platform-version LATEST \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=$PROJECT_NAME-backend,containerPort=8000" \
        --enable-execute-command \
        --deployment-configuration "maximumPercent=200,minimumHealthyPercent=50,deploymentCircuitBreaker={enable=true,rollback=true}"
    
    echo -e "${GREEN}✅ ECS service created${NC}"
else
    # Update existing service
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service "$PROJECT_NAME-service" \
        --task-definition "$PROJECT_NAME-backend" \
        --desired-count 1
    
    echo -e "${GREEN}✅ ECS service updated${NC}"
fi

# Step 7: Wait for service to be stable
echo "⏳ Waiting for service to be stable..."
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services "$PROJECT_NAME-service"

# Get Load Balancer DNS
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text)

# Clean up
rm ecs-task-definition-final.json

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your API is live at: http://$ALB_DNS${NC}"
echo -e "${GREEN}📚 API Documentation: http://$ALB_DNS/docs${NC}"
echo -e "${GREEN}📊 Monitor at: https://console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services${NC}"
echo -e "${YELLOW}💰 Cost: ~\$15-30/month depending on usage${NC}"

# Test the deployment
echo "🧪 Testing deployment..."
sleep 30  # Give it time to fully start
if curl -f "http://$ALB_DNS" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding correctly!${NC}"
else
    echo -e "${YELLOW}⚠️  API might still be starting up. Try again in a few minutes.${NC}"
fi

echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "${BLUE}  View logs: aws logs tail /ecs/$PROJECT_NAME-backend --follow${NC}"
echo -e "${BLUE}  Scale service: aws ecs update-service --cluster $CLUSTER_NAME --service $PROJECT_NAME-service --desired-count 2${NC}"
echo -e "${BLUE}  Delete stack: aws cloudformation delete-stack --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-infrastructure${NC}"