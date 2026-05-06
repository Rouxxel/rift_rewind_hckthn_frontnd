# 🚀 AWS Deployment Guide - Rift Rewind Backend

## 📌 Important Note

**AWS Credits Status**: The AWS credits for this hackathon were unfortunately never approved. As a result, this backend is currently deployed on **Render** for the hackathon demonstration. However, all necessary AWS deployment configurations and scripts have been prepared and are fully functional for future AWS deployment.

This guide documents the complete AWS deployment setup that was prepared, including three different deployment methods: Lambda (FREE), App Runner and ECS Fargate.

---

## 📋 Table of Contents

- [Overview](#overview)
- [AWS Deployment Options](#aws-deployment-options)
- [Prerequisites](#prerequisites)
- [Deployment Method 1: Lambda + API Gateway (FREE)](#deployment-method-1-lambda--api-gateway-free)
- [Deployment Method 2: AWS App Runner](#deployment-method-2-aws-app-runner)
- [Deployment Method 3: ECS Fargate](#deployment-method-3-ecs-fargate)
- [Security Configuration](#security-configuration)
- [Cost Analysis](#cost-analysis)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)
- [Current Deployment (Render)](#current-deployment-render)

---

## 🎯 Overview

The Rift Rewind Backend is a FastAPI-based service designed for flexible cloud deployment. This project includes complete infrastructure-as-code configurations for three AWS deployment strategies, each optimized for different use cases and budgets.

### What's Included

All AWS deployment files are production-ready and include:

- **Lambda Handler** (`lambda_handler.py`) - Serverless function wrapper using Mangum
- **Serverless Framework Config** (`serverless.yml`) - Lambda deployment automation
- **App Runner Config** (`apprunner.yaml`) - Managed container service configuration
- **ECS Task Definition** (`ecs-task-definition.json`) - Container task specifications
- **ECS Service Definition** (`ecs-service-definition.json`) - Service orchestration
- **CloudFormation Template** (`cloudformation/ecs-infrastructure.yaml`) - Complete infrastructure
- **Deployment Scripts** (`deployment/*.sh`) - Automated deployment automation
- **Multi-stage Dockerfile** (`DOCKERFILE`) - Optimized container image

---

## 🔄 AWS Deployment Options

| Method | Cost | Complexity | Best For | Auto-Scaling |
|--------|------|------------|----------|--------------|
| **Lambda + API Gateway** | **FREE** (1M requests/month) | Low | Hackathons, demos, low traffic | ✅ Automatic |
| **App Runner** | ~$25-50/month | Low | Production, CI/CD pipelines | ✅ Automatic |
| **ECS Fargate** | ~$15-30/month | Medium | Enterprise, full control | ⚙️ Configurable |

---

## ✅ Prerequisites

### Required Tools

1. **AWS Account** with appropriate IAM permissions
2. **AWS CLI** (v2.x or higher)
   ```bash
   # Install AWS CLI
   # Windows: Download from https://aws.amazon.com/cli/
   # Linux/Mac: 
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

3. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Default region: us-east-1
   # Default output format: json
   ```

4. **Docker** (for ECS deployment)
   - Download from [docker.com](https://www.docker.com/products/docker-desktop)

5. **Node.js** (for Lambda deployment)
   - Download from [nodejs.org](https://nodejs.org/)

6. **Riot Games API Key**
   - Obtain from [Riot Developer Portal](https://developer.riotgames.com/)

### Validate Prerequisites

Run the validation script to check your setup:

```bash
cd deployment
chmod +x validate-deployment.sh
./validate-deployment.sh
```

---

## 🆓 Deployment Method 1: Lambda + API Gateway (FREE)

**Best for**: Hackathons, demos, proof-of-concepts, low-traffic applications

### Architecture

```
Internet → API Gateway → Lambda Function → Riot Games API
                              ↓
                    AWS Systems Manager
                    (Secure API Key Storage)
```

### Key Features

- ✅ **100% FREE** within AWS Free Tier (1M requests/month)
- ✅ Automatic scaling (0 to thousands of requests)
- ✅ No server management
- ✅ Pay only for actual usage
- ✅ Built-in API Gateway with HTTPS

### Files Used

- `lambda_handler.py` - Lambda entry point using Mangum adapter
- `serverless.yml` - Serverless Framework configuration
- `requirements.txt` - Python dependencies

### Step-by-Step Deployment

#### 1. Install Serverless Framework

```bash
npm install -g serverless
npm install serverless-python-requirements
```

#### 2. Set Environment Variables

```bash
# Windows (CMD)
set RIOT_API_KEY=RGAPI-your-api-key-here

# Windows (PowerShell)
$env:RIOT_API_KEY="RGAPI-your-api-key-here"

# Linux/Mac
export RIOT_API_KEY="RGAPI-your-api-key-here"
```

#### 3. Deploy Using Script (Linux/Mac)

```bash
cd deployment
chmod +x deploy-lambda-free.sh
./deploy-lambda-free.sh
```

#### 4. Deploy Manually (All Platforms)

```bash
# From project root
serverless deploy --verbose
```

#### 5. Get Your API Endpoint

After deployment, you'll see output like:

```
✅ Deployment complete!
🌐 API endpoint: https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/
📚 API Documentation: https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/docs
```

### Configuration Details

The `serverless.yml` configures:

- **Runtime**: Python 3.12
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Region**: us-east-1 (configurable)
- **API Gateway**: HTTP API (cheaper than REST API)
- **Environment**: Secure parameter store integration

### Testing Your Lambda Deployment

```bash
# Health check
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/

# API documentation
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/docs

# Test endpoint
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/user/get_riot_puuid \
  -H "Content-Type: application/json" \
  -d '{"game_name": "TestUser", "tag_line": "NA1", "region": "americas"}'
```

### Updating Your Lambda Deployment

```bash
# Make code changes, then redeploy
serverless deploy

# Deploy a single function (faster)
serverless deploy function -f api
```

### Removing Lambda Deployment

```bash
serverless remove
```

---

## 💼 Deployment Method 2: AWS App Runner

**Best for**: Production applications with automatic CI/CD, moderate traffic

### Architecture

```
Internet → App Runner Service → Container → Riot Games API
              ↓
        Auto-scaling
        Load Balancing
        HTTPS Certificate
```

### Key Features

- ✅ Automatic deployments from GitHub
- ✅ Built-in load balancing and HTTPS
- ✅ Automatic scaling based on traffic
- ✅ No infrastructure management
- ✅ Simple pricing model

### Files Used

- `apprunner.yaml` - App Runner build and runtime configuration
- `requirements.txt` - Python dependencies
- `main.py` - FastAPI application

### Step-by-Step Deployment

#### 1. Push Code to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Ready for App Runner deployment"

# Add remote and push
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

#### 2. Deploy Using Script (Linux/Mac)

```bash
cd deployment
chmod +x deploy-apprunner.sh
./deploy-apprunner.sh
```

#### 3. Deploy Manually via AWS Console

1. Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
2. Click **"Create service"**
3. **Source**: Choose "Source code repository"
4. **Connect to GitHub**: Authorize AWS to access your repository
5. **Repository**: Select your repository and branch (main)
6. **Deployment settings**: Choose "Automatic"
7. **Build settings**: Use "Configuration file" and select `apprunner.yaml`
8. **Service settings**:
   - Service name: `rift-rewind-backend`
   - Port: `8000`
9. **Environment variables**:
   - Add `RIOT_API_KEY` with your API key
   - Add `PYTHONUNBUFFERED` = `1`
10. Click **"Create & deploy"**

#### 4. Deploy Using AWS CLI

```bash
# Create App Runner service
aws apprunner create-service \
  --service-name rift-rewind-backend \
  --source-configuration '{
    "AutoDeploymentsEnabled": true,
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/your-username/your-repo",
      "SourceCodeVersion": {"Type": "BRANCH", "Value": "main"},
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY"
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB"
  }'
```

### Configuration Details

The `apprunner.yaml` specifies:

- **Runtime**: Python 3.12
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2`
- **Port**: 8000
- **Environment Variables**: RIOT_API_KEY, PYTHONPATH, PYTHONUNBUFFERED

### Testing Your App Runner Deployment

```bash
# Get service URL
aws apprunner describe-service \
  --service-arn your-service-arn \
  --query 'Service.ServiceUrl' \
  --output text

# Test the API
curl https://your-service-url.awsapprunner.com/
curl https://your-service-url.awsapprunner.com/docs
```

### Updating App Runner Deployment

App Runner automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
# App Runner automatically detects and deploys
```

### Monitoring App Runner

- View logs in the App Runner console
- Monitor metrics (requests, latency, errors)
- Set up CloudWatch alarms

---

## 🐳 Deployment Method 3: ECS Fargate

**Best for**: Enterprise applications, full container orchestration, custom networking

### Architecture

```
Internet → Application Load Balancer → ECS Service (Fargate)
                                           ↓
                                      ECS Tasks (Containers)
                                           ↓
                                      Riot Games API
           ↓
    VPC with Public Subnets
    Security Groups
    CloudWatch Logs
    ECR (Container Registry)
```

### Key Features

- ✅ Full container orchestration
- ✅ Custom VPC and networking
- ✅ Application Load Balancer with health checks
- ✅ Auto-scaling based on CPU/memory
- ✅ Blue/green deployments
- ✅ Complete infrastructure as code

### Files Used

- `DOCKERFILE` - Multi-stage optimized container image
- `ecs-task-definition.json` - ECS task specifications
- `ecs-service-definition.json` - ECS service configuration
- `cloudformation/ecs-infrastructure.yaml` - Complete infrastructure

### Infrastructure Components

The CloudFormation template creates:

1. **VPC** with 2 public subnets across availability zones
2. **Internet Gateway** for public internet access
3. **Application Load Balancer** with health checks
4. **Target Group** for routing traffic to containers
5. **ECS Cluster** with Fargate capacity providers
6. **ECR Repository** for Docker images
7. **Security Groups** for ALB and ECS tasks
8. **IAM Roles** for task execution and task runtime
9. **CloudWatch Log Groups** for container logs

### Step-by-Step Deployment

#### 1. Deploy Infrastructure

```bash
cd deployment
chmod +x deploy-ecs.sh
./deploy-ecs.sh
```

Or manually:

```bash
aws cloudformation deploy \
  --template-file cloudformation/ecs-infrastructure.yaml \
  --stack-name rift-rewind-dev-infrastructure \
  --parameter-overrides \
      ProjectName=rift-rewind \
      Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### 2. Store API Key Securely

```bash
aws ssm put-parameter \
  --name "/rift-rewind/riot-api-key" \
  --value "RGAPI-your-api-key-here" \
  --type "SecureString" \
  --description "Riot Games API Key" \
  --overwrite
```

#### 3. Build and Push Docker Image

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get ECR repository URI from CloudFormation outputs
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
  --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
docker build -t rift-rewind-backend .

# Tag image
docker tag rift-rewind-backend:latest $ECR_URI:latest

# Push to ECR
docker push $ECR_URI:latest
```

#### 4. Update Task Definition with Your Values

Edit `ecs-task-definition.json` and replace:
- `YOUR_ACCOUNT_ID` with your AWS account ID
- `YOUR_SUBNET_ID_1` and `YOUR_SUBNET_ID_2` with subnet IDs from CloudFormation outputs
- `YOUR_SECURITY_GROUP_ID` with security group ID from outputs

#### 5. Register Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json
```

#### 6. Create ECS Service

```bash
# Get values from CloudFormation outputs
CLUSTER_NAME=$(aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
  --output text)

TARGET_GROUP_ARN=$(aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`TargetGroupArn`].OutputValue' \
  --output text)

SUBNET_1=$(aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet1Id`].OutputValue' \
  --output text)

SUBNET_2=$(aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet2Id`].OutputValue' \
  --output text)

SECURITY_GROUP=$(aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`ECSSecurityGroupId`].OutputValue' \
  --output text)

# Create service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name rift-rewind-service \
  --task-definition rift-rewind-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=rift-rewind-backend,containerPort=8000" \
  --enable-execute-command \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=50,deploymentCircuitBreaker={enable=true,rollback=true}"
```

#### 7. Get Load Balancer URL

```bash
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

echo "Your API is available at: http://$ALB_DNS"
```

### Testing Your ECS Deployment

```bash
# Health check
curl http://your-alb-dns.us-east-1.elb.amazonaws.com/

# API documentation
curl http://your-alb-dns.us-east-1.elb.amazonaws.com/docs

# Test endpoint
curl -X POST http://your-alb-dns.us-east-1.elb.amazonaws.com/user/get_riot_puuid \
  -H "Content-Type: application/json" \
  -d '{"game_name": "TestUser", "tag_line": "NA1", "region": "americas"}'
```

### Scaling Your ECS Service

```bash
# Scale to 3 tasks
aws ecs update-service \
  --cluster rift-rewind-dev-cluster \
  --service rift-rewind-service \
  --desired-count 3

# Enable auto-scaling (optional)
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/rift-rewind-dev-cluster/rift-rewind-service \
  --min-capacity 1 \
  --max-capacity 10
```

### Updating ECS Deployment

```bash
# Build and push new image
docker build -t rift-rewind-backend .
docker tag rift-rewind-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest

# Force new deployment
aws ecs update-service \
  --cluster rift-rewind-dev-cluster \
  --service rift-rewind-service \
  --force-new-deployment
```

---

## 🔐 Security Configuration

### AWS Systems Manager Parameter Store

All deployment methods use AWS Systems Manager for secure API key storage:

```bash
# Store API key
aws ssm put-parameter \
  --name "/rift-rewind/riot-api-key" \
  --value "RGAPI-your-api-key-here" \
  --type "SecureString" \
  --description "Riot Games API Key for Rift Rewind Backend" \
  --overwrite

# Retrieve API key (for testing)
aws ssm get-parameter \
  --name "/rift-rewind/riot-api-key" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text
```

### IAM Permissions Required

Your AWS user/role needs these permissions:

**For Lambda:**
- `lambda:*`
- `apigateway:*`
- `iam:CreateRole`, `iam:AttachRolePolicy`
- `ssm:GetParameter`
- `cloudformation:*`

**For App Runner:**
- `apprunner:*`
- `iam:CreateRole`, `iam:AttachRolePolicy`
- `ecr:*` (if using ECR)

**For ECS:**
- `ecs:*`
- `ec2:*`
- `elasticloadbalancing:*`
- `ecr:*`
- `iam:CreateRole`, `iam:AttachRolePolicy`
- `cloudformation:*`
- `ssm:GetParameter`

### Security Best Practices

1. **Never commit API keys** to version control
2. **Use .env files** for local development (add to `.gitignore`)
3. **Use AWS Systems Manager** for production secrets
4. **Enable CloudTrail** for audit logging
5. **Use security groups** to restrict network access
6. **Enable container insights** for ECS monitoring
7. **Rotate API keys** regularly
8. **Use HTTPS** in production (configure SSL certificate)

---

## 💰 Cost Analysis

### Lambda + API Gateway (FREE Tier)

**Free Tier Includes:**
- 1M requests per month (FREE)
- 400,000 GB-seconds compute time (FREE)
- API Gateway: 1M API calls (FREE for 12 months)

**After Free Tier:**
- $0.20 per 1M requests
- $0.0000166667 per GB-second
- API Gateway: $1.00 per million requests

**Example Monthly Cost (after free tier):**
- 5M requests: ~$5-10/month

### App Runner

**Pricing:**
- Compute: $0.064 per vCPU-hour
- Memory: $0.007 per GB-hour
- Build: $0.005 per build minute

**Example Monthly Cost:**
- 0.25 vCPU, 0.5 GB, 24/7: ~$25-30/month
- With auto-scaling (average 50% utilization): ~$40-50/month

### ECS Fargate

**Pricing:**
- vCPU: $0.04048 per vCPU-hour
- Memory: $0.004445 per GB-hour

**Example Monthly Cost:**
- 0.5 vCPU, 1 GB, 24/7, 1 task: ~$15-20/month
- With ALB: Add ~$16/month
- Total: ~$30-35/month

**Cost Optimization Tips:**
- Use Fargate Spot for 70% savings (non-critical workloads)
- Scale down during off-hours
- Use smaller task sizes
- Enable container insights only when needed

---

## 📊 Monitoring and Logging

### CloudWatch Logs

**Lambda:**
```bash
# View logs
aws logs tail /aws/lambda/rift-rewind-backend-dev-api --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/rift-rewind-backend-dev-api \
  --filter-pattern "ERROR"
```

**ECS:**
```bash
# View logs
aws logs tail /ecs/rift-rewind-backend --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /ecs/rift-rewind-backend \
  --filter-pattern "ERROR"
```

### CloudWatch Metrics

Monitor these key metrics:

**Lambda:**
- Invocations
- Duration
- Errors
- Throttles
- Concurrent executions

**App Runner:**
- Active instances
- Request count
- Response time
- HTTP status codes

**ECS:**
- CPU utilization
- Memory utilization
- Task count
- Target response time
- Unhealthy host count

### Setting Up Alarms

```bash
# Example: High error rate alarm for Lambda
aws cloudwatch put-metric-alarm \
  --alarm-name rift-rewind-high-errors \
  --alarm-description "Alert when error rate is high" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=rift-rewind-backend-dev-api
```

---

## 🔧 Troubleshooting

### Common Issues

#### Lambda Timeout Errors

**Problem**: Function times out after 30 seconds

**Solution**:
```yaml
# In serverless.yml, increase timeout
provider:
  timeout: 60  # Increase to 60 seconds
```

#### ECS Tasks Not Starting

**Problem**: Tasks fail health checks

**Solutions**:
1. Check CloudWatch logs for errors
2. Verify security groups allow traffic on port 8000
3. Ensure API key is correctly stored in Systems Manager
4. Check task definition has correct image URI

```bash
# View task failures
aws ecs describe-tasks \
  --cluster rift-rewind-dev-cluster \
  --tasks $(aws ecs list-tasks --cluster rift-rewind-dev-cluster --query 'taskArns[0]' --output text)
```

#### App Runner Build Failures

**Problem**: Build fails during deployment

**Solutions**:
1. Check `apprunner.yaml` syntax
2. Verify all dependencies in `requirements.txt`
3. Check build logs in App Runner console
4. Ensure Python version compatibility

#### API Key Not Working

**Problem**: 401 Unauthorized from Riot API

**Solutions**:
1. Verify API key is valid at [Riot Developer Portal](https://developer.riotgames.com/)
2. Check key is correctly stored in Systems Manager
3. Verify IAM role has `ssm:GetParameter` permission
4. Check environment variable is correctly set

```bash
# Test API key retrieval
aws ssm get-parameter \
  --name "/rift-rewind/riot-api-key" \
  --with-decryption
```

#### High Costs

**Problem**: Unexpected AWS charges

**Solutions**:
1. Check CloudWatch metrics for unusual traffic
2. Enable cost allocation tags
3. Set up billing alarms
4. Review CloudTrail for unauthorized access
5. Scale down or delete unused resources

```bash
# Set up billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-billing \
  --alarm-description "Alert when estimated charges exceed $50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold
```

### Debugging Commands

```bash
# Check Lambda function status
aws lambda get-function --function-name rift-rewind-backend-dev-api

# Check ECS service status
aws ecs describe-services \
  --cluster rift-rewind-dev-cluster \
  --services rift-rewind-service

# Check App Runner service status
aws apprunner describe-service --service-arn your-service-arn

# View recent CloudWatch logs
aws logs tail /aws/lambda/rift-rewind-backend-dev-api --since 1h

# Check CloudFormation stack status
aws cloudformation describe-stacks \
  --stack-name rift-rewind-dev-infrastructure
```

---

## 🌐 Current Deployment (Render)

Since AWS credits were not approved for this hackathon, the Rift Rewind Backend is currently deployed on **Render** for demonstration purposes.

### Why Render?

- Free tier available for hackathon projects
- Simple deployment from GitHub
- Automatic HTTPS
- No credit card required for basic tier
- Quick setup without AWS account complexity

### Render Deployment Details

The application is deployed with:
- **Service Type**: Web Service
- **Environment**: Python 3.12
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Environment Variables**: RIOT_API_KEY set in Render dashboard

### Migrating from Render to AWS

When AWS credits become available, migration is straightforward:

1. Choose your preferred AWS deployment method (Lambda, App Runner, or ECS)
2. Run the corresponding deployment script
3. Update your frontend to point to the new AWS endpoint
4. Test thoroughly
5. Decommission Render service

All AWS configurations are ready to use - no code changes needed!

---

## 📚 Additional Resources

### AWS Documentation

- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [AWS App Runner Developer Guide](https://docs.aws.amazon.com/apprunner/)
- [Amazon ECS Developer Guide](https://docs.aws.amazon.com/ecs/)
- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)

### Project Documentation

- [Main README](README.md) - Complete project documentation
- [Quick Start Guide](deployment/QUICK-START.md) - Fast deployment reference
- [Deployment Scripts](deployment/) - Automated deployment tools

### Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Review this troubleshooting guide
3. Verify AWS permissions and configuration
4. Test locally first: `python main.py`
5. Check API documentation at `/docs` endpoint

---

## 🎉 Conclusion

This project includes complete, production-ready AWS deployment configurations for three different deployment strategies. While the hackathon deployment uses Render due to AWS credit approval delays, all AWS infrastructure code is tested and ready for immediate deployment when needed.

Choose the deployment method that best fits your needs:
- **Lambda** for cost-free hackathon demos
- **App Runner** for production with minimal ops
- **ECS Fargate** for enterprise-grade control

All deployment scripts are automated and include error handling, validation, and helpful output messages to guide you through the process.
