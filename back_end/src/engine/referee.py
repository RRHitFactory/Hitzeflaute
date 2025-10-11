import numpy as np

from src.models.game_state import GameState
from src.models.ids import AssetId, PlayerId, TransmissionId
from src.models.message import (
    AssetWornMessage,
    BuyResponse,
    GameOverMessage,
    IceCreamMeltedMessage,
    LoadsDeactivatedMessage,
    PlayerEliminatedMessage,
    T_Id,
    TransmissionWornMessage,
)
from src.models.transmission import TransmissionInfo


class Referee:
    """
    The Referee class is responsible for enforcing some of the game rules.
    It validates players requests, checks for win conditions, or determines when penalties should be applied
    (e.g., losing ice creams, losing lives of transmission lines, or eliminate players from the game).
    """

    # BEFORE MARKET COUPLING
    @classmethod
    def validate_purchase(cls, gs: GameState, player_id: PlayerId, purchase_id: T_Id) -> list[BuyResponse[T_Id]]:
        if isinstance(purchase_id, AssetId):
            purchase_type = "asset"
            purchase_repo = gs.assets
            purchase_repo_ids = purchase_repo.asset_ids

        elif isinstance(purchase_id, TransmissionId):
            purchase_type = "transmission"
            purchase_repo = gs.transmission
            purchase_repo_ids = purchase_repo.transmission_ids

        else:
            raise NotImplementedError(f"Elements with id type {type(purchase_id)} cannot be purchased.")

        purchase_id = purchase_id
        player = gs.players[player_id]

        def make_failed_response(failed_message: str) -> list[BuyResponse[T_Id]]:
            failed_response = BuyResponse(
                player_id=player_id,
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
            return make_failed_response(f"Sorry, player {player_id} cannot afford {purchase_type} {purchase_id}.")

        return []

    @staticmethod
    def deactivate_loads_of_players_in_debt(
        gs: GameState,
    ) -> tuple[GameState, list[LoadsDeactivatedMessage]]:
        def deactivate_player_loads(game_state: GameState, loads: list[AssetId]) -> GameState:
            asset_repo = game_state.assets.batch_deactivate(loads)
            return game_state.update(assets=asset_repo)

        msgs = []
        ids_to_deactivate = []

        for player in gs.players.human_players:
            if player.money >= 0:
                continue
            load_ids = gs.assets.get_all_for_player(player_id=player.id).only_loads.asset_ids
            ids_to_deactivate.extend(load_ids)
            msg = LoadsDeactivatedMessage(
                player_id=player.id,
                asset_ids=load_ids,
                message=f"Player {player.name} has negative balance, all their loads ({load_ids}) have been deactivated.",
            )
            msgs.append(msg)

        new_gs = deactivate_player_loads(game_state=gs, loads=ids_to_deactivate)

        return new_gs, msgs

    # AFTER MARKET COUPLING

    @staticmethod
    def melt_ice_creams(gs: GameState) -> tuple[GameState, list[IceCreamMeltedMessage]]:
        def generate_melted_ice_cream_messages(new_gs: GameState, asset_ids: list[AssetId]) -> list[IceCreamMeltedMessage]:
            return [
                IceCreamMeltedMessage(
                    player_id=new_gs.assets[asset_id].owner_player,
                    asset_id=asset_id,
                    message=(
                        f"Ice cream melted in Freezer {asset_id} due to insufficient power dispatch. You only have {new_gs.assets[asset_id].health} ice creams left in this freezer."
                        if new_gs.assets[asset_id].health > 0
                        else f"Your Freezer {asset_id} has no ice creams left, you will not survive global warming."
                    ),
                )
                for asset_id in asset_ids
            ]

        asset_repo = gs.assets
        ice_cream_loads = asset_repo.only_freezers
        assets_dispatch: dict[AssetId, float] = gs.market_coupling_result.assets_dispatch.loc[0, :].to_dict()  # type: ignore
        melted_ids = []

        for load in ice_cream_loads:
            if load.health == 0:
                continue
            if assets_dispatch[load.id] == 0:
                asset_repo = asset_repo.melt_ice_cream(load.id)
                melted_ids.append(load.id)

        new_gs = gs.update(assets=asset_repo)
        msgs = generate_melted_ice_cream_messages(new_gs, melted_ids)

        return new_gs, msgs

    @staticmethod
    def wear_congested_transmission(
        gs: GameState,
    ) -> tuple[GameState, list[TransmissionWornMessage]]:
        transmission_repo = gs.transmission
        market_coupling_result = gs.market_coupling_result
        assert market_coupling_result is not None
        flows = market_coupling_result.transmission_flows

        def filter_transmission(tx: TransmissionInfo) -> bool:
            if tx.health == 0:
                return False
            return any(np.isclose(tx.capacity, flows[tx.id]))

        congested_transmissions = [t.id for t in transmission_repo if filter_transmission(t)]
        for tid in congested_transmissions:
            transmission_repo = transmission_repo.wear_transmission(tid)

        new_gs = gs.update(transmission=transmission_repo)

        msgs = [
            TransmissionWornMessage(
                player_id=new_gs.transmission[transmission_id].owner_player,
                transmission_id=transmission_id,
                message=f"Transmission line {TransmissionId} has worn due to congestion, it can only withstand {new_gs.transmission[transmission_id].health} more congested periods.",
            )
            for transmission_id in congested_transmissions
        ]

        return new_gs, msgs

    @staticmethod
    def wear_non_freezer_assets(
        gs: GameState,
    ) -> tuple[GameState, list[AssetWornMessage]]:
        asset_repo = gs.assets
        wearable_assets = gs.assets._filter({"is_freezer": False})
        melted_ids: list[AssetId] = []

        for asset in wearable_assets:
            if asset.health == 0:
                continue
            asset_repo = asset_repo.wear_asset(asset_id=asset.id)
            melted_ids.append(asset.id)

        new_gs = gs.update(assets=asset_repo)

        warn_asset_messages = [
            AssetWornMessage(
                player_id=new_gs.assets[asset_id].owner_player,
                asset_id=asset_id,
                message=(
                    f"Asset {asset_id} has worn with time, it can only operate during the next {new_gs.assets[asset_id].health} rounds."
                    if new_gs.assets[asset_id].health > 0
                    else f"Asset {asset_id} has worn with time and is no longer operational."
                ),
            )
            for asset_id in melted_ids
        ]

        return new_gs, warn_asset_messages

    @staticmethod
    def eliminate_players(
        gs: GameState,
    ) -> tuple[GameState, list[PlayerEliminatedMessage]]:
        new_gs = gs
        eliminated_player_ids = []

        for player in gs.players.only_alive.human_players:
            remaining_ice_creams = gs.assets.get_remaining_ice_creams(player.id)
            if remaining_ice_creams > 0:
                continue
            else:
                new_gs = new_gs.update(new_gs.players.eliminate_player(player.id))
                eliminated_player_ids.append(player.id)

        return new_gs, [
            PlayerEliminatedMessage(
                player_id=player_id,
                message=f"Player {player_id} has been eliminated from the game as they have no remaining ice creams.",
            )
            for player_id in eliminated_player_ids
        ]

    @staticmethod
    def check_game_over(gs: GameState) -> tuple[GameState, list[GameOverMessage]]:
        n_players_alive = len(gs.players.only_alive.human_players)
        if n_players_alive == 1:
            winner = gs.players.only_alive.human_players[0]
            return gs, [
                GameOverMessage(
                    player_id=player_id,
                    winner_id=winner.id,
                    message=f"Player {winner.id} <{winner.name}> has won the game!",
                )
                for player_id in gs.players.human_player_ids
            ]
        elif n_players_alive == 0:
            return gs, [
                GameOverMessage(
                    player_id=player_id,
                    winner_id=None,
                    message="All players have been eliminated. The game is over.",
                )
                for player_id in gs.players.human_player_ids
            ]
        else:
            return gs, []
