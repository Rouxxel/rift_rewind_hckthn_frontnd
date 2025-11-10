"""
#############################################################################
### Champion Abilities Information
###
### @file get_champion_abilities.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This endpoint provides detailed champion ability information including
descriptions, cooldowns, costs, and damage ratios from Data Dragon.
"""

#Native imports
from typing import Dict, Any, Optional

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
import requests

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

"""VARIABLES-----------------------------------------------------------"""
# Data Dragon URLs
DATA_DRAGON_CHAMPIONS_URL = data_loader["metadata"]["data_dragon"]["working_url_chmp"]
PATCH_VERSION = data_loader["metadata"]["data_dragon"]["latest_versions"]
LANGUAGE = data_loader["metadata"]["data_dragon"]["chosen_lang"]

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_champion_abilities_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_champion_abilities_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_champion_abilities_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_champion_abilities_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_champion_abilities_endpoint']['unit_of_time_for_limit']}"
)
async def get_champion_abilities(
    request: Request,
    champion_name: str = Query(..., description="Champion name or ID (e.g., 'Jinx', 'Ahri')"),
    ability: str = Query(None, description="Specific ability: passive, q, w, e, r, all"),
    include_stats: bool = Query(True, description="Include champion base stats"),
    include_tips: bool = Query(False, description="Include champion tips and lore")
) -> Dict[str, Any]:
    """
    Get detailed champion ability information from Data Dragon.

    Parameters:
    - champion_name (str): Name or ID of the champion
    - ability (str, optional): Specific ability to return
    - include_stats (bool): Include base champion statistics
    - include_tips (bool): Include champion tips and lore

    Returns:
    - dict containing detailed champion ability information
    """
    try:
        # Fetch champion data from Data Dragon
        response = requests.get(DATA_DRAGON_CHAMPIONS_URL)
        response.raise_for_status()
        
        champions_data = response.json().get("data", {})
        
        # Find the champion (case-insensitive search)
        champion_data = None
        champion_key = None
        
        for champ_id, champ_info in champions_data.items():
            if (champ_info.get("name", "").lower() == champion_name.lower() or 
                champ_info.get("id", "").lower() == champion_name.lower() or
                champ_id.lower() == champion_name.lower()):
                champion_data = champ_info
                champion_key = champ_id
                break
        
        if not champion_data:
            raise HTTPException(status_code=404, detail=f"Champion '{champion_name}' not found.")

        # Extract basic champion info
        result = {
            "champion_id": champion_key,
            "name": champion_data.get("name"),
            "title": champion_data.get("title"),
            "tags": champion_data.get("tags", []),
            "patch_version": PATCH_VERSION,
            "language": LANGUAGE
        }

        # Extract abilities
        spells = champion_data.get("spells", [])
        passive = champion_data.get("passive", {})
        
        abilities_data = {
            "passive": {
                "name": passive.get("name", "Unknown"),
                "description": passive.get("description", "No description available"),
                "image": {
                    "full": passive.get("image", {}).get("full", ""),
                    "sprite": passive.get("image", {}).get("sprite", ""),
                    "group": passive.get("image", {}).get("group", "")
                }
            }
        }
        
        # Map spells to Q, W, E, R
        ability_keys = ["q", "w", "e", "r"]
        for i, spell in enumerate(spells[:4]):  # Only take first 4 spells
            if i < len(ability_keys):
                key = ability_keys[i]
                
                # Extract cooldown, cost, and range information
                cooldown = spell.get("cooldown", [])
                cost = spell.get("cost", [])
                spell_range = spell.get("range", [])
                
                abilities_data[key] = {
                    "name": spell.get("name", "Unknown"),
                    "description": spell.get("description", "No description available"),
                    "tooltip": spell.get("tooltip", ""),
                    "max_rank": spell.get("maxrank", 5),
                    "cooldown": cooldown,
                    "cost": cost,
                    "cost_type": spell.get("costType", "Mana"),
                    "range": spell_range,
                    "effect": spell.get("effect", []),
                    "effect_burn": spell.get("effectBurn", []),
                    "vars": spell.get("vars", []),
                    "image": {
                        "full": spell.get("image", {}).get("full", ""),
                        "sprite": spell.get("image", {}).get("sprite", ""),
                        "group": spell.get("image", {}).get("group", "")
                    }
                }

        # Filter by specific ability if requested
        if ability and ability.lower() != "all":
            ability_key = ability.lower()
            if ability_key in abilities_data:
                result["ability"] = abilities_data[ability_key]
            else:
                raise HTTPException(status_code=400, detail=f"Invalid ability '{ability}'. Must be one of: passive, q, w, e, r, all")
        else:
            result["abilities"] = abilities_data

        # Include champion stats if requested
        if include_stats:
            stats = champion_data.get("stats", {})
            result["base_stats"] = {
                "hp": stats.get("hp", 0),
                "hp_per_level": stats.get("hpperlevel", 0),
                "mp": stats.get("mp", 0),
                "mp_per_level": stats.get("mpperlevel", 0),
                "move_speed": stats.get("movespeed", 0),
                "armor": stats.get("armor", 0),
                "armor_per_level": stats.get("armorperlevel", 0),
                "spell_block": stats.get("spellblock", 0),
                "spell_block_per_level": stats.get("spellblockperlevel", 0),
                "attack_range": stats.get("attackrange", 0),
                "hp_regen": stats.get("hpregen", 0),
                "hp_regen_per_level": stats.get("hpregenperlevel", 0),
                "mp_regen": stats.get("mpregen", 0),
                "mp_regen_per_level": stats.get("mpregenperlevel", 0),
                "crit": stats.get("crit", 0),
                "crit_per_level": stats.get("critperlevel", 0),
                "attack_damage": stats.get("attackdamage", 0),
                "attack_damage_per_level": stats.get("attackdamageperlevel", 0),
                "attack_speed": stats.get("attackspeed", 0),
                "attack_speed_per_level": stats.get("attackspeedperlevel", 0)
            }

        # Include tips and lore if requested
        if include_tips:
            result["tips"] = {
                "ally_tips": champion_data.get("allytips", []),
                "enemy_tips": champion_data.get("enemytips", []),
                "lore": champion_data.get("lore", "No lore available"),
                "blurb": champion_data.get("blurb", "No description available")
            }

        # Add champion difficulty and info
        info = champion_data.get("info", {})
        result["champion_info"] = {
            "attack": info.get("attack", 0),
            "defense": info.get("defense", 0),
            "magic": info.get("magic", 0),
            "difficulty": info.get("difficulty", 0)
        }

        log_handler.info(f"Fetched abilities for champion: {champion_data.get('name')}")
        return result

    except requests.RequestException as e:
        log_handler.error(f"Failed to fetch champion data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch champion data from Data Dragon.")