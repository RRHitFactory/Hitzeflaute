import json
from typing import Any

from src.app.prepare_gs import prepare_game_state_for_front_end
from tests.base_test import BaseTest
from tests.utils.game_state_maker import GameStateMaker


class TestPrepareGs(BaseTest):
    def test_prepare_game_state_for_front_end(self) -> None:
        game_state = GameStateMaker().make()
        self.assertIsNotNone(game_state.market_coupling_result)

        reduced: dict[str, Any] = prepare_game_state_for_front_end(game_state)

        self.assertIn("market_summary", reduced)
        self.assertIn("losing_player", reduced)
        self.assertIsNone(reduced["market_coupling_result"])

        # The result should be json serializatble
        json.dumps(reduced)
