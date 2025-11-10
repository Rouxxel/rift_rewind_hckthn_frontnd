# CORS & Deployment Fix Guide

## 🔴 The Problem

You're getting `ERR_CONNECTION_REFUSED` and CORS errors because:

1. **Wrong URL**: Your frontend is trying to connect to `http://localhost:8000` (which doesn't exist in production)
2. **CORS Not Configured**: Even with the right URL, the backend needs to allow cross-origin requests from Vercel

## ✅ Solution (3 Steps)

### Step 1: CORS is Now Fixed in Backend ✓

I've added CORS middleware to `main.py`. The backend now accepts requests from:
- `http://localhost:3000` (local dev)
- `http://localhost:5173` (Vite)
- `https://*.vercel.app` (all Vercel deployments)
- All origins temporarily (remove `"*"` for production security)

### Step 2: Deploy Backend to Render.com

#### Option A: Quick Deploy (Recommended)

1. **Go to [Render.com](https://render.com)** and sign in
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repo**
4. **Configure:**
   ```
   Name: rift-rewind-backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. **Add Environment Variables:**
   ```
   RIOT_API_KEY=your-riot-api-key
   GEMINI_API_KEY=your-gemini-api-key
   ```
6. **Click "Create Web Service"**

Your backend will be deployed at: `https://rift-rewind-backend.onrender.com`

#### Option B: Using render.yaml (Better for CI/CD)

Create `render.yaml` in your root:

```yaml
services:
  - type: web
    name: rift-rewind-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: RIOT_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
    healthCheckPath: /
```

Then push to GitHub and connect in Render dashboard.

### Step 3: Update Frontend to Use Production URL

In your frontend code, change the API URL:

#### React/Vite Example

**Before:**
```javascript
const API_URL = "http://localhost:8000";
```

**After:**
```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

Then create `.env.production` in your frontend:
```env
VITE_API_URL=https://rift-rewind-backend.onrender.com
```

And `.env.development`:
```env
VITE_API_URL=http://localhost:8000
```

#### Or use environment detection:

```javascript
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://rift-rewind-backend.onrender.com'
  : 'http://localhost:8000';
```

## 🔧 Additional CORS Configuration (If Needed)

### Restrict Origins for Production Security

Once deployed, update `main.py` to only allow your specific domains:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://your-actual-app.vercel.app",  # Your production domain
        "https://your-preview-*.vercel.app",   # Preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Remove the `"*"` from `allow_origins` for better security.

## 🚀 Quick Deployment Checklist

- [x] CORS middleware added to backend
- [ ] Backend deployed to Render.com
- [ ] Environment variables set on Render
- [ ] Frontend updated with production API URL
- [ ] Frontend redeployed to Vercel
- [ ] Test the connection

## 🧪 Testing After Deployment

### 1. Test Backend Health

```bash
curl https://rift-rewind-backend.onrender.com/
```

Should return: `{"message": "Rift Rewind Backend is running!"}`

### 2. Test CORS Headers

```bash
curl -H "Origin: https://your-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://rift-rewind-backend.onrender.com/user/get_riot_puuid
```

Should return CORS headers in response.

### 3. Test from Frontend

Open browser console on your Vercel app and run:
```javascript
fetch('https://rift-rewind-backend.onrender.com/')
  .then(r => r.json())
  .then(console.log)
```

## 🐛 Troubleshooting

### Issue: Still getting CORS errors

**Solution 1**: Make sure you redeployed the backend after adding CORS middleware

**Solution 2**: Check Render logs for errors:
```bash
# In Render dashboard, go to Logs tab
```

**Solution 3**: Verify your frontend is using the correct URL (not localhost)

### Issue: Backend not starting on Render

**Check:**
1. Build logs in Render dashboard
2. Environment variables are set
3. Start command is correct: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Issue: 502 Bad Gateway

**Cause**: Backend crashed or not responding

**Solution**: Check Render logs for Python errors

### Issue: Slow first request (Cold Start)

**Cause**: Render free tier spins down after inactivity

**Solutions:**
- Upgrade to paid tier ($7/month)
- Use a cron job to ping your backend every 10 minutes
- Accept the 30-second cold start on free tier

## 💰 Render.com Pricing

- **Free Tier**: 
  - 750 hours/month
  - Spins down after 15 min inactivity
  - Cold start: ~30 seconds
  - Perfect for hackathons/demos

- **Starter ($7/month)**:
  - Always on
  - No cold starts
  - Better for production

## 🔐 Security Best Practices

1. **Remove `"*"` from CORS origins** after testing
2. **Use environment variables** for API keys (never commit them)
3. **Add rate limiting** (already configured in your backend)
4. **Use HTTPS only** in production

## 📝 Alternative Deployment Options

### AWS (Already Configured)

You have AWS deployment scripts in `/deployment`:
- Lambda (Free tier)
- App Runner (~$25/month)
- ECS Fargate (~$15/month)

See `deployment/DEPLOYMENT.md` for details.

### Railway.app

Similar to Render, also has free tier:
1. Connect GitHub repo
2. Set environment variables
3. Deploy automatically

### Fly.io

Good for global deployment:
```bash
fly launch
fly secrets set RIOT_API_KEY=xxx GEMINI_API_KEY=xxx
fly deploy
```

## 🎯 Recommended Setup

**For Hackathon/Demo:**
- Backend: Render.com (Free tier)
- Frontend: Vercel (Free tier)
- Total cost: $0

**For Production:**
- Backend: Render.com Starter ($7/month) or AWS App Runner
- Frontend: Vercel Pro (if needed)
- Database: If you add one later

## 📚 Resources

- [Render.com Docs](https://render.com/docs)
- [FastAPI CORS Guide](https://fastapi.tiangolo.com/tutorial/cors/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Need help?** Check the Render logs first, they usually show exactly what's wrong!
