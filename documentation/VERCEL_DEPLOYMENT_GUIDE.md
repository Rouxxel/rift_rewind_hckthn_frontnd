# 🚀 Vercel Deployment Fix - Complete Guide

## ✅ What I've Fixed

1. Created `.env.production` with your Render backend URL
2. Updated `.env` for local development to use `http://localhost:8000`
3. Your Vite proxy is already configured for local dev

## 🎯 Current Setup

### Local Development
- Frontend: `http://localhost:5173` (or 3000)
- Backend: `http://localhost:8000`
- Uses Vite proxy (`/api` → backend)

### Production (Vercel)
- Frontend: Your Vercel URL
- Backend: `https://rift-rewind-hckthn-backend.onrender.com`
- Direct connection (no proxy)

## 📋 Deployment Steps

### Step 1: Verify Backend is Running

Test your backend:
```bash
curl https://rift-rewind-hckthn-backend.onrender.com/
```

Expected response:
```json
{"message": "Rift Rewind Backend is running!"}
```

If this fails, your backend needs to be deployed first. See `CORS_AND_DEPLOYMENT_FIX.md`.

### Step 2: Commit and Push Changes

```bash
cd rift_frontend
git add .env.production .env
git commit -m "Fix: Configure production API URL for Vercel deployment"
git push
```

### Step 3: Vercel Will Auto-Deploy

Vercel automatically deploys when you push to your main branch.

### Step 4: (Optional) Set Environment Variables in Vercel Dashboard

For extra security, you can also set environment variables in Vercel:

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   Name: VITE_API_BASE_URL
   Value: https://rift-rewind-hckthn-backend.onrender.com
   Environment: Production, Preview
   ```
5. Redeploy (or it will use on next deployment)

**Note:** The `.env.production` file will work fine without this step.

## 🧪 Testing

### Test Locally First

```bash
# In rift_frontend directory
npm run dev
```

Open `http://localhost:5173` and test the app. It should connect to your local backend at `http://localhost:8000`.

### Test Production Build Locally

```bash
npm run build
npm run preview
```

This will use the production environment variables and connect to your Render backend.

### Test on Vercel

After deployment completes:
1. Open your Vercel URL
2. Open browser DevTools (F12) → Console
3. Try searching for a player
4. Check for any errors

## 🐛 Troubleshooting

### Issue: Still getting ERR_CONNECTION_REFUSED

**Check:**
1. Is your backend actually running?
   ```bash
   curl https://rift-rewind-hckthn-backend.onrender.com/
   ```

2. Check Vercel build logs:
   - Go to Vercel dashboard → Deployments → Click latest deployment → View logs
   - Look for environment variable values

3. Check browser console:
   - What URL is it trying to connect to?
   - Add this temporarily to your code to debug:
     ```javascript
     console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
     ```

### Issue: CORS Error

**Solution:**
Your backend already has CORS configured. If you still get CORS errors:

1. Make sure you're using HTTPS (not HTTP) for the backend URL
2. Check backend logs on Render for errors
3. Verify the backend CORS middleware includes your Vercel domain

### Issue: Backend is slow (Cold Start)

**Cause:** Render free tier spins down after 15 minutes of inactivity.

**Solutions:**
- First request after inactivity takes ~30 seconds (this is normal)
- Upgrade to Render paid tier ($7/month) for always-on
- Or accept the cold start delay on free tier

### Issue: Environment variable not working

**Check:**
1. File is named exactly `.env.production` (not `.env.prod`)
2. Variables start with `VITE_` prefix
3. You rebuilt the app after creating the file
4. No typos in the URL

## 📁 File Structure

```
rift_frontend/
├── .env                    # Local development (localhost:8000)
├── .env.production         # Production (Render backend)
├── .env.example           # Example/documentation
├── vite.config.ts         # Proxy for local dev
└── src/
    └── config/
        └── api.ts         # Uses VITE_API_BASE_URL
```

## 🔍 How It Works

### Development Mode (`npm run dev`)
1. Vite reads `.env`
2. `VITE_API_BASE_URL=/api`
3. Vite proxy intercepts `/api/*` requests
4. Proxy forwards to `http://localhost:8000`

### Production Mode (Vercel)
1. Vite reads `.env.production`
2. `VITE_API_BASE_URL=https://rift-rewind-hckthn-backend.onrender.com`
3. Direct connection to backend (no proxy)
4. Backend CORS allows Vercel domain

## ✅ Verification Checklist

- [ ] Backend is deployed and responding at Render URL
- [ ] `.env.production` created with correct backend URL
- [ ] `.env` updated for local development
- [ ] Changes committed and pushed to GitHub
- [ ] Vercel auto-deployed (check dashboard)
- [ ] Tested on Vercel URL - no connection errors
- [ ] Tested on Vercel URL - API calls work

## 🎉 Success Indicators

When everything works:
- ✅ No console errors about connection refused
- ✅ No CORS errors
- ✅ Player search works
- ✅ Match history loads
- ✅ All API calls succeed

## 📞 Still Need Help?

1. **Check Vercel Logs:**
   - Vercel Dashboard → Your Project → Deployments → Latest → Logs

2. **Check Render Logs:**
   - Render Dashboard → Your Service → Logs

3. **Check Browser Console:**
   - F12 → Console tab
   - Look for the actual error message

4. **Common Issues:**
   - Backend not deployed → Deploy to Render first
   - Wrong URL → Check for typos
   - CORS not configured → Check backend `main.py`
   - Environment variable not loaded → Rebuild app

## 💡 Pro Tips

1. **Always test production build locally first:**
   ```bash
   npm run build && npm run preview
   ```

2. **Use console.log to debug:**
   ```javascript
   console.log('Environment:', import.meta.env.MODE);
   console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
   ```

3. **Check Network tab in DevTools:**
   - See exactly what URLs are being called
   - Check request/response headers

4. **Render free tier cold starts:**
   - First request after 15 min = slow
   - This is normal, not an error

---

## 🚀 Quick Deploy Command

```bash
cd rift_frontend
git add .env.production .env
git commit -m "Fix: Configure production API URL"
git push
```

Then wait ~2 minutes for Vercel to deploy. Done! 🎉
