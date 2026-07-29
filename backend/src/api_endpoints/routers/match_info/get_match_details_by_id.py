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
import httpx

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.utils.validators import validate_region_routing
from src.resources.riot_cache_keys import match_details_key, TTL_MATCH
from src.resources.riot_data_service import cached_or_fetch

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
        log_handler.warning(f"[get_match_details] Validation failed: {e.detail}")
        raise

    async def _fetch() -> Dict[str, Any]:
        url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        headers = {"X-Riot-Token": RIOT_API_KEY}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)

            if not response.content:
                raise HTTPException(status_code=500, detail="Empty response from Riot API")

            if response.status_code == 200:
                match_data = response.json()
                match_info_only = {
                    k: v for k, v in match_data.get("info", {}).items() if k != "participants"
                }
                log_handler.info(
                    f"[get_match_details] Fetched match info (no participants) for match ID: {match_id}"
                )
                return {
                    "match_id": match_id,
                    "region": region,
                    "match_info": match_info_only,
                }

            if response.status_code == 403:
                raise HTTPException(status_code=403, detail="Forbidden: Invalid or expired Riot API key.")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Match not found for this ID.")
            raise HTTPException(status_code=response.status_code, detail=response.text)

    try:
        return await cached_or_fetch(
            match_details_key(region_lower, match_id),
            TTL_MATCH,
            _fetch,
            log_prefix="get_match_details",
        )
    except httpx.RequestError as e:
        log_handler.error(f"[get_match_details] Riot API request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")
