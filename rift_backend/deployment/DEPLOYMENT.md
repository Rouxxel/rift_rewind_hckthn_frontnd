# 🚀 Rift Rewind Backend - AWS Deployment Guide

This guide provides step-by-step instructions for deploying the Rift Rewind Backend to AWS using three different methods: Lambda + API Gateway (FREE), App Runner, and ECS Fargate.

## 📋 Prerequisites

Before deploying, ensure you have:

- **AWS Account** with appropriate permissions
- **AWS CLI** installed and configured (`aws configure`)
- **Docker** installed (for ECS deployment)
- **Node.js** installed (for Lambda deployment)
- **Git repository** set up (for App Runner)
- **Riot Games API Key** from [Riot Developer Portal](https://developer.riotgames.com/)

## 🆓 Option 1: Lambda + API Gateway (FREE)

**Best for:** Hackathons, demos, low-traffic applications
**Cost:** FREE within AWS Free Tier (1M requests/month)
**Scaling:** Automatic serverless scaling

### Quick Deploy
```bash
# Set your API key
export RIOT_API_KEY="your-riot-api-key-here"

# Navigate to deployment folder
cd deployment

# Deploy
chmod +x deploy-lambda-free.sh
./deploy-lambda-free.sh
```

### Manual Steps
1. **Install dependencies:**
   ```bash
   npm install -g serverless
   npm install serverless-python-requirements
   ```

2. **Set environment variables:**
   ```bash
   export RIOT_API_KEY="your-riot-api-key-here"
   ```

3. **Deploy:**
   ```bash
   serverless deploy
   ```

4. **Test:**
   ```bash
   curl https://your-api-gateway-url.amazonaws.com/dev/
   ```

## 💼 Option 2: App Runner (~$25-50/month)

**Best for:** Production applications, automatic CI/CD
**Cost:** ~$25-50/month depending on usage
**Scaling:** Automatic scaling with traffic

### Prerequisites
- Code must be in a **GitHub repository**
- Repository must be public or you need GitHub connection setup

### Quick Deploy
```bash
# Ensure code is pushed to GitHub
git add .
git commit -m "Ready for App Runner deployment"
git push origin main

# Navigate to deployment folder
cd deployment

# Deploy
chmod +x deploy-apprunner.sh
./deploy-apprunner.sh
```

### Manual Steps
1. **Push code to GitHub:**
   ```bash
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **Create App Runner service:**
   - Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
   - Click "Create service"
   - Choose "Source code repository"
   - Connect your GitHub account
   - Select your repository and branch
   - Use automatic deployment configuration
   - Set environment variables in the console

3. **Configure environment:**
   - Add `RIOT_API_KEY` in environment variables
   - Set `PYTHONUNBUFFERED=1`

## 🐳 Option 3: ECS Fargate (~$15-30/month)

**Best for:** Production applications, full container orchestration
**Cost:** ~$15-30/month depending on usage
**Scaling:** Manual or automatic scaling

### Quick Deploy
```bash
# Set your API key
export RIOT_API_KEY="your-riot-api-key-here"

# Navigate to deployment folder
cd deployment

# Deploy everything
chmod +x deploy-ecs.sh
./deploy-ecs.sh
```

### Manual Steps
1. **Deploy infrastructure:**
   ```bash
   aws cloudformation deploy \
     --template-file ../cloudformation/ecs-infrastructure.yaml \
     --stack-name rift-rewind-dev-infrastructure \
     --parameter-overrides ProjectName=rift-rewind Environment=dev \
     --capabilities CAPABILITY_NAMED_IAM
   ```

2. **Build and push Docker image:**
   ```bash
   # Get ECR login
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

   # Build and push
   docker build -t rift-rewind-backend .
   docker tag rift-rewind-backend:latest YOUR_ECR_URI:latest
   docker push YOUR_ECR_URI:latest
   ```

3. **Create ECS service:**
   ```bash
   # Register task definition
   aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

   # Create service
   aws ecs create-service \
     --cluster rift-rewind-dev-cluster \
     --service-name rift-rewind-service \
     --task-definition rift-rewind-backend \
     --desired-count 1 \
     --launch-type FARGATE
   ```

## 🔐 Security Best Practices

### Store API Key Securely
```bash
# Store in AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name "/rift-rewind/riot-api-key" \
  --value "your-riot-api-key" \
  --type "SecureString"
```

### Environment Variables
Never commit API keys to git. Use:
- `.env` file for local development (add to `.gitignore`)
- AWS Systems Manager for production
- Environment variables in deployment platforms

## 📊 Cost Comparison

| Method | Monthly Cost | Free Tier | Best For |
|--------|-------------|-----------|----------|
| **Lambda + API Gateway** | **$0-5** | ✅ 1M requests | Hackathons, demos |
| **App Runner** | **$25-50** | ❌ | Production, CI/CD |
| **ECS Fargate** | **$15-30** | ❌ | Enterprise, scaling |

## 🧪 Testing Your Deployment

After deployment, test your API:

```bash
# Health check
curl https://your-api-url/

# API documentation
curl https://your-api-url/docs

# Test endpoint
curl -X POST https://your-api-url/user/get_riot_puuid \
  -H "Content-Type: application/json" \
  -d '{"game_name": "TestUser", "tag_line": "NA1", "region": "americas"}'
```

## 🔧 Troubleshooting

### Common Issues

1. **API Key not working:**
   - Verify key is valid at [Riot Developer Portal](https://developer.riotgames.com/)
   - Check environment variable is set correctly
   - Ensure parameter is stored in AWS Systems Manager

2. **Lambda timeout:**
   - Increase timeout in `serverless.yml`
   - Check CloudWatch logs for errors

3. **ECS service not starting:**
   - Check ECS console for task failures
   - Verify security groups allow traffic
   - Check CloudWatch logs

4. **App Runner build failing:**
   - Verify `apprunner.yaml` configuration
   - Check build logs in App Runner console
   - Ensure all dependencies in `requirements.txt`

### Monitoring and Logs

- **Lambda:** CloudWatch Logs automatically created
- **App Runner:** Built-in logging in App Runner console
- **ECS:** CloudWatch Logs at `/ecs/rift-rewind-backend`

## 🚀 Next Steps

After successful deployment:

1. **Set up custom domain** (optional)
2. **Configure SSL certificate** for HTTPS
3. **Set up monitoring** and alerts
4. **Implement CI/CD pipeline** for automatic deployments
5. **Add caching** with Redis/ElastiCache for better performance

## 📞 Support

If you encounter issues:
1. Check the deployment logs
2. Verify AWS permissions
3. Test locally first with `python main.py`
4. Check API documentation at `/docs` endpoint

---

**Happy deploying! 🎉**