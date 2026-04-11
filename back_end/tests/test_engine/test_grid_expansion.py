from src.models.game_state import GameState
from src.models.assets import AssetRepo
from src.engine.grid_expansion import GridExpansion
from src.models.game_settings import GameSettings
from tests.base_test import BaseTest
from tests.utils.game_state_maker import GameStateMaker


class TestGridExpansion(BaseTest):

    @staticmethod
    def _create_game_state_without_assets() -> GameState:
        settings = GameSettings(
            probability_of_new_asset=1.0
        )
        gs = GameStateMaker().make().update(settings)
        return gs

    def test_try_build_asset(self):
        gs = self._create_game_state_without_assets()
        self.assertEqual(gs.game_settings.probability_of_new_asset, 1.0)

        n_assets = len(gs.assets)
        n_new_assets = 5
        for _ in range(n_new_assets):
            gs, _ = GridExpansion.try_build_asset(gs)

        self.assertEqual(len(gs.assets), n_assets + n_new_assets)