"""
#############################################################################
### Player Performance Analytics
###
### @file get_player_performance.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint calculates advanced player statistics by analyzing
multiple recent matches and providing performance trends.
"""

#Native imports
import os
from typing import Dict, Any, List
from collections import Counter
import statistics

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
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
    prefix=config_loader['endpoints']['get_player_performance_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_player_performance_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_player_performance_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_player_performance_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_player_performance_endpoint']['unit_of_time_for_limit']}"
)
async def get_player_performance(
    request: Request,
    region: str = Query(..., description="One of: americas, europe, asia, sea"),
    puuid: str = Query(..., description="Encrypted PUUID of the player"),
    match_count: int = Query(20, description="Number of recent matches to analyze (max 30)"),
    queue_type: str = Query("all", description="Queue type filter: ranked, normal, aram, all")
) -> Dict[str, Any]:
    """
    Calculate advanced player performance statistics across recent matches.

    Default queue_type is "all" so inactive / non-Solo-Duo players still get
    Overview data from recent normals, Flex, ARAM, etc.
    """
    try:
        region_lower = region.lower()
        validate_region_routing(region_lower)
    except HTTPException as e:
        log_handler.warning(f"[get_player_performance] Validation failed: {e.detail}")
        raise

    if match_count > 30:
        match_count = 30

    headers = {"X-Riot-Token": RIOT_API_KEY}

    # Riot match-v5 accepts a single queue id per request. For "ranked" we
    # fetch a larger unfiltered window and keep Solo/Duo + Flex only.
    queue_filter_ids = {
        "ranked": {420, 440},  # Solo/Duo, Flex
        "normal": {430},
        "aram": {450},
        "all": None,
    }
    allowed_queues = queue_filter_ids.get(queue_type, None)

    try:
        async with httpx.AsyncClient() as client:
            match_url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
            # Over-fetch when filtering so we still reach match_count after drops
            fetch_count = match_count if allowed_queues is None else min(30, match_count * 2)
            match_params = {"start": 0, "count": fetch_count}

            # Single-queue types can use Riot's queue param directly
            if queue_type in ("normal", "aram"):
                match_params["queue"] = next(iter(allowed_queues))

            match_response = await client.get(match_url, headers=headers, params=match_params)
            match_response.raise_for_status()
            match_ids = match_response.json()

            if not match_ids:
                raise HTTPException(status_code=404, detail="No recent matches found for this player.")

            performance_data = []
            champions_played = Counter()
            roles_played = Counter()

            kda_values = []
            cs_per_min_values = []
            damage_per_min_values = []
            vision_scores = []
            gold_per_min_values = []
            kill_participation = []

            wins = 0
            total_games = 0

            for match_id in match_ids:
                if total_games >= match_count:
                    break
                try:
                    match_detail_url = f"https://{region_lower}.api.riotgames.com/lol/match/v5/matches/{match_id}"
                    match_detail_response = await client.get(match_detail_url, headers=headers)
                    match_detail_response.raise_for_status()

                    match_data = match_detail_response.json()
                    match_info = match_data.get("info", {})
                    queue_id = match_info.get("queueId")

                    if allowed_queues is not None and queue_id not in allowed_queues:
                        continue

                    participants = match_info.get("participants", [])
                    game_duration = match_info.get("gameDuration", 1)

                    player_data = None
                    team_kills = 0
                    for participant in participants:
                        if participant.get("puuid") == puuid:
                            player_data = participant
                        if player_data and participant.get("teamId") == player_data.get("teamId"):
                            team_kills += participant.get("kills", 0)

                    if not player_data:
                        continue

                    total_games += 1
                    champion = player_data.get("championName", "Unknown")
                    role = player_data.get("teamPosition", "UNKNOWN")

                    champions_played[champion] += 1
                    roles_played[role] += 1

                    kills = player_data.get("kills", 0)
                    deaths = player_data.get("deaths", 0)
                    assists = player_data.get("assists", 0)

                    kda = (kills + assists) / max(deaths, 1)
                    kda_values.append(kda)

                    total_cs = player_data.get("totalMinionsKilled", 0) + player_data.get("neutralMinionsKilled", 0)
                    cs_per_min = (total_cs / game_duration) * 60 if game_duration > 0 else 0
                    cs_per_min_values.append(cs_per_min)

                    total_damage = player_data.get("totalDamageDealtToChampions", 0)
                    damage_per_min = (total_damage / game_duration) * 60 if game_duration > 0 else 0
                    damage_per_min_values.append(damage_per_min)

                    vision_score = player_data.get("visionScore", 0)
                    vision_scores.append(vision_score)

                    gold_earned = player_data.get("goldEarned", 0)
                    gold_per_min = (gold_earned / game_duration) * 60 if game_duration > 0 else 0
                    gold_per_min_values.append(gold_per_min)

                    kp = ((kills + assists) / max(team_kills, 1)) * 100 if team_kills > 0 else 0
                    kill_participation.append(kp)

                    if player_data.get("win", False):
                        wins += 1

                    performance_data.append({
                        "match_id": match_id,
                        "champion": champion,
                        "role": role,
                        "kda": round(kda, 2),
                        "cs_per_min": round(cs_per_min, 1),
                        "damage_per_min": round(damage_per_min, 0),
                        "vision_score": vision_score,
                        "gold_per_min": round(gold_per_min, 0),
                        "kill_participation": round(kp, 1),
                        "win": player_data.get("win", False),
                        "game_duration": game_duration,
                        "queue_id": queue_id,
                    })

                except httpx.RequestError as e:
                    log_handler.warning(f"[get_player_performance] Failed to fetch match {match_id}: {e}")
                    continue

            if not performance_data:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        "No performance data found in recent matches "
                        f"for queue_type='{queue_type}'. Try queue_type=all."
                    ),
                )

        # Calculate averages and statistics
        def safe_mean(values):
            return round(statistics.mean(values), 2) if values else 0
        
        def safe_median(values):
            return round(statistics.median(values), 2) if values else 0

        win_rate = (wins / total_games * 100) if total_games > 0 else 0

        result = {
            "puuid": puuid,
            "region": region,
            "queue_type": queue_type,
            "matches_analyzed": total_games,
            "overall_performance": {
                "win_rate": round(win_rate, 1),
                "avg_kda": safe_mean(kda_values),
                "median_kda": safe_median(kda_values),
                "avg_cs_per_min": safe_mean(cs_per_min_values),
                "avg_damage_per_min": safe_mean(damage_per_min_values),
                "avg_vision_score": safe_mean(vision_scores),
                "avg_gold_per_min": safe_mean(gold_per_min_values),
                "avg_kill_participation": safe_mean(kill_participation)
            },
            "champion_stats": {
                "most_played": dict(champions_played.most_common(5)),
                "total_unique_champions": len(champions_played)
            },
            "role_distribution": dict(roles_played.most_common()),
            "performance_trends": {
                "recent_5_games": {
                    "win_rate": round(sum(1 for match in performance_data[-5:] if match["win"]) / min(5, len(performance_data)) * 100, 1),
                    "avg_kda": safe_mean([match["kda"] for match in performance_data[-5:]])
                },
                "recent_10_games": {
                    "win_rate": round(sum(1 for match in performance_data[-10:] if match["win"]) / min(10, len(performance_data)) * 100, 1),
                    "avg_kda": safe_mean([match["kda"] for match in performance_data[-10:]])
                }
            },
            "detailed_matches": performance_data[-10:]  # Return last 10 matches for detailed view
        }

        log_handler.info(f"[get_player_performance] Analyzed performance for {total_games} matches for PUUID: {puuid}")
        return result

    except httpx.HTTPStatusError as e:
        log_handler.error(f"[get_player_performance] HTTP Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch match data from Riot API.")
    except httpx.RequestError as e:
        log_handler.error(f"[get_player_performance] Request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Riot API.")