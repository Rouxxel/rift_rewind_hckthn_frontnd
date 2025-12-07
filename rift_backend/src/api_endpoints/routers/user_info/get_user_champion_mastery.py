"""
#############################################################################
### Riot API Champion Mastery Fetch
###
### @file get_user_champion_mastery.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint returns the mastery level of a user on the LOL champions, it
allows to choose which one, if all of them at the same time, if the top one etc.
"""

#Native imports
import os
from typing import Dict, Any, Optional

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
import httpx

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

"""VARIABLES-----------------------------------------------------------"""
RIOT_API_KEY = os.getenv("RIOT_API_KEY")
if not RIOT_API_KEY:
    raise RuntimeError("RIOT_API_KEY environment variable is not set.")

REGION_DATA = data_loader["regions"]

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_champion_mastery_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_champion_mastery_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_champion_mastery_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_champion_mastery_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_champion_mastery_endpoint']['unit_of_time_for_limit']}"
)
async def get_champion_mastery(
    request: Request,
    region: str = Query(..., description="One of: americas, europe, asia, sea"),
    puuid: str = Query(..., description="Encrypted PUUID of the player"),
    champion_id: Optional[int] = Query(None, description="Optional: Specific champion ID to fetch mastery for"),
    top: Optional[int] = Query(None, description="Optional: Get top N champion masteries"),
    total_score: Optional[bool] = Query(False, description="If true, return the player's total mastery score"),
) -> Dict[str, Any]:
    """
    Fetch champion mastery data for a summoner using their encrypted PUUID.

    - If `champion_id` is provided, returns mastery info only for that champion.
    - If `top` is provided, returns top N mastery entries.
    - If `total_score` is True, returns total mastery score.
    - Otherwise, returns all champion masteries.
    """
    region_lower = region.lower()

    #Validate region
    if region_lower not in REGION_DATA:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid region '{region}'. Must be one of: {list(REGION_DATA.keys())}"
        )

    # Get all platforms for this region
    platforms = REGION_DATA[region_lower]["platforms"]
    
    headers = {"X-Riot-Token": RIOT_API_KEY}

    try:
        async with httpx.AsyncClient() as client:
            # Try each platform in the region to find the summoner
            # PUUID is region-wide, but summoner data is platform-specific
            summoner_id = None
            platform_region = None
            
            for platform in platforms:
                platform_lower = platform.lower()
                summoner_url = f"https://{platform_lower}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
                
                try:
                    log_handler.info(f"Trying platform {platform_lower} for summoner lookup")
                    summoner_response = await client.get(summoner_url, headers=headers, timeout=10.0)
                    
                    if summoner_response.status_code == 200:
                        summoner_data = summoner_response.json()
                        summoner_id = summoner_data.get("id")
                        platform_region = platform_lower
                        log_handler.info(f"Found summoner on platform {platform_lower}: {summoner_id}")
                        break
                    elif summoner_response.status_code == 404:
                        log_handler.debug(f"Summoner not found on platform {platform_lower}, trying next...")
                        continue
                    else:
                        summoner_response.raise_for_status()
                        
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        continue
                    raise
            
            if not summoner_id or not platform_region:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Summoner not found on any platform in region {region}. Tried: {', '.join(platforms)}"
                )
            
            # Now fetch champion mastery using summoner ID
            base_url = f"https://{platform_region}.api.riotgames.com/lol/champion-mastery/v4"
            
            #Determine API endpoint
            if total_score:
                url = f"{base_url}/scores/by-summoner/{summoner_id}"
            elif champion_id is not None:
                url = f"{base_url}/champion-masteries/by-summoner/{summoner_id}/by-champion/{champion_id}"
            elif top is not None:
                url = f"{base_url}/champion-masteries/by-summoner/{summoner_id}/top?count={top}"
            else:
                url = f"{base_url}/champion-masteries/by-summoner/{summoner_id}"
            
            log_handler.info(f"Champion Mastery API URL: {url}")
            
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()

            mastery_data = response.json()
            
            # Calculate count based on response type
            if total_score:
                count = 1
                log_handler.info(f"Fetched total mastery score for PUUID {puuid}")
            elif isinstance(mastery_data, list):
                count = len(mastery_data)
                log_handler.info(f"Fetched {count} mastery entries for PUUID {puuid}")
            else:
                count = 1
                log_handler.info(f"Fetched mastery for champion {champion_id} for PUUID {puuid}")

            return {
                "region": region,
                "puuid": puuid,
                "entries_count": count,
                "mastery_data": mastery_data
            }

    except httpx.HTTPStatusError as e:
        log_handler.error(f"HTTP Error: {e} | Response: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        log_handler.error(f"Request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")
