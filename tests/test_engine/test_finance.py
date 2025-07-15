from unittest import TestCase

from tests.utils.repo_maker import AssetRepoMaker, BusRepoMaker
from tests.utils.game_state_maker import GameStateMaker, MarketResultMaker
from src.engine.finance import FinanceCalculator
from src.models.game_state import GameState
from src.models.market_coupling_result import MarketCouplingResult


class TestFinanceCalculator(TestCase):
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

    def test_compute_assets_cashflow(self):
        game_state, market_coupling_result = self.create_game_state_and_market_coupling_result()
        assets_dispatch = market_coupling_result.assets_dispatch.loc[0].to_dict()
        bus_prices = market_coupling_result.bus_prices.loc[0].to_dict()

        asset_repo = game_state.assets
        for asset in asset_repo:
            single_asset_repo = asset_repo.filter({"id": asset.id})
            asset_cashflow = FinanceCalculator.compute_assets_cashflow(single_asset_repo, assets_dispatch, bus_prices)
            sign = asset.cashflow_sign
            self.assertAlmostEqual(
                asset_cashflow,
                sign * (bus_prices[asset.bus] - asset.marginal_cost) * assets_dispatch[asset.id]
                - asset.fixed_operating_cost,
            )

    def test_compute_transmission_cashflow(self):
        game_state, market_coupling_result = self.create_game_state_and_market_coupling_result()
        transmission_flows = market_coupling_result.transmission_flows.loc[0].to_dict()
        bus_prices = market_coupling_result.bus_prices.loc[0].to_dict()

        transmission_repo = game_state.transmission
        for transmission in transmission_repo:
            single_transmission_repo = transmission_repo.filter({"id": transmission.id})
            transmission_cashflow = FinanceCalculator.compute_transmission_cashflow(
                single_transmission_repo, transmission_flows, bus_prices
            )
            price_spread = bus_prices[transmission.bus1] - bus_prices[transmission.bus2]
            self.assertAlmostEqual(transmission_cashflow, transmission_flows[transmission.id] * price_spread)

    def test_validate_bid_based_on_expected_loads_cost(self):
        game_state, _ = self.create_game_state_and_market_coupling_result()
        asset_repo = game_state.assets

        ice_cream_loads = asset_repo.filter({"is_freezer": True})
        load_to_validate = ice_cream_loads.asset_ids[0]

        cash = sum([load.bid_price * load.power_expected for load in ice_cream_loads])

        asset_obj = ice_cream_loads[load_to_validate]
        bid_min_limit = asset_obj.bid_price
        low_bid = bid_min_limit - 100
        high_bid = bid_min_limit + 100

        self.assertTrue(
            FinanceCalculator.validate_bid_for_asset(
                player_assets=ice_cream_loads,
                asset_id_to_validate=load_to_validate,
                bid_to_validate=low_bid,
                player_money=cash,
            )
        )
        self.assertFalse(
            FinanceCalculator.validate_bid_for_asset(
                player_assets=ice_cream_loads,
                asset_id_to_validate=load_to_validate,
                bid_to_validate=high_bid,
                player_money=cash,
            )
        )
