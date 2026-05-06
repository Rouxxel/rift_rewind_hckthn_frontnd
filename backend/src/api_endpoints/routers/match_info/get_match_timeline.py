"""
#############################################################################
### Riot API Match Timeline Fetch
###
### @file get_match_timeline.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint fetches detailed match timeline data including events,
kills, deaths, item purchases, and ward placements by minute.
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

"""VARIABLES-----------------------------------------------------------"""
RIOT_API_KEY = os.getenv("RIOT_API_KEY")
if not RIOT_API_KEY:
    raise RuntimeError("RIOT_API_KEY environment variable is not set.")

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_match_timeline_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_match_timeline_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['get_match_timeline_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_match_timeline_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_match_timeline_endpoint']['unit_of_time_for_limit']}"
)
async def get_match_timeline(
    request: Request,
    match_id: str = Body(...),
    region: str = Body(...),
    event_types: list = Body(None, description="Optional: Filter by event types (e.g., ['CHAMPION_KILL', 'ITEM_PURCHASED'])"),
    participant_id: int = Body(None, description="Optional: Filter events for specific participant (1-10)")
) -> Dict[str, Any]:
    """
    Fetch detailed match timeline with minute-by-minute events.

    Parameters:
    - match_id (str): The match's unique Riot Match ID
    - region (str): One of: americas, europe, asia, sea
    - event_types (list, optional): Filter by specific event types
    - participant_id (int, optional): Filter events for specific participant

    Returns:
    - dict containing detailed timeline data with events
    """
    try:
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"Validation failed: {e.detail}")
        raise

    try:
        # Build the Riot API request URL for timeline
        url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/{match_id}/timeline"
        headers = {"X-Riot-Token": RIOT_API_KEY}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)

            if not response.content:
                raise HTTPException(status_code=500, detail="Empty response from Riot API")

            if response.status_code == 200:
                timeline_data = response.json()
                
                # Extract and process timeline frames
                frames = timeline_data.get("info", {}).get("frames", [])
                processed_frames = []
            
                for frame in frames:
                    timestamp = frame.get("timestamp", 0)
                    minute = timestamp // 60000  # Convert to minutes
                    
                    events = frame.get("events", [])
                    
                    # Filter events if specified
                    if event_types:
                        events = [event for event in events if event.get("type") in event_types]
                    
                    if participant_id:
                        events = [event for event in events 
                                 if event.get("participantId") == participant_id or 
                                    event.get("killerId") == participant_id or
                                    event.get("victimId") == participant_id]
                    
                    # Categorize events
                    categorized_events = {
                        "kills": [],
                        "deaths": [],
                        "assists": [],
                        "item_events": [],
                        "ward_events": [],
                        "objective_events": [],
                        "other_events": []
                    }
                    
                    for event in events:
                        event_type = event.get("type")
                        
                        if event_type == "CHAMPION_KILL":
                            categorized_events["kills"].append({
                                "timestamp": event.get("timestamp"),
                                "killer_id": event.get("killerId"),
                                "victim_id": event.get("victimId"),
                                "assisting_participants": event.get("assistingParticipantIds", []),
                                "position": event.get("position", {}),
                                "bounty": event.get("bounty", 0)
                            })
                        elif event_type in ["ITEM_PURCHASED", "ITEM_SOLD", "ITEM_DESTROYED", "ITEM_UNDO"]:
                            categorized_events["item_events"].append({
                                "type": event_type,
                                "timestamp": event.get("timestamp"),
                                "participant_id": event.get("participantId"),
                                "item_id": event.get("itemId"),
                                "after_id": event.get("afterId"),
                                "before_id": event.get("beforeId")
                            })
                        elif event_type in ["WARD_PLACED", "WARD_KILL"]:
                            categorized_events["ward_events"].append({
                                "type": event_type,
                                "timestamp": event.get("timestamp"),
                                "participant_id": event.get("participantId"),
                                "ward_type": event.get("wardType"),
                                "position": event.get("position", {})
                            })
                        elif event_type in ["BUILDING_KILL", "ELITE_MONSTER_KILL", "DRAGON_KILL", "BARON_KILL"]:
                            categorized_events["objective_events"].append({
                                "type": event_type,
                                "timestamp": event.get("timestamp"),
                                "killer_id": event.get("killerId"),
                                "team_id": event.get("teamId"),
                                "monster_type": event.get("monsterType"),
                                "monster_sub_type": event.get("monsterSubType"),
                                "building_type": event.get("buildingType"),
                                "lane_type": event.get("laneType"),
                                "tower_type": event.get("towerType"),
                                "position": event.get("position", {})
                            })
                        else:
                            categorized_events["other_events"].append(event)
                    
                    # Include participant frames (gold, xp, cs, position)
                    participant_frames = frame.get("participantFrames", {})
                    
                    processed_frame = {
                        "timestamp": timestamp,
                        "minute": minute,
                        "events": categorized_events,
                        "participant_frames": participant_frames
                    }
                    
                    processed_frames.append(processed_frame)

                # Calculate summary statistics
                total_kills = sum(len(frame["events"]["kills"]) for frame in processed_frames)
                total_items = sum(len(frame["events"]["item_events"]) for frame in processed_frames)
                total_wards = sum(len(frame["events"]["ward_events"]) for frame in processed_frames)
                total_objectives = sum(len(frame["events"]["objective_events"]) for frame in processed_frames)

                result = {
                    "match_id": match_id,
                    "region": region,
                    "game_duration": timeline_data.get("info", {}).get("gameLength", 0),
                    "interval": timeline_data.get("info", {}).get("frameInterval", 60000),
                    "summary": {
                        "total_frames": len(processed_frames),
                        "total_kills": total_kills,
                        "total_item_events": total_items,
                        "total_ward_events": total_wards,
                        "total_objective_events": total_objectives
                    },
                    "frames": processed_frames
                }

                log_handler.info(f"Fetched timeline for match ID: {match_id} with {len(processed_frames)} frames")
                return result

            elif response.status_code == 403:
                raise HTTPException(status_code=403, detail="Forbidden: Invalid or expired Riot API key.")
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Match timeline not found for this ID.")
            else:
                raise HTTPException(status_code=response.status_code, detail=response.text)

    except httpx.RequestError as e:
        log_handler.error(f"Riot API request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")