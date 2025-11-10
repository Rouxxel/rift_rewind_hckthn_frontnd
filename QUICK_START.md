# 🚀 Quick Start Guide

## 🧠 Smart Backend Detection

Your app now has **intelligent backend detection**! It automatically finds and uses the best available backend:

1. ✅ **Render backend** (most likely) - Always available
2. ✅ **Localhost** (if running) - For local development
3. ✅ **Cached backend** (from previous session) - Fastest

**This means you can run the app with or without a local backend!**

---

Choose how you want to run Rift Rewind:

## 🔧 Option 1: Local Development

**Best for:** Active development, debugging, hot reload

```bash
# Windows
start-local.bat

# Or manually:
cd rift_frontend
npm run dev
```

**Requirements:**
- Node.js 18+ installed
- *(Optional)* Backend running on `http://localhost:8000`

**Backend:** Automatically uses Render backend OR localhost if available

**Access:** `http://localhost:5173`

---

## 🐳 Option 2: Docker

**Best for:** Testing production build, consistent environment

```bash
# Windows
start-docker.bat

# Or manually:
docker-compose up --build
```

**Requirements:**
- Docker Desktop installed and running

**Access:** `http://localhost:3000`

---

## ☁️ Option 3: Vercel (Production)

**Best for:** Live deployment, sharing with others

```bash
git add .
git commit -m "Deploy to production"
git push
```

**Requirements:**
- GitHub repo connected to Vercel
- Backend deployed on Render

**Access:** Your Vercel URL (e.g., `https://your-app.vercel.app`)

---

## 📋 Environment Files

| Scenario | File Used | Backend URL |
|----------|-----------|-------------|
| Local Dev | `.env` | `http://localhost:8000` |
| Docker | `.env.docker` | `https://rift-rewind-hckthn-backend.onrender.com` |
| Vercel | `.env.production` | `https://rift-rewind-hckthn-backend.onrender.com` |

---

## ✅ Verify Setup

### Check Backend
```bash
# Local
curl http://localhost:8000/

# Render (Production)
curl https://rift-rewind-hckthn-backend.onrender.com/
```

### Check Frontend
1. Open the app in your browser
2. Press F12 to open DevTools
3. Try searching for a player
4. Check Console tab for errors

---

## 🆘 Common Issues

### Local Dev: "Connection Refused"
**Solution:** Start your backend first
```bash
uvicorn main:app --reload --port 8000
```

### Docker: "Cannot connect to Docker daemon"
**Solution:** Start Docker Desktop

### Vercel: "CORS Error"
**Solution:** Backend is configured correctly. Check:
1. Backend is running: `curl https://rift-rewind-hckthn-backend.onrender.com/`
2. `.env.production` is committed: `git ls-files | grep .env.production`

---

## 📚 Detailed Documentation

- **All Scenarios:** See `DEPLOYMENT_ALL_SCENARIOS.md`
- **Vercel Specific:** See `VERCEL_DEPLOYMENT_GUIDE.md`
- **CORS & Backend:** See `CORS_AND_DEPLOYMENT_FIX.md`

---

## 🎯 Quick Commands

```bash
# Local development
cd rift_frontend && npm run dev

# Docker
docker-compose up --build

# Stop Docker
docker-compose down

# Deploy to Vercel
git push

# Test production build locally
cd rift_frontend && npm run build && npm run preview
```

---

**Need help?** Check the detailed guides or open browser DevTools (F12) to see error messages.
