from unittest import TestCase

from src.models.ids import PlayerId
from tests.utils.repo_maker import AssetRepoMaker, BusRepoMaker, PlayerRepoMaker
from tests.utils.game_state_maker import GameStateMaker, MarketResultMaker
from src.models.game_state import GameState, Phase
from src.models.market_coupling_result import MarketCouplingResult
from src.engine.referee import Referee


class TestReferee(TestCase):
    @staticmethod
    def create_game_state_and_market_coupling_result() -> tuple[GameState, MarketCouplingResult]:
        game_maker = GameStateMaker()

        player_repo = PlayerRepoMaker.make_quick(3)
        buses = BusRepoMaker.make_quick(n_npc_buses=3, players=player_repo)
        asset_maker = AssetRepoMaker(bus_repo=buses, players=player_repo)

        for _ in range(6):
            asset_maker.add_asset(cat="Generator", power_std=0, is_for_sale=True)

        assets = asset_maker.make()
        game_state = game_maker.add_bus_repo(buses).add_asset_repo(assets).make()
        market_coupling_result = MarketResultMaker.make_quick(
            player_repo=game_state.players,
            bus_repo=game_state.buses,
            asset_repo=game_state.assets,
            transmission_repo=game_state.transmission,
            n_random_congested_transmissions=2,
        )
        game_state = game_state.update(phase=Phase.DA_AUCTION, market_coupling_result=market_coupling_result)

        return game_state, market_coupling_result

    def test_melt_ice_creams(self):
        game_state, market_result = self.create_game_state_and_market_coupling_result()
        freezers = game_state.assets.only_freezers
        game_state = game_state.update(phase=Phase.DA_AUCTION)

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

    def test_wear_non_freezer_assets(self):
        game_state, market_result = self.create_game_state_and_market_coupling_result()
        wearable_assets = game_state.assets._filter({"is_freezer": False})

        new_game_state, update_msgs = Referee.wear_non_freezer_assets(game_state)
        self.assertEqual(len(update_msgs), len(wearable_assets))

        for asset in wearable_assets:
            if asset.health > 1:
                self.assertLess(new_game_state.assets[asset.id].health, asset.health)
            else:
                self.assertFalse(new_game_state.assets[asset.id].is_active)
                self.assertEqual(new_game_state.assets[asset.id].health, 0)

    def test_wear_congested_transmission(self):
        game_state, market_result = self.create_game_state_and_market_coupling_result()

        new_game_state, update_msgs = Referee.wear_congested_transmission(game_state)

        n_congested_lines = 0
        congested_transmissions = []
        for transmission in game_state.transmission:
            if market_result.transmission_flows.loc[:, transmission.id].iloc[0] >= transmission.capacity:
                n_congested_lines += 1
                congested_transmissions.append(transmission)

        self.assertGreaterEqual(len(update_msgs), n_congested_lines)

        for transmission in congested_transmissions:
            if transmission.health > 1:
                self.assertLess(new_game_state.transmission[transmission.id].health, transmission.health)
            else:
                self.assertFalse(new_game_state.transmission[transmission.id].is_active)
                self.assertEqual(new_game_state.transmission[transmission.id].health, 0)

    def test_deactivate_loads_of_players_in_debt(self):
        game_state, market_result = self.create_game_state_and_market_coupling_result()

        # make the first player go in debt
        player = game_state.players[0]
        players = game_state.players.subtract_money(player_id=player.id, amount=player.money * 2 + 100)
        game_state = game_state.update(players=players)

        new_game_state, update_msgs = Referee.deactivate_loads_of_players_in_debt(game_state)
        loads_player_in_debt = new_game_state.assets.get_all_for_player(player_id=player.id).only_loads

        self.assertEqual(len(update_msgs), 1)
        for asset in loads_player_in_debt:
            self.assertFalse(new_game_state.assets[asset.id].is_active)

    def test_validate_purchase(self):
        game_state, market_result = self.create_game_state_and_market_coupling_result()

        # make the first player go in debt
        poor_player = game_state.players[0]
        players = game_state.players.subtract_money(player_id=poor_player.id, amount=poor_player.money * 2 + 100)
        # make the second player rich
        rich_player = game_state.players[1]
        players = players.add_money(player_id=rich_player.id, amount=1e10)
        game_state = game_state.update(players=players)

        # get the first asset for sale
        asset = game_state.assets._filter({"is_for_sale": True, "owner_player": PlayerId.get_npc()}).as_objs()[0]
        # get the first transmission for sale
        transmission = game_state.transmission._filter(
            {"is_for_sale": True, "owner_player": PlayerId.get_npc()}
        ).as_objs()[0]

        self.assertTrue(len(Referee.validate_purchase(game_state, poor_player.id, asset.id)) == 1)
        self.assertTrue(len(Referee.validate_purchase(game_state, poor_player.id, transmission.id)) == 1)
        self.assertTrue(len(Referee.validate_purchase(game_state, rich_player.id, asset.id)) == 0)
        self.assertTrue(len(Referee.validate_purchase(game_state, rich_player.id, transmission.id)) == 0)
