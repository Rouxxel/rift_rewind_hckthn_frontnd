"""
#############################################################################
### Riot API Match Details Fetch
###
### @file get_match_details_by_id.py
### @author Sebastian Russo
### @date 2025
#############################################################################
This module defines an endpoint to fetch detailed match data
from the Riot API using a Match ID.
"""

#Native imports
import os
from typing import Dict, Any

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
    prefix=config_loader['endpoints']['get_match_details_by_id_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_match_details_by_id_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['get_match_details_by_id_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_match_details_by_id_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_match_details_by_id_endpoint']['unit_of_time_for_limit']}"
)
async def get_match_details(
    request: Request,
    match_id: str = Body(...),
    region: str = Body(...),
) -> Dict[str, Any]:
    """
    Fetch match-level information only (exclude participants) from Riot API.

    Parameters:
    - match_id (str): The match's unique Riot Match ID
    - region (str): One of: americas, europe, asia, sea

    Returns:
    - dict containing match metadata (no participant info)
    """
    #Validate region routing
    try:
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"Validation failed: {e.detail}")
        raise

    try:
        #Build the Riot API request URL
        url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        headers = {"X-Riot-Token": RIOT_API_KEY}
        response = requests.get(url, headers=headers)

        if not response.content:
            raise HTTPException(status_code=500, detail="Empty response from Riot API")

        if response.status_code == 200:
            match_data = response.json()

            #Keep only match-level info (exclude participants)
            match_info_only = {k: v for k, v in match_data.get("info", {}).items() if k != "participants"}

            log_handler.info(f"Fetched match info (no participants) for match ID: {match_id}")
            return {
                "match_id": match_id,
                "region": region,
                "match_info": match_info_only
            }

        elif response.status_code == 403:
            raise HTTPException(status_code=403, detail="Forbidden: Invalid or expired Riot API key.")
        elif response.status_code == 404:
            raise HTTPException(status_code=404, detail="Match not found for this ID.")
        else:
            raise HTTPException(status_code=response.status_code, detail=response.text)

    except requests.RequestException as e:
        log_handler.error(f"Riot API request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")
