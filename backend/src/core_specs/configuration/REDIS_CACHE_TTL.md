# Redis Cache TTL Mapping

TTLs are configured in [`config_file.json`](./config_file.json) under `redis_cache.ttl_seconds` (values in **seconds**). Key builders live in `src/resources/riot_cache_keys.py`.

| Config key | Default TTL | What it caches | UI / usage |
|---|---|---|---|
| `match` | 86400 (24h) | Immutable match details, participants, and timeline | Match History page |
| `match_ids` | 600 (10m) | List of recent match IDs for a player | Match History page |
| `ddragon` | 21600 (6h) | Champions and items from Data Dragon (shared by all users) | Game Assets; also reused by winrates |
| `puuid` | 3600 (60m) | Account lookup (`gameName#tag` → PUUID) | Login / auth, not Performance tabs |
| `summoner` | 1800 (30m) | Summoner profile (level, icon, IDs) | Dashboard header more than Performance tabs |
| `mastery` | 900 (15m) | Champion mastery entries for a player | Performance Analysis → Champion Mastery tab only |
| `winrates` | 300 (5m) | Champion win/pick/ban rates by rank/role (shared meta data) | Predictions page → Champion Winrates |

## Not Redis-cached (yet)

These Performance Analysis sections still call the backend/Riot on each miss (frontend localStorage may still apply):

- **Overview** — `get_player_performance`
- **Summoner Spells** — `get_summoner_spells_analysis`
- **Runes** — `get_runes_masteries`

## Changing TTLs

Edit `redis_cache.ttl_seconds` in `config_file.json`, then restart the backend.
