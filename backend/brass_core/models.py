from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class Era(Enum):
    CANAL = "canal"
    RAIL = "rail"


class IndustryType(Enum):
    COAL = "coal"
    IRON = "iron"
    BREWERY = "brewery"
    MANUFACTURER = "manufacturer"
    COTTON = "cotton"
    POTTERY = "pottery"


class PlayerColor(Enum):
    RED = "red"
    BLUE = "blue"
    GREEN = "green"
    YELLOW = "yellow"


@dataclass
class Player:
    id: int
    name: str
    color: PlayerColor
    income: int = 0
    money: int = 0
    victory_points: int = 0


@dataclass
class IndustryTile:
    id: str
    owner: Optional[PlayerColor]
    industry: IndustryType
    level: int
    flipped: bool = False


@dataclass
class IndustrySpace:
    id: str
    allowed_industries: List[IndustryType]
    tile: Optional[IndustryTile] = None


@dataclass
class Location:
    id: str
    name: str
    spaces: List[IndustrySpace]


@dataclass
class Route:
    id: str
    city1: str
    city2: str
    owner: Optional[PlayerColor] = None
    era: Optional[Era] = None


@dataclass
class GameState:
    era: Era
    players: List[Player] = field(default_factory=list)
    locations: List[Location] = field(default_factory=list)
    routes: List[Route] = field(default_factory=list)