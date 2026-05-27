# Rift Rewind — LoL Coach (Frontend)

A retro-themed React dashboard that turns Riot API data into actionable League of Legends coaching. The app authenticates a player by Riot ID, then surfaces ranked stats, performance analytics, match history, win-rate predictions, and a champion/item explorer — all with an integrated AI assistant that understands the page you're on.

## Features

- **Riot ID authentication** — sign in with `gameName#tagLine` + region, PUUID stored locally
- **Dashboard hub** — summoner header, ranked overview across queues, and tiles for each section
- **Performance Analysis** — overall stats, role distribution, champion mastery, summoner-spell and rune effectiveness
- **Match History** — recent matches with team comp, timeline, and per-match prediction
- **Predictions** — champion win-rates and head-to-head match-outcome forecasting
- **Game Assets** — searchable champion and item explorers with ability details
- **AI Assistant** — page-aware chatbot with localStorage context injection and per-page conversation history (Markdown rendered)
- **Smart backend detection** — tries `localhost`, then a Render fallback, then `VITE_API_BASE_URL`, caching the winner

## Tech Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS v3** with a custom retro design system (semantic HSL tokens, `BevelPanel`, `GlossButton`, `RuneDivider`)
- **shadcn/ui** primitives (Radix-based)
- **React Router v6** for routing, **TanStack Query** for data caching
- **react-markdown** for AI responses
- **Recharts** for charts
- **Vitest** + **Testing Library** for tests
- **localStorage** for session, backend URL cache, and per-page caches (`rift_rewind_cache_*`)

## Quick Start

### Prerequisites
- Node.js 18+
- A running Rift Rewind backend (local on `:8000`, or the hosted Render instance)

### Installation

```bash
npm install
cp .env.example .env   # optional: edit VITE_API_BASE_URL
npm run dev
```

Open <http://localhost:5173>.

## Available Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run build:dev` — development-mode build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
- `npm test` — run Vitest once
- `npm run test:watch` — Vitest in watch mode

## Environment Configuration

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

`VITE_API_BASE_URL` is the **last-resort** fallback — the app first tries `http://localhost:8000` (in dev) or the hosted Render URL (in prod), then falls back to this value. The winning URL is cached in localStorage under `rift_backend_url`.

## Routing

```
/                         → Landing (Riot ID auth)
/dashboard                → Hub: summoner header + ranked overview + section tiles
/dashboard/performance    → Performance Analysis
/dashboard/matches        → Match History
/dashboard/predictions    → Predictions
/dashboard/assets         → Game Assets (champions + items)
*                         → NotFound
```

All `/dashboard/*` routes are wrapped in `<ProtectedRoute>`, which redirects to `/` when no PUUID is in storage.

## Project Structure

```
src/
├── assets/                       # Logos, helmet, static images
├── components/
│   ├── AIAssistant.tsx           # Page-aware chatbot
│   ├── ProtectedRoute.tsx        # Auth gate
│   ├── dashboard/                # Feature components
│   │   ├── PerformanceAnalysis.tsx
│   │   ├── MatchHistory.tsx
│   │   ├── Predictions.tsx
│   │   ├── GameAssets.tsx
│   │   ├── ChampionDetails.tsx
│   │   └── ItemDetails.tsx
│   ├── layout/                   # Shells, headers, footer
│   ├── ui-retro/                 # BevelPanel, GlossButton, RuneDivider
│   └── ui/                       # shadcn/ui primitives
├── config/api.ts                 # Endpoint map + REGIONS
├── context/AuthContext.tsx       # PUUID + credentials context
├── hooks/                        # use-mobile, use-toast
├── pages/                        # Landing, Dashboard, *Page wrappers, NotFound
├── services/
│   ├── api.ts                    # Smart backend detection + API client
│   └── championCache.ts          # Champion list/abilities cache
├── styles/legacy.css             # Legacy table/grid responsive styles
├── test/                         # Vitest setup + examples
├── types/user.ts
├── utils/
│   ├── cache.ts                  # CacheManager + CACHE_KEYS (TTL'd)
│   └── storage.ts                # User credentials/data helpers
├── index.css                     # Design tokens (HSL)
└── main.tsx
```

## Backend API

The frontend hits the FastAPI Rift Rewind backend. Endpoint paths live in `src/config/api.ts`:

- **User**: `get_riot_puuid`, `get_summoner_info`, `get_lol_match_ids`, `get_champion_mastery`, `get_ranked_stats`, `get_summoner_spells_analysis`, `get_runes_masteries`
- **Match**: `get_lol_match_details`, `get_lol_match_participants_info`, `get_match_timeline`
- **Analytics**: `get_player_performance`, `get_champion_winrates`
- **Predictions**: `get_match_outcome`
- **Game Assets**: `get_lol_champions`, `get_lol_items`, `get_champion_abilities`
- **Analysis**: `get_team_composition`
- **AI**: `POST /ai/generate_ai_response` — body `{ prompt, context_data?, conversation_history? }`

## LocalStorage Keys

- `rift_rewind_user_credentials` — `{ gameName, tagLine, region }`
- `rift_rewind_user_data` — `{ puuid, gameName, tagLine }`
- `rift_backend_url` — last working backend URL
- `rift_rewind_cache_*` — per-page response caches with TTL (managed by `utils/cache.ts`)
- `ai_chat_<page>` — per-page AI conversation history

## Design System

All colors are HSL semantic tokens defined in `src/index.css` and mapped in `tailwind.config.ts`. Components consume tokens (`bg-card`, `text-foreground`, `border-border`, `bg-gradient-coral`, etc.) — no hardcoded color classes. Retro primitives (`BevelPanel`, `GlossButton`, `RuneDivider`) live under `src/components/ui-retro/`.

## Deployment

### Docker Deployment

The frontend includes Docker configuration files for containerized deployment:

- **Dockerfile** - Multi-stage build configuration (Node.js builder + Nginx server)
- **docker-compose.yml** - Docker Compose configuration for running the frontend service
- **nginx.conf** - Nginx configuration for serving the built React app
- **.dockerignore** - Files to exclude from Docker build context

#### Quick Start with Docker

**Windows (Batch Script):**
```bash
start-docker.bat
```

**Manual Docker Commands:**
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access at http://localhost:3000
```

#### Local Development

**Windows (Batch Script):**
```bash
start-local.bat
```

**Manual Commands:**
```bash
cd rift_frontend
npm run dev
```

### Other Deployment Options

Deploy directly from Lovable via the **Publish** button (top right of the editor). Frontend changes require clicking **Update** in the publish dialog to go live.

For self-hosting on Vercel, Netlify, etc., see [DEPLOYMENT.md](./DEPLOYMENT.md).

## License

Part of the Rift Rewind hackathon submission.
