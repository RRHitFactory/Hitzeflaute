from unittest import TestCase

from tests.utils.repo_maker import AssetRepoMaker, BusRepoMaker
from tests.utils.game_state_maker import GameStateMaker, MarketResultMaker
from src.models.game_state import GameState
from src.models.market_coupling_result import MarketCouplingResult
from src.engine.referee import Referee


class TestReferee(TestCase):
    @staticmethod
    def create_game_state_and_market_coupling_result() -> tuple[GameState, MarketCouplingResult]:
        game_maker = GameStateMaker()

        buses = BusRepoMaker.make_quick(n_npc_buses=0)
        asset_maker = AssetRepoMaker(bus_repo=buses)

        for _ in range(6):
            asset_maker.add_asset(cat="Generator", power_std=0)
        assets = asset_maker.make()
        game_state = game_maker.add_bus_repo(buses).add_asset_repo(assets).make()
        market_coupling_result = MarketResultMaker.make_quick(
            player_repo=game_state.players,
            bus_repo=game_state.buses,
            asset_repo=game_state.assets,
            transmission_repo=game_state.transmission,
        )

        return game_state, market_coupling_result

    def test_melt_ice_creams(self):
        game_state, market_result = self.create_game_state_and_market_coupling_result()
        freezers = game_state.assets.filter({"is_freezer": True})

        unpowered_freezer_ids = []
        for freezer in freezers:
            if market_result.assets_dispatch.loc[:, freezer.id].iloc[0] < freezer.power_expected:
                unpowered_freezer_ids.append(freezer.id)

        new_game_state, update_msgs = Referee.melt_ice_creams(game_state)
        self.assertEqual(len(update_msgs), len(unpowered_freezer_ids))

        for freezer_id in unpowered_freezer_ids:
            if game_state.assets[freezer_id].health > 1:
                self.assertLess(new_game_state.assets[freezer_id].health, game_state.assets[freezer_id].health)
            else:
                self.assertFalse(new_game_state.assets[freezer_id].is_active)
                self.assertEqual(new_game_state.assets[freezer_id].health, 0)