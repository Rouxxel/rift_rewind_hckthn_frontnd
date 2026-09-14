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
    puuid: Optional[str] = Query(None, description="Player PUUID (preferred)"),
) -> Dict[str, Any]:
    """
    Fetch current season ranked information for a summoner.

    Prefers League-V4 entries by PUUID. Falls back to by-summoner if only
    summoner_id is provided. Unranked players return empty solo/flex (200).
    """
    region_lower = region.lower()

    if not summoner_id and not puuid:
        raise HTTPException(
            status_code=400,
            detail="Either summoner_id or puuid must be provided"
        )

    if region_lower not in REGION_DATA:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid region '{region}'. Must be one of: {list(REGION_DATA.keys())}"
        )

    platforms = REGION_DATA[region_lower]["platforms"]
    headers = {"X-Riot-Token": RIOT_API_KEY}

    ranked_data = None
    successful_platform = None
    last_error = None

    async with httpx.AsyncClient() as client:
        for platform in platforms:
            platform_lower = platform.lower()
            if puuid:
                url = f"https://{platform_lower}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}"
            else:
                url = f"https://{platform_lower}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}"

            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    ranked_data = response.json()
                    successful_platform = platform_lower
                    log_handler.info(f"[get_ranked_stats] Found ranked data on platform: {platform_lower}")
                    break
                if response.status_code == 404:
                    continue
                last_error = f"[get_ranked_stats] Platform {platform_lower}: {response.status_code} - {response.text}"
            except httpx.RequestError as e:
                last_error = f"[get_ranked_stats] Platform {platform_lower}: Connection error - {str(e)}"
                continue

    if ranked_data is None:
        if last_error:
            log_handler.error(
                f"[get_ranked_stats] Failed to find ranked data after trying all platforms. Last error: {last_error}"
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to find ranked data in {region} region. Last error: {last_error}",
            )
        # Empty list never happens above as None; treat as not found on any platform
        raise HTTPException(
            status_code=404,
            detail=f"Summoner not found in any platform within {region} region.",
        )

    # Empty array [] is valid — player is unranked in all queues this season
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
        "input_method": "puuid" if puuid else "summoner_id",
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
            "league_name": entry.get("leagueName"),
        }

        if queue_type == "RANKED_SOLO_5x5":
            organized_data["ranked_solo"] = rank_info
        elif queue_type == "RANKED_FLEX_SR":
            organized_data["ranked_flex"] = rank_info
        else:
            organized_data["other_queues"].append(rank_info)

    log_handler.info(
        f"[get_ranked_stats] Fetched ranked stats on {successful_platform} "
        f"(solo={'yes' if organized_data['ranked_solo'] else 'no'}, "
        f"flex={'yes' if organized_data['ranked_flex'] else 'no'})"
    )
    return organized_data
