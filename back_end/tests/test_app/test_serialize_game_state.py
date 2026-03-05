import json

from src.app.tools.reduce_message import reduce_game_state
from tests.base_test import BaseTest
from tests.utils.game_state_maker import GameStateMaker


class TestGameState(BaseTest):
    def test_reduce_game_state_and_serialize(self) -> None:
        game_state = GameStateMaker().make()

        self.assertIsNotNone(game_state.market_coupling_result)
        self.assertIsNone(game_state.market_summary)

        # We reduce the game state, getting rid of the raw market coupling result and instead making a summary
        reduced = reduce_game_state(game_state)

        self.assertIsNotNone(reduced.market_summary)
        self.assertIsNone(reduced.market_coupling_result)

        # The result should be json serializatble
        json.dumps(reduced.to_simple_dict())
