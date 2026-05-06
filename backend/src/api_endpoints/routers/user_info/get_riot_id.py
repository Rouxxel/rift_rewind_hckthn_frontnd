"""
#############################################################################
### Riot API PUUID fetch
###
### @file get_user_id.py
### @Sebastian Russo
### @date: 2025
#############################################################################

This module defines an endpoint to fetch a player's PUUID from Riot API
using their Riot ID (gameName + tagline) and the region.
"""

#Native imports
import os
from typing import Dict, Any

#Third-party imports
from fastapi import APIRouter, Body, Request, HTTPException
import httpx

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.validators import validate_summoner_name, validate_tagline, validate_region_routing

"""VARIABLES-----------------------------------------------------------"""
#Get Riot API key from environment
RIOT_API_KEY =  os.getenv("RIOT_API_KEY")
if not RIOT_API_KEY:
    raise RuntimeError("RIOT_API_KEY environment variable is not set.")

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_puuid_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_puuid_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['get_puuid_endpoint']['endpoint_route']) #/get_puuid
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_puuid_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_puuid_endpoint']['unit_of_time_for_limit']}"
)
async def get_puuid_endpoint(
    request: Request,
    game_name: str = Body(...),
    tag_line: str = Body(...),
    region: str = Body(...),
) -> Dict[str, Any]:
    """
    Fetch a player's PUUID using their Riot ID and region.

    Parameters:
    - game_name (str): Summoner's game name
    - tag_line (str): Summoner's tagline
    - region (str): Region (americas | europe | asia | sea)

    Returns:
    - dict with player's info including PUUID
    """
    #Validate inputs
    try:
        validate_summoner_name(game_name)
        validate_tagline(tag_line)
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"Validation failed: {e.detail}")
        raise

    #Riot API call
    url = f"https://{region_lower}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    headers = {"X-Riot-Token": RIOT_API_KEY}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                log_handler.info(f"Found user: {data['gameName']}#{data['tagLine']} | PUUID: {data['puuid']}")
                return data
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found.")
            else:
                raise HTTPException(status_code=response.status_code, detail=response.text)
    except httpx.RequestError as e:
        log_handler.error(f"Riot API request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")
