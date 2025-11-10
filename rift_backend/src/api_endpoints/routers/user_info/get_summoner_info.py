"""
#############################################################################
### Riot API Summoner Info Fetch
###
### @file get_summoner_info.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint returns detailed Summoner information using the player's PUUID.
It fetches the account’s public League of Legends profile data such as:
summoner name, level, profile icon, and IDs.
"""

# Native imports
import os
from typing import Dict, Any

# Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
import requests

# Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader


"""VARIABLES-----------------------------------------------------------"""
RIOT_API_KEY = os.getenv("RIOT_API_KEY")
if not RIOT_API_KEY:
    raise RuntimeError("RIOT_API_KEY environment variable is not set.")

# Get region mappings from data loader
REGION_DATA = data_loader["regions"]

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader["endpoints"]["get_summoner_info_endpoint"]["endpoint_prefix"],
    tags=[config_loader["endpoints"]["get_summoner_info_endpoint"]["endpoint_tag"]],
)


"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader["endpoints"]["get_summoner_info_endpoint"]["endpoint_route"])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_summoner_info_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_summoner_info_endpoint']['unit_of_time_for_limit']}"
)
async def get_summoner_info(
    request: Request,
    region: str = Query(..., description="One of: americas, europe, asia, sea"),
    puuid: str = Query(..., description="Encrypted PUUID of the player"),
) -> Dict[str, Any]:
    """
    Fetch Summoner profile information using their encrypted PUUID.

    Returns the SummonerDTO from Riot Summoner-V4 API:
    - id (encrypted summoner ID)
    - accountId
    - puuid
    - name
    - profileIconId
    - revisionDate
    - summonerLevel
    """
    region_lower = region.lower()

    # Validate region
    if region_lower not in REGION_DATA:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid region '{region}'. Must be one of: {list(REGION_DATA.keys())}",
        )

    # Get all platform regions for this regional routing
    platforms = REGION_DATA[region_lower]["platforms"]
    headers = {"X-Riot-Token": RIOT_API_KEY}
    
    # Try each platform in the region until we find the summoner
    summoner_data = None
    successful_platform = None
    last_error = None
    
    for platform in platforms:
        platform_lower = platform.lower()
        url = f"https://{platform_lower}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                summoner_data = response.json()
                successful_platform = platform_lower
                log_handler.info(f"Found summoner on platform: {platform_lower}")
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
    
    # Check if we found the summoner
    if not summoner_data:
        if last_error:
            log_handler.error(f"Failed to find summoner after trying all platforms. Last error: {last_error}")
            raise HTTPException(status_code=500, detail=f"Failed to find summoner in {region} region. Last error: {last_error}")
        else:
            raise HTTPException(status_code=404, detail=f"Summoner not found in any platform within {region} region.")

    result = {
        "region": region_lower,
        "platform": successful_platform,
        "puuid": puuid,
        "summoner_id": summoner_data.get("id"),
        "account_id": summoner_data.get("accountId"),
        "summoner_name": summoner_data.get("name"),
        "profile_icon_id": summoner_data.get("profileIconId"),
        "revision_date": summoner_data.get("revisionDate"),
        "summoner_level": summoner_data.get("summonerLevel"),
        "platforms_tried": [p.lower() for p in platforms],
        "found_on_platform": successful_platform
    }

    log_handler.info(f"Fetched Summoner info: {result['summoner_name']} (PUUID: {puuid})")
    return result
