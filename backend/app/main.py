from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from brass_core.board import Board

app = FastAPI(title="Beer Flip API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/board")
def get_board():
    board = Board.load()

    return {
        "locations": [
            {
                "id": location.id,
                "name": location.name,
                "x": location.position.x,
                "y": location.position.y,
                "spaces": len(location.spaces),
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