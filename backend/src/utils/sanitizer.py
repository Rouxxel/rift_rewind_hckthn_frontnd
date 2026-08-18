"""
#############################################################################
### Input Sanitization Utilities
###
### @file sanitizer.py
### @author Sebastian Russo
### @date 2025
#############################################################################

Provides functions to sanitize user-provided text inputs (prompts, names, etc.)
to prevent injection attacks, control character abuse, and oversized payloads.
"""

import re
import unicodedata


def sanitize_text(text: str, max_length: int = 2000, field_name: str = "input") -> str:
    """
    Sanitize a generic text input.

    - Strips control characters (keeps newline, tab, space)
    - Normalizes excessive whitespace
    - Enforces maximum length

    Parameters:
        text (str): The raw input text.
        max_length (int): Maximum allowed character count.
        field_name (str): Name for error messages.

    Returns:
        str: Cleaned text.

    Raises:
        ValueError: If the input is empty or exceeds max_length after cleaning.
    """
    if not text or not text.strip():
        raise ValueError(f"{field_name} must not be empty.")

    # Strip control characters (keep \n \r \t and space)
    cleaned = "".join(
        ch for ch in text
        if ch in (' ', '\n', '\r', '\t') or not unicodedata.category(ch).startswith('C')
    )

    # Collapse excessive whitespace (but preserve single newlines for formatting)
    cleaned = re.sub(r'[^\S\n]+', ' ', cleaned)  # non-newline whitespace → single space
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)  # max 2 consecutive newlines
    cleaned = cleaned.strip()

    if not cleaned:
        raise ValueError(f"{field_name} must not be empty after sanitization.")

    if len(cleaned) > max_length:
        raise ValueError(f"{field_name} exceeds maximum allowed length of {max_length} characters.")

    return cleaned


def sanitize_game_name(name: str, max_length: int = 50) -> str:
    """
    Sanitize a Riot game name or tag line.

    - Allows alphanumeric, spaces, underscores, hyphens, and common unicode letters
    - Strips everything else
    - Enforces length limit

    Parameters:
        name (str): The raw game name or tag.
        max_length (int): Maximum allowed length.

    Returns:
        str: Cleaned name.

    Raises:
        ValueError: If the name is empty or invalid.
    """
    if not name or not name.strip():
        raise ValueError("Game name must not be empty.")

    # Allow letters (any script), digits, spaces, hyphens, underscores, periods, apostrophes
    cleaned = re.sub(r'[^\w\s\-\.\']', '', name, flags=re.UNICODE).strip()

    if not cleaned:
        raise ValueError("Game name contains only invalid characters.")

    if len(cleaned) > max_length:
        raise ValueError(f"Game name exceeds maximum length of {max_length} characters.")

    return cleaned


def sanitize_region(region: str) -> str:
    """
    Validate and normalize a region string.

    Only allows known region values to prevent injection.

    Parameters:
        region (str): The raw region input.

    Returns:
        str: Validated lowercase region.

    Raises:
        ValueError: If the region is not in the allowed set.
    """
    allowed_regions = {"americas", "europe", "asia", "sea"}
    normalized = region.strip().lower()

    if normalized not in allowed_regions:
        raise ValueError(f"Invalid region '{region}'. Must be one of: {', '.join(sorted(allowed_regions))}")

    return normalized
