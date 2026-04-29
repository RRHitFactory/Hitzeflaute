from typing import cast

import polars as pl

from src.engine.finance import FinanceCalculator
from src.engine.grid_expansion import GridExpansion
from src.engine.market_coupling import MarketCouplingCalculator
from src.engine.referee import Referee
from src.models.game_state import GameState, Phase
from src.models.ids import AssetId, Round, TransmissionId
from src.models.market_coupling_result import MarketCouplingResult
from src.models.message import (
    Ack,
    ActivationUpdateRequest,
    AuctionClearedMessage,
    BuyRequest,
    ClearAuction,
    ConcludePhase,
    EndTurn,
    Message,
    PlayerNotInTurn,
    PlayerToGameMessage,
    ToGameMessage,
    UpdateBatchBidsRequest,
)
from src.models.pending_state import PendingState


class Engine:
    @classmethod
    def handle_message(cls, game_state: GameState, msg: ToGameMessage) -> tuple[GameState, list[Message]]:
        """
        Messages can come from players or from the game itself
        Every time a message occurs, the engine is informed and it can then:
        -Update the game state
        -Send messages back to the players OR to itself
        :param game_state: The current state of the game
        :param msg: The triggering message
        :return: The new game state and a list of messages to be sent
        """
        reject_player_not_in_turn = cls.reject_player_message_if_not_in_turn(game_state=game_state, msg=msg)
        if reject_player_not_in_turn is not None:
            return reject_player_not_in_turn
        # Handle the message based on its type
        match msg:
            case ConcludePhase():
                return cls.handle_new_phase_message(game_state=game_state, msg=msg)
            case ClearAuction():
                return cls.handle_clear_auction_message(game_state=game_state, msg=msg)
            case UpdateBatchBidsRequest():
                return cls.handle_update_batch_bid_message(game_state=game_state, msg=msg)
            case ActivationUpdateRequest():
                return cls.handle_activation_update_message(game_state, msg)
            case BuyRequest() if isinstance(msg.purchase_id, AssetId):
                return cls.handle_buy_asset_message(game_state, msg)  # type: ignore
            case BuyRequest() if isinstance(msg.purchase_id, TransmissionId):
                return cls.handle_buy_transmission_message(game_state, msg)  # type: ignore
            case EndTurn():
                return cls.handle_end_turn_message(game_state=game_state, msg=msg)
            case _:
                raise NotImplementedError(f"message type {type(msg)} not implemented.")

    @classmethod
    def reject_player_message_if_not_in_turn(
        cls,
        game_state: GameState,
        msg: ToGameMessage,
    ) -> tuple[GameState, list[Message]] | None:
        if not isinstance(msg, PlayerToGameMessage):
            return None

        requesting_player_id = msg.player_id
        if game_state.players[requesting_player_id].is_having_turn:
            return None
        else:
            return game_state, [PlayerNotInTurn(player_id=requesting_player_id, game_id=game_state.game_id, message=f"Player {requesting_player_id} cannot play when it is not their turn.")]

    @classmethod
    def handle_clear_auction_message(
        cls,
        game_state: GameState,
        msg: ClearAuction,
    ) -> tuple[GameState, list[Message]]:
        new_game_state, msgs_load_deactivation = Referee.deactivate_loads_of_players_in_debt(gs=game_state)

        market_result = MarketCouplingCalculator.run(game_state=new_game_state)

        new_game_state, new_msgs = cls._run_post_clearing_book_keeping(game_state=new_game_state, market_result=market_result)
        conclude_phase = ConcludePhase(game_id=game_state.game_id, phase=game_state.phase)

        return new_game_state, msgs_load_deactivation + new_msgs + [conclude_phase]

    @classmethod
    def handle_new_phase_message(
        cls,
        game_state: GameState,
        msg: ConcludePhase,
    ) -> tuple[GameState, list[Message]]:
        gs = game_state
        new_phase = msg.new_phase
        round = gs.game_round
        players = gs.players

        if msg.new_phase == Phase.DA_AUCTION:
            ca_message = ClearAuction(game_state.game_id)
            gs = gs.update(msg.new_phase)
            return gs, [ca_message]

        msgs: list[Message] = []
        if new_phase == Phase.CONSTRUCTION:
            gs, building_msgs = GridExpansion.build_grid_elements_for_new_round(gs)
            round = Round(gs.game_round + 1)
            msgs += building_msgs

        if msg.new_phase.is_turn_based:
            players = players.start_first_player_turn()
        else:
            players = players.start_all_turns()

        gs = gs.update(new_phase, players, round)
        return gs, msgs

    @classmethod
    def handle_update_batch_bid_message(
        cls,
        game_state: GameState,
        msg: UpdateBatchBidsRequest,
    ) -> tuple[GameState, list[Message]]:
        pending_state = game_state.pending_state.update(PendingState(bids=msg.bids))
        new_game_state = game_state.update(pending_state)
        response = Ack(game_id=game_state.game_id, player_id=msg.player_id)
        return new_game_state, [response]

    @classmethod
    def handle_buy_asset_message(
        cls,
        game_state: GameState,
        msg: BuyRequest[AssetId],
    ) -> tuple[GameState, list[Message]]:
        if game_state.phase != Phase.CONSTRUCTION:
            response = msg.make_response(
                success=False,
                message=f"You can only buy assets during the {Phase.CONSTRUCTION.nice_name} phase",
            )
            return game_state, [response]

        list_failed_response = Referee.validate_purchase(gs=game_state, player_id=msg.player_id, purchase_id=msg.purchase_id)
        if list_failed_response:
            return game_state, cast(list[Message], list_failed_response)

        asset = game_state.assets[msg.purchase_id]

        new_players = game_state.players.subtract_money(player_id=msg.player_id, amount=asset.minimum_acquisition_price)
        new_assets = game_state.assets.change_owner(asset_id=asset.id, new_owner=msg.player_id)

        new_game_state = game_state.update(new_players, new_assets)

        message = f"Player {msg.player_id} successfully bought asset {asset.id}."
        response = msg.make_response(success=True, message=message)
        return new_game_state, [response]

    @classmethod
    def handle_buy_transmission_message(
        cls,
        game_state: GameState,
        msg: BuyRequest[TransmissionId],
    ) -> tuple[GameState, list[Message]]:
        if game_state.phase != Phase.CONSTRUCTION:
            response = msg.make_response(
                success=False,
                message=f"You can only buy transmission during the {Phase.CONSTRUCTION.nice_name} phase",
            )
            return game_state, [response]

        list_failed_response = Referee.validate_purchase(gs=game_state, player_id=msg.player_id, purchase_id=msg.purchase_id)
        if list_failed_response:
            return game_state, cast(list[Message], list_failed_response)

        transmission = game_state.transmission[msg.purchase_id]

        new_players = game_state.players.subtract_money(player_id=msg.player_id, amount=transmission.minimum_acquisition_price)
        new_transmission = game_state.transmission.change_owner(transmission_id=transmission.id, new_owner=msg.player_id)

        new_game_state = game_state.update(new_players, new_transmission)

        message = f"Player {msg.player_id} successfully bought transmission {transmission.id}."
        response = msg.make_response(success=True, message=message)

        return new_game_state, [response]

    @classmethod
    def handle_activation_update_message(
        cls,
        game_state: GameState,
        msg: ActivationUpdateRequest,
    ) -> tuple[GameState, list[Message]]:
        pending_state = game_state.pending_state.update(PendingState(line_activation=msg.line_activation, asset_activation=msg.asset_activation))
        new_game_state = game_state.update(pending_state)
        response = Ack(game_id=game_state.game_id, player_id=msg.player_id)
        return new_game_state, [response]

    @classmethod
    def handle_end_turn_message(
        cls,
        game_state: GameState,
        msg: EndTurn,
    ) -> tuple[GameState, list[Message]]:
        players = game_state.players
        if game_state.phase.is_turn_based:
            players = players.cycle_turn()
        else:
            players = players.end_turn(player_id=msg.player_id)

        game_state = game_state.update(players)
        if game_state.players.are_all_players_finished():
            game_state = game_state.commit_pending_state()
            return game_state, [ConcludePhase(game_id=game_state.game_id, phase=game_state.phase)]
        else:
            return game_state, []

    @classmethod
    def _run_post_clearing_book_keeping(cls, game_state: GameState, market_result: MarketCouplingResult) -> tuple[GameState, list[Message]]:
        game_state, msgs_auction_cashflows = cls._update_game_state_with_market_coupling_result(game_state=game_state, market_coupling_result=market_result)
        game_state, ice_cream_msgs = Referee.melt_ice_creams(game_state)
        game_state, transmission_msgs = Referee.wear_congested_transmission(game_state)
        game_state, asset_msgs = Referee.wear_non_freezer_assets(game_state)
        game_state, eliminated_player_msgs = Referee.eliminate_players(gs=game_state)
        game_state, game_over_msg = Referee.check_game_over(gs=game_state)

        msgs = msgs_auction_cashflows + ice_cream_msgs + transmission_msgs + asset_msgs + eliminated_player_msgs + game_over_msg

        return game_state, msgs  # type: ignore

    @staticmethod
    def _update_game_state_with_market_coupling_result(
        game_state: GameState,
        market_coupling_result: MarketCouplingResult,
    ) -> tuple[GameState, list[AuctionClearedMessage]]:
        player_repo = game_state.players
        cashflows = FinanceCalculator.compute_cashflows_after_power_delivery(game_state=game_state, market_coupling_result=market_coupling_result)
        for player_id in cashflows["player_id"].unique().to_list():
            player_cashflow = cashflows.filter(pl.col("player_id") == player_id)["cashflow"].sum()
            player_repo = player_repo.add_money(player_id=player_id, amount=player_cashflow)

        new_game_state = game_state.update(player_repo, market_coupling_result)

        msgs: list[AuctionClearedMessage] = []
        for player_id in new_game_state.players.player_ids:
            old_money = game_state.players[player_id].money
            new_money = new_game_state.players[player_id].money
            text = f"Day-ahead market cleared. Your balance was adjusted accordingly from ${old_money} to ${new_money}."
            msgs.append(
                AuctionClearedMessage(
                    game_id=game_state.game_id,
                    player_id=player_id,
                    message=text,
                )
            )

        return new_game_state, msgs
