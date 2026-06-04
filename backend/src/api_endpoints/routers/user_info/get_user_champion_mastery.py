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

    platforms = REGION_DATA[region_lower]["platforms"]
    headers = {"X-Riot-Token": RIOT_API_KEY}

    mastery_data = None
    successful_platform = None
    last_error = None

    async with httpx.AsyncClient() as client:
        for platform in platforms:
            platform_lower = platform.lower()
            base_url = f"https://{platform_lower}.api.riotgames.com/lol/champion-mastery/v4"

            #Determine API endpoint
            if total_score:
                url = f"{base_url}/scores/by-puuid/{puuid}"
            elif champion_id is not None:
                url = f"{base_url}/champion-masteries/by-puuid/{puuid}/by-champion/{champion_id}"
            elif top is not None:
                url = f"{base_url}/champion-masteries/by-puuid/{puuid}/top?count={top}"
            else:
                url = f"{base_url}/champion-masteries/by-puuid/{puuid}"

            try:
                response = await client.get(url, headers=headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if data exists on this platform
                    if total_score:
                        if isinstance(data, int) and data > 0:
                            mastery_data = data
                            successful_platform = platform_lower
                            break
                    elif champion_id is not None:
                        if isinstance(data, dict):
                            mastery_data = data
                            successful_platform = platform_lower
                            break
                    else:
                        if isinstance(data, list) and len(data) > 0:
                            mastery_data = data
                            successful_platform = platform_lower
                            break
                    
                    # If it's an empty list or 0, we keep it as a fallback but continue checking other platforms
                    if mastery_data is None:
                        mastery_data = data
                        successful_platform = platform_lower
                
                elif response.status_code == 404:
                    # Not found on this platform, continue
                    continue
                else:
                    last_error = f"Platform {platform_lower}: {response.status_code} - {response.text}"
                    continue

            except httpx.RequestError as e:
                last_error = f"Platform {platform_lower}: Connection error - {str(e)}"
                continue

    if mastery_data is None:
        if last_error:
            log_handler.error(f"[get_user_champion_mastery] Failed to find champion mastery after trying all platforms. Last error: {last_error}")
            raise HTTPException(status_code=500, detail=f"Failed to connect to Riot API. Last error: {last_error}")
        else:
            raise HTTPException(status_code=404, detail="Champion mastery not found on any platform.")

    # Calculate count based on response type
    if total_score:
        count = 1
        log_handler.info(f"[get_user_champion_mastery] Fetched total mastery score for PUUID {puuid} on {successful_platform}")
    elif isinstance(mastery_data, list):
        count = len(mastery_data)
        log_handler.info(f"[get_user_champion_mastery] Fetched {count} mastery entries for PUUID {puuid} on {successful_platform}")
    else:
        count = 1
        log_handler.info(f"[get_user_champion_mastery] Fetched mastery for champion {champion_id} for PUUID {puuid} on {successful_platform}")

    return {
        "region": region,
        "platform": successful_platform,
        "puuid": puuid,
        "entries_count": count,
        "mastery_data": mastery_data
    }
