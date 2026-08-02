from brass_core.board import Board
from brass_core.models import IndustryType


def test_board_loads_complete_initial_map() -> None:
    board = Board.load()

    assert board.location_count() == 20
    assert board.route_count() == 39
    assert len(board.merchants) == 5


def test_birmingham_is_typed_and_has_four_spaces() -> None:
    board = Board.load()
    birmingham = board.get_location("birmingham")

    assert birmingham.name == "Birmingham"
    assert len(birmingham.spaces) == 4
    assert IndustryType.MANUFACTURER in birmingham.spaces[0].allowed_industries


def test_all_route_endpoints_are_valid() -> None:
    board = Board.load()
    board.validate()
