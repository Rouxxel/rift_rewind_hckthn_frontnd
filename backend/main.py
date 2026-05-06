"""
#############################################################################
### Main backend file
###
### @file main.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module initializes the FastAPI backend locally for development.
It sets up routers, custom logger, rate limiter, and loads environment variables.
"""

#Native imports
import os
from contextlib import asynccontextmanager

#Third-party imports
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
load_dotenv()

#Other files imports
from src.utils.request_limiter import rate_limit_handler
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter

#Json files
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

#Endpoints imports
from src.api_endpoints.root_endpoint import router as root_router

from src.api_endpoints.routers.user_info import get_riot_id
from src.api_endpoints.routers.user_info import get_match_history_by_id
from src.api_endpoints.routers.user_info import get_summoner_info
from src.api_endpoints.routers.user_info import get_user_champion_mastery
from src.api_endpoints.routers.user_info import get_runes_masteries
from src.api_endpoints.routers.user_info import get_summoner_spells_analysis
from src.api_endpoints.routers.match_info import get_match_details_by_id
from src.api_endpoints.routers.match_info import get_match_participants_info
from src.api_endpoints.routers.match_info import get_match_timeline
from src.api_endpoints.routers.game_assets_info import get_champion_info
from src.api_endpoints.routers.game_assets_info import get_item_info
from src.api_endpoints.routers.analytics import get_player_performance
from src.api_endpoints.routers.analytics import get_champion_winrates
from src.api_endpoints.routers.predictions import get_match_outcome
from src.api_endpoints.routers.analysis import get_team_composition
from src.api_endpoints.routers.ai_coms import ai_call

"""ENVIRONMENT VARIABLES---------------------------------------------------"""
def get_riot_api_key():
    """Get Riot API key from environment or AWS Systems Manager"""
    # Try environment variable first
    api_key = os.getenv("RIOT_API_KEY")
    if api_key and api_key != "RGAPI-REPLACE_ME":
        return api_key
    
    # Try AWS Systems Manager Parameter Store
    try:
        import boto3
        ssm = boto3.client('ssm')
        response = ssm.get_parameter(Name='/rift-rewind/riot-api-key', WithDecryption=True)
        return response['Parameter']['Value']
    except Exception as e:
        log_handler.warning(f"Could not retrieve API key from AWS SSM: {e}")
        return "RGAPI-REPLACE_ME"

RIOT_API_KEY = get_riot_api_key()
if not RIOT_API_KEY or RIOT_API_KEY == "RGAPI-REPLACE_ME":
    log_handler.warning("RIOT_API_KEY is not properly configured")

"""API APP-----------------------------------------------------------"""
#Lifespan event manager (startup and shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    port = config_loader["network"]["server_port"]
    log_handler.info(f"Rift Rewind backend server starting on port {port}")
    yield
    log_handler.info("Rift Rewind backend server shutting down")

#Create FastAPI app
app = FastAPI(lifespan=lifespan, title="Rift Rewind Backend")

"""CORS Configuration-----------------------------------------------------------"""
# Allow requests from your frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Local development
        "http://localhost:5173",      # Vite default
        "http://localhost:5174",      # Vite alternate
        "https://*.vercel.app",       # All Vercel preview deployments
        "https://rift-rewind-hckthn-frontnd.vercel.app/",
        "*"                           # Allow all origins (remove in production for security)
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Allow all HTTP methods
    allow_headers=["*"],              # Allow all headers
)

"""VARIOUS-----------------------------------------------------------"""
#Setup rate limiter
app.state.limiter = limiter

#Add global exception handler for rate limits
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

"""Routers-----------------------------------------------------------"""
#Root
app.include_router(root_router)

#User
app.include_router(get_riot_id.router)
app.include_router(get_summoner_info.router)
app.include_router(get_match_history_by_id.router)
app.include_router(get_user_champion_mastery.router)
app.include_router(get_runes_masteries.router)
app.include_router(get_summoner_spells_analysis.router)

#Match
app.include_router(get_match_details_by_id.router)
app.include_router(get_match_participants_info.router)
app.include_router(get_match_timeline.router)

#Game assets
app.include_router(get_champion_info.router)
app.include_router(get_item_info.router)

#Analytics
app.include_router(get_player_performance.router)
app.include_router(get_champion_winrates.router)

#Predictions
app.include_router(get_match_outcome.router)

#Analysis
app.include_router(get_team_composition.router)

#AI Assistant
app.include_router(ai_call.router)

"""Start server-----------------------------------------------------------"""
if __name__ == "__main__":
    port = config_loader["network"]["server_port"]
    
    uvicorn.run(
        config_loader["network"]["uvicorn_app_reference"],
        host=config_loader["network"]["host"],
        port=config_loader["network"]["server_port"],
        reload=config_loader["network"]["reload"],
        workers=config_loader["network"]["workers"],
        proxy_headers=config_loader["network"]["proxy_headers"]
    )
    
    log_handler(f"Loaded configuration: \n {config_loader}")
    log_handler(f"Loaded data: \n {data_loader}")
    #available at: http://127.0.0.1:8000/docs
