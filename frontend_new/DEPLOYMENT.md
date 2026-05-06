# Rift Rewind Frontend — Deployment Guide

The recommended way to deploy is via **Lovable**: click the **Publish** button (top right in the editor, or bottom right on mobile in Preview mode). This gives you a `*.lovable.app` URL immediately and lets you connect a custom domain afterwards via **Project Settings → Domains**. Frontend updates go live after clicking **Update** in the publish dialog.

This guide covers self-hosting alternatives (Vercel, Netlify, static hosts) and explains the environment configuration the app expects regardless of host.

## Environment Variables

The frontend reads two `VITE_`-prefixed variables. Both are optional — the app has built-in smart backend detection.

| Variable | Required | Example | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No (fallback) | `https://your-backend.onrender.com` | Last-resort backend URL when neither `localhost:8000` nor the hardcoded Render fallback responds |
| `VITE_ENVIRONMENT` | No | `production` | Informational; logged at startup |

### Smart backend detection

The app does **not** rely solely on `VITE_API_BASE_URL`. On first request it probes URLs in this order and caches the winner under `localStorage["rift_backend_url"]`:

- **Development mode** (`import.meta.env.DEV`):
  1. `http://localhost:8000`
  2. `https://rift-rewind-hckthn-backend.onrender.com`
  3. `VITE_API_BASE_URL`
- **Production build**:
  1. `https://rift-rewind-hckthn-backend.onrender.com`
  2. `http://localhost:8000` (effectively skipped)
  3. `VITE_API_BASE_URL`

To force a different backend in production, set `VITE_API_BASE_URL` and clear `localStorage["rift_backend_url"]` in the browser, or update the priority list in `src/services/api.ts`.

## Build Configuration

- **Framework**: Vite 5 + React 18 + TypeScript
- **Build command**: `npm run build`
- **Dev command**: `npm run dev`
- **Output directory**: `dist/`
- **Node version**: 18+ (20 recommended)

Local sanity check:

```bash
npm install
npm run build
npm run preview
```

## Vercel

### Option A — Vercel Dashboard
1. Import the repository at <https://vercel.com>.
2. Framework preset: **Vite**. Build command and output directory are auto-detected.
3. (Optional) Project Settings → **Environment Variables**:
   - `VITE_API_BASE_URL` = your backend URL
   - `VITE_ENVIRONMENT` = `production`
4. Deploy.

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
vercel env add VITE_API_BASE_URL
vercel env add VITE_ENVIRONMENT
vercel --prod
```

### SPA routing
This is a React Router SPA (`BrowserRouter`). On Vercel, Vite SPA routing works out of the box. If you ever see a 404 on deep-link refresh, add `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add a `public/_redirects` file with: `/* /index.html 200`
- Set the same environment variables in **Site settings → Environment**.

## Other Static Hosts

The `dist/` folder is a plain static bundle and works on:
- GitHub Pages (configure SPA fallback)
- AWS S3 + CloudFront (set the 404 response to serve `/index.html` with status 200)
- Firebase Hosting (`"rewrites": [{ "source": "**", "destination": "/index.html" }]`)
- Cloudflare Pages

In every case, configure the host to serve `index.html` for unknown routes so client-side routing works on refresh.

## Backend CORS

Whatever backend you point to must allow your deployed origin. Example FastAPI setup:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.lovable.app",
        "https://your-app.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

The frontend wraps CORS / network failures as `ApiError` and shows a "Connection Issue" panel with a retry button on the dashboard.

## Custom Domain (Lovable)

A project must be published before adding a custom domain. After publishing, go to **Project Settings → Domains** or open the publish dialog and choose **Add custom domain**. Follow the DNS instructions shown there.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| API calls all fail | Backend unreachable | Confirm backend is up; clear `localStorage["rift_backend_url"]`; set `VITE_API_BASE_URL` |
| CORS errors in console | Backend missing your origin | Add the deployed URL to `allow_origins` |
| 404 on page refresh | Host not configured for SPA | Add SPA rewrite rule (see per-host sections above) |
| Env vars ignored | Missing `VITE_` prefix | Vite only exposes vars prefixed with `VITE_` |
| Stale data after backend change | Cached responses in `rift_rewind_cache_*` | Clear localStorage or wait for the TTL to expire |
| Render cold start (~30s) | Free tier sleeping | First request takes longer; the detector waits up to 35s |

## Performance & Security Notes

- Vite handles code splitting, tree shaking, and asset hashing automatically.
- All `VITE_`-prefixed variables are bundled into the client — **never put secrets in them**. The Riot API key lives only on the backend.
- Always serve over HTTPS in production.
- The app uses `localStorage` only for non-sensitive session data (PUUID, Riot ID, response caches, AI conversation history).
