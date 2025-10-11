from unittest import TestCase

from src.engine.engine import Engine
from src.models.colors import Color
from src.models.game_state import GameState, Phase
from src.models.ids import AssetId, PlayerId, TransmissionId
from src.models.message import (
    AssetWornMessage,
    BuyRequest,
    BuyResponse,
    IceCreamMeltedMessage,
    OperateLineRequest,
    OperateLineResponse,
    PlayerToGameMessage,
    TransmissionWornMessage,
)
from src.models.player import Player
from src.models.transmission import TransmissionInfo
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


class DummyMessage(PlayerToGameMessage):
    pass


class TestAssets(TestCase):
    def test_bad_message(self) -> None:
        game_state = GameStateMaker().make()
        dumb_message = DummyMessage(player_id=PlayerId(5))
        with self.assertRaises(NotImplementedError):
            Engine.handle_message(game_state=game_state, msg=dumb_message)  # noqa

    def test_buy_asset_message(self) -> None:
        player_repo = PlayerRepoMaker.make_quick()
        rich_player = Player(
            id=PlayerId(100),
            name="Rich player",
            color=Color("black"),
            money=1000000,
            is_having_turn=True,
        )
        player_repo += rich_player
        game_state = GameStateMaker().add_player_repo(player_repo).add_phase(Phase.CONSTRUCTION).make()

        is_for_sale_ids = game_state.assets._filter(condition={"is_for_sale": True}).asset_ids
        not_for_sale_ids = game_state.assets._filter(condition={"is_for_sale": False}).asset_ids

        msg = BuyRequest(player_id=rich_player.id, purchase_id=AssetId(-5))
        self.assert_fails_with(game_state=game_state, request=msg, x="asset")

        msg = BuyRequest(player_id=rich_player.id, purchase_id=not_for_sale_ids[0])
        self.assert_fails_with(game_state=game_state, request=msg, x="for sale")

        msg = BuyRequest(player_id=rich_player.id, purchase_id=is_for_sale_ids[0])
        result_game_state, messages = Engine.handle_message(game_state=game_state, msg=msg)
        self.assertEqual(len(messages), 1)
        success_msg = messages[0]
        self.assertIsInstance(success_msg, BuyResponse)
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
            color=Color("black"),
            money=1000000,
            is_having_turn=True,
        )
        player_repo += rich_player
        game_state = GameStateMaker().add_player_repo(player_repo).add_phase(Phase.CONSTRUCTION).make()

        is_for_sale_ids = game_state.transmission._filter(condition={"is_for_sale": True}).transmission_ids
        not_for_sale_ids = game_state.transmission._filter(condition={"is_for_sale": False}).transmission_ids

        msg = BuyRequest(player_id=rich_player.id, purchase_id=TransmissionId(-5))
        self.assert_fails_with(game_state=game_state, request=msg, x="transmission")

        msg = BuyRequest(player_id=rich_player.id, purchase_id=not_for_sale_ids[0])
        self.assert_fails_with(game_state=game_state, request=msg, x="for sale")

        msg = BuyRequest(player_id=rich_player.id, purchase_id=is_for_sale_ids[0])
        result_game_state, messages = Engine.handle_message(game_state=game_state, msg=msg)
        self.assertEqual(len(messages), 1)
        success_msg = messages[0]
        self.assertIsInstance(success_msg, BuyResponse)
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
        not_my_line = TransmissionInfo(
            id=TransmissionId(101),
            owner_player=PlayerId.get_npc(),
            bus1=bus_repo.bus_ids[2],
            bus2=bus_repo.bus_ids[3],
            reactance=10.0,
        )
        transmission_repo += my_line
        transmission_repo += not_my_line

        game_state = GameStateMaker().add_player_repo(player_repo).add_bus_repo(bus_repo).add_transmission_repo(transmission_repo).add_phase(Phase.SNEAKY_TRICKS).make()

        # Test operating a line that I own
        open_request = OperateLineRequest(player_id=player.id, transmission_id=my_line.id, action="open")
        game_state, responses = Engine.handle_message(game_state=game_state, msg=open_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, OperateLineResponse)
        print(response)
        self.assertEqual(response.result, "success")
        self.assertEqual(game_state.transmission[my_line.id].is_open, True)

        # Try to open it again
        game_state, responses = Engine.handle_message(game_state=game_state, msg=open_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, OperateLineResponse)
        self.assertEqual(response.result, "no_change")
        self.assertEqual(game_state.transmission[my_line.id].is_open, True)

        # Try closing a line that I own
        close_request = OperateLineRequest(player_id=player.id, transmission_id=my_line.id, action="close")
        game_state, responses = Engine.handle_message(game_state=game_state, msg=close_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, OperateLineResponse)
        self.assertEqual(response.result, "success")
        self.assertEqual(game_state.transmission[my_line.id].is_open, False)

        # Try to close it again
        game_state, responses = Engine.handle_message(game_state=game_state, msg=close_request)

        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, OperateLineResponse)
        self.assertEqual(response.result, "no_change")
        self.assertEqual(game_state.transmission[my_line.id].is_open, False)

        # Try to operate a line that I do not own
        not_my_open_request = OperateLineRequest(player_id=player.id, transmission_id=not_my_line.id, action="open")
        game_state, responses = Engine.handle_message(game_state=game_state, msg=not_my_open_request)
        self.assertEqual(len(responses), 1)
        response = responses[0]
        self.assertIsInstance(response, OperateLineResponse)
        self.assertEqual(response.result, "failure")
        self.assertEqual(game_state.transmission[not_my_line.id].is_open, False)

    def test_post_clearing_book_keeping(self):
        game_maker = GameStateMaker()

        player_repo = PlayerRepoMaker.make_quick(3)
        buses = BusRepoMaker.make_quick(n_npc_buses=3, players=player_repo)
        assets = AssetRepoMaker.make_quick(bus_repo=buses, players=player_repo, n_normal_assets=5)
        transmission = TransmissionRepoMaker.make_quick(buses=buses, players=player_repo, n=5)

        player_a = player_repo.human_players[0]

        game_state = game_maker.add_bus_repo(buses).add_asset_repo(assets).add_transmission_repo(transmission).make()
        market_coupling_result = MarketResultMaker.make_quick(
            player_repo=player_repo,
            bus_repo=buses,
            asset_repo=assets,
            transmission_repo=transmission,
            n_random_congested_transmissions=2,
            players_with_no_power_for_ice_cream=[player_a.id],
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
        self.assertIsInstance(message, BuyResponse)
        self.assertFalse(message.success)
        self.assertTrue(x in message.message.lower())
        assert_game_states_are_equal(game_state1=game_state, game_state2=new_game_state)
