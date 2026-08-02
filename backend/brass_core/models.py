from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Era(StrEnum):
    CANAL = "canal"
    RAIL = "rail"


class IndustryType(StrEnum):
    COAL_MINE = "coal_mine"
    IRON_WORKS = "iron_works"
    BREWERY = "brewery"
    MANUFACTURER = "manufacturer"
    COTTON_MILL = "cotton_mill"
    POTTERY = "pottery"


@dataclass(frozen=True, slots=True)
class Position:
    x: float
    y: float


@dataclass(frozen=True, slots=True)
class IndustrySpace:
    id: str
    allowed_industries: tuple[IndustryType, ...]


@dataclass(frozen=True, slots=True)
class Location:
    id: str
    name: str
    position: Position
    spaces: tuple[IndustrySpace, ...]


@dataclass(frozen=True, slots=True)
class Merchant:
    id: str
    name: str
    position: Position
    link_icons: int = 2


@dataclass(frozen=True, slots=True)
class Route:
    id: str
    endpoint_a: str
    endpoint_b: str
    supported_eras: tuple[Era, ...]
