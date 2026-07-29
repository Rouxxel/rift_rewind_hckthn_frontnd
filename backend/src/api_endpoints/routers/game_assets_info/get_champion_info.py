"""
#############################################################################
### Riot API Champion Info Fetch
###
### @file get_champions.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines an endpoint to fetch all champion info from Riot's Data Dragon.
"""

# Native imports
import re
from typing import Dict, Any, Optional

# Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
import httpx

# Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader
from src.resources.riot_cache_keys import (
    ddragon_champions_key,
    ddragon_champion_detail_key,
    TTL_DDRAGON,
)
from src.resources.riot_data_service import cached_or_fetch

"""VARIABLES-----------------------------------------------------------"""
# Data Dragon URL for champions (already fully formed)
DATA_DRAGON_CHAMPIONS_URL = data_loader["metadata"]["data_dragon"]["working_url_chmp"]
# Template for detailed champion data
DATA_DRAGON_CHAMPION_DETAIL_URL_TEMPLATE = "https://ddragon.leagueoflegends.com/cdn/{version}/data/{language}/champion/{champion}.json"


def _champion_name_variations(name: str) -> list:
    """
    Generate name variants for matching Data Dragon champions.
    Handles spaces (Miss Fortune / MissFortune) and special chars (Kai'Sa / KaiSa, Cho'Gath / ChoGath).
    """
    if not name or not name.strip():
        return []
    name = name.strip()
    variants = [name]

    # Remove spaces and common special chars (compact form)
    compact = name.replace(" ", "").replace("'", "").replace(".", "").replace("-", "")
    if compact and compact not in variants:
        variants.append(compact)

    # Add space before capitals: MissFortune -> Miss Fortune, LeeSin -> Lee Sin
    with_spaces = "".join(" " + c if c.isupper() and i else c for i, c in enumerate(name)).strip()
    if with_spaces and with_spaces not in variants:
        variants.append(with_spaces)

    # Add apostrophe between lower and upper: KaiSa -> Kai'Sa, ChoGath -> Cho'Gath
    with_apostrophe = re.sub(r"([a-z])([A-Z])", r"\1'\2", name)
    if with_apostrophe and with_apostrophe not in variants:
        variants.append(with_apostrophe)

    # Without apostrophe: Kai'Sa -> KaiSa
    if "'" in name:
        no_apostrophe = name.replace("'", "")
        if no_apostrophe and no_apostrophe not in variants:
            variants.append(no_apostrophe)

    # Known Data Dragon display names / keys (common special cases)
    special = {
        "velkoz": ["Vel'Koz", "VelKoz", "Vel Koz"],
        "velkoZ": ["Vel'Koz", "VelKoz"],
        "ksante": ["K'Sante", "KSante", "K Sante"],
        "khazix": ["Kha'Zix", "KhaZix", "Kha Zix"],
        "reksai": ["Rek'Sai", "RekSai", "Rek Sai"],
        "chogath": ["Cho'Gath", "ChoGath", "Cho Gath"],
        "kogmaw": ["Kog'Maw", "KogMaw", "Kog Maw"],
        "leblanc": ["LeBlanc", "Le Blanc"],
        "missfortune": ["Miss Fortune", "MissFortune"],
        "masteryi": ["Master Yi", "MasterYi"],
        "tahmkench": ["Tahm Kench", "TahmKench"],
        "twistedfate": ["Twisted Fate", "TwistedFate"],
        "jarvaniv": ["Jarvan IV", "JarvanIV"],
        "leesin": ["Lee Sin", "LeeSin"],
        "aurelionsol": ["Aurelion Sol", "AurelionSol"],
        "drmundo": ["Dr. Mundo", "DrMundo", "Dr Mundo"],
        "xinzhao": ["Xin Zhao", "XinZhao"],
        "kaisa": ["Kai'Sa", "KaiSa"],
    }
    key = name.replace(" ", "").replace("'", "").replace(".", "").replace("-", "").lower()
    if key in special:
        for v in special[key]:
            if v and v not in variants:
                variants.append(v)
    return variants

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_champions_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_champions_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_champions_endpoint']['endpoint_route'])  # /get_champions
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_champions_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_champions_endpoint']['unit_of_time_for_limit']}"
)
async def get_champions(
    request: Request,
    champion_name: Optional[str] = Query(None, description="Champion name or key (optional - returns all if not specified)"),
    detailed: bool = Query(False, description="Include detailed ability information and stats"),
    ability: Optional[str] = Query(None, description="Specific ability: passive, q, w, e, r (only with detailed=true)"),
    include_stats: bool = Query(False, description="Include champion base stats (only with detailed=true)"),
    include_tips: bool = Query(False, description="Include champion tips and lore (only with detailed=true)")
) -> Dict[str, Any]:
    """
    Fetch champion info from Data Dragon with optional detailed ability information.

    Parameters:
    - champion_name (str, optional): Name or key of a specific champion
    - detailed (bool): Include parsed abilities, cooldowns, costs, etc.
    - ability (str, optional): Specific ability to return (requires detailed=true)
    - include_stats (bool): Include base champion statistics
    - include_tips (bool): Include champion tips and lore

    Returns:
    - dict containing champion data (basic or detailed based on parameters)
    """
    try:
        patch_version = data_loader["metadata"]["data_dragon"]["latest_versions"]

        async def _fetch_champions_catalog() -> Dict[str, Any]:
            async with httpx.AsyncClient() as client:
                response = await client.get(DATA_DRAGON_CHAMPIONS_URL)
                response.raise_for_status()
                return response.json()

        raw = await cached_or_fetch(
            ddragon_champions_key(patch_version),
            TTL_DDRAGON,
            _fetch_champions_catalog,
            log_prefix="get_champion_info",
        )
        champions_data = raw.get("data") if isinstance(raw, dict) else {}
        if not isinstance(champions_data, dict):
            champions_data = {}

        # If a specific champion is requested
        if champion_name:
            # Try match with fallback: spaces (Miss Fortune/MissFortune) and special chars (Kai'Sa/KaiSa, Cho'Gath/ChoGath)
            variants = _champion_name_variations(champion_name)
            found_champion = None
            champion_key = None

            for champ_id, champ_info in champions_data.items():
                cid = (champ_info.get("id") or "").lower()
                cname = (champ_info.get("name") or "").lower()
                ckey = champ_id.lower()
                for v in variants:
                    vv = v.lower()
                    if cid == vv or cname == vv or ckey == vv:
                        found_champion = champ_info
                        champion_key = champ_id
                        break
                if found_champion:
                    break

            if not found_champion:
                raise HTTPException(status_code=404, detail=f"Champion '{champion_name}' not found")

            # Return detailed information if requested
            if detailed:
                detailed_url = DATA_DRAGON_CHAMPION_DETAIL_URL_TEMPLATE.format(
                    version=patch_version,
                    language=data_loader["metadata"]["data_dragon"]["chosen_lang"],
                    champion=champion_key
                )

                async def _fetch_champion_detail() -> Dict[str, Any]:
                    async with httpx.AsyncClient() as client:
                        detailed_response = await client.get(detailed_url)
                        detailed_response.raise_for_status()
                        return detailed_response.json()

                try:
                    detailed_raw = await cached_or_fetch(
                        ddragon_champion_detail_key(patch_version, champion_key),
                        TTL_DDRAGON,
                        _fetch_champion_detail,
                        log_prefix="get_champion_info",
                    )
                    detailed_data = detailed_raw.get("data", {}) if isinstance(detailed_raw, dict) else {}
                    if champion_key in detailed_data:
                        detailed_champion = detailed_data[champion_key]
                        result = parse_detailed_champion_data(
                            detailed_champion, champion_key, ability, include_stats, include_tips
                        )
                        log_handler.info(
                            f"[get_champion_info] Fetched detailed info for champion '{champion_name}' from Data Dragon"
                        )
                        return {"champion": result}
                    log_handler.warning(
                        f"[get_champion_info] Detailed data not found for champion '{champion_name}', falling back to basic"
                    )
                    return {"champion": found_champion}
                except httpx.RequestError as e:
                    log_handler.warning(
                        f"[get_champion_info] Failed to fetch detailed data for champion '{champion_name}': {e}, falling back to basic"
                    )
                    return {"champion": found_champion}

            log_handler.info(
                f"[get_champion_info] Fetched basic info for champion '{champion_name}' from Data Dragon"
            )
            return {"champion": found_champion}

        # Return all champions (no champion_name)
        if detailed:
            raise HTTPException(
                status_code=400,
                detail="Detailed information is only available for specific champions. Please specify champion_name.",
            )
        log_handler.info(f"[get_champion_info] Fetched {len(champions_data)} champions from Data Dragon")
        return {"champions": champions_data}
    except HTTPException:
        raise
    except httpx.RequestError as e:
        log_handler.error(f"[get_champion_info] Failed to fetch champions from Data Dragon: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch champion data from Data Dragon.")


def parse_detailed_champion_data(champion_data: dict, champion_key: str, ability: Optional[str], 
                                include_stats: bool, include_tips: bool) -> Dict[str, Any]:
    """Parse detailed champion data with abilities, stats, and tips."""
    
    # Extract basic champion info
    result = {
        "champion_id": champion_key,
        "name": champion_data.get("name"),
        "title": champion_data.get("title"),
        "tags": champion_data.get("tags", []),
        "patch_version": data_loader["metadata"]["data_dragon"]["latest_versions"],
        "language": data_loader["metadata"]["data_dragon"]["chosen_lang"]
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

    return result
