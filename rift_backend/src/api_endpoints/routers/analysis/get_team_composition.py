"""
#############################################################################
### Team Composition Analysis
###
### @file get_team_composition.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint analyzes team composition strengths, weaknesses,
and provides strategic recommendations.
"""

#Native imports
from typing import Dict, Any, List

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

# Team composition archetypes
TEAM_ARCHETYPES = {
    "Poke": {"required_tags": ["Mage"], "bonus_tags": ["Marksman"], "description": "Long-range damage and siege potential"},
    "Engage": {"required_tags": ["Tank"], "bonus_tags": ["Fighter", "Assassin"], "description": "Strong initiation and team fight"},
    "Protect": {"required_tags": ["Support", "Marksman"], "bonus_tags": ["Tank"], "description": "Protect the carry strategy"},
    "Split Push": {"required_tags": ["Fighter"], "bonus_tags": ["Assassin"], "description": "1-3-1 or 1-4 split push strategy"},
    "Teamfight": {"required_tags": ["Tank", "Mage"], "bonus_tags": ["Support"], "description": "5v5 team fight focused"},
    "Pick": {"required_tags": ["Assassin"], "bonus_tags": ["Support"], "description": "Catch enemies out of position"}
}

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_team_composition_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_team_composition_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['get_team_composition_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_team_composition_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_team_composition_endpoint']['unit_of_time_for_limit']}"
)
async def get_team_composition(
    request: Request,
    champions: List[str] = Body(..., description="List of 5 champion names"),
    enemy_champions: List[str] = Body(None, description="Optional: Enemy team champions for counter-analysis"),
    game_phase: str = Body("all", description="Game phase focus: early, mid, late, all")
) -> Dict[str, Any]:
    """
    Analyze team composition strengths, weaknesses, and strategic potential.

    Parameters:
    - champions (List[str]): List of 5 champion names for the team
    - enemy_champions (List[str], optional): Enemy team for matchup analysis
    - game_phase (str): Which game phase to focus analysis on

    Returns:
    - dict containing comprehensive team composition analysis
    """
    if len(champions) != 5:
        raise HTTPException(status_code=400, detail="Team must have exactly 5 champions.")
    
    if enemy_champions and len(enemy_champions) != 5:
        raise HTTPException(status_code=400, detail="Enemy team must have exactly 5 champions if provided.")

    try:
        # Fetch champion data
        response = requests.get(DATA_DRAGON_CHAMPIONS_URL)
        response.raise_for_status()
        champions_data = response.json().get("data", {})

        def get_champion_info(champion_name):
            for champ_id, champ_info in champions_data.items():
                if champ_info.get("name", "").lower() == champion_name.lower():
                    return champ_info
            return None

        # Analyze team composition
        team_data = []
        all_tags = []
        total_stats = {"attack": 0, "defense": 0, "magic": 0, "difficulty": 0}

        for champion_name in champions:
            champ_info = get_champion_info(champion_name)
            if not champ_info:
                raise HTTPException(status_code=404, detail=f"Champion '{champion_name}' not found.")
            
            tags = champ_info.get("tags", [])
            info = champ_info.get("info", {})
            
            champion_analysis = {
                "name": champ_info.get("name"),
                "title": champ_info.get("title"),
                "tags": tags,
                "stats": {
                    "attack": info.get("attack", 5),
                    "defense": info.get("defense", 5),
                    "magic": info.get("magic", 5),
                    "difficulty": info.get("difficulty", 5)
                },
                "primary_role": tags[0] if tags else "Unknown"
            }
            
            team_data.append(champion_analysis)
            all_tags.extend(tags)
            
            for stat, value in champion_analysis["stats"].items():
                total_stats[stat] += value

        # Calculate team averages
        team_averages = {stat: round(value / 5, 1) for stat, value in total_stats.items()}
        
        # Identify team archetype
        unique_tags = set(all_tags)
        team_archetype = "Balanced"
        archetype_score = 0
        
        for archetype, requirements in TEAM_ARCHETYPES.items():
            score = 0
            # Check required tags
            for req_tag in requirements["required_tags"]:
                if req_tag in unique_tags:
                    score += 3
            # Check bonus tags
            for bonus_tag in requirements.get("bonus_tags", []):
                if bonus_tag in unique_tags:
                    score += 1
            
            if score > archetype_score:
                archetype_score = score
                team_archetype = archetype

        # Analyze strengths and weaknesses
        strengths = []
        weaknesses = []
        
        # Damage analysis
        if team_averages["attack"] >= 7:
            strengths.append("High physical damage output")
        elif team_averages["attack"] <= 4:
            weaknesses.append("Low physical damage")
            
        if team_averages["magic"] >= 7:
            strengths.append("Strong magic damage")
        elif team_averages["magic"] <= 4:
            weaknesses.append("Limited magic damage")
            
        # Survivability analysis
        if team_averages["defense"] >= 7:
            strengths.append("Tanky frontline")
        elif team_averages["defense"] <= 4:
            weaknesses.append("Fragile team composition")
        
        # Role diversity
        role_count = len(unique_tags)
        if role_count >= 4:
            strengths.append("Diverse team composition")
        elif role_count <= 2:
            weaknesses.append("Limited role diversity")
        
        # Specific tag analysis
        if "Tank" in unique_tags and "Marksman" in unique_tags:
            strengths.append("Good engage and sustained damage")
        if "Support" in unique_tags:
            strengths.append("Strong utility and vision control")
        if "Assassin" in unique_tags and "Tank" not in unique_tags:
            weaknesses.append("Lack of frontline protection")

        # Game phase analysis
        phase_analysis = {}
        
        if game_phase in ["early", "all"]:
            early_strength = 0
            if "Assassin" in unique_tags:
                early_strength += 2
            if "Fighter" in unique_tags:
                early_strength += 1
            if team_averages["attack"] >= 6:
                early_strength += 1
            
            phase_analysis["early_game"] = {
                "strength": "Strong" if early_strength >= 3 else "Moderate" if early_strength >= 2 else "Weak",
                "score": early_strength,
                "focus": "Look for early skirmishes and lane dominance" if early_strength >= 3 else "Play safe and scale"
            }
        
        if game_phase in ["mid", "all"]:
            mid_strength = 0
            if "Mage" in unique_tags:
                mid_strength += 2
            if "Tank" in unique_tags:
                mid_strength += 1
            if role_count >= 4:
                mid_strength += 1
            
            phase_analysis["mid_game"] = {
                "strength": "Strong" if mid_strength >= 3 else "Moderate" if mid_strength >= 2 else "Weak",
                "score": mid_strength,
                "focus": "Group for objectives and team fights" if mid_strength >= 3 else "Look for picks and avoid team fights"
            }
        
        if game_phase in ["late", "all"]:
            late_strength = 0
            if "Marksman" in unique_tags:
                late_strength += 2
            if "Mage" in unique_tags:
                late_strength += 1
            if team_averages["magic"] + team_averages["attack"] >= 12:
                late_strength += 1
            
            phase_analysis["late_game"] = {
                "strength": "Strong" if late_strength >= 3 else "Moderate" if late_strength >= 2 else "Weak",
                "score": late_strength,
                "focus": "Focus on team fights and objective control" if late_strength >= 3 else "End game quickly"
            }

        # Strategic recommendations
        recommendations = []
        
        if team_archetype == "Poke":
            recommendations.append("Focus on sieging and poking before team fights")
        elif team_archetype == "Engage":
            recommendations.append("Look for good engage opportunities")
        elif team_archetype == "Protect":
            recommendations.append("Keep your carry safe and let them deal damage")
        elif team_archetype == "Split Push":
            recommendations.append("Use split push pressure to create advantages")
        elif team_archetype == "Teamfight":
            recommendations.append("Group up and force 5v5 team fights")
        elif team_archetype == "Pick":
            recommendations.append("Look for isolated enemies and pick them off")
        else:
            recommendations.append("Play to your team's strengths and adapt to the game state")

        # Add general recommendations based on strengths/weaknesses
        if "Fragile team composition" in weaknesses:
            recommendations.append("Focus on positioning and avoid getting caught")
        if "Strong utility and vision control" in strengths:
            recommendations.append("Use vision control to set up plays")

        result = {
            "team_composition": {
                "champions": team_data,
                "archetype": team_archetype,
                "archetype_description": TEAM_ARCHETYPES.get(team_archetype, {}).get("description", "Balanced team composition")
            },
            "team_stats": {
                "averages": team_averages,
                "total_difficulty": round(team_averages["difficulty"], 1),
                "role_diversity": role_count,
                "unique_roles": list(unique_tags)
            },
            "analysis": {
                "strengths": strengths,
                "weaknesses": weaknesses,
                "phase_analysis": phase_analysis
            },
            "strategic_recommendations": recommendations,
            "win_conditions": [
                f"Leverage {team_archetype.lower()} strategy effectively",
                "Play to your power spikes",
                "Minimize weaknesses through positioning and macro play"
            ]
        }

        # Add enemy matchup analysis if provided
        if enemy_champions:
            enemy_tags = []
            for enemy_champ in enemy_champions:
                enemy_info = get_champion_info(enemy_champ)
                if enemy_info:
                    enemy_tags.extend(enemy_info.get("tags", []))
            
            enemy_unique_tags = set(enemy_tags)
            
            matchup_analysis = {
                "enemy_roles": list(enemy_unique_tags),
                "favorable_matchups": [],
                "difficult_matchups": [],
                "key_considerations": []
            }
            
            # Simple matchup analysis
            if "Tank" in unique_tags and "Marksman" in enemy_unique_tags:
                matchup_analysis["favorable_matchups"].append("Your tanks can engage on their carries")
            if "Assassin" in unique_tags and "Mage" in enemy_unique_tags:
                matchup_analysis["favorable_matchups"].append("Your assassins can target their mages")
            if "Assassin" in enemy_unique_tags and "Tank" not in unique_tags:
                matchup_analysis["difficult_matchups"].append("Enemy assassins can target your carries")
            
            result["matchup_analysis"] = matchup_analysis

        log_handler.info(f"Analyzed team composition: {team_archetype} archetype with {len(champions)} champions")
        return result

    except requests.RequestException as e:
        log_handler.error(f"Failed to fetch champion data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch champion data for analysis.")