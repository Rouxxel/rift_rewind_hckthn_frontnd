"""
#############################################################################
### Validator methods file
###
### @file validators.py
### @Sebastian Russo
### @date: 2025
#############################################################################

This module defines several methods to validate several things.
"""
#Native imports
import re

#Other files imports
from src.utils.custom_logger import log_handler
#from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader
from fastapi import HTTPException

def validate_summoner_name(give_name: str):
    """
    Validate a League of Legends summoner name (gameName).

    Rules:
    - 1 to 16 characters
    - Only letters, numbers, spaces, underscores and periods
    - No leading or trailing spaces
    """
    if not (1 <= len(give_name) <= 16):
        raise HTTPException(status_code=400, detail="Summoner name must be 1-16 characters long.")
    if give_name != give_name.strip():
        raise HTTPException(status_code=400, detail="Summoner name cannot have leading or trailing spaces.")
    if not re.fullmatch(r"[A-Za-z0-9 _\.]+", give_name):
        raise HTTPException(status_code=400, detail="Summoner name contains invalid characters.")
    log_handler.debug(f"Summoner name '{give_name}' is valid.")

def validate_tagline(given_tagline: str):
    """
    Validate a League of Legends tagline (discriminator).

    Rules:
    - 2 to 5 characters
    - Only letters or numbers
    """
    if not (2 <= len(given_tagline) <= 5):
        raise HTTPException(status_code=400, detail="Tagline must be 2-5 characters long.")
    if not re.fullmatch(r"[A-Za-z0-9]+", given_tagline):
        raise HTTPException(status_code=400, detail="Tagline must be alphanumeric.")
    log_handler.debug(f"Tagline '{given_tagline}' is valid.")

def validate_region_routing(given_region: str):
    """
    Validate a region input against the general_regions in the configuration JSON.

    Args:
        region (str): The region input to validate (e.g., 'americas', 'europe').
        data_loader (dict): The loaded configuration JSON containing region info.

    Raises:
        HTTPException: If the region is not valid.
    """
    region_lower = given_region.lower()
    general_regions = data_loader["regions"]["regional_routings"]

    if region_lower not in general_regions:
        raise HTTPException(
            status_code=400,
            detail=f"Region '{given_region}' is invalid. Must be one of: {', '.join(general_regions)}."
        )

    log_handler.debug(f"Region '{given_region}' is valid.")

def validate_platform_regions(given_region: str):
    """
    Validate a region input against the platform_regions in the configuration JSON.

    Args:
        region (str): The region input to validate (e.g., 'jp1', 'kr').
        data_loader (dict): The loaded configuration JSON containing region info.

    Raises:
        HTTPException: If the region is not valid.
    """
    region_plat_lower = given_region.lower()
    plat_regions = data_loader["regions"]["platform_regions"]

    if region_plat_lower not in plat_regions:
        raise HTTPException(
            status_code=400,
            detail=f"Region '{given_region}' is invalid. Must be one of: {', '.join(plat_regions)}."
        )

    log_handler.debug(f"Region '{given_region}' is valid.")

