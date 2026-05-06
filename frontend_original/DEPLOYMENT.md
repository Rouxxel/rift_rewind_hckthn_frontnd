# Rift Rewind Frontend Deployment Guide

## Environment Configuration

The frontend is configured to work with different backend deployments through environment variables.

### Local Development
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

### AWS Deployment
```bash
VITE_API_BASE_URL=https://your-aws-api-gateway-url.amazonaws.com
VITE_ENVIRONMENT=production
```

### Render Deployment
```bash
VITE_API_BASE_URL=https://your-app-name.onrender.com
VITE_ENVIRONMENT=production
```

## Vercel Deployment

### 1. Prepare for Deployment

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Build the project locally** to test:
   ```bash
   npm run build
   npm run preview
   ```

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add VITE_API_BASE_URL
vercel env add VITE_ENVIRONMENT

# Redeploy with environment variables
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set environment variables in the dashboard:
   - `VITE_API_BASE_URL`: Your backend URL
   - `VITE_ENVIRONMENT`: `production`
4. Deploy

### 3. Environment Variables Setup

In Vercel dashboard, add these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://your-backend-url.com` | Backend API URL |
| `VITE_ENVIRONMENT` | `production` | Environment mode |

### 4. Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Backend URL Configuration

### Switching Between Backends

To switch between different backend deployments, simply update the `VITE_API_BASE_URL` environment variable:

#### For AWS Lambda/API Gateway:
```
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

#### For AWS App Runner:
```
VITE_API_BASE_URL=https://abc123.us-east-1.awsapprunner.com
```

#### For Render:
```
VITE_API_BASE_URL=https://your-app-name.onrender.com
```

#### For Local Development:
```
VITE_API_BASE_URL=http://localhost:8000
```

## Build Configuration

The project uses Vite for building. Key configurations:

- **Output Directory**: `dist/`
- **Build Command**: `npm run build`
- **Dev Command**: `npm run dev`
- **Node Version**: 18.x or higher

## CORS Configuration

The frontend handles CORS through the backend. Ensure your backend is configured to accept requests from your Vercel domain:

```python
# In your FastAPI backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Common Issues

1. **API calls failing**: Check that `VITE_API_BASE_URL` is correctly set
2. **CORS errors**: Ensure backend allows your Vercel domain
3. **Build failures**: Check Node.js version compatibility
4. **Environment variables not working**: Ensure they start with `VITE_`

### Debug Steps

1. Check environment variables in Vercel dashboard
2. Verify backend is accessible from browser
3. Check browser console for errors
4. Test API endpoints directly

## Performance Optimization

The build is optimized for production with:
- Code splitting
- Tree shaking
- Asset optimization
- Gzip compression (handled by Vercel)

## Security Considerations

- Environment variables are exposed to the client (prefixed with `VITE_`)
- Never store sensitive data in frontend environment variables
- Use HTTPS for all API communications
- Implement proper authentication flow