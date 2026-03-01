import json

from src.app.tools.reduce_message import reduce_game_state
from tests.base_test import BaseTest
from tests.utils.game_state_maker import GameStateMaker


class TestGameState(BaseTest):
    def test_reduce_game_state(self) -> None:
        game_state = GameStateMaker().make()
        self.assertIsNone(game_state.market_summary)
        reduced = reduce_game_state(game_state)
        self.assertIsNotNone(reduced.market_summary)
        json.dumps(reduced.to_simple_dict())
