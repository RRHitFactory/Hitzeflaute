import numpy as np
from back_end.tests.base_test import BaseTest

from src.engine.market_coupling import MarketCouplingCalculator
from src.models.assets import AssetType
from tests.utils.game_state_maker import GameStateMaker
from tests.utils.infeasibility_catcher import infeasibility_catcher
from tests.utils.repo_maker import (
    AssetRepoMaker,
    BusRepoMaker,
    PlayerRepoMaker,
    TransmissionRepoMaker,
)


class TestMarketCoupling(BaseTest):
    @staticmethod
    def create_game_state():
        game_maker = GameStateMaker()

        player_repo = PlayerRepoMaker().make_quick(2)
        bus_repo = BusRepoMaker.make_quick(n_npc_buses=0, players=player_repo)
        asset_maker = AssetRepoMaker(players=player_repo.human_player_ids, bus_repo=bus_repo)

        transmission_maker = TransmissionRepoMaker(players=player_repo.human_player_ids, buses=bus_repo)
        transmission_maker.add_transmission(is_active=False)
        transmission_maker.add_n_random(1)

        # add generators
        for bid_price in [10.0, 20.0, 30.0, 80.0]:
            # cheap bus
            asset_maker.add_asset(
                cat="Generator",
                power_std=0,
                bid_price=bid_price,
                bus=bus_repo[0].id,
                is_active=True,
            )
            # expensive bus
            asset_maker.add_asset(
                cat="Generator",
                power_std=0,
                bid_price=bid_price * 3,
                bus=bus_repo[1].id,
                is_active=True,
            )
            # inactive generator
            asset_maker.add_asset(
                cat="Generator",
                power_std=0,
                bid_price=bid_price * 3,
                bus=bus_repo[1].id,
                is_active=False,
            )

        # add two loads for each player at the expensive bus
        for player in player_repo.human_players:
            asset_maker.add_asset(
                cat="Load",
                bid_price=100,
                power_std=0,
                owner=player.id,
                bus=bus_repo[1].id,
                is_active=True,
            )
            asset_maker.add_asset(
                cat="Load",
                bid_price=100,
                power_std=0,
                owner=player.id,
                bus=bus_repo[1].id,
                is_active=True,
            )

        assets = asset_maker.make()
        transmission = transmission_maker.make()
        game_state = game_maker.add_player_repo(player_repo).add_bus_repo(bus_repo).add_asset_repo(assets).add_transmission_repo(transmission).make()

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
                assets_in_bus = game_state.assets._filter({"bus": bus.id})
                generators_in_or_at_the_money = assets_in_bus._filter(
                    lambda x: x["bid_price"] <= bus_price,
                    "and",
                    {"asset_type": AssetType.GENERATOR},
                ).asset_ids
                loads_in_or_at_the_money = assets_in_bus._filter(
                    lambda x: x["bid_price"] >= bus_price,
                    "and",
                    {"asset_type": AssetType.LOAD},
                ).asset_ids
                asset_dispatch = market_result.assets_dispatch.loc[mtu]

                small_generation = 0.5  # Define a threshold for small generation to avoid floating point issues
                dispatched_assets = set(asset_dispatch[asset_dispatch.abs() > small_generation].index) & set(assets_in_bus.asset_ids)
                assets_in_or_at_the_money = set(generators_in_or_at_the_money) | set(loads_in_or_at_the_money)

                self.assertTrue(
                    dispatched_assets.issubset(assets_in_or_at_the_money),
                    f"Some dispatched assets ({dispatched_assets}) are not in/at the money ({assets_in_or_at_the_money})",
                )

    def test_energy_balance(self) -> None:
        game_state = self.create_game_state()
        market_result = MarketCouplingCalculator.run(game_state)

        for mtu in market_result.assets_dispatch.index:
            total_generation = market_result.assets_dispatch.loc[mtu][game_state.assets._filter({"asset_type": AssetType.GENERATOR}).asset_ids].sum()
            total_load = market_result.assets_dispatch.loc[mtu][game_state.assets._filter({"asset_type": AssetType.LOAD}).asset_ids].sum()

            self.assertAlmostEqual(total_generation, total_load, places=5)

    def test_congestion_rent_and_price_spread(self) -> None:
        game_state = self.create_game_state()

        with infeasibility_catcher():
            market_result = MarketCouplingCalculator.run(game_state)

        for mtu in market_result.transmission_flows.index:
            for transmission in game_state.transmission:
                flow = market_result.transmission_flows.loc[mtu, transmission.id]
                if not transmission.is_active:
                    continue
                elif np.isclose(abs(flow), abs(transmission.capacity)):
                    self.assertGreater(
                        abs(market_result.bus_prices.loc[mtu, transmission.bus1] - market_result.bus_prices.loc[mtu, transmission.bus2]),
                        0,
                    )
                else:
                    self.assertAlmostEqual(
                        market_result.bus_prices.loc[mtu, transmission.bus1],
                        market_result.bus_prices.loc[mtu, transmission.bus2],
                        places=0,
                    )

    def test_all_assets_and_transmission_appear_in_results(self) -> None:
        game_state = self.create_game_state()
        market_result = MarketCouplingCalculator.run(game_state)

        all_assets = game_state.assets.asset_ids
        dispatched_assets = market_result.assets_dispatch.columns.tolist()
        self.assertSetEqual(
            set(all_assets),
            set(dispatched_assets),
            "Not all assets appear in the market results.",
        )

        all_transmissions = game_state.transmission.transmission_ids
        transmission_flows = market_result.transmission_flows.columns.tolist()
        self.assertSetEqual(
            set(all_transmissions),
            set(transmission_flows),
            "Not all transmission lines appear in the market results.",
        )
