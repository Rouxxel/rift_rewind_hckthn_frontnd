"""
#############################################################################
### Riot API Item Info Fetch
###
### @file get_items.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module defines an endpoint to fetch all item info from Riot's Data Dragon.
"""

#Native imports
from typing import Dict, Any, Optional

#Third-party imports
from fastapi import APIRouter, Request, HTTPException, Query
import httpx

#Other file imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

"""VARIABLES-----------------------------------------------------------"""
# Data Dragon URL for items (already fully formed)
DATA_DRAGON_ITEMS_URL = data_loader["metadata"]["data_dragon"]["working_url_item"]

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['get_items_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['get_items_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.get(config_loader['endpoints']['get_items_endpoint']['endpoint_route'])  # /get_items
@SlowLimiter.limit(
    f"{config_loader['endpoints']['get_items_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['get_items_endpoint']['unit_of_time_for_limit']}"
)
async def get_items(
    request: Request,
    item_name_or_id: Optional[str] = Query(None, description="Item name or ID (optional - returns all if not specified)"),
    detailed: bool = Query(False, description="Include detailed item information (stats, build path, etc.)"),
    category: Optional[str] = Query(None, description="Filter by item category (e.g., 'Boots', 'Damage', 'Defense')"),
    include_recipe: bool = Query(False, description="Include item build recipe and components"),
    include_stats: bool = Query(False, description="Include detailed item statistics")
) -> Dict[str, Any]:
    """
    Fetch item info from Data Dragon with optional detailed information.

    Parameters:
    - item_name_or_id (str, optional): Name or ID of a specific item
    - detailed (bool): Include enhanced item information
    - category (str, optional): Filter items by category
    - include_recipe (bool): Include build recipe and components
    - include_stats (bool): Include detailed item statistics

    Returns:
    - dict containing item data (basic or detailed based on parameters)
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(DATA_DRAGON_ITEMS_URL)
            response.raise_for_status()

            items_data = response.json().get("data", {})

            # If a specific item is requested
            if item_name_or_id:
                found_item = None
                item_key = None
                
                for item_id, item_info in items_data.items():
                    if (str(item_id) == str(item_name_or_id) or 
                        item_info.get("name", "").lower() == item_name_or_id.lower()):
                        found_item = item_info
                        item_key = item_id
                        break

                if not found_item:
                    raise HTTPException(status_code=404, detail=f"Item '{item_name_or_id}' not found")

                # Return detailed information if requested
                if detailed:
                    result = parse_detailed_item_data(found_item, item_key, items_data, include_recipe, include_stats)
                    log_handler.info(f"Fetched detailed info for item '{item_name_or_id}' from Data Dragon")
                    return {"item": result}
                else:
                    log_handler.info(f"Fetched basic info for item '{item_name_or_id}' from Data Dragon")
                    return {"item": found_item}

            # Filter by category if specified
            filtered_items = items_data
            if category:
                filtered_items = {}
                for item_id, item_info in items_data.items():
                    item_tags = item_info.get("tags", [])
                    if category.lower() in [tag.lower() for tag in item_tags]:
                        filtered_items[item_id] = item_info

            # Return all items (or filtered) if no specific item is requested
            if detailed and len(filtered_items) > 50:
                raise HTTPException(status_code=400, detail="Detailed information is only available for specific items or smaller filtered sets (max 50 items).")
            
            if detailed:
                detailed_items = {}
                for item_id, item_info in list(filtered_items.items())[:50]:  # Limit to 50 for performance
                    detailed_items[item_id] = parse_detailed_item_data(item_info, item_id, items_data, include_recipe, include_stats)
                
                log_handler.info(f"Fetched detailed info for {len(detailed_items)} items from Data Dragon")
                return {"items": detailed_items, "total_count": len(filtered_items)}
            else:
                log_handler.info(f"Fetched {len(filtered_items)} items from Data Dragon")
                return {"items": filtered_items, "total_count": len(filtered_items)}

    except httpx.RequestError as e:
        log_handler.error(f"Failed to fetch items from Data Dragon: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch item data from Data Dragon.")


def parse_detailed_item_data(item_data: dict, item_key: str, all_items: dict, 
                           include_recipe: bool, include_stats: bool) -> Dict[str, Any]:
    """Parse detailed item data with enhanced information."""
    
    # Extract basic item info
    result = {
        "item_id": item_key,
        "name": item_data.get("name"),
        "description": item_data.get("description", ""),
        "plaintext": item_data.get("plaintext", ""),
        "tags": item_data.get("tags", []),
        "gold": item_data.get("gold", {}),
        "patch_version": data_loader["metadata"]["data_dragon"]["latest_versions"],
        "language": data_loader["metadata"]["data_dragon"]["chosen_lang"]
    }

    # Add item image information
    image = item_data.get("image", {})
    result["image"] = {
        "full": image.get("full", ""),
        "sprite": image.get("sprite", ""),
        "group": image.get("group", ""),
        "x": image.get("x", 0),
        "y": image.get("y", 0),
        "w": image.get("w", 0),
        "h": image.get("h", 0)
    }

    # Include detailed stats if requested
    if include_stats:
        stats = item_data.get("stats", {})
        result["stats"] = {
            "attack_damage": stats.get("FlatPhysicalDamageMod", 0),
            "ability_power": stats.get("FlatMagicDamageMod", 0),
            "health": stats.get("FlatHPPoolMod", 0),
            "mana": stats.get("FlatMPPoolMod", 0),
            "armor": stats.get("FlatArmorMod", 0),
            "magic_resist": stats.get("FlatSpellBlockMod", 0),
            "attack_speed": stats.get("PercentAttackSpeedMod", 0),
            "crit_chance": stats.get("FlatCritChanceMod", 0),
            "movement_speed": stats.get("FlatMovementSpeedMod", 0),
            "life_steal": stats.get("PercentLifeStealMod", 0),
            "ability_haste": stats.get("FlatCooldownReductionMod", 0),
            "health_regen": stats.get("FlatHPRegenMod", 0),
            "mana_regen": stats.get("FlatMPRegenMod", 0)
        }

    # Include recipe information if requested
    if include_recipe:
        recipe_from = item_data.get("from", [])
        recipe_into = item_data.get("into", [])
        
        result["recipe"] = {
            "components": [],
            "builds_into": [],
            "total_cost": item_data.get("gold", {}).get("total", 0),
            "base_cost": item_data.get("gold", {}).get("base", 0),
            "sell_value": item_data.get("gold", {}).get("sell", 0)
        }
        
        # Get component item names
        for component_id in recipe_from:
            component_item = all_items.get(str(component_id), {})
            result["recipe"]["components"].append({
                "id": component_id,
                "name": component_item.get("name", f"Item {component_id}"),
                "cost": component_item.get("gold", {}).get("total", 0)
            })
        
        # Get items this builds into
        for upgrade_id in recipe_into:
            upgrade_item = all_items.get(str(upgrade_id), {})
            result["recipe"]["builds_into"].append({
                "id": upgrade_id,
                "name": upgrade_item.get("name", f"Item {upgrade_id}"),
                "cost": upgrade_item.get("gold", {}).get("total", 0)
            })

    # Add item categories and metadata
    result["metadata"] = {
        "purchasable": item_data.get("gold", {}).get("purchasable", True),
        "consumable": "Consumable" in item_data.get("tags", []),
        "boots": "Boots" in item_data.get("tags", []),
        "legendary": "Legendary" in item_data.get("tags", []),
        "mythic": "Mythic" in item_data.get("tags", []),
        "starter": "Starter" in item_data.get("tags", []),
        "support": "Support" in item_data.get("tags", [])
    }

    return result
