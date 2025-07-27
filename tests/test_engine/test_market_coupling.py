from unittest import TestCase
import numpy as np

from tests.utils.repo_maker import AssetRepoMaker, BusRepoMaker, PlayerRepoMaker, TransmissionRepoMaker
from tests.utils.game_state_maker import GameStateMaker
from src.engine.market_coupling import MarketCouplingCalculator
from src.models.assets import AssetType


class TestMarketCoupling(TestCase):
    @staticmethod
    def create_game_state():
        game_maker = GameStateMaker()

        player_repo = PlayerRepoMaker().make_quick(2)
        bus_repo = BusRepoMaker.make_quick(n_npc_buses=0, players=player_repo)
        asset_maker = AssetRepoMaker(players=player_repo.human_player_ids, bus_repo=bus_repo)
        transmission_repo = TransmissionRepoMaker.make_quick(1, players=player_repo.human_player_ids, buses=bus_repo)

        # add generators
        for bid_price in [10.0, 20.0, 30.0, 80.0]:
            # cheap bus
            asset_maker.add_asset(cat="Generator", power_std=0, bid_price=bid_price, bus=bus_repo[0].id, is_active=True)
            # expensive bus
            asset_maker.add_asset(
                cat="Generator", power_std=0, bid_price=bid_price * 3, bus=bus_repo[1].id, is_active=True
            )

        # add two loads for each player at the expensive bus
        for player in player_repo.human_players:
            asset_maker.add_asset(
                cat="Load", bid_price=100, power_std=0, owner=player.id, bus=bus_repo[1].id, is_active=True
            )
            asset_maker.add_asset(
                cat="Load", bid_price=100, power_std=0, owner=player.id, bus=bus_repo[1].id, is_active=True
            )

        assets = asset_maker.make()
        game_state = (
            game_maker.add_player_repo(player_repo)
            .add_bus_repo(bus_repo)
            .add_asset_repo(assets)
            .add_transmission_repo(transmission_repo)
            .make()
        )

        return game_state

    def test_run_market_coupling(self) -> None:

        game_state = self.create_game_state()
        market_result = MarketCouplingCalculator.run(game_state)

        self.assertGreaterEqual(market_result.assets_dispatch.shape[0], 1)
        self.assertGreaterEqual(market_result.bus_prices.shape[0], 1)
        self.assertGreaterEqual(market_result.transmission_flows.shape[0], 1)

    def test_no_paradoxically_accepted_assets(self) -> None:
        game_state = self.create_game_state()
        market_result = MarketCouplingCalculator.run(game_state)

        for mtu in market_result.bus_prices.index:
            for bus in game_state.buses:
                bus_price = market_result.bus_prices.loc[mtu, bus.id]
                assets_in_bus = game_state.assets.filter({"bus": bus.id})
                generators_in_the_money = assets_in_bus.filter(
                    lambda x: x["bid_price"] <= bus_price, 'and', {"asset_type": AssetType.GENERATOR}
                ).asset_ids
                loads_in_the_money = assets_in_bus.filter(
                    lambda x: x["bid_price"] >= bus_price, 'and', {"asset_type": AssetType.LOAD}
                ).asset_ids
                asset_dispatch = market_result.assets_dispatch.loc[mtu]

                small_generation = 0.1  # Define a threshold for small generation to avoid floating point issues
                dispatched_assets = set(asset_dispatch[asset_dispatch.abs() > small_generation].index) & set(
                    assets_in_bus.asset_ids
                )

                for asset_id in dispatched_assets:
                    self.assertIn(asset_id, set(generators_in_the_money) | set(loads_in_the_money))

    def test_energy_balance(self) -> None:
        game_state = self.create_game_state()
        market_result = MarketCouplingCalculator.run(game_state)

        for mtu in market_result.assets_dispatch.index:
            total_generation = market_result.assets_dispatch.loc[mtu][
                game_state.assets.filter({"asset_type": AssetType.GENERATOR}).asset_ids
            ].sum()
            total_load = market_result.assets_dispatch.loc[mtu][
                game_state.assets.filter({"asset_type": AssetType.LOAD}).asset_ids
            ].sum()

            self.assertAlmostEqual(total_generation, total_load, places=5)

    def test_congestion_rent_and_price_spread(self) -> None:
        game_state = self.create_game_state()
        market_result = MarketCouplingCalculator.run(game_state)

        for mtu in market_result.transmission_flows.index:
            for transmission in game_state.transmission:
                flow = market_result.transmission_flows.loc[mtu, transmission.id]
                if np.isclose(abs(flow), abs(transmission.capacity)):
                    self.assertGreater(
                        abs(
                            market_result.bus_prices.loc[mtu, transmission.bus1]
                            - market_result.bus_prices.loc[mtu, transmission.bus2]
                        ),
                        0,
                    )
                else:
                    self.assertAlmostEqual(
                        market_result.bus_prices.loc[mtu, transmission.bus1],
                        market_result.bus_prices.loc[mtu, transmission.bus2],
                        places=0,
                    )
