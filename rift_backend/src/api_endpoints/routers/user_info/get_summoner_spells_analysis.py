"""
#############################################################################
### Riot API Summoner Spells Analysis
###
### @file get_summoner_spells_analysis.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint analyzes summoner spell usage patterns from recent matches
and provides effectiveness statistics.
"""

#Native imports
import os
from typing import Dict, Any, List
from collections import Counter

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
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

# Summoner spell mapping
SUMMONER_SPELLS = {
    1: "Cleanse",
    3: "Exhaust", 
    4: "Flash",
    6: "Ghost",
    7: "Heal",
    11: "Smite",
    12: "Teleport",
    13: "Clarity",
    14: "Ignite",
    21: "Barrier",
    32: "Mark/Dash"
}

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_summoner_spells_analysis_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_summoner_spells_analysis_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_summoner_spells_analysis_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_summoner_spells_analysis_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_summoner_spells_analysis_endpoint']['unit_of_time_for_limit']}"
)
async def get_summoner_spells_analysis(
    request: Request,
    region: str = Query(..., description="One of: americas, europe, asia, sea"),
    puuid: str = Query(..., description="Encrypted PUUID of the player"),
    champion_name: str = Query(None, description="Optional: Analyze spells for specific champion"),
    match_count: int = Query(15, description="Number of recent matches to analyze (max 25)")
) -> Dict[str, Any]:
    """
    Analyze summoner spell usage patterns and effectiveness.

    Parameters:
    - region (str): Regional routing value
    - puuid (str): Player's encrypted PUUID
    - champion_name (str, optional): Filter by specific champion
    - match_count (int): Number of matches to analyze

    Returns:
    - dict containing summoner spell usage statistics and win rates
    """
    try:
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"Validation failed: {e.detail}")
        raise

    if match_count > 25:
        match_count = 25

    headers = {"X-Riot-Token": RIOT_API_KEY}

    try:
        # Get recent match IDs
        match_url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        match_params = {"start": 0, "count": match_count}
        
        match_response = requests.get(match_url, headers=headers, params=match_params)
        match_response.raise_for_status()
        match_ids = match_response.json()

        if not match_ids:
            raise HTTPException(status_code=404, detail="No recent matches found for this player.")

        # Analyze summoner spells from matches
        spell_combinations = Counter()
        spell_wins = Counter()
        spell_games = Counter()
        champion_spells = {}
        role_spells = {}

        for match_id in match_ids:
            try:
                # Get match details
                match_detail_url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/{match_id}"
                match_detail_response = requests.get(match_detail_url, headers=headers)
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
                role = player_data.get("teamPosition", "UNKNOWN")
                
                # Skip if filtering by champion and this doesn't match
                if champion_name and champion.lower() != champion_name.lower():
                    continue

                # Extract summoner spell data
                spell1_id = player_data.get("summoner1Id")
                spell2_id = player_data.get("summoner2Id")
                
                spell1_name = SUMMONER_SPELLS.get(spell1_id, f"Unknown_{spell1_id}")
                spell2_name = SUMMONER_SPELLS.get(spell2_id, f"Unknown_{spell2_id}")
                
                # Create consistent spell combination (alphabetical order)
                spell_combo = tuple(sorted([spell1_name, spell2_name]))
                spell_combinations[spell_combo] += 1
                spell_games[spell_combo] += 1
                
                win = player_data.get("win", False)
                if win:
                    spell_wins[spell_combo] += 1

                # Track by champion
                if champion not in champion_spells:
                    champion_spells[champion] = {
                        "combinations": Counter(),
                        "wins": Counter(),
                        "games": Counter()
                    }
                
                champion_spells[champion]["combinations"][spell_combo] += 1
                champion_spells[champion]["games"][spell_combo] += 1
                if win:
                    champion_spells[champion]["wins"][spell_combo] += 1

                # Track by role
                if role not in role_spells:
                    role_spells[role] = {
                        "combinations": Counter(),
                        "wins": Counter(),
                        "games": Counter()
                    }
                
                role_spells[role]["combinations"][spell_combo] += 1
                role_spells[role]["games"][spell_combo] += 1
                if win:
                    role_spells[role]["wins"][spell_combo] += 1

            except requests.RequestException as e:
                log_handler.warning(f"Failed to fetch match {match_id}: {e}")
                continue

        if not spell_combinations:
            raise HTTPException(status_code=404, detail="No summoner spell data found in recent matches.")

        # Calculate win rates
        spell_stats = {}
        for combo, games in spell_games.items():
            wins = spell_wins.get(combo, 0)
            win_rate = (wins / games * 100) if games > 0 else 0
            spell_stats[f"{combo[0]} + {combo[1]}"] = {
                "games": games,
                "wins": wins,
                "win_rate": round(win_rate, 1)
            }

        # Champion breakdown
        champion_breakdown = {}
        for champion, data in champion_spells.items():
            champion_breakdown[champion] = {}
            for combo, games in data["games"].items():
                wins = data["wins"].get(combo, 0)
                win_rate = (wins / games * 100) if games > 0 else 0
                champion_breakdown[champion][f"{combo[0]} + {combo[1]}"] = {
                    "games": games,
                    "wins": wins,
                    "win_rate": round(win_rate, 1)
                }

        # Role breakdown
        role_breakdown = {}
        for role, data in role_spells.items():
            role_breakdown[role] = {}
            for combo, games in data["games"].items():
                wins = data["wins"].get(combo, 0)
                win_rate = (wins / games * 100) if games > 0 else 0
                role_breakdown[role][f"{combo[0]} + {combo[1]}"] = {
                    "games": games,
                    "wins": wins,
                    "win_rate": round(win_rate, 1)
                }

        result = {
            "puuid": puuid,
            "region": region,
            "champion_filter": champion_name,
            "matches_analyzed": len([combo for combo in spell_combinations]),
            "overall_stats": {
                "most_used_combinations": dict(spell_combinations.most_common(5)),
                "spell_effectiveness": dict(sorted(spell_stats.items(), key=lambda x: x[1]["win_rate"], reverse=True)[:5])
            },
            "champion_breakdown": champion_breakdown,
            "role_breakdown": role_breakdown
        }

        log_handler.info(f"Analyzed summoner spells from matches for PUUID: {puuid}")
        return result

    except requests.HTTPError as e:
        log_handler.error(f"HTTP Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch match data from Riot API.")
    except requests.RequestException as e:
        log_handler.error(f"Request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")