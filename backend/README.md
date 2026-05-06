# Rift Rewind Backend

A FastAPI-based backend service for League of Legends data analysis, built for the Rift Rewind hackathon. This service provides a comprehensive REST API that interfaces with Riot Games' API to fetch player statistics, match history, champion information, and game assets where almost all avaialble endpoints provided by Riot's API have been implemented.

## Table of Contents

- [Purpose](#purpose)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [🚀 AWS Deployment Options](#-aws-deployment-options)
- [Docker Deployment](#docker-deployment-localself-hosted)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Rate Limiting](#rate-limiting)
- [Logging](#logging)
- [Contributing](#contributing)

## Purpose

Rift Rewind Backend serves as a middleware layer between client applications and the Riot Games API, providing:

- **Player Analytics**: Fetch summoner information, match history, and champion mastery data
- **Match Analysis**: Detailed match information and participant statistics
- **Game Assets**: Champion and item data for enriched user experiences
- **Rate Management**: Intelligent rate limiting to respect Riot API constraints
- **Data Processing**: Clean, structured responses optimized for frontend consumption

## Features

### Core Functionality
- ✅ Riot ID and summoner information lookup
- ✅ Match history retrieval and analysis
- ✅ Champion mastery statistics
- ✅ Detailed match information with participant data
- ✅ Champion and item database access
- ✅ Rate limiting and request throttling
- ✅ Comprehensive logging system
- ✅ Docker containerization
- ✅ Environment-based configuration

### Technical Features
- **FastAPI Framework**: Modern, fast, and auto-documented API
- **Async Support**: Non-blocking request handling
- **Rate Limiting**: SlowAPI integration for request throttling
- **Custom Logging**: Structured logging with file output
- **Error Handling**: Graceful error responses and recovery
- **Configuration Management**: JSON-based config system
- **Docker Ready**: Production-ready containerization

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Rift Rewind    │───▶│   Riot Games    │
│                 │    │    Backend      │    │      API        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Rate Limiter  │
                       │   & Logger      │
                       └─────────────────┘
```

## Prerequisites

- **Python 3.8+**
- **Docker** (optional, for containerized deployment)
- **Riot Games API Key** (obtain from [Riot Developer Portal](https://developer.riotgames.com/))

## Installation

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rift_rewind_hckthn_backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Riot API key
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
RIOT_API_KEY=RGAPI-your-api-key-here
```

### Configuration Files

The application uses JSON configuration files:

- `src/core_specs/configuration/config_file.json` - Server and endpoint configuration
- `src/core_specs/data/general_data.json` - General application data

## Running the Application

### Local Development

```bash
# Run with Python directly
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🚀 AWS Deployment Options

This project supports **three AWS deployment methods**:

### 1. 🆓 Lambda + API Gateway (FREE)
- **Cost:** FREE within AWS Free Tier
- **Best for:** Hackathons, demos, low traffic
- **Deploy:** `cd deployment && ./deploy-lambda-free.sh`

### 2. 💼 App Runner (~$25-50/month)
- **Cost:** ~$25-50/month
- **Best for:** Production with auto-scaling
- **Deploy:** `cd deployment && ./deploy-apprunner.sh`

### 3. 🐳 ECS Fargate (~$15-30/month)
- **Cost:** ~$15-30/month
- **Best for:** Enterprise, full container control
- **Deploy:** `cd deployment && ./deploy-ecs.sh`

**📖 For detailed deployment instructions, see [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)**
**🚀 For quick start guide, see [deployment/QUICK-START.md](deployment/QUICK-START.md)**

## Docker Deployment (Local/Self-hosted)

### Build and Run with Docker

```bash
# Build the image
docker build -t rift-rewind-backend .

# Run the container
docker run -p 8000:8000 --env-file .env rift-rewind-backend
```

### Docker Compose (Recommended)

```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

The Docker setup includes:
- **Automatic restarts** on failure
- **Environment variable** injection
- **Port mapping** (8000:8000)
- **Multi-worker** configuration for production

## 📚 API Endpoints

### 🏠 Health Check
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/` | GET | 25/min | API health check and status |

### 👤 User Information
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/user/get_riot_puuid` | POST | 3/min | Get player PUUID from Riot ID (gameName#tagLine) |
| `/user/get_summoner_info` | GET | 5/min | Get summoner profile (name, level, icon) from PUUID |
| `/user/get_lol_match_ids` | POST | 8/min | Get recent match IDs from player PUUID |
| `/user/get_champion_mastery` | GET | 10/min | Get champion mastery points and levels |
| `/user/get_ranked_stats` | GET | 8/min | Get current season ranked information (Solo/Flex) |
| `/user/get_runes_masteries` | GET | 10/min | Analyze rune usage patterns from recent matches |
| `/user/get_summoner_spells_analysis` | GET | 8/min | Analyze summoner spell effectiveness and usage |

### 🎮 Match Information
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/match/get_lol_match_details` | POST | 10/min | Get detailed match data (stats, items, outcome) |
| `/match/get_lol_match_participants_info` | GET | 10/min | Get all participants' detailed information |
| `/match/get_match_timeline` | POST | 5/min | Get minute-by-minute match events and timeline |

### 🎯 Game Assets
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/game_assets/get_lol_champions` | GET | 10/min | Get champion data (basic or detailed with abilities, stats, tips) |
| `/game_assets/get_lol_items` | GET | 10/min | Get item information and statistics |

### 📊 Analytics
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/analytics/get_player_performance` | GET | 3/min | Advanced performance analytics across recent matches |
| `/analytics/get_champion_winrates` | GET | 5/min | Champion win rates, pick rates, and meta analysis |

### 🔮 Predictions
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/predictions/get_match_outcome` | POST | 5/min | AI-powered match outcome prediction from team compositions |

### 🛡️ Analysis
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/analysis/get_team_composition` | POST | 5/min | Strategic team composition analysis and recommendations |

### 🤖 AI Assistant
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/ai/generate_ai_response` | POST | 20/min | AI-powered chat assistant for gameplay insights and data analysis |

### 📖 Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs` - Interactive API documentation
- **ReDoc**: `http://localhost:8000/redoc` - Alternative documentation format

## 🚀 Quick API Usage Examples

### Get Player PUUID
```bash
curl -X POST "http://localhost:8000/user/get_riot_puuid" \
  -H "Content-Type: application/json" \
  -d '{"game_name": "YourName", "tag_line": "NA1", "region": "americas"}'
```

### Get Ranked Stats
```bash
curl "http://localhost:8000/user/get_ranked_stats?region=americas&puuid=YOUR_PUUID"
```

### Predict Match Outcome
```bash
curl -X POST "http://localhost:8000/predictions/get_match_outcome" \
  -H "Content-Type: application/json" \
  -d '{
    "blue_team": ["Jinx", "Thresh", "Graves", "Ahri", "Garen"],
    "red_team": ["Caitlyn", "Lulu", "Lee Sin", "Yasuo", "Malphite"],
    "game_mode": "CLASSIC",
    "average_rank": "GOLD"
  }'
```

### Get Champion Information (Basic)
```bash
curl "http://localhost:8000/game_assets/get_lol_champions?champion_name=Jinx"
```

### Get Champion Abilities (Detailed)
```bash
curl "http://localhost:8000/game_assets/get_lol_champions?champion_name=Jinx&detailed=true&include_stats=true"
```

### Ask AI Assistant
```bash
curl -X POST "http://localhost:8000/ai/generate_ai_response" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How can I improve my KDA on Jinx?",
    "context_data": {
      "champion_mastery": {"Jinx": {"level": 7, "points": 150000}},
      "recent_matches": [{"champion": "Jinx", "kda": "8/5/12", "win": true}]
    }
  }'
```

## Project Structure

```
rift_rewind_hckthn_backend/
├── src/
│   ├── api_endpoints/              # API route definitions
│   │   ├── routers/
│   │   │   ├── user_info/         # User-related endpoints
│   │   │   ├── match_info/        # Match-related endpoints
│   │   │   └── game_assets_info/  # Game asset endpoints
│   │   └── root_endpoint.py       # Health check endpoint
│   ├── core_specs/                # Core configuration
│   │   ├── configuration/         # App configuration loader
│   │   └── data/                  # Data management
│   └── utils/                     # Shared utilities
│       ├── custom_logger.py       # Logging system
│       ├── limiter.py            # Rate limiting setup
│       ├── request_limiter.py    # Rate limit handlers
│       ├── validators.py         # Input validation
│       ├── en_de_crypt.py       # Encryption utilities
│       └── keys_generator.py    # Key generation
├── deployment/                   # AWS deployment files
│   ├── deploy-lambda-free.sh     # Lambda deployment script
│   ├── deploy-apprunner.sh       # App Runner deployment script
│   ├── deploy-ecs.sh             # ECS deployment script
│   ├── validate-deployment.sh    # Prerequisites validation
│   ├── DEPLOYMENT.md             # Detailed deployment guide
│   └── QUICK-START.md            # Quick deployment reference
├── cloudformation/               # Infrastructure as code
│   └── ecs-infrastructure.yaml   # ECS CloudFormation template
├── main.py                       # Application entry point
├── lambda_handler.py             # AWS Lambda entry point
├── serverless.yml                # Serverless Framework config
├── apprunner.yaml                # App Runner configuration
├── requirements.txt              # Python dependencies
├── docker-compose.yml            # Docker Compose configuration
├── DOCKERFILE                    # Docker build instructions
├── .env                          # Environment variables
└── README.md                     # This file
```

## Development

### Adding New Endpoints

1. Create a new router file in `src/api_endpoints/routers/`
2. Define your endpoint with proper rate limiting:
   ```python
   from fastapi import APIRouter, Request
   from src.utils.limiter import limiter as SlowLimiter
   
   router = APIRouter(prefix="/your-prefix", tags=["your-tag"])
   
   @router.get("/your-endpoint")
   @SlowLimiter.limit("10/minute")
   async def your_endpoint(request: Request):
       return {"message": "Your response"}
   ```
3. Import and include the router in `main.py`

### Configuration Management

- Server settings: Modify `src/core_specs/configuration/config_file.json`
- Application data: Update `src/core_specs/data/general_data.json`
- Environment variables: Add to `.env` file

### Testing

```bash
# Run the application
python main.py

# Test endpoints
curl http://localhost:8000/
curl http://localhost:8000/docs
```

## Rate Limiting

The application implements intelligent rate limiting to respect Riot Games API constraints:

- **Per-endpoint limits**: Configurable via JSON configuration
- **Global rate limiting**: Prevents API key exhaustion
- **Graceful handling**: Returns proper HTTP 429 responses
- **Automatic retry**: Built-in backoff strategies

## Logging

Comprehensive logging system with:

- **Multiple log levels**: DEBUG, INFO, WARNING, ERROR
- **File output**: Persistent log storage
- **Request tracking**: API call monitoring
- **Error reporting**: Detailed error information

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `RIOT_API_KEY` | Your Riot Games API key | Yes | None |
| `GEMINI_API_KEY` | Google Gemini API key for AI assistant | No | None |

**Note**: The AI assistant endpoint (`/ai/generate_ai_response`) requires `GEMINI_API_KEY`. Get your key from [Google AI Studio](https://makersuite.google.com/app/apikey).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the [API documentation](http://localhost:8000/docs) when running locally
- Review the logs for debugging information
- Ensure your Riot API key is valid and has proper permissions

## Acknowledgments

- **Riot Games** for providing the comprehensive League of Legends API
- **FastAPI** community for the excellent framework
- **Hackathon organizers** for the opportunity to build this project
