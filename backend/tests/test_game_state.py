import pytest

from brass_core.board import Board
from brass_core.game_state import GameState, GameStateError
from brass_core.models import Era, IndustryType, PlayerColor


@pytest.fixture
def board() -> Board:
    return Board.load()


@pytest.fixture
def game() -> GameState:
    return GameState.new()


def test_new_game_has_four_players(game: GameState) -> None:
    assert set(game.players) == {
        PlayerColor.PURPLE,
        PlayerColor.YELLOW,
        PlayerColor.ORANGE,
        PlayerColor.WHITE,
    }
    assert game.era == Era.CANAL


def test_claim_and_clear_route(board: Board, game: GameState) -> None:
    game.claim_route(
        board=board,
        route_id="birmingham_coventry",
        owner=PlayerColor.ORANGE,
    )

    assert game.routes["birmingham_coventry"].owner == PlayerColor.ORANGE

    game.clear_route("birmingham_coventry")

    assert "birmingham_coventry" not in game.routes


def test_place_valid_industry(board: Board, game: GameState) -> None:
    placed = game.place_industry(
        board=board,
        space_id="birmingham_1",
        owner=PlayerColor.PURPLE,
        industry=IndustryType.COTTON_MILL,
        level=3,
        flipped=True,
    )

    assert placed.owner == PlayerColor.PURPLE
    assert placed.level == 3
    assert placed.flipped is True


def test_reject_invalid_industry_for_space(board: Board, game: GameState) -> None:
    with pytest.raises(GameStateError):
        game.place_industry(
            board=board,
            space_id="birmingham_2",
            owner=PlayerColor.WHITE,
            industry=IndustryType.COAL_MINE,
            level=2,
        )


def test_serialization_is_json_ready(board: Board, game: GameState) -> None:
    game.claim_route(
        board=board,
        route_id="birmingham_coventry",
        owner=PlayerColor.YELLOW,
    )

    payload = game.to_dict()

    assert payload["era"] == "canal"
    assert payload["routes"]["birmingham_coventry"]["owner"] == "yellow"
