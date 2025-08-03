from typing import Literal, Optional

from src.engine.finance import FinanceCalculator
from src.engine.market_coupling import MarketCouplingCalculator
from src.engine.referee import Referee
from src.models.game_state import GameState, Phase
from src.models.ids import AssetId, TransmissionId
from src.models.market_coupling_result import MarketCouplingResult
from src.models.message import (
    UpdateBidRequest,
    EndTurn,
    UpdateBidResponse,
    ConcludePhase,
    ToGameMessage,
    FromGameMessage,
    BuyRequest,
    BuyResponse,
    T_Id,
    AuctionClearedMessage,
    GameToPlayerMessage,
    OperateLineRequest,
    OperateLineResponse,
)


class Engine:
    @classmethod
    def handle_message(cls, game_state: GameState, msg: ToGameMessage) -> tuple[GameState, list[FromGameMessage]]:
        """
        Messages can come from players or from the game itself
        Every time a message occurs, the engine is informed and it can then:
        -Update the game state
        -Send messages back to the players OR to itself
        :param game_state: The current state of the game
        :param msg: The triggering message
        :return: The new game state and a list of messages to be sent
        """
        # Handle the message based on its type
        if isinstance(msg, ConcludePhase):
            return cls.handle_new_phase_message(game_state=game_state, msg=msg)
        elif isinstance(msg, UpdateBidRequest):
            return cls.handle_update_bid_message(game_state=game_state, msg=msg)
        elif isinstance(msg, OperateLineRequest):
            return cls.handle_operate_line_message(game_state, msg)
        elif isinstance(msg, BuyRequest):
            if isinstance(msg.purchase_id, AssetId):
                return cls.handle_buy_asset_message(game_state, msg)
            elif isinstance(msg.purchase_id, TransmissionId):
                return cls.handle_buy_transmission_message(game_state, msg)
            else:
                raise NotImplementedError(f"You cannot buy objects of type <{type(msg.purchase_id)}>.")
        elif isinstance(msg, EndTurn):
            return cls.handle_end_turn_message(game_state=game_state, msg=msg)
        else:
            raise NotImplementedError(f"message type {type(msg)} not implemented.")

    @classmethod
    def handle_new_phase_message(
        cls,
        game_state: GameState,
        msg: ConcludePhase,
    ) -> tuple[GameState, list[GameToPlayerMessage]]:

        if msg.phase == Phase.CONSTRUCTION:
            new_game_state, msgs = cls._process_construction_phase(game_state)
        elif msg.phase == Phase.DA_AUCTION:
            new_game_state, msgs = cls._process_day_ahead_auction_phase(game_state)
        elif msg.phase == Phase.SNEAKY_TRICKS:
            new_game_state, msgs = cls._process_sneaky_tricks_phase(game_state)
        else:
            raise NotImplementedError(f"Phase {msg.phase} not implemented.")

        new_game_state = new_game_state.update(
            phase=new_game_state.phase.get_next(),
            players=new_game_state.players.start_all_turns(),
            round=new_game_state.round + 1 if new_game_state.phase.get_next().value == 0 else new_game_state.round,
        )
        return new_game_state, msgs

    @classmethod
    def handle_update_bid_message(
        cls,
        game_state: GameState,
        msg: UpdateBidRequest,
    ) -> tuple[GameState, list[UpdateBidResponse]]:

        list_failed_response = cls._validate_update_bid(gs=game_state, msg=msg)
        if list_failed_response:
            return game_state, list_failed_response

        new_assets = game_state.assets.update_bid_price(asset_id=msg.asset_id, bid_price=msg.bid_price)
        new_game_state = game_state.update(assets=new_assets)

        response = UpdateBidResponse(
            player_id=msg.player_id,
            success=True,
            message=f"Player {msg.player_id} successfully updated bid for asset {msg.asset_id} to {msg.bid_price}.",
            asset_id=msg.asset_id,
        )

        return new_game_state, [response]

    @classmethod
    def handle_buy_asset_message(
        cls,
        game_state: GameState,
        msg: BuyRequest[AssetId],
    ) -> tuple[GameState, list[BuyResponse[AssetId]]]:

        list_failed_response = Referee.validate_purchase(
            gs=game_state, player_id=msg.player_id, purchase_id=msg.purchase_id
        )
        if list_failed_response:
            return game_state, list_failed_response

        asset = game_state.assets[msg.purchase_id]

        message = f"Player {msg.player_id} successfully bought asset {asset.id}."
        new_players = game_state.players.subtract_money(player_id=msg.player_id, amount=asset.minimum_acquisition_price)
        new_assets = game_state.assets.change_owner(asset_id=asset.id, new_owner=msg.player_id)

        new_game_state = game_state.update(players=new_players, assets=new_assets)

        response = BuyResponse(player_id=msg.player_id, success=True, message=message, purchase_id=asset.id)
        return new_game_state, [response]

    @classmethod
    def handle_buy_transmission_message(
        cls,
        game_state: GameState,
        msg: BuyRequest[TransmissionId],
    ) -> tuple[GameState, list[BuyResponse[TransmissionId]]]:

        list_failed_response = Referee.validate_purchase(
            gs=game_state, player_id=msg.player_id, purchase_id=msg.purchase_id
        )
        if list_failed_response:
            return game_state, list_failed_response

        transmission = game_state.transmission[msg.purchase_id]

        message = f"Player {msg.player_id} successfully bought transmission {transmission.id}."
        new_players = game_state.players.subtract_money(
            player_id=msg.player_id, amount=transmission.minimum_acquisition_price
        )
        new_transmission = game_state.transmission.change_owner(
            transmission_id=transmission.id, new_owner=msg.player_id
        )

        new_game_state = game_state.update(players=new_players, transmission=new_transmission)

        response = BuyResponse(player_id=msg.player_id, success=True, message=message, purchase_id=transmission.id)
        return new_game_state, [response]

    @classmethod
    def handle_operate_line_message(
        cls,
        game_state: GameState,
        msg: OperateLineRequest,
    ) -> tuple[GameState, list[OperateLineResponse]]:

        def make_response(
            result: Literal["success", "no_change", "failure"], text: str, new_game_state: Optional[GameState] = None
        ) -> tuple[GameState, list[OperateLineResponse]]:
            if new_game_state is None:
                new_game_state = game_state
            response = OperateLineResponse(player_id=msg.player_id, request=msg, result=result, message=text)
            return new_game_state, [response]

        if msg.transmission_id not in game_state.transmission.transmission_ids:
            return make_response(result="failure", text="Transmission does not exist.")

        line = game_state.transmission[msg.transmission_id]
        if line.owner_player != msg.player_id:
            return make_response(result="failure", text="Transmission does not belong to this player.")

        if msg.action == "open":
            if line.is_open:
                return make_response(result="no_change", text="Transmission line is already open.")
            else:
                new_state = game_state.update(transmission=game_state.transmission.open_line(line.id))
                return make_response(
                    result="success", text="Transmission line opened successfully.", new_game_state=new_state
                )

        assert msg.action == "close"
        if line.is_closed:
            return make_response(result="no_change", text="Transmission line is already closed.")

        new_state = game_state.update(transmission=game_state.transmission.close_line(line.id))
        return make_response(result="success", text="Transmission line closed successfully.", new_game_state=new_state)

    @classmethod
    def handle_end_turn_message(
        cls,
        game_state: GameState,
        msg: EndTurn,
    ) -> tuple[GameState, list[ConcludePhase]]:
        # TODO If this phase requires players to play one by one (Do we need such a phase?) Then cycle to the next player
        game_state = game_state.update(players=game_state.players.end_turn(player_id=msg.player_id))
        if game_state.players.are_all_players_finished():
            return game_state, [ConcludePhase(phase=game_state.phase)]
        else:
            return game_state, []

    @classmethod
    def _process_construction_phase(cls, game_state: GameState) -> tuple[GameState, list[GameToPlayerMessage]]:
        new_game_state = game_state
        return new_game_state, []

    @classmethod
    def _process_sneaky_tricks_phase(cls, game_state: GameState) -> tuple[GameState, list[GameToPlayerMessage]]:
        new_game_state = game_state
        return new_game_state, []

    @classmethod
    def _process_day_ahead_auction_phase(cls, game_state: GameState) -> tuple[GameState, list[GameToPlayerMessage]]:
        msgs: list[GameToPlayerMessage] = []

        new_game_state, msgs_load_deactivation = Referee.deactivate_loads_of_players_in_debt(gs=game_state)
        msgs.extend(msgs_load_deactivation)

        market_result = MarketCouplingCalculator.run(game_state=new_game_state)
        new_game_state, msgs_auction_cashflows = cls._update_game_state_with_market_coupling_result(
            game_state=new_game_state, market_coupling_result=market_result
        )

        new_game_state, referee_after_coupling_msgs = cls._apply_rules_after_market_coupling(new_game_state)
        msgs.extend(referee_after_coupling_msgs)

        return new_game_state, msgs

    @staticmethod
    def _update_game_state_with_market_coupling_result(
        game_state: GameState,
        market_coupling_result: MarketCouplingResult,
    ) -> tuple[GameState, list[AuctionClearedMessage]]:
        player_repo = game_state.players
        cashflows = FinanceCalculator.compute_cashflows_after_power_delivery(
            game_state=game_state, market_coupling_result=market_coupling_result
        )

        for player_id, net_cashflow in cashflows.items():
            player_repo = player_repo.add_money(player_id=player_id, amount=net_cashflow)

        new_game_state = game_state.update(
            players=player_repo,
            market_coupling_result=market_coupling_result,
        )

        msgs: list[AuctionClearedMessage] = []
        for player_id in new_game_state.players.player_ids:
            old_money = game_state.players[player_id].money
            new_money = new_game_state.players[player_id].money
            text = f"Day-ahead market cleared. Your balance was adjusted accordingly from ${old_money} to ${new_money}."
            msgs.append(
                AuctionClearedMessage(
                    player_id=player_id,
                    message=text,
                )
            )

        return new_game_state, msgs

    @classmethod
    def _apply_rules_after_market_coupling(cls, gs: GameState) -> tuple[GameState, list[GameToPlayerMessage]]:
        new_gs = gs
        msgs: list[GameToPlayerMessage] = []

        new_gs, ice_cream_msgs = Referee.melt_ice_creams(new_gs)
        msgs.extend(ice_cream_msgs)

        new_gs, transmission_msgs = Referee.wear_congested_transmission(new_gs)
        msgs.extend(transmission_msgs)

        new_gs, asset_msgs = Referee.wear_non_freezer_assets(new_gs)
        msgs.extend(asset_msgs)

        return new_gs, msgs

    @classmethod
    def _validate_purchase(cls, gs: GameState, msg: BuyRequest[T_Id]) -> list[BuyResponse[T_Id]]:

        if isinstance(msg.purchase_id, AssetId):
            purchase_type = "asset"
            purchase_repo = gs.assets
            purchase_repo_ids = purchase_repo.asset_ids

        elif isinstance(msg.purchase_id, TransmissionId):
            purchase_type = "transmission"
            purchase_repo = gs.transmission
            purchase_repo_ids = purchase_repo.transmission_ids

        else:
            raise NotImplementedError(f"Message type {type(msg)} not implemented for purchase validation.")

        purchase_id = msg.purchase_id
        player = gs.players[msg.player_id]

        def make_failed_response(failed_message: str) -> list[BuyResponse[T_Id]]:
            failed_response = BuyResponse(
                player_id=msg.player_id,
                success=False,
                message=failed_message,
                purchase_id=purchase_id,
            )
            return [failed_response]

        if purchase_id not in purchase_repo_ids:
            return make_failed_response(f"Sorry, {purchase_type} {purchase_id} does not exist.")
        purchase_obj = purchase_repo[purchase_id]

        if not purchase_obj.is_for_sale:
            return make_failed_response(f"Sorry, {purchase_type} {purchase_id} is not for sale.")

        elif player.money < purchase_obj.minimum_acquisition_price:
            return make_failed_response(f"Sorry, player {msg.player_id} cannot afford {purchase_type} {purchase_id}.")

        return []

    @classmethod
    def _validate_update_bid(cls, gs: GameState, msg: UpdateBidRequest) -> list[UpdateBidResponse]:

        def make_failed_response(failed_message: str) -> list[UpdateBidResponse]:
            failed_response = UpdateBidResponse(
                player_id=msg.player_id,
                success=False,
                message=failed_message,
                asset_id=msg.asset_id,
            )
            return [failed_response]

        if msg.asset_id not in gs.assets.asset_ids:
            return make_failed_response("Asset does not exist.")

        player = gs.players[msg.player_id]
        asset = gs.assets[msg.asset_id]
        player_assets = gs.assets.get_all_for_player(player.id, only_active=True)
        min_bid = gs.game_settings.min_bid_price
        max_bid = gs.game_settings.max_bid_price

        if player.id != asset.owner_player:
            return make_failed_response(f"Player {player.id} cannot bid on asset {asset.id} as they do not own it.")

        if not (min_bid <= msg.bid_price <= max_bid):
            return make_failed_response(
                f"Bid price {msg.bid_price} is not within the allowed range " f"[{min_bid}, {max_bid}]."
            )

        if FinanceCalculator.validate_bid_for_asset(player_assets, msg.asset_id, msg.bid_price, player.money):
            return make_failed_response(
                f"Player {player.id} cannot afford the bid price of {msg.bid_price} for asset {asset.id}."
            )

        return []
