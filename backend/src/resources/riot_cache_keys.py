"""
#############################################################################
### Riot / Data Dragon cache key builders and TTLs
###
### TTLs are loaded from config_file.json via config_loader
### (redis_cache.ttl_seconds). Values are in seconds.
#############################################################################
"""

from typing import Optional, Sequence

from src.core_specs.configuration.config_loader import config_loader

_TTL = config_loader["redis_cache"]["ttl_seconds"]

TTL_MATCH = _TTL["match"]
TTL_DDRAGON = _TTL["ddragon"]
TTL_PUUID = _TTL["puuid"]
TTL_SUMMONER = _TTL["summoner"]
TTL_MATCH_IDS = _TTL["match_ids"]
TTL_MASTERY = _TTL["mastery"]
TTL_WINRATES = _TTL["winrates"]


def puuid_key(region: str, game_name: str, tag_line: str) -> str:
    return f"riot:puuid:{region.lower()}:{game_name.lower()}:{tag_line.lower()}"


def summoner_key(region: str, puuid: str) -> str:
    return f"riot:summoner:{region.lower()}:{puuid}"


def match_ids_key(region: str, puuid: str, count: int) -> str:
    return f"riot:match_ids:{region.lower()}:{puuid}:{count}"


def match_details_key(region: str, match_id: str) -> str:
    return f"riot:match:{region.lower()}:{match_id}"


def match_participants_key(
    region: str,
    match_id: str,
    num_participants: int,
    simplified: bool,
) -> str:
    return (
        f"riot:match_participants:{region.lower()}:{match_id}"
        f":{num_participants}:{int(simplified)}"
    )


def match_timeline_key(
    region: str,
    match_id: str,
    event_types: Optional[Sequence[str]],
    participant_id: Optional[int],
) -> str:
    events_part = ",".join(sorted(event_types)) if event_types else "all"
    participant_part = participant_id if participant_id is not None else "all"
    return f"riot:timeline:{region.lower()}:{match_id}:{events_part}:{participant_part}"


def mastery_key(
    region: str,
    puuid: str,
    champion_id: Optional[int],
    top: Optional[int],
    total_score: bool,
) -> str:
    return (
        f"riot:mastery:{region.lower()}:{puuid}"
        f":cid={champion_id}:top={top}:score={int(total_score)}"
    )


def ddragon_champions_key(version: str = "latest") -> str:
    return f"ddragon:champions:{version}"


def ddragon_champion_detail_key(version: str, champion_key: str) -> str:
    return f"ddragon:champion_detail:{version}:{champion_key}"


def ddragon_items_key(version: str = "latest") -> str:
    return f"ddragon:items:{version}"


def winrates_key(rank: str, role: str, sort_by: str, limit: int) -> str:
    return (
        f"analytics:winrates:{rank.upper()}:{role.upper()}"
        f":{sort_by.lower()}:{limit}"
    )
