"""
#############################################################################
### Riot API Match History Fetch
###
### @file get_match_history_by_id.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines an endpoint to fetch a player's recent match IDs
from the Riot API using their PUUID.
"""

#Native imports
import os
from typing import Dict, Any, List

#Third-party imports
from fastapi import APIRouter, Body, Request, HTTPException
import requests

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.validators import validate_region_routing

"""VARIABLES-----------------------------------------------------------"""
RIOT_API_KEY = os.getenv("RIOT_API_KEY")
if not RIOT_API_KEY:
    raise RuntimeError("RIOT_API_KEY environment variable is not set.")

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_match_ids_by_puuid_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_match_ids_by_puuid_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['get_match_ids_by_puuid_endpoint']['endpoint_route'])  # /get_match_ids
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_match_ids_by_puuid_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_match_ids_by_puuid_endpoint']['unit_of_time_for_limit']}"
)
async def get_match_ids_by_puuid(
    request: Request,
    puuid: str = Body(...),
    region: str = Body(...),
    count: int = Body(5),  #how many matches to return (default: 5)
) -> Dict[str, Any]:
    """
    Fetch recent match IDs using the player's PUUID.

    Parameters:
    - puuid (str): The player's unique Riot PUUID.
    - region (str): One of: americas, europe, asia, sea (regional routing)
    - count (int): Optional. Number of recent matches to return (default: 5)

    Returns:
    - dict containing a list of match IDs
    """
    #Validate inputs
    try:
        #Validate region
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"Validation failed: {e.detail}")
        raise

    try:
        #Riot Match API (regional endpoint)
        url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?count={count}"
        headers = {"X-Riot-Token": RIOT_API_KEY}
    
        response = requests.get(url, headers=headers)

        #Handle no response
        if not response.content:
            raise HTTPException(status_code=500, detail="Empty response from Riot API")

        #Successful fetch
        if response.status_code == 200:
            match_ids: List[str] = response.json()
            log_handler.info(f"Fetched {len(match_ids)} matches for PUUID: {puuid}")
            return {"puuid": puuid, "region": region, "match_ids": match_ids}

        #Handle common Riot API errors
        elif response.status_code == 403:
            raise HTTPException(status_code=403, detail="Forbidden: Invalid or expired Riot API key.")
        elif response.status_code == 404:
            raise HTTPException(status_code=404, detail="No matches found for this PUUID.")
        else:
            raise HTTPException(status_code=response.status_code, detail=response.text)

    except requests.RequestException as e:
        log_handler.error(f"Riot API request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")
