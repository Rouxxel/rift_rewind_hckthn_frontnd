"""
#############################################################################
### Riot API Runes & Masteries Analysis
###
### @file get_runes_masteries.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint analyzes rune usage patterns from recent matches for a player
and provides recommendations based on champion and role.
"""

#Native imports
import os
from typing import Dict, Any, List
from collections import Counter

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
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

# Rune tree mapping (simplified)
RUNE_TREES = {
    8000: "Precision",
    8100: "Domination", 
    8200: "Sorcery",
    8300: "Resolve",
    8400: "Inspiration"
}

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_runes_masteries_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_runes_masteries_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_runes_masteries_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_runes_masteries_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_runes_masteries_endpoint']['unit_of_time_for_limit']}"
)
async def get_runes_masteries(
    request: Request,
    region: str = Query(..., description="One of: americas, europe, asia, sea"),
    puuid: str = Query(..., description="Encrypted PUUID of the player"),
    champion_name: str = Query(None, description="Optional: Analyze runes for specific champion"),
    match_count: int = Query(10, description="Number of recent matches to analyze (max 20)")
) -> Dict[str, Any]:
    """
    Analyze rune usage patterns from recent matches.

    Parameters:
    - region (str): Regional routing value
    - puuid (str): Player's encrypted PUUID
    - champion_name (str, optional): Filter by specific champion
    - match_count (int): Number of matches to analyze

    Returns:
    - dict containing rune usage statistics and recommendations
    """
    try:
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"Validation failed: {e.detail}")
        raise

    if match_count > 20:
        match_count = 20

    headers = {"X-Riot-Token": RIOT_API_KEY}

    try:
        async with httpx.AsyncClient() as client:
            # Get recent match IDs
            match_url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
            match_params = {"start": 0, "count": match_count}
            
            match_response = await client.get(match_url, headers=headers, params=match_params)
            match_response.raise_for_status()
            match_ids = match_response.json()

            if not match_ids:
                raise HTTPException(status_code=404, detail="No recent matches found for this player.")

            # Analyze runes from matches
            rune_data = []
            primary_trees = Counter()
            secondary_trees = Counter()
            keystone_runes = Counter()
            champion_runes = {}

            for match_id in match_ids:
                try:
                    # Get match details
                    match_detail_url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/{match_id}"
                    match_detail_response = await client.get(match_detail_url, headers=headers)
                    match_detail_response.raise_for_status()
                    
                    match_data = match_detail_response.json()
                    participants = match_data.get("info", {}).get("participants", [])
                    
                    # Find player's data in this match
                    player_data = None
                    for participant in participants:
                        if participant.get("puuid") == puuid:
                            player_data = participant
                            break
                    
                    if not player_data:
                        continue

                    champion = player_data.get("championName", "Unknown")
                    
                    # Skip if filtering by champion and this doesn't match
                    if champion_name and champion.lower() != champion_name.lower():
                        continue

                    # Extract rune data
                    perks = player_data.get("perks", {})
                    styles = perks.get("styles", [])
                    
                    if len(styles) >= 2:
                        primary_style = styles[0]
                        secondary_style = styles[1]
                        
                        primary_tree_id = primary_style.get("style")
                        secondary_tree_id = secondary_style.get("style")
                        
                        primary_tree_name = RUNE_TREES.get(primary_tree_id, f"Unknown_{primary_tree_id}")
                        secondary_tree_name = RUNE_TREES.get(secondary_tree_id, f"Unknown_{secondary_tree_id}")
                        
                        primary_trees[primary_tree_name] += 1
                        secondary_trees[secondary_tree_name] += 1
                        
                        # Get keystone (first selection in primary tree)
                        primary_selections = primary_style.get("selections", [])
                        if primary_selections:
                            keystone_id = primary_selections[0].get("perk")
                            keystone_runes[keystone_id] += 1
                        
                        # Store champion-specific data
                        if champion not in champion_runes:
                            champion_runes[champion] = {
                                "primary_trees": Counter(),
                                "secondary_trees": Counter(),
                                "keystones": Counter(),
                                "games": 0
                            }
                        
                        champion_runes[champion]["primary_trees"][primary_tree_name] += 1
                        champion_runes[champion]["secondary_trees"][secondary_tree_name] += 1
                        champion_runes[champion]["keystones"][keystone_id] += 1
                        champion_runes[champion]["games"] += 1
                        
                        rune_data.append({
                            "match_id": match_id,
                            "champion": champion,
                            "primary_tree": primary_tree_name,
                            "secondary_tree": secondary_tree_name,
                            "keystone_id": keystone_id,
                            "win": player_data.get("win", False)
                        })

                except httpx.RequestError as e:
                    log_handler.warning(f"Failed to fetch match {match_id}: {e}")
                    continue

            if not rune_data:
                raise HTTPException(status_code=404, detail="No rune data found in recent matches.")

        # Calculate statistics
        total_games = len(rune_data)
        
        result = {
            "puuid": puuid,
            "region": region,
            "champion_filter": champion_name,
            "matches_analyzed": total_games,
            "overall_stats": {
                "most_used_primary_trees": dict(primary_trees.most_common(3)),
                "most_used_secondary_trees": dict(secondary_trees.most_common(3)),
                "most_used_keystones": dict(keystone_runes.most_common(5))
            },
            "champion_breakdown": {}
        }

        # Add champion-specific breakdown
        for champion, data in champion_runes.items():
            result["champion_breakdown"][champion] = {
                "games_played": data["games"],
                "primary_trees": dict(data["primary_trees"].most_common(2)),
                "secondary_trees": dict(data["secondary_trees"].most_common(2)),
                "keystones": dict(data["keystones"].most_common(3))
            }

            log_handler.info(f"Analyzed runes from {total_games} matches for PUUID: {puuid}")
            return result

    except httpx.HTTPStatusError as e:
        log_handler.error(f"HTTP Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch match data from Riot API.")
    except httpx.RequestError as e:
        log_handler.error(f"Request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")