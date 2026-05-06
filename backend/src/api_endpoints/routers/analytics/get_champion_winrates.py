"""
#############################################################################
### Champion Win Rates Analytics
###
### @file get_champion_winrates.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint provides champion win rates, pick rates, and ban rates
based on aggregated data from Data Dragon and simulated meta analysis.
"""

#Native imports
import os
from typing import Dict, Any, List
import random

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
import httpx

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

"""VARIABLES-----------------------------------------------------------"""
# Data Dragon URL for champions
DATA_DRAGON_CHAMPIONS_URL = data_loader["metadata"]["data_dragon"]["working_url_chmp"]
CURRENT_PATCH = data_loader["metadata"]["data_dragon"]["latest_versions"]

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_champion_winrates_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_champion_winrates_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_champion_winrates_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_champion_winrates_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_champion_winrates_endpoint']['unit_of_time_for_limit']}"
)
async def get_champion_winrates(
    request: Request,
    rank: str = Query("ALL", description="Rank filter: IRON, BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, MASTER, GRANDMASTER, CHALLENGER, ALL"),
    role: str = Query("ALL", description="Role filter: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY, ALL"),
    sort_by: str = Query("win_rate", description="Sort by: win_rate, pick_rate, ban_rate, name"),
    limit: int = Query(50, description="Number of champions to return (max 200)")
) -> Dict[str, Any]:
    """
    Get champion win rates, pick rates, and ban rates by rank and role.
    
    Note: This endpoint provides simulated data based on champion characteristics
    since real-time meta data requires extensive match analysis.

    Parameters:
    - rank (str): Rank tier filter
    - role (str): Role/position filter  
    - sort_by (str): Sorting criteria
    - limit (int): Number of results to return (max 200)

    Returns:
    - dict containing champion statistics and meta information
    """
    if limit > 200:
        limit = 200

    try:
        # Fetch champion data from Data Dragon
        async with httpx.AsyncClient() as client:
            response = await client.get(DATA_DRAGON_CHAMPIONS_URL)
            response.raise_for_status()
            
            champions_data = response.json().get("data", {})
            
            if not champions_data:
                raise HTTPException(status_code=500, detail="Failed to fetch champion data from Data Dragon.")

            # Generate simulated meta data based on champion characteristics
            champion_stats = []
            
            for champ_id, champ_info in champions_data.items():
                champion_name = champ_info.get("name", champ_id)
                champion_title = champ_info.get("title", "")
                tags = champ_info.get("tags", [])
                
                # Simulate win rates based on champion characteristics
                # This is a simplified simulation - in production, you'd use real data
                base_win_rate = 50.0
                
                # Adjust based on champion complexity and meta position
                if "Assassin" in tags:
                    base_win_rate += random.uniform(-3, 5)  # Assassins vary by skill level
                elif "Tank" in tags:
                    base_win_rate += random.uniform(-1, 3)  # Tanks generally stable
                elif "Marksman" in tags:
                    base_win_rate += random.uniform(-2, 4)  # ADCs depend on meta
                elif "Mage" in tags:
                    base_win_rate += random.uniform(-2, 6)  # Mages vary widely
                elif "Support" in tags:
                    base_win_rate += random.uniform(0, 3)   # Supports generally positive
                elif "Fighter" in tags:
                    base_win_rate += random.uniform(-1, 4)  # Fighters balanced
                
                # Adjust for rank (higher ranks favor complex champions)
                rank_multiplier = 1.0
                if rank in ["MASTER", "GRANDMASTER", "CHALLENGER"]:
                    if "Assassin" in tags or "Mage" in tags:
                        rank_multiplier = 1.1
                elif rank in ["IRON", "BRONZE", "SILVER"]:
                    if "Tank" in tags or "Support" in tags:
                        rank_multiplier = 1.05
                    elif "Assassin" in tags:
                        rank_multiplier = 0.95
                
                win_rate = min(max(base_win_rate * rank_multiplier, 35.0), 65.0)
                
                # Generate pick and ban rates
                pick_rate = random.uniform(0.5, 15.0)
                ban_rate = random.uniform(0.1, 25.0)
                
                # Popular champions have higher pick rates
                if champion_name in ["Jinx", "Yasuo", "Lee Sin", "Thresh", "Lux", "Ezreal"]:
                    pick_rate *= 1.5
                    ban_rate *= 1.3
                
                # Adjust for role filter (simplified)
                role_match = True
                if role != "ALL":
                    primary_role = None
                    if "Marksman" in tags:
                        primary_role = "BOTTOM"
                    elif "Support" in tags:
                        primary_role = "UTILITY"
                    elif "Assassin" in tags:
                        primary_role = "MIDDLE"
                    elif "Tank" in tags and "Fighter" not in tags:
                        primary_role = "TOP"
                    elif "Fighter" in tags:
                        primary_role = random.choice(["TOP", "JUNGLE"])
                    elif "Mage" in tags:
                        primary_role = "MIDDLE"
                    else:
                        primary_role = "TOP"
                    
                    role_match = (primary_role == role)
                
                if role_match:
                    champion_stats.append({
                        "name": champion_name,
                        "title": champion_title,
                        "champion_id": champ_id,
                        "tags": tags,
                        "win_rate": round(win_rate, 1),
                        "pick_rate": round(pick_rate, 1),
                        "ban_rate": round(ban_rate, 1),
                        "games_played": int(pick_rate * 1000),  # Simulated games
                        "primary_role": primary_role if 'primary_role' in locals() else "UNKNOWN"
                    })

            # Sort champions
            sort_key_map = {
                "win_rate": lambda x: x["win_rate"],
                "pick_rate": lambda x: x["pick_rate"], 
                "ban_rate": lambda x: x["ban_rate"],
                "name": lambda x: x["name"]
            }
            
            if sort_by in sort_key_map:
                champion_stats.sort(key=sort_key_map[sort_by], reverse=(sort_by != "name"))
            
            # Limit results
            champion_stats = champion_stats[:limit]
            
            # Calculate meta statistics
            total_champions = len(champion_stats)
            avg_win_rate = sum(champ["win_rate"] for champ in champion_stats) / total_champions if total_champions > 0 else 0
            avg_pick_rate = sum(champ["pick_rate"] for champ in champion_stats) / total_champions if total_champions > 0 else 0
            avg_ban_rate = sum(champ["ban_rate"] for champ in champion_stats) / total_champions if total_champions > 0 else 0
            
            # Find top performers
            top_win_rate = max(champion_stats, key=lambda x: x["win_rate"]) if champion_stats else None
            top_pick_rate = max(champion_stats, key=lambda x: x["pick_rate"]) if champion_stats else None
            top_ban_rate = max(champion_stats, key=lambda x: x["ban_rate"]) if champion_stats else None

            result = {
                "patch": CURRENT_PATCH,
                "rank_filter": rank,
                "role_filter": role,
                "sort_by": sort_by,
                "total_champions": total_champions,
                "meta_summary": {
                    "avg_win_rate": round(avg_win_rate, 1),
                    "avg_pick_rate": round(avg_pick_rate, 1),
                    "avg_ban_rate": round(avg_ban_rate, 1),
                    "highest_win_rate": {
                        "champion": top_win_rate["name"] if top_win_rate else None,
                        "win_rate": top_win_rate["win_rate"] if top_win_rate else 0
                    },
                    "most_picked": {
                        "champion": top_pick_rate["name"] if top_pick_rate else None,
                        "pick_rate": top_pick_rate["pick_rate"] if top_pick_rate else 0
                    },
                    "most_banned": {
                        "champion": top_ban_rate["name"] if top_ban_rate else None,
                        "ban_rate": top_ban_rate["ban_rate"] if top_ban_rate else 0
                    }
                },
                "champions": champion_stats,
                "disclaimer": "This data is simulated for demonstration purposes. Production implementation would require extensive match data analysis."
            }

            log_handler.info(f"Generated champion win rates for {total_champions} champions (rank: {rank}, role: {role})")
            return result

    except httpx.RequestError as e:
        log_handler.error(f"Failed to fetch champion data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch champion data from Data Dragon.")