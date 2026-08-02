from __future__ import annotations

from dataclasses import dataclass, field, replace

from .board import Board
from .models import (
    Era,
    IndustryType,
    PlacedIndustry,
    PlacedRoute,
    Player,
    PlayerColor,
)


class GameStateError(ValueError):
    """Raised when a requested game-state mutation is invalid."""


@dataclass(slots=True)
class GameState:
    era: Era = Era.CANAL
    players: dict[PlayerColor, Player] = field(default_factory=dict)
    routes: dict[str, PlacedRoute] = field(default_factory=dict)
    industries: dict[str, PlacedIndustry] = field(default_factory=dict)

    @classmethod
    def new(cls) -> "GameState":
        return cls(
            era=Era.CANAL,
            players={
                color: Player(color=color, name=color.value.title())
                for color in PlayerColor
            },
        )

    def set_era(self, era: Era) -> None:
        self.era = era

    def claim_route(
        self,
        board: Board,
        route_id: str,
        owner: PlayerColor,
        era: Era | None = None,
    ) -> PlacedRoute:
        route = board.routes.get(route_id)
        if route is None:
            raise GameStateError(f"Unknown route: {route_id}")

        route_era = era or self.era
        if route_era not in route.supported_eras:
            raise GameStateError(
                f"Route {route_id} does not support the {route_era.value} era."
            )

        placed = PlacedRoute(route_id=route_id, owner=owner, era=route_era)
        self.routes[route_id] = placed
        return placed

    def clear_route(self, route_id: str) -> None:
        self.routes.pop(route_id, None)

    def place_industry(
        self,
        board: Board,
        space_id: str,
        owner: PlayerColor,
        industry: IndustryType,
        level: int,
        flipped: bool = False,
    ) -> PlacedIndustry:
        space = None
        for location in board.locations.values():
            for candidate in location.spaces:
                if candidate.id == space_id:
                    space = candidate
                    break
            if space is not None:
                break

        if space is None:
            raise GameStateError(f"Unknown industry space: {space_id}")

        if industry not in space.allowed_industries:
            allowed = ", ".join(item.value for item in space.allowed_industries)
            raise GameStateError(
                f"{industry.value} is not allowed in {space_id}. Allowed: {allowed}"
            )

        placed = PlacedIndustry(
            space_id=space_id,
            owner=owner,
            industry=industry,
            level=level,
            flipped=flipped,
        )
        self.industries[space_id] = placed
        return placed

    def clear_industry(self, space_id: str) -> None:
        self.industries.pop(space_id, None)

    def set_industry_flipped(self, space_id: str, flipped: bool) -> PlacedIndustry:
        current = self.industries.get(space_id)
        if current is None:
            raise GameStateError(f"No industry is placed in {space_id}")

        updated = replace(current, flipped=flipped)
        self.industries[space_id] = updated
        return updated

    def to_dict(self) -> dict:
        return {
            "era": self.era.value,
            "players": [
                {
                    "color": player.color.value,
                    "name": player.name,
                    "income": player.income,
                    "money": player.money,
                    "victory_points": player.victory_points,
                }
                for player in self.players.values()
            ],
            "routes": {
                route_id: {
                    "route_id": item.route_id,
                    "owner": item.owner.value,
                    "era": item.era.value,
                }
                for route_id, item in self.routes.items()
            },
            "industries": {
                space_id: {
                    "space_id": item.space_id,
                    "owner": item.owner.value,
                    "industry": item.industry.value,
                    "level": item.level,
                    "flipped": item.flipped,
                }
                for space_id, item in self.industries.items()
            },
        }
