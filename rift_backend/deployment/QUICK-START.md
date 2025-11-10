# 🚀 Quick Start - AWS Deployment

## Prerequisites Checklist

- [ ] AWS Account with CLI configured (`aws configure`)
- [ ] Riot Games API Key from [developer portal](https://developer.riotgames.com/)
- [ ] Set `RIOT_API_KEY` in `.env` file or environment

## 🆓 Option 1: Lambda (FREE) - Recommended for Hackathons

```bash
# Windows
set RIOT_API_KEY=your-api-key-here
cd deployment
npm install -g serverless
npm install serverless-python-requirements
serverless deploy

# Linux/Mac
export RIOT_API_KEY="your-api-key-here"
cd deployment
./deploy-lambda-free.sh
```

**Result:** FREE serverless API at `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/`

## 💼 Option 2: App Runner (~$25-50/month)

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy via script (Linux/Mac):**
   ```bash
   cd deployment
   ./deploy-apprunner.sh
   ```

3. **Or deploy manually:**
   - Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
   - Create service from GitHub repository
   - Use `apprunner.yaml` configuration

## 🐳 Option 3: ECS Fargate (~$15-30/month)

**Requirements:** Docker installed

```bash
# Linux/Mac
cd deployment
./deploy-ecs.sh

# Windows - run commands manually from deploy-ecs.sh
```

## 🧪 Test Your Deployment

```bash
# Health check
curl https://your-api-url/

# API docs
curl https://your-api-url/docs

# Test endpoint
curl -X POST https://your-api-url/user/get_riot_puuid \
  -H "Content-Type: application/json" \
  -d '{"game_name": "TestUser", "tag_line": "NA1", "region": "americas"}'
```

## 📁 Files Created for Deployment

### Lambda + API Gateway
- `lambda_handler.py` - Lambda entry point
- `serverless.yml` - Serverless Framework config
- `package.json` - Node.js dependencies

### App Runner
- `apprunner.yaml` - App Runner configuration

### ECS Fargate
- `DOCKERFILE` - Enhanced multi-stage Docker build
- `ecs-task-definition.json` - ECS task configuration
- `ecs-service-definition.json` - ECS service configuration
- `cloudformation/ecs-infrastructure.yaml` - Infrastructure as code

### Deployment Scripts (in `deployment/` folder)
- `deploy-lambda-free.sh` - Lambda deployment automation
- `deploy-apprunner.sh` - App Runner deployment automation
- `deploy-ecs.sh` - ECS deployment automation
- `validate-deployment.sh` - Prerequisites validation

## 🔧 Windows Users

Since you're on Windows, you'll need to run the deployment commands manually or use Git Bash/WSL for the shell scripts.

For Lambda deployment on Windows:
```cmd
set RIOT_API_KEY=your-api-key-here
cd deployment
npm install -g serverless
npm install serverless-python-requirements
serverless deploy
```

## 📖 Need More Details?

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive step-by-step instructions, troubleshooting, and advanced configuration options.

---

**Happy deploying! 🎉**