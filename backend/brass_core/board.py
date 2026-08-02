from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .models import Era, IndustrySpace, IndustryType, Location, Merchant, Position, Route


class BoardDataError(ValueError):
    """Raised when board.json contains invalid or inconsistent data."""


@dataclass(frozen=True, slots=True)
class Board:
    locations: dict[str, Location]
    merchants: dict[str, Merchant]
    routes: dict[str, Route]

    @classmethod
    def load(cls, path: str | Path | None = None) -> "Board":
        data_path = (
            Path(path)
            if path is not None
            else Path(__file__).parent / "data" / "board.json"
        )

        with data_path.open("r", encoding="utf-8") as file:
            raw = json.load(file)

        locations = {
            item["id"]: Location(
                id=item["id"],
                name=item["name"],
                position=Position(**item["position"]),
                spaces=tuple(
                    IndustrySpace(
                        id=space["id"],
                        allowed_industries=tuple(
                            IndustryType(value)
                            for value in space["allowed_industries"]
                        ),
                    )
                    for space in item["spaces"]
                ),
            )
            for item in raw["locations"]
        }

        merchants = {
            item["id"]: Merchant(
                id=item["id"],
                name=item["name"],
                position=Position(**item["position"]),
                link_icons=item.get("link_icons", 2),
            )
            for item in raw.get("merchants", [])
        }

        routes = {
            item["id"]: Route(
                id=item["id"],
                endpoint_a=item["endpoints"][0],
                endpoint_b=item["endpoints"][1],
                supported_eras=tuple(Era(value) for value in item["supported_eras"]),
            )
            for item in raw.get("routes", [])
        }

        board = cls(locations=locations, merchants=merchants, routes=routes)
        board.validate()
        return board

    def validate(self) -> None:
        all_endpoints = set(self.locations) | set(self.merchants)

        space_ids: list[str] = []
        for location in self.locations.values():
            if not 0 <= location.position.x <= 1 or not 0 <= location.position.y <= 1:
                raise BoardDataError(f"Invalid coordinates for {location.id}.")
            space_ids.extend(space.id for space in location.spaces)

        if len(space_ids) != len(set(space_ids)):
            raise BoardDataError("Industry-space ids must be unique.")

        for route in self.routes.values():
            if route.endpoint_a not in all_endpoints:
                raise BoardDataError(
                    f"Route {route.id} has unknown endpoint {route.endpoint_a}."
                )
            if route.endpoint_b not in all_endpoints:
                raise BoardDataError(
                    f"Route {route.id} has unknown endpoint {route.endpoint_b}."
                )
            if route.endpoint_a == route.endpoint_b:
                raise BoardDataError(f"Route {route.id} connects an endpoint to itself.")

    def get_location(self, location_id: str) -> Location:
        try:
            return self.locations[location_id]
        except KeyError as error:
            raise KeyError(f"Unknown location: {location_id}") from error

    def location_count(self) -> int:
        return len(self.locations)

    def route_count(self) -> int:
        return len(self.routes)
