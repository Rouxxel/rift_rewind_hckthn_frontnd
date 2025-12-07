"""
#############################################################################
### Riot API Match Participants Info Fetch
###
### @file get_match_participants_info.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines an endpoint to fetch all participants' detailed
information from a specific match using the Riot API and Data Dragon.

It includes champion, stats, and readable item data.
"""

#Native imports
import os
from typing import Dict, Any, List

#Third-party imports
from fastapi import APIRouter, Body, Request, HTTPException
import httpx

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader
from src.utils.validators import validate_region_routing

"""VARIABLES-----------------------------------------------------------"""
RIOT_API_KEY = os.getenv("RIOT_API_KEY")
if not RIOT_API_KEY:
    raise RuntimeError("RIOT_API_KEY environment variable is not set.")

#Data Dragon version (dynamically fetched if needed)
DATA_DRAGON_ITEMS_URL = data_loader["metadata"]["data_dragon"]["working_url_item"]

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_match_participants_info_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_match_participants_info_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['get_match_participants_info_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_match_participants_info_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_match_participants_info_endpoint']['unit_of_time_for_limit']}"
)
async def get_match_participants_full_info(
    request: Request,
    match_id: str = Body(...),
    region: str = Body(...),
    num_participants: int = Body(-1),  # -1 = all
    simplified: bool = Body(False)     # If True, return only core stats + items
) -> Dict[str, Any]:
    """
    Fetch full participant information from a specific match.
    Optionally returns simplified participant stats only.

    Parameters:
    - match_id (str): The match's unique Riot Match ID
    - region (str): One of: americas, europe, asia, sea
    - num_participants (int): Optional. Number of participants to return (-1 = all)
    - simplified (bool): Optional. If True, returns only core stats + items_detailed

    Returns:
    - dict containing participant data
    """
    try:
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"Validation failed: {e.detail}")
        raise

    try:
        async with httpx.AsyncClient() as client:
            #Fetch match details
            match_url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/{match_id}"
            headers = {"X-Riot-Token": RIOT_API_KEY}
            match_response = await client.get(match_url, headers=headers)

            if not match_response.content:
                raise HTTPException(status_code=500, detail="Empty response from Riot API")
            if match_response.status_code != 200:
                if match_response.status_code == 403:
                    raise HTTPException(status_code=403, detail="Forbidden: Invalid or expired Riot API key.")
                elif match_response.status_code == 404:
                    raise HTTPException(status_code=404, detail="Match not found for this ID.")
                else:
                    raise HTTPException(status_code=match_response.status_code, detail=match_response.text)

            match_details = match_response.json()
            participants = match_details.get('info', {}).get('participants', [])
            if not participants:
                raise HTTPException(status_code=500, detail="No participants found in match data.")

            #Select participants
            if num_participants == -1:
                selected_participants = participants
            elif 0 < num_participants <= len(participants):
                selected_participants = participants[:num_participants]
            else:
                raise HTTPException(status_code=400, detail=f"num_participants must be -1 (all) or between 1 and {len(participants)}")

            #Fetch Data Dragon items
            try:
                items_response = await client.get(DATA_DRAGON_ITEMS_URL)
                items_response.raise_for_status()
                item_data = items_response.json().get('data', {})
            except httpx.RequestError:
                log_handler.warning("Failed to fetch Data Dragon items")
                item_data = {}

        detailed_participants: List[Dict[str, Any]] = []
        for participant in selected_participants:
            # Build items_detailed
            items_detailed = []
            for i in range(7):
                item_id = participant.get(f"item{i}")
                if item_id and item_id != 0:
                    info = item_data.get(str(item_id), {})
                    items_detailed.append({
                        "id": item_id,
                        "name": info.get("name", f"Unknown Item {item_id}"),
                        "description": info.get("description", "")
                    })

            if simplified:
                simplified_data = {
                    "summonerName": participant.get("summonerName"),
                    "championName": participant.get("championName"),
                    "kills": participant.get("kills"),
                    "deaths": participant.get("deaths"),
                    "assists": participant.get("assists"),
                    "goldEarned": participant.get("goldEarned"),
                    "totalMinionsKilled": participant.get("totalMinionsKilled") + participant.get("neutralMinionsKilled", 0),
                    "win": participant.get("win"),
                    "items_detailed": items_detailed
                }
                detailed_participants.append(simplified_data)
            else:
                enriched_participant = participant.copy()
                enriched_participant["items_detailed"] = items_detailed
                detailed_participants.append(enriched_participant)

        # Return after processing ALL participants (not inside the loop!)
        return {
            "match_id": match_id,
            "region": region,
            "num_participants": len(detailed_participants),
            "participants": detailed_participants
        }

    except httpx.RequestError as e:
        log_handler.error(f"Riot API request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")
