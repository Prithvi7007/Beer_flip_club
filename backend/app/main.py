from __future__ import annotations

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from brass_core.board import Board
from brass_core.game_state import GameState, GameStateError
from brass_core.models import Era, IndustryType, PlayerColor

app = FastAPI(title="Beer Flip API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

board = Board.load()
game = GameState.new()


class EraRequest(BaseModel):
    era: Era


class RouteClaimRequest(BaseModel):
    owner: PlayerColor
    era: Era | None = None


class IndustryPlacementRequest(BaseModel):
    owner: PlayerColor
    industry: IndustryType
    level: int = Field(ge=1, le=8)
    flipped: bool = False


class FlipIndustryRequest(BaseModel):
    flipped: bool


def serialize_board() -> dict:
    return {
        "locations": [
            {
                "id": location.id,
                "name": location.name,
                "x": location.position.x,
                "y": location.position.y,
                "spaces": [
                    {
                        "id": space.id,
                        "allowed_industries": [
                            industry.value for industry in space.allowed_industries
                        ],
                    }
                    for space in location.spaces
                ],
            }
            for location in board.locations.values()
        ],
        "merchants": [
            {
                "id": merchant.id,
                "name": merchant.name,
                "x": merchant.position.x,
                "y": merchant.position.y,
                "link_icons": merchant.link_icons,
            }
            for merchant in board.merchants.values()
        ],
        "routes": [
            {
                "id": route.id,
                "endpoint_a": route.endpoint_a,
                "endpoint_b": route.endpoint_b,
                "supported_eras": [era.value for era in route.supported_eras],
            }
            for route in board.routes.values()
        ],
    }


@app.get("/api/board")
def get_board() -> dict:
    return serialize_board()


@app.get("/api/game")
def get_game() -> dict:
    return game.to_dict()


@app.post("/api/game/new")
def new_game() -> dict:
    global game
    game = GameState.new()
    return game.to_dict()


@app.put("/api/game/era")
def update_era(request: EraRequest) -> dict:
    game.set_era(request.era)
    return game.to_dict()


@app.put("/api/game/routes/{route_id}")
def claim_route(route_id: str, request: RouteClaimRequest) -> dict:
    try:
        game.claim_route(
            board=board,
            route_id=route_id,
            owner=request.owner,
            era=request.era,
        )
    except GameStateError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return game.to_dict()


@app.delete("/api/game/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
def clear_route(route_id: str) -> Response:
    game.clear_route(route_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.put("/api/game/industries/{space_id}")
def place_industry(space_id: str, request: IndustryPlacementRequest) -> dict:
    try:
        game.place_industry(
            board=board,
            space_id=space_id,
            owner=request.owner,
            industry=request.industry,
            level=request.level,
            flipped=request.flipped,
        )
    except GameStateError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return game.to_dict()


@app.patch("/api/game/industries/{space_id}/flipped")
def update_industry_flipped(space_id: str, request: FlipIndustryRequest) -> dict:
    try:
        game.set_industry_flipped(space_id, request.flipped)
    except GameStateError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return game.to_dict()


@app.delete(
    "/api/game/industries/{space_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def clear_industry(space_id: str) -> Response:
    game.clear_industry(space_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
