import json

from src.app.prepare_gs import prepare_game_state_for_front_end
from tests.base_test import BaseTest
from tests.utils.game_state_maker import GameStateMaker


class TestPrepareGs(BaseTest):
    def test_reduce_game_state_and_serialize(self) -> None:
        game_state = GameStateMaker().make()

        self.assertIsNotNone(game_state.market_coupling_result)
        self.assertIsNone(game_state.market_summary)

        # We prepare the game state message for the front end, getting rid of the raw market coupling result and instead making a summary
        reduced = prepare_game_state_for_front_end(game_state)

        self.assertIn("market_summary", reduced)
        self.assertIn("losing_player", reduced)
        self.assertIsNone(reduced["market_coupling_result"])

        # The result should be json serializatble
        json.dumps(reduced)
