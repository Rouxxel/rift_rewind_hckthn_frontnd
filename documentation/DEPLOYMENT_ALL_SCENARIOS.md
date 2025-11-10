# 🚀 Complete Deployment Guide - All Scenarios

This guide covers running your app in **3 different scenarios**:
1. Local Development (`npm run dev`)
2. Docker (`docker-compose up`)
3. Vercel (Production)

## 📋 Environment Files Overview

| File | Used For | Backend URL |
|------|----------|-------------|
| `.env` | Local dev (`npm run dev`) | `http://localhost:8000` |
| `.env.production` | Vercel deployment | `https://rift-rewind-hckthn-backend.onrender.com` |
| `.env.docker` | Docker builds | `https://rift-rewind-hckthn-backend.onrender.com` |

---

## 🔧 Scenario 1: Local Development

### Prerequisites
- Node.js 18+ installed
- Backend running locally on port 8000

### Setup

1. **Start Backend Locally:**
   ```bash
   # In backend directory
   uvicorn main:app --reload --port 8000
   ```

2. **Start Frontend:**
   ```bash
   cd rift_frontend
   npm install
   npm run dev
   ```

3. **Access:**
   - Frontend: `http://localhost:5173` (or 3000)
   - Backend: `http://localhost:8000`

### How It Works
- Uses `rift_frontend/.env` file
- Vite proxy intercepts `/api/*` requests
- Proxy forwards to `http://localhost:8000`
- No CORS issues (same origin via proxy)

### Configuration
```env
# rift_frontend/.env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

---

## 🐳 Scenario 2: Docker

### Prerequisites
- Docker and Docker Compose installed

### Option A: Frontend Only (Backend on Render)

**Recommended for simplicity**

1. **Build and Run:**
   ```bash
   docker-compose up --build
   ```

2. **Access:**
   - Frontend: `http://localhost:3000`
   - Backend: `https://rift-rewind-hckthn-backend.onrender.com` (Render)

3. **Configuration:**
   ```env
   # rift_frontend/.env.docker
   VITE_API_BASE_URL=https://rift-rewind-hckthn-backend.onrender.com
   VITE_ENVIRONMENT=production
   ```

### Option B: Full Stack (Frontend + Backend in Docker)

**For complete local containerization**

1. **Update `.env.docker`:**
   ```env
   # rift_frontend/.env.docker
   VITE_API_BASE_URL=http://backend:8000
   VITE_ENVIRONMENT=production
   ```

2. **Uncomment backend service in `docker-compose.yml`:**
   ```yaml
   backend:
     build:
       context: .
       dockerfile: Dockerfile.backend
     container_name: rift-rewind-backend
     ports:
       - "8000:8000"
     environment:
       - RIOT_API_KEY=${RIOT_API_KEY}
       - GEMINI_API_KEY=${GEMINI_API_KEY}
     restart: unless-stopped
     networks:
       - rift-rewind-network
   ```

3. **Create `.env` in root with API keys:**
   ```env
   RIOT_API_KEY=your-riot-api-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Build and Run:**
   ```bash
   docker-compose up --build
   ```

5. **Access:**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:8000`

### Docker Commands

```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild specific service
docker-compose up --build frontend
```

---

## ☁️ Scenario 3: Vercel (Production)

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- Backend deployed on Render

### Setup

1. **Verify Backend is Running:**
   ```bash
   curl https://rift-rewind-hckthn-backend.onrender.com/
   ```
   Should return: `{"message":"Backend running successfully..."}`

2. **Commit Environment Files:**
   ```bash
   git add rift_frontend/.env.production
   git commit -m "Add production environment config"
   git push
   ```

3. **Vercel Auto-Deploys:**
   - Vercel detects the push
   - Builds using `.env.production`
   - Deploys automatically (~2 minutes)

4. **Access:**
   - Your Vercel URL (e.g., `https://your-app.vercel.app`)

### Configuration
```env
# rift_frontend/.env.production
VITE_API_BASE_URL=https://rift-rewind-hckthn-backend.onrender.com
VITE_ENVIRONMENT=production
```

### Optional: Vercel Environment Variables

For extra security, set in Vercel Dashboard:

1. Go to Project → Settings → Environment Variables
2. Add:
   ```
   Name: VITE_API_BASE_URL
   Value: https://rift-rewind-hckthn-backend.onrender.com
   Environment: Production, Preview
   ```

**Note:** The `.env.production` file works fine without this step.

---

## 🔄 Switching Between Scenarios

### From Local Dev → Docker
```bash
# Stop local dev (Ctrl+C)
docker-compose up --build
```

### From Docker → Local Dev
```bash
docker-compose down
cd rift_frontend
npm run dev
```

### From Local/Docker → Vercel
```bash
git add .
git commit -m "Deploy to Vercel"
git push
# Vercel auto-deploys
```

---

## 🧪 Testing Each Scenario

### Test Local Dev
```bash
cd rift_frontend
npm run dev
# Open http://localhost:5173
# Try searching for a player
# Check console for errors
```

### Test Docker
```bash
docker-compose up --build
# Open http://localhost:3000
# Try searching for a player
# Check: docker-compose logs -f
```

### Test Vercel
```bash
# After deployment completes
# Open your Vercel URL
# Try searching for a player
# Check browser console (F12)
```

---

## 🐛 Troubleshooting

### Local Dev Issues

**Problem:** Connection refused to localhost:8000
```bash
# Solution: Start backend first
uvicorn main:app --reload --port 8000
```

**Problem:** Port already in use
```bash
# Solution: Kill process or use different port
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or change port in vite.config.ts
```

### Docker Issues

**Problem:** Cannot connect to backend
```bash
# Check if backend container is running
docker-compose ps

# Check logs
docker-compose logs backend

# Verify network
docker network inspect rift-rewind-network
```

**Problem:** Build fails
```bash
# Clean rebuild
docker-compose down -v
docker-compose up --build --force-recreate
```

**Problem:** Changes not reflected
```bash
# Docker caches builds, force rebuild
docker-compose build --no-cache frontend
docker-compose up
```

### Vercel Issues

**Problem:** Still connecting to localhost
```bash
# Check build logs in Vercel dashboard
# Verify .env.production is committed
git ls-files | grep .env.production

# Check what URL is being used (add to code temporarily)
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
```

**Problem:** CORS errors
```bash
# Verify backend CORS is configured
curl -I https://rift-rewind-hckthn-backend.onrender.com/

# Check for Access-Control-Allow-Origin header
```

---

## 📁 File Structure

```
rift-rewind/
├── rift_frontend/
│   ├── .env                    # Local dev (localhost:8000)
│   ├── .env.production         # Vercel (Render backend)
│   ├── .env.docker            # Docker (Render backend or backend:8000)
│   ├── .env.example           # Documentation
│   ├── vite.config.ts         # Proxy for local dev
│   └── src/
│       └── config/
│           └── api.ts         # Uses VITE_API_BASE_URL
├── docker-compose.yml         # Docker orchestration
├── Dockerfile                 # Frontend Docker build
├── nginx.conf                 # Nginx config for Docker
└── .dockerignore             # Docker ignore rules
```

---

## ✅ Quick Reference

### Start Local Dev
```bash
# Terminal 1: Backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd rift_frontend && npm run dev
```

### Start Docker
```bash
docker-compose up --build
```

### Deploy to Vercel
```bash
git push
# Auto-deploys
```

### Check Backend Status
```bash
# Local
curl http://localhost:8000/

# Render
curl https://rift-rewind-hckthn-backend.onrender.com/
```

---

## 🎯 Environment Variable Priority

Vite loads environment files in this order (later overrides earlier):

1. `.env` - All environments
2. `.env.local` - All environments (ignored by git)
3. `.env.[mode]` - Specific mode (development/production)
4. `.env.[mode].local` - Specific mode (ignored by git)

**For our setup:**
- `npm run dev` → Uses `.env`
- `npm run build` → Uses `.env.production`
- Docker → Copies `.env.docker` to `.env.production` during build

---

## 🔐 Security Notes

1. **Never commit API keys** to `.env` files
2. **Use environment variables** in Vercel/Render for secrets
3. **`.env.local` files** are gitignored (use for local secrets)
4. **Production URLs** in `.env.production` are safe to commit

---

## 💡 Pro Tips

1. **Test production build locally:**
   ```bash
   cd rift_frontend
   npm run build
   npm run preview
   # Uses .env.production
   ```

2. **Debug environment variables:**
   ```javascript
   console.log('Mode:', import.meta.env.MODE);
   console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
   ```

3. **Docker hot reload (development):**
   ```yaml
   # Add to docker-compose.yml for dev
   volumes:
     - ./rift_frontend/src:/app/src
   ```

4. **Check which env file is used:**
   ```bash
   # Add to package.json scripts
   "dev:debug": "vite --mode development --debug"
   ```

---

## 🚀 Deployment Checklist

### Before Deploying

- [ ] Backend is deployed and accessible
- [ ] All environment files are configured
- [ ] Local dev works (`npm run dev`)
- [ ] Production build works (`npm run build && npm run preview`)
- [ ] Docker build works (`docker-compose up --build`)

### After Deploying

- [ ] Vercel deployment succeeded
- [ ] No console errors on production URL
- [ ] API calls work (test player search)
- [ ] All features functional

---

## 📞 Need Help?

1. **Check logs:**
   - Local: Browser console (F12)
   - Docker: `docker-compose logs -f`
   - Vercel: Dashboard → Deployments → Logs
   - Render: Dashboard → Service → Logs

2. **Verify URLs:**
   ```bash
   # Local backend
   curl http://localhost:8000/
   
   # Render backend
   curl https://rift-rewind-hckthn-backend.onrender.com/
   ```

3. **Check environment:**
   ```javascript
   // Add temporarily to your code
   console.log('Environment:', import.meta.env);
   ```

---

**Happy Deploying! 🎉**
