# Security Posture — Rift Rewind

This document summarizes the security controls applied to this project and what remains as accepted risk.

## Architecture Context

- **No database** — no user data is persisted server-side
- **No authentication** — the API is public (rate-limited) since it proxies Riot API data
- **Secrets** — RIOT_API_KEY, GEMINI_API_KEY stored server-side only (env vars)
- **Frontend** — static SPA served via Nginx or Vercel; all state is in-browser (localStorage)
- **Session model** — ephemeral; once the browser tab closes, data is gone

## Controls Implemented

### Backend (FastAPI)

| Control | Status | Notes |
|---------|--------|-------|
| CORS origin allowlist | ✅ | Environment-specific; no wildcard `*` |
| Rate limiting (slowapi) | ✅ | Per-endpoint limits keyed by client IP |
| Security response headers | ✅ | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Input sanitization utilities | ✅ | `src/utils/sanitizer.py` for prompts, names, regions |
| Swagger/ReDoc disabled in prod | ✅ | `ENVIRONMENT=production` hides docs |
| No secrets in source code | ✅ | Env vars + AWS SSM fallback |
| Request timeout (httpx) | ✅ | 10s timeout on all outbound Riot API calls |

### Frontend (Nginx)

| Control | Status | Notes |
|---------|--------|-------|
| Content-Security-Policy | ✅ | Restricts script, style, img, connect sources |
| X-Frame-Options DENY | ✅ | Prevents clickjacking |
| X-Content-Type-Options nosniff | ✅ | Prevents MIME confusion |
| Referrer-Policy | ✅ | strict-origin-when-cross-origin |
| Permissions-Policy | ✅ | Disables camera, mic, geolocation, payment |
| HSTS | ⚠️ | Commented out — enable when serving HTTPS in production |
| Static asset caching | ✅ | 1-year immutable cache for hashed assets |

### CI/CD (GitHub Actions)

| Workflow | Triggers | Jobs |
|----------|----------|------|
| `frontend.yml` | PR + push to main (frontend paths) | lint, test, build, dependency audit, secret pattern check |
| `backend.yml` | PR + push to main (backend paths) | syntax check, compile, import verification, pip-audit, secret pattern check |
| `security.yml` | All PRs + weekly schedule | gitleaks secret scan, dependency review, Docker image Trivy scan |
| Dependabot | Weekly | npm, pip, and GitHub Actions version bumps |

## Accepted Risks / Not Applicable

| Risk | Rationale |
|------|-----------|
| No user authentication | API proxies public Riot data; no user accounts or private data |
| No database security (RLS, encryption at rest) | No database exists |
| No file upload handling | No upload endpoints |
| No CSRF protection | No cookies used for auth; frontend uses fetch with JSON |
| localStorage data exposure | Only holds publicly available Riot data (PUUID, match IDs); no secrets |
| Rate limit bypass via IP rotation | Accepted — Riot API key has its own rate limits as a second layer |

## Before Production Deployment

- [ ] Set `ENVIRONMENT=production` in the backend
- [ ] Remove `http://localhost:*` from CORS origins (handled automatically by env check)
- [ ] Enable HSTS in nginx.conf (uncomment the line)
- [ ] Verify Render/hosting platform enforces HTTPS
- [ ] Rotate Riot API key if it was ever exposed
- [ ] Review `ALLOWED_ORIGINS` env var for any additional frontend domains
