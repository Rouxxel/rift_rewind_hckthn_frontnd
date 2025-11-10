# 🚀 Rift Rewind Deployment Guide

This guide covers multiple deployment options for the Rift Rewind frontend application.

---

## 📋 Table of Contents

- [Docker Deployment](#-docker-deployment)
- [Vercel Deployment](#-vercel-deployment)
- [AWS Deployment](#-aws-deployment)
- [Netlify Deployment](#-netlify-deployment)
- [Manual Deployment](#-manual-deployment)

---

## 🐳 Docker Deployment

### Prerequisites
- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)

### Quick Start

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**:
   ```
   http://localhost:3000
   ```

3. **Stop the application**:
   ```bash
   docker-compose down
   ```

### Manual Docker Build

1. **Build the Docker image**:
   ```bash
   docker build -t rift-rewind-frontend .
   ```

2. **Run the container**:
   ```bash
   docker run -d -p 3000:80 --name rift-rewind rift-rewind-frontend
   ```

3. **View logs**:
   ```bash
   docker logs -f rift-rewind
   ```

4. **Stop and remove**:
   ```bash
   docker stop rift-rewind
   docker rm rift-rewind
   ```

### Docker Configuration

#### Environment Variables

Create a `.env` file for Docker Compose:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000

# Environment
NODE_ENV=production
```

#### Custom Nginx Configuration

The `nginx.conf` file includes:
- Gzip compression for better performance
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Static asset caching (1 year)
- SPA routing support
- Health check endpoint at `/health`

#### Health Checks

The container includes health checks:
- **Endpoint**: `http://localhost/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

### Docker Hub Deployment

1. **Tag the image**:
   ```bash
   docker tag rift-rewind-frontend yourusername/rift-rewind:latest
   ```

2. **Push to Docker Hub**:
   ```bash
   docker login
   docker push yourusername/rift-rewind:latest
   ```

3. **Pull and run on any server**:
   ```bash
   docker pull yourusername/rift-rewind:latest
   docker run -d -p 80:80 yourusername/rift-rewind:latest
   ```

---

## ☁️ Vercel Deployment

### Automatic Deployment

1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `rift_frontend` directory as root

2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `rift_frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Set Environment Variables**:
   ```
   VITE_API_BASE_URL=https://your-backend-url.com
   VITE_ENVIRONMENT=production
   ```

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically deploy on every push to main

### Manual Deployment

```bash
cd rift_frontend
npm install -g vercel
vercel --prod
```

---

## 🌐 AWS Deployment

### Option 1: AWS S3 + CloudFront

1. **Build the application**:
   ```bash
   cd rift_frontend
   npm run build
   ```

2. **Create S3 bucket**:
   ```bash
   aws s3 mb s3://rift-rewind-frontend
   ```

3. **Upload build files**:
   ```bash
   aws s3 sync dist/ s3://rift-rewind-frontend --delete
   ```

4. **Configure bucket for static hosting**:
   ```bash
   aws s3 website s3://rift-rewind-frontend \
     --index-document index.html \
     --error-document index.html
   ```

5. **Create CloudFront distribution**:
   - Origin: Your S3 bucket
   - Default Root Object: `index.html`
   - Error Pages: 404 → /index.html (for SPA routing)

### Option 2: AWS Amplify

1. **Install Amplify CLI**:
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

2. **Initialize Amplify**:
   ```bash
   cd rift_frontend
   amplify init
   ```

3. **Add hosting**:
   ```bash
   amplify add hosting
   ```

4. **Deploy**:
   ```bash
   amplify publish
   ```

### Option 3: AWS ECS with Docker

1. **Push Docker image to ECR**:
   ```bash
   aws ecr create-repository --repository-name rift-rewind
   docker tag rift-rewind-frontend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/rift-rewind:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/rift-rewind:latest
   ```

2. **Create ECS task definition** and service

3. **Configure Application Load Balancer**

---

## 🎯 Netlify Deployment

### Automatic Deployment

1. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Import your GitHub repository

2. **Configure Build Settings**:
   - **Base directory**: `rift_frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `rift_frontend/dist`

3. **Set Environment Variables**:
   ```
   VITE_API_BASE_URL=https://your-backend-url.com
   ```

4. **Configure Redirects** (create `rift_frontend/public/_redirects`):
   ```
   /*    /index.html   200
   ```

### Manual Deployment

```bash
cd rift_frontend
npm install -g netlify-cli
netlify deploy --prod
```

---

## 🔧 Manual Deployment

### Build for Production

1. **Navigate to frontend directory**:
   ```bash
   cd rift_frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Output location**: `rift_frontend/dist/`

### Deploy to Any Static Host

The `dist` folder can be deployed to:
- **GitHub Pages**
- **Firebase Hosting**
- **Surge.sh**
- **Render**
- **DigitalOcean App Platform**
- Any web server (Apache, Nginx, etc.)

### Nginx Configuration (Manual)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/rift-rewind;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔐 Environment Configuration

### Development
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

### Production
```env
VITE_API_BASE_URL=https://api.riftrewind.com
VITE_ENVIRONMENT=production
```

### Docker
```env
VITE_API_BASE_URL=http://backend:8000
NODE_ENV=production
```

---

## 🧪 Testing Deployment

### Local Testing

1. **Build and preview**:
   ```bash
   cd rift_frontend
   npm run build
   npm run preview
   ```

2. **Test Docker build**:
   ```bash
   docker build -t rift-rewind-test .
   docker run -p 8080:80 rift-rewind-test
   ```

### Health Checks

- **Frontend**: `http://your-domain/`
- **Docker Health**: `http://your-domain/health`
- **API Connection**: Check browser console for API calls

---

## 📊 Performance Optimization

### Build Optimization

1. **Enable production mode**:
   ```bash
   NODE_ENV=production npm run build
   ```

2. **Analyze bundle size**:
   ```bash
   npm run build -- --mode analyze
   ```

### CDN Configuration

- **CloudFlare**: Add your domain to CloudFlare for free CDN
- **AWS CloudFront**: Configure with S3 bucket
- **Vercel/Netlify**: Automatic CDN included

### Caching Strategy

- **HTML**: No cache (always fresh)
- **JS/CSS**: 1 year cache with content hash
- **Images**: 1 year cache
- **API calls**: Handled by frontend cache utilities

---

## 🐛 Troubleshooting

### Docker Issues

**Issue**: Container won't start
```bash
docker logs rift-rewind
docker inspect rift-rewind
```

**Issue**: Port already in use
```bash
# Use different port
docker run -p 8080:80 rift-rewind-frontend
```

### Build Issues

**Issue**: Out of memory during build
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**Issue**: Module not found
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Deployment Issues

**Issue**: 404 on page refresh (SPA routing)
- Ensure server redirects all routes to `index.html`
- Check nginx/server configuration

**Issue**: API calls failing
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS configuration on backend
- Verify network connectivity

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd rift_frontend
          npm ci
      
      - name: Build
        run: |
          cd rift_frontend
          npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
      
      - name: Build Docker image
        run: docker build -t rift-rewind:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push rift-rewind:${{ github.sha }}
```

---

## 📝 Deployment Checklist

- [ ] Environment variables configured
- [ ] Backend API URL set correctly
- [ ] Build completes without errors
- [ ] Docker image builds successfully
- [ ] Health checks passing
- [ ] SPA routing works (page refresh)
- [ ] API calls successful
- [ ] Static assets loading
- [ ] HTTPS configured (production)
- [ ] CDN configured (optional)
- [ ] Monitoring setup (optional)

---

## 🆘 Support

For deployment issues:
- Check the [README.md](./README.md) for general setup
- Review Docker logs: `docker logs rift-rewind`
- Check browser console for errors
- Verify environment variables
- Test API connectivity

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Happy Deploying! 🚀**
