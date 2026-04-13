from types import MappingProxyType

from src.engine.engine import Engine
from src.models.assets import AssetInfo, AssetType
from src.models.colors import Color
from src.models.game_state import GameState, Phase
from src.models.ids import AssetId, GameId, PlayerId, TransmissionId
from src.models.message import Ack, ActivationUpdateRequest, AssetWornMessage, BuyRequest, BuyResponse, IceCreamMeltedMessage, PlayerNotInTurn, PlayerToGameMessage, TransmissionWornMessage
from src.models.player import Player
from src.models.transmission import TransmissionInfo
from tests.base_test import BaseTest
from tests.utils.comparisons import (
    assert_game_states_are_equal,
    assert_game_states_are_not_equal,
)
from tests.utils.game_state_maker import (
    AssetRepoMaker,
    GameStateMaker,
    MarketResultMaker,
)
from tests.utils.repo_maker import BusRepoMaker, PlayerRepoMaker, TransmissionRepoMaker


def give_turn_to_player(gs: GameState, player_id: PlayerId) -> GameState:
    return gs.update(gs.players.start_turn(player_id))


class DummyMessage(PlayerToGameMessage):
    pass


class TestEngine(BaseTest):
    def test_bad_message(self) -> None:
        player_id = PlayerId(0)
        game_state = give_turn_to_player(GameStateMaker().make(), player_id)
        dumb_message = DummyMessage(game_id=GameId(1), player_id=player_id)
        with self.assertRaises(NotImplementedError):
            Engine.handle_message(game_state=game_state, msg=dumb_message)  # noqa

    def test_player_not_in_turn(self) -> None:
        game_state = GameStateMaker().make()
        player_not_in_turn = game_state.players.player_ids[0]

        new_player_repo = game_state.players.end_turn(player_not_in_turn).add_money(player_not_in_turn, 1e6)
        construction_phase = Phase(0)
        game_state = game_state.update(new_player_repo, construction_phase)

        player_msg = BuyRequest(game_state.game_id, player_not_in_turn, game_state.assets.asset_ids[-1])
        result_game_state, failed_message = Engine.handle_message(
            game_state=game_state, msg=player_msg
        )
        self.assertIsInstance(failed_message[0], PlayerNotInTurn)

    def test_buy_asset_message(self) -> None:
        player_repo = PlayerRepoMaker.make_quick()
        rich_player = Player(
            id=PlayerId(100),
            name="Rich player",
            trigram="RPL",
            color=Color("black"),
            money=1000000,
            is_having_turn=True,
        )
        player_repo += rich_player
        game_state = GameStateMaker().add_player_repo(player_repo).add_phase(Phase.CONSTRUCTION).make()

        is_for_sale_ids = game_state.assets._filter(condition={"is_for_sale": True}).asset_ids
        not_for_sale_ids = game_state.assets._filter(condition={"is_for_sale": False}).asset_ids

        msg = BuyRequest(game_id=game_state.game_id, player_id=rich_player.id, purchase_id=AssetId(-5))
        self.assert_fails_with(game_state=game_state, request=msg, x="asset")

        msg = BuyRequest(game_id=game_state.game_id, player_id=rich_player.id, purchase_id=not_for_sale_ids[0])
        self.assert_fails_with(game_state=game_state, request=msg, x="for sale")

        msg = BuyRequest(game_id=game_state.game_id, player_id=rich_player.id, purchase_id=is_for_sale_ids[0])
        result_game_state, messages = Engine.handle_message(game_state=game_state, msg=msg)
        self.assertEqual(len(messages), 1)
        success_msg = messages[0]
        success_msg = self.assertIsInstance(success_msg, BuyResponse)
        self.assertTrue(success_msg.success)
        assert_game_states_are_not_equal(game_state1=game_state, game_state2=result_game_state)

        sold_asset = result_game_state.assets[is_for_sale_ids[0]]
        self.assertEqual(sold_asset.owner_player, rich_player.id)
        self.assertFalse(sold_asset.is_for_sale)

    def test_buy_transmission_message(self) -> None:
        player_repo = PlayerRepoMaker.make_quick()
        rich_player = Player(
            id=PlayerId(100),
            name="Rich player",
            trigram="RPL",
            color=Color("black"),
            money=1000000,
            is_having_turn=True,
        )
        player_repo += rich_player
        game_state = GameStateMaker().add_player_repo(player_repo).add_phase(Phase.CONSTRUCTION).make()

        is_for_sale_ids = game_state.transmission._filter(condition={"is_for_sale": True}).transmission_ids
        not_for_sale_ids = game_state.transmission._filter(condition={"is_for_sale": False}).transmission_ids

        msg = BuyRequest(game_id=game_state.game_id, player_id=rich_player.id, purchase_id=TransmissionId(-5))
        self.assert_fails_with(game_state=game_state, request=msg, x="transmission")

        msg = BuyRequest(game_id=game_state.game_id, player_id=rich_player.id, purchase_id=not_for_sale_ids[0])
        self.assert_fails_with(game_state=game_state, request=msg, x="for sale")

        msg = BuyRequest(game_id=game_state.game_id, player_id=rich_player.id, purchase_id=is_for_sale_ids[0])
        result_game_state, messages = Engine.handle_message(game_state=game_state, msg=msg)
        self.assertEqual(len(messages), 1)
        success_msg = messages[0]
        success_msg = self.assertIsInstance(success_msg, BuyResponse)
        self.assertTrue(success_msg.success)
        assert_game_states_are_not_equal(game_state1=game_state, game_state2=result_game_state)

        sold_transmission = result_game_state.transmission[is_for_sale_ids[0]]
        self.assertEqual(sold_transmission.owner_player, rich_player.id)
        self.assertFalse(sold_transmission.is_for_sale)

    def test_operate_line_messages(self) -> None:
        player_repo = PlayerRepoMaker.make_quick()
        bus_repo = BusRepoMaker.make_quick(n_npc_buses=5)
        transmission_repo = TransmissionRepoMaker().make_quick(n=3, players=player_repo, buses=bus_repo)

        player = player_repo.human_players[0]
        my_line = TransmissionInfo(
            id=TransmissionId(100),
            owner_player=player.id,
            bus1=bus_repo.bus_ids[0],
            bus2=bus_repo.bus_ids[1],
            reactance=10.0,
        )
        transmission_repo += my_line

        game_state = GameStateMaker().add_player_repo(player_repo).add_bus_repo(bus_repo).add_transmission_repo(transmission_repo).add_phase(Phase.SNEAKY_TRICKS).make()
        game_state = give_turn_to_player(game_state, player.id)


        deactivate_request = ActivationUpdateRequest(
            game_id=game_state.game_id,
            player_id=player.id,
            line_activation=MappingProxyType({my_line.id: False}),
            asset_activation=MappingProxyType({})
        )
        activate_request = ActivationUpdateRequest(
            game_id=game_state.game_id,
            player_id=player.id,
            line_activation=MappingProxyType({my_line.id: True}),
            asset_activation=MappingProxyType({})
        )
        game_state, responses = Engine.handle_message(game_state=game_state, msg=deactivate_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, Ack)
        self.assertEqual(game_state.transmission[my_line.id].is_active, True)
        game_state = game_state.commit_pending_state()
        self.assertEqual(game_state.transmission[my_line.id].is_active, False)

        game_state, responses = Engine.handle_message(game_state=game_state, msg=deactivate_request)
        game_state, responses = Engine.handle_message(game_state=game_state, msg=activate_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, Ack)
        self.assertEqual(game_state.transmission[my_line.id].is_active, False)
        game_state = game_state.commit_pending_state()
        self.assertEqual(game_state.transmission[my_line.id].is_active, True)


    def test_operate_asset_messages(self) -> None:
        player_repo = PlayerRepoMaker.make_quick()
        bus_repo = BusRepoMaker.make_quick(n_npc_buses=5, players=player_repo)
        asset_repo = AssetRepoMaker.make_quick(players=player_repo, bus_repo=bus_repo)

        player = player_repo.human_players[0]
        my_generator = AssetInfo(id=AssetId(100), owner_player=player.id, asset_type=AssetType.GENERATOR, bus=bus_repo.bus_ids[0], power_expected=10, power_std=0.0, health=5, is_active=True)
        asset_repo = asset_repo.add(my_generator)

        game_state = GameStateMaker().add_player_repo(player_repo).add_bus_repo(bus_repo).add_asset_repo(asset_repo).add_phase(Phase.SNEAKY_TRICKS).make()
        game_state = game_state.start_all_turns()

        deactivate_request = ActivationUpdateRequest(
            game_id=GameId(0),
            player_id=player.id,
            line_activation=MappingProxyType({}),
            asset_activation=MappingProxyType({my_generator.id: False})
        )
        activate_request = ActivationUpdateRequest(
            game_id=GameId(0),
            player_id=player.id,
            line_activation=MappingProxyType({}),
            asset_activation=MappingProxyType({my_generator.id: True})
        )
        game_state, responses = Engine.handle_message(game_state=game_state, msg=deactivate_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, Ack)
        self.assertEqual(game_state.assets[my_generator.id].is_active, True)
        game_state = game_state.commit_pending_state()
        self.assertEqual(game_state.assets[my_generator.id].is_active, False)

        game_state, responses = Engine.handle_message(game_state=game_state, msg=deactivate_request)
        game_state, responses = Engine.handle_message(game_state=game_state, msg=activate_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, Ack)
        self.assertEqual(game_state.assets[my_generator.id].is_active, False)
        game_state = game_state.commit_pending_state()
        self.assertEqual(game_state.assets[my_generator.id].is_active, True)



    def test_post_clearing_book_keeping(self):
        game_maker = GameStateMaker()

        player_repo = PlayerRepoMaker.make_quick(3)
        buses = BusRepoMaker.make_quick(n_npc_buses=3, players=player_repo)
        assets = AssetRepoMaker.make_quick(bus_repo=buses, players=player_repo, n_normal_assets=5)
        transmission = TransmissionRepoMaker.make_quick(buses=buses, players=player_repo, n=5)

        game_state = game_maker.add_bus_repo(buses).add_asset_repo(assets).add_transmission_repo(transmission).make()
        market_coupling_result = MarketResultMaker.make_quick(
            player_repo=player_repo,
            bus_repo=buses,
            asset_repo=assets,
            transmission_repo=transmission,
            n_random_congested_transmissions=2,
            n_players_with_no_power_for_ice_cream=1,
        )
        new_game_state, update_msgs = Engine._run_post_clearing_book_keeping(game_state=game_state, market_result=market_coupling_result)
        melt_ice_cream_msgs = [msg for msg in update_msgs if isinstance(msg, IceCreamMeltedMessage)]
        wear_transmission_msgs = [msg for msg in update_msgs if isinstance(msg, TransmissionWornMessage)]
        wear_asset_msgs = [msg for msg in update_msgs if isinstance(msg, AssetWornMessage)]

        self.assertIsInstance(new_game_state, GameState)
        self.assertEqual(len(melt_ice_cream_msgs), 1)
        self.assertEqual(len(wear_transmission_msgs), 2)
        self.assertGreater(len(wear_asset_msgs), 0)

    def assert_fails_with(self, game_state: GameState, request: BuyRequest, x: str) -> None:
        new_game_state, msgs = Engine.handle_message(game_state=game_state, msg=request)
        self.assertEqual(len(msgs), 1)
        message = msgs[0]
        message = self.assertIsInstance(message, BuyResponse)
        self.assertFalse(message.success)
        self.assertTrue(x in message.message.lower())
        assert_game_states_are_equal(game_state1=game_state, game_state2=new_game_state)
