"""
#############################################################################
### Riot API Ranked Stats Fetch
###
### @file get_ranked_stats.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint returns the current season ranked information for a summoner
including Solo/Duo, Flex 5v5, and other ranked queues.
"""

#Native imports
import os
from typing import Dict, Any, Optional

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
import requests

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

"""HELPER FUNCTIONS-----------------------------------------------------------"""
async def get_summoner_id_from_puuid(puuid: str, region: str) -> str:
    """
    Helper function to get summoner_id from PUUID.
    
    Parameters:
    - puuid (str): Player PUUID
    - region (str): Regional routing (already validated)
    
    Returns:
    - str: Summoner ID
    
    Raises:
    - HTTPException: If summoner not found
    """
    platforms = REGION_DATA[region]["platforms"]
    headers = {"X-Riot-Token": RIOT_API_KEY}
    
    for platform in platforms:
        platform_lower = platform.lower()
        url = f"https://{platform_lower}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                summoner_data = response.json()
                summoner_id = summoner_data.get("id")
                if summoner_id:
                    log_handler.info(f"Found summoner_id on platform {platform_lower}: {summoner_id}")
                    return summoner_id
            elif response.status_code == 404:
                continue  # Try next platform
            else:
                log_handler.warning(f"Platform {platform_lower} returned {response.status_code}: {response.text}")
                continue
                
        except requests.RequestException as e:
            log_handler.warning(f"Platform {platform_lower} connection error: {e}")
            continue
    
    # If we get here, summoner not found on any platform
    raise HTTPException(
        status_code=404, 
        detail=f"Summoner not found for PUUID {puuid[:20]}... in {region} region"
    )

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_ranked_stats_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_ranked_stats_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_ranked_stats_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_ranked_stats_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_ranked_stats_endpoint']['unit_of_time_for_limit']}"
)
async def get_ranked_stats(
    request: Request,
    region: str = Query(..., description="One of: americas, europe, asia, sea"),
    summoner_id: Optional[str] = Query(None, description="Encrypted summoner ID (optional if puuid provided)"),
    puuid: Optional[str] = Query(None, description="Player PUUID (optional if summoner_id provided)"),
) -> Dict[str, Any]:
    """
    Fetch current season ranked information for a summoner.

    Parameters:
    - region (str): Regional routing value
    - summoner_id (str, optional): Encrypted summoner ID
    - puuid (str, optional): Player PUUID (will get summoner_id automatically)

    Note: Provide either summoner_id OR puuid (not both)

    Returns:
    - dict containing ranked stats for all queues (Solo/Duo, Flex, etc.)
    """
    region_lower = region.lower()

    # Validate inputs
    if not summoner_id and not puuid:
        raise HTTPException(
            status_code=400,
            detail="Either summoner_id or puuid must be provided"
        )
    
    if summoner_id and puuid:
        raise HTTPException(
            status_code=400,
            detail="Provide either summoner_id OR puuid, not both"
        )

    # Validate region
    if region_lower not in REGION_DATA:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid region '{region}'. Must be one of: {list(REGION_DATA.keys())}"
        )

    # If PUUID is provided, get summoner_id first
    if puuid and not summoner_id:
        log_handler.info(f"Getting summoner_id from PUUID: {puuid[:20]}...")
        summoner_id = await get_summoner_id_from_puuid(puuid, region_lower)

    # Get all platform regions for this regional routing
    platforms = REGION_DATA[region_lower]["platforms"]
    headers = {"X-Riot-Token": RIOT_API_KEY}
    
    # Try each platform in the region until we find the summoner
    ranked_data = None
    successful_platform = None
    last_error = None
    
    for platform in platforms:
        platform_lower = platform.lower()
        url = f"https://{platform_lower}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                ranked_data = response.json()
                successful_platform = platform_lower
                log_handler.info(f"Found ranked data on platform: {platform_lower}")
                break
            elif response.status_code == 404:
                # Summoner not found on this platform, try next one
                continue
            else:
                # Other error, store it but continue trying
                last_error = f"Platform {platform_lower}: {response.status_code} - {response.text}"
                continue
                
        except requests.RequestException as e:
            last_error = f"Platform {platform_lower}: Connection error - {str(e)}"
            continue
    
    # Check if we found the ranked data
    if ranked_data is None:
        if last_error:
            log_handler.error(f"Failed to find ranked data after trying all platforms. Last error: {last_error}")
            raise HTTPException(status_code=500, detail=f"Failed to find ranked data in {region} region. Last error: {last_error}")
        else:
            raise HTTPException(status_code=404, detail=f"Summoner not found in any platform within {region} region.")
    
    # Organize data by queue type
    organized_data = {
        "summoner_id": summoner_id,
        "puuid": puuid if puuid else None,
        "region": region,
        "platform": successful_platform,
        "ranked_solo": None,
        "ranked_flex": None,
        "other_queues": [],
        "platforms_tried": [p.lower() for p in platforms],
        "found_on_platform": successful_platform,
        "input_method": "puuid" if puuid else "summoner_id"
    }

    for entry in ranked_data:
        queue_type = entry.get("queueType")
        
        rank_info = {
            "queue_type": queue_type,
            "tier": entry.get("tier"),
            "rank": entry.get("rank"),
            "league_points": entry.get("leaguePoints"),
            "wins": entry.get("wins"),
            "losses": entry.get("losses"),
            "hot_streak": entry.get("hotStreak", False),
            "veteran": entry.get("veteran", False),
            "fresh_blood": entry.get("freshBlood", False),
            "inactive": entry.get("inactive", False),
            "league_id": entry.get("leagueId"),
            "league_name": entry.get("leagueName")
        }
        
        if queue_type == "RANKED_SOLO_5x5":
            organized_data["ranked_solo"] = rank_info
        elif queue_type == "RANKED_FLEX_SR":
            organized_data["ranked_flex"] = rank_info
        else:
            organized_data["other_queues"].append(rank_info)

    log_handler.info(f"Fetched ranked stats for summoner ID: {summoner_id}")
    return organized_data