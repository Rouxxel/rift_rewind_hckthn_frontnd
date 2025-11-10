"""
#############################################################################
### Match Outcome Prediction
###
### @file get_match_outcome.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint predicts match outcomes based on team compositions,
champion synergies, and historical performance data.
"""

#Native imports
import os
from typing import Dict, Any, List
import random

#Third-party imports
from fastapi import APIRouter, Body, Request, HTTPException
import requests

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

"""VARIABLES-----------------------------------------------------------"""
DATA_DRAGON_CHAMPIONS_URL = data_loader["metadata"]["data_dragon"]["working_url_chmp"]

# Champion synergy and counter data (simplified for demo)
CHAMPION_SYNERGIES = {
    "Tank": ["Marksman", "Mage"],
    "Fighter": ["Support", "Mage"],
    "Assassin": ["Tank", "Support"],
    "Mage": ["Tank", "Support"],
    "Marksman": ["Tank", "Support"],
    "Support": ["Marksman", "Mage"]
}

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_match_outcome_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_match_outcome_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['get_match_outcome_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_match_outcome_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_match_outcome_endpoint']['unit_of_time_for_limit']}"
)
async def get_match_outcome(
    request: Request,
    blue_team: List[str] = Body(..., description="List of 5 champion names for blue team"),
    red_team: List[str] = Body(..., description="List of 5 champion names for red team"),
    game_mode: str = Body("CLASSIC", description="Game mode: CLASSIC, ARAM, etc."),
    average_rank: str = Body("GOLD", description="Average rank of players: IRON, BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, MASTER+")
) -> Dict[str, Any]:
    """
    Predict match outcome based on team compositions and champion synergies.

    Parameters:
    - blue_team (List[str]): Champion names for blue team (5 champions)
    - red_team (List[str]): Champion names for red team (5 champions)
    - game_mode (str): Game mode type
    - average_rank (str): Average player rank

    Returns:
    - dict containing win probability prediction and analysis
    """
    if len(blue_team) != 5 or len(red_team) != 5:
        raise HTTPException(status_code=400, detail="Each team must have exactly 5 champions.")

    try:
        # Fetch champion data for analysis
        response = requests.get(DATA_DRAGON_CHAMPIONS_URL)
        response.raise_for_status()
        champions_data = response.json().get("data", {})

        def get_champion_data(champion_name):
            for champ_id, champ_info in champions_data.items():
                if champ_info.get("name", "").lower() == champion_name.lower():
                    return champ_info
            return None

        def analyze_team(team_champions):
            team_data = []
            team_tags = []
            team_difficulty = 0
            team_synergy_score = 0
            
            for champion_name in team_champions:
                champ_data = get_champion_data(champion_name)
                if not champ_data:
                    raise HTTPException(status_code=404, detail=f"Champion '{champion_name}' not found.")
                
                tags = champ_data.get("tags", [])
                difficulty = champ_data.get("info", {}).get("difficulty", 5)
                
                team_data.append({
                    "name": champ_data.get("name"),
                    "tags": tags,
                    "difficulty": difficulty,
                    "attack": champ_data.get("info", {}).get("attack", 5),
                    "defense": champ_data.get("info", {}).get("defense", 5),
                    "magic": champ_data.get("info", {}).get("magic", 5)
                })
                
                team_tags.extend(tags)
                team_difficulty += difficulty
            
            # Calculate team synergy based on role diversity
            unique_tags = set(team_tags)
            synergy_bonus = len(unique_tags) * 2  # Reward role diversity
            
            # Check for specific synergies
            for tag in unique_tags:
                synergistic_tags = CHAMPION_SYNERGIES.get(tag, [])
                for syn_tag in synergistic_tags:
                    if syn_tag in unique_tags:
                        synergy_bonus += 3
            
            # Calculate team composition scores
            avg_attack = sum(champ["attack"] for champ in team_data) / 5
            avg_defense = sum(champ["defense"] for champ in team_data) / 5
            avg_magic = sum(champ["magic"] for champ in team_data) / 5
            avg_difficulty = team_difficulty / 5
            
            return {
                "champions": team_data,
                "composition_score": {
                    "attack": round(avg_attack, 1),
                    "defense": round(avg_defense, 1),
                    "magic": round(avg_magic, 1),
                    "difficulty": round(avg_difficulty, 1),
                    "synergy": synergy_bonus
                },
                "team_tags": list(unique_tags),
                "strengths": [],
                "weaknesses": []
            }

        # Analyze both teams
        blue_analysis = analyze_team(blue_team)
        red_analysis = analyze_team(red_team)

        # Calculate win probability based on multiple factors
        blue_score = 0
        red_score = 0

        # Factor 1: Team composition balance
        blue_balance = (blue_analysis["composition_score"]["attack"] + 
                       blue_analysis["composition_score"]["defense"] + 
                       blue_analysis["composition_score"]["magic"]) / 3
        red_balance = (red_analysis["composition_score"]["attack"] + 
                      red_analysis["composition_score"]["defense"] + 
                      red_analysis["composition_score"]["magic"]) / 3

        blue_score += blue_balance * 2
        red_score += red_balance * 2

        # Factor 2: Synergy bonus
        blue_score += blue_analysis["composition_score"]["synergy"]
        red_score += red_analysis["composition_score"]["synergy"]

        # Factor 3: Difficulty adjustment based on rank
        rank_difficulty_multiplier = {
            "IRON": 0.5, "BRONZE": 0.6, "SILVER": 0.7, "GOLD": 0.8,
            "PLATINUM": 0.9, "DIAMOND": 1.0, "MASTER+": 1.1
        }
        
        multiplier = rank_difficulty_multiplier.get(average_rank.upper(), 0.8)
        
        # Higher difficulty champions are better in higher ranks
        blue_score += blue_analysis["composition_score"]["difficulty"] * multiplier
        red_score += red_analysis["composition_score"]["difficulty"] * multiplier

        # Factor 4: Game mode adjustments
        if game_mode == "ARAM":
            # ARAM favors poke and teamfight champions
            for team_analysis, score in [(blue_analysis, "blue"), (red_analysis, "red")]:
                aram_bonus = 0
                if "Mage" in team_analysis["team_tags"]:
                    aram_bonus += 5
                if "Marksman" in team_analysis["team_tags"]:
                    aram_bonus += 3
                if "Support" in team_analysis["team_tags"]:
                    aram_bonus += 4
                
                if score == "blue":
                    blue_score += aram_bonus
                else:
                    red_score += aram_bonus

        # Add some randomness to make predictions more realistic
        blue_score += random.uniform(-5, 5)
        red_score += random.uniform(-5, 5)

        # Calculate win probabilities
        total_score = blue_score + red_score
        blue_win_prob = (blue_score / total_score * 100) if total_score > 0 else 50
        red_win_prob = 100 - blue_win_prob

        # Ensure probabilities are within reasonable bounds
        blue_win_prob = max(25, min(75, blue_win_prob))
        red_win_prob = 100 - blue_win_prob

        # Generate team strengths and weaknesses
        def generate_team_analysis(analysis, team_name):
            strengths = []
            weaknesses = []
            
            if analysis["composition_score"]["attack"] >= 7:
                strengths.append("High damage output")
            elif analysis["composition_score"]["attack"] <= 4:
                weaknesses.append("Low damage potential")
            
            if analysis["composition_score"]["defense"] >= 7:
                strengths.append("Strong frontline")
            elif analysis["composition_score"]["defense"] <= 4:
                weaknesses.append("Fragile team composition")
            
            if analysis["composition_score"]["magic"] >= 7:
                strengths.append("Strong magic damage")
            elif analysis["composition_score"]["magic"] <= 4:
                weaknesses.append("Limited magic damage")
            
            if analysis["composition_score"]["synergy"] >= 15:
                strengths.append("Excellent team synergy")
            elif analysis["composition_score"]["synergy"] <= 8:
                weaknesses.append("Poor champion synergy")
            
            analysis["strengths"] = strengths
            analysis["weaknesses"] = weaknesses

        generate_team_analysis(blue_analysis, "Blue")
        generate_team_analysis(red_analysis, "Red")

        result = {
            "prediction": {
                "blue_team_win_probability": round(blue_win_prob, 1),
                "red_team_win_probability": round(red_win_prob, 1),
                "confidence": "Medium",  # Could be calculated based on score difference
                "predicted_winner": "Blue Team" if blue_win_prob > red_win_prob else "Red Team"
            },
            "team_analysis": {
                "blue_team": blue_analysis,
                "red_team": red_analysis
            },
            "match_factors": {
                "game_mode": game_mode,
                "average_rank": average_rank,
                "key_factors": [
                    "Team composition balance",
                    "Champion synergies",
                    "Player skill level adaptation",
                    "Game mode optimization"
                ]
            },
            "recommendations": {
                "blue_team": "Focus on your team's strengths and coordinate team fights.",
                "red_team": "Look for picks and capitalize on enemy positioning mistakes."
            },
            "disclaimer": "This prediction is based on champion data and simulated analysis. Actual match outcomes depend heavily on player skill, strategy, and execution."
        }

        log_handler.info(f"Generated match prediction: Blue {blue_win_prob:.1f}% vs Red {red_win_prob:.1f}%")
        return result

    except requests.RequestException as e:
        log_handler.error(f"Failed to fetch champion data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch champion data for analysis.")