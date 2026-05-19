from collections.abc import Sequence

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
    AssetBuiltMessage,
    AuctionClearedMessage,
    BuyRequest,
    BuyResponse,
    ClearAuction,
    ConcludePhase,
    EndTurn,
    FreezerMigrationRequest,
    FreezerMigrationResponse,
    IceCreamMeltedMessage,
    Message,
    PlayerNotInTurn,
    PlayerToGameMessage,
    ToGameMessage,
    TransmissionBuiltMessage,
    UpdateBatchBidsRequest,
)
from src.models.pending_state import PendingState


class Engine:
    @classmethod
    def handle_message(cls, game_state: GameState, msg: ToGameMessage) -> tuple[GameState, Sequence[Message]]:
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
                return cls.handle_activation_update_message(game_state=game_state, msg=msg)
            case BuyRequest() if isinstance(msg.purchase_id, AssetId):
                return cls.handle_buy_asset_message(game_state=game_state, msg=msg)
            case BuyRequest() if isinstance(msg.purchase_id, TransmissionId):
                return cls.handle_buy_transmission_message(game_state=game_state, msg=msg)
            case FreezerMigrationRequest():
                return cls.handle_freezer_migration_message(game_state=game_state, msg=msg)
            case EndTurn():
                return cls.handle_end_turn_message(game_state=game_state, msg=msg)
            case _:
                raise NotImplementedError(f"message type {type(msg)} not implemented.")

    @classmethod
    def reject_player_message_if_not_in_turn(
        cls,
        game_state: GameState,
        msg: ToGameMessage,
    ) -> tuple[GameState, list[PlayerNotInTurn]] | None:
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
    ) -> tuple[GameState, Sequence[Message]]:
        gs, msgs_load_deactivation = Referee.deactivate_loads_of_players_in_debt(gs=game_state)

        market_result = MarketCouplingCalculator.run(game_state=gs)

        gs, new_msgs = cls._run_post_clearing_book_keeping(game_state=gs, market_result=market_result)
        melted_ice_cream_players = [m.player_id for m in new_msgs if isinstance(m, IceCreamMeltedMessage)]
        loser = Referee.get_losing_player(gs=gs)
        if loser in melted_ice_cream_players:
            # Someone is having a really bad day. Let's help them out.
            next_phase = Phase.MIGRATION
        else:
            next_phase = Phase(0)

        conclude_phase = ConcludePhase(game_id=gs.game_id, phase=gs.phase, force_new_phase=next_phase)
        return gs, [*msgs_load_deactivation, *new_msgs, conclude_phase]

    @classmethod
    def handle_new_phase_message(
        cls,
        game_state: GameState,
        msg: ConcludePhase,
    ) -> tuple[GameState, Sequence[AssetBuiltMessage | TransmissionBuiltMessage | ClearAuction]]:
        gs = game_state
        new_phase = msg.new_phase
        round = gs.game_round

        msgs: Sequence[AssetBuiltMessage | TransmissionBuiltMessage | ClearAuction] = []
        if new_phase == Phase.CONSTRUCTION:
            gs, building_msgs = GridExpansion.build_grid_elements_for_new_round(gs)
            round = Round(gs.game_round + 1)
            msgs += building_msgs  # type: ignore

        if new_phase == Phase.DA_AUCTION:
            ca_message = ClearAuction(game_state.game_id)
            gs = gs.update(new_phase)
            return gs, [ca_message]

        if new_phase == Phase.MIGRATION:
            loser = Referee.get_losing_player(gs=game_state)
            players = gs.players.end_all_turns().start_turn(loser)
        else:
            players = gs.get_players_with_updated_turns_for_new_phase(new_phase=new_phase)

        gs = gs.update(new_phase, players, round)
        return gs, msgs

    @classmethod
    def handle_update_batch_bid_message(
        cls,
        game_state: GameState,
        msg: UpdateBatchBidsRequest,
    ) -> tuple[GameState, list[Ack]]:
        pending_state = game_state.pending_state.update(PendingState(bids=msg.bids))
        new_game_state = game_state.update(pending_state)
        response = Ack(game_id=game_state.game_id, player_id=msg.player_id)
        return new_game_state, [response]

    @classmethod
    def handle_buy_asset_message(
        cls,
        game_state: GameState,
        msg: BuyRequest[AssetId],
    ) -> tuple[GameState, list[BuyResponse[AssetId]]]:
        if game_state.phase != Phase.CONSTRUCTION:
            response = msg.make_response(
                success=False,
                message=f"You can only buy assets during the {Phase.CONSTRUCTION.nice_name} phase",
            )
            return game_state, [response]

        list_failed_response = Referee.validate_purchase(gs=game_state, player_id=msg.player_id, purchase_id=msg.purchase_id)
        if list_failed_response:
            return game_state, list_failed_response

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
    ) -> tuple[GameState, list[BuyResponse[TransmissionId]]]:
        if game_state.phase != Phase.CONSTRUCTION:
            response = msg.make_response(
                success=False,
                message=f"You can only buy transmission during the {Phase.CONSTRUCTION.nice_name} phase",
            )
            return game_state, [response]

        list_failed_response = Referee.validate_purchase(gs=game_state, player_id=msg.player_id, purchase_id=msg.purchase_id)
        if list_failed_response:
            return game_state, list_failed_response

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
    ) -> tuple[GameState, list[Ack]]:
        pending_state = game_state.pending_state.update(PendingState(line_activation=msg.line_activation, asset_activation=msg.asset_activation))
        new_game_state = game_state.update(pending_state)
        response = Ack(game_id=game_state.game_id, player_id=msg.player_id)
        return new_game_state, [response]

    @classmethod
    def handle_freezer_migration_message(
        cls,
        game_state: GameState,
        msg: FreezerMigrationRequest,
    ) -> tuple[GameState, Sequence[FreezerMigrationResponse | ConcludePhase]]:
        cp_message = ConcludePhase(game_id=game_state.game_id, phase=game_state.phase)
        asset_id = msg.asset_id
        if asset_id is None:
            asset_id = game_state.assets.get_freezer_for_player(msg.player_id).id

        def fail(reason: str) -> tuple[GameState, Sequence[FreezerMigrationResponse | ConcludePhase]]:
            response = msg.make_response(success=False, message=reason, asset_id=asset_id)
            return game_state, [response, cp_message]

        is_losing_player = Referee.get_losing_player(gs=game_state) == msg.player_id
        if not is_losing_player:
            return fail("Only the losing player can migrate their ice cream to the freezer.")

        is_freezer = game_state.assets[asset_id].is_freezer
        if not is_freezer:
            return fail("The asset you are trying to move is not a freezer.")

        freezer_current_bus = game_state.assets[asset_id].bus
        freezer_is_already_there = freezer_current_bus == msg.bus
        if freezer_is_already_there:
            return fail("The freezer is already at the bus you are trying to move to.")

        bus_has_sockets = game_state.buses[msg.bus].max_assets > len(game_state.assets.get_all_assets_at_bus(msg.bus))
        if not bus_has_sockets:
            return fail("The bus you are trying to move to does not have free sockets.")

        is_asset_owner = game_state.assets[asset_id].owner_player == msg.player_id
        if not is_asset_owner:
            return fail("You can only move your own freezer.")

        new_assets = game_state.assets.migrate_asset(asset_id=asset_id, new_bus_id=msg.bus, round=game_state.game_round)
        new_game_state = game_state.update(new_assets)
        message = f"Successfully migrated freezer {asset_id} from bus {freezer_current_bus} to bus {msg.bus}."
        success_msg = msg.make_response(success=True, message=message, asset_id=asset_id)
        return new_game_state, [success_msg, cp_message]

    @classmethod
    def handle_end_turn_message(
        cls,
        game_state: GameState,
        msg: EndTurn,
    ) -> tuple[GameState, list[ConcludePhase]]:
        players = game_state.players

        cycle_turn = game_state.is_hotseat or game_state.phase.is_one_by_one
        if game_state.phase is Phase.MIGRATION:
            cycle_turn = False

        if cycle_turn:
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
    def _run_post_clearing_book_keeping(cls, game_state: GameState, market_result: MarketCouplingResult) -> tuple[GameState, Sequence[Message]]:
        game_state, msgs_auction_cashflows = cls._settle_player_cashflows(game_state=game_state, market_coupling_result=market_result)
        game_state, ice_cream_msgs = Referee.melt_ice_creams(game_state)
        game_state, transmission_msgs = Referee.wear_congested_transmission(game_state)
        game_state, asset_msgs = Referee.wear_non_freezer_assets(game_state)
        game_state, eliminated_player_msgs = Referee.eliminate_players(gs=game_state)
        game_state, game_over_msg = Referee.check_game_over(gs=game_state)

        msgs = msgs_auction_cashflows + ice_cream_msgs + transmission_msgs + asset_msgs + eliminated_player_msgs + game_over_msg

        return game_state, msgs

    @staticmethod
    def _settle_player_cashflows(
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
