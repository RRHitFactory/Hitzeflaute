import numpy as np

from src.models.ids import AssetId, TransmissionId, PlayerId
from src.models.message import (
    GameUpdate,
    IceCreamMeltedMessage,
    AssetWornMessage,
    TransmissionWornMessage,
    GameToPlayerMessage,
    LoadsDeactivatedMessage,
    BuyResponse,
    T_Id,
)
from src.models.game_state import GameState, Phase


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

        if not purchase_id in purchase_repo_ids:
            return make_failed_response(f"Sorry, {purchase_type} {purchase_id} does not exist.")
        purchase_obj = purchase_repo[purchase_id]

        if not purchase_obj.is_for_sale:
            return make_failed_response(f"Sorry, {purchase_type} {purchase_id} is not for sale.")

        elif player.money < purchase_obj.minimum_acquisition_price:
            return make_failed_response(f"Sorry, player {player_id} cannot afford {purchase_type} {purchase_id}.")

        return []

    @staticmethod
    def deactivate_loads_of_players_in_debt(gs: GameState) -> tuple[GameState, list[LoadsDeactivatedMessage]]:

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

        def generate_melted_ice_cream_messages(
            new_gs: GameState, asset_ids: list[AssetId]
        ) -> list[IceCreamMeltedMessage]:
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
        assets_dispatch: dict[AssetId, float] = gs.market_coupling_result.assets_dispatch.loc[0, :].to_dict()
        melted_ids = []

        for load in ice_cream_loads:
            if load.health == 0:
                continue
            if assets_dispatch[load.id] < load.power_expected:
                asset_repo = asset_repo.melt_ice_cream(load.id)
                melted_ids.append(load.id)

        new_gs = gs.update(assets=asset_repo)
        msgs = generate_melted_ice_cream_messages(new_gs, melted_ids)

        return new_gs, msgs

    @staticmethod
    def wear_congested_transmission(gs: GameState) -> tuple[GameState, list[TransmissionWornMessage]]:

        def generate_worn_transmission_messages(
            new_gs: GameState, transmission_ids: list[TransmissionId]
        ) -> list[TransmissionWornMessage]:
            return [
                TransmissionWornMessage(
                    player_id=new_gs.transmission[transmission_id].owner_player,
                    transmission_id=transmission_id,
                    message=f"Transmission line {TransmissionId} has worn due to congestion, it can only withstand "
                    f"{new_gs.transmission[transmission_id].health} more congested periods.",
                )
                for transmission_id in transmission_ids
            ]

        transmission_repo = gs.transmission
        congested_transmissions: list[TransmissionId] = []
        flows = gs.market_coupling_result.transmission_flows

        for transmission in transmission_repo:
            if transmission.health == 0:
                continue
            if np.isclose(transmission.capacity, flows[transmission.id]):
                transmission_repo = transmission_repo.wear_transmission(transmission_id=transmission.id)
                congested_transmissions.append(transmission.id)

        new_gs = gs.update(transmission=transmission_repo)
        msgs = generate_worn_transmission_messages(new_gs=new_gs, transmission_ids=congested_transmissions)

        return new_gs, msgs

    @staticmethod
    def wear_non_freezer_assets(gs: GameState) -> tuple[GameState, list[AssetWornMessage]]:

        def generate_worn_asset_messages(new_gs: GameState, asset_ids: list[AssetId]) -> list[AssetWornMessage]:
            return [
                AssetWornMessage(
                    player_id=new_gs.assets[asset_id].owner_player,
                    asset_id=asset_id,
                    message=(
                        f"Asset {asset_id} has worn with time, it can only operate during the next {new_gs.assets[asset_id].health} rounds."
                        if new_gs.assets[asset_id].health > 0
                        else f"Asset {asset_id} has worn with time and is no longer operational."
                    ),
                )
                for asset_id in asset_ids
            ]

        asset_repo = gs.assets
        wearable_assets = gs.assets.filter({"is_freezer": False})
        melted_ids: list[AssetId] = []

        for asset in wearable_assets:
            if asset.health == 0:
                continue
            asset_repo = asset_repo.wear_asset(asset_id=asset.id)
            melted_ids.append(asset.id)

        new_gs = gs.update(assets=asset_repo)
        msgs = generate_worn_asset_messages(new_gs=new_gs, asset_ids=melted_ids)

        return new_gs, msgs

    @staticmethod
    def eliminate_players(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()

    @staticmethod
    def check_for_winner(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()
