from dataclasses import replace

from src.models.ids import AssetId
from src.models.message import (
    GameUpdate,
    IceCreamMeltedMessage,
    AssetWornMessage,
    LoadsDeactivatedMessage
)  # , BuyAssetRequest, BuyAssetResponse, BuyTransmissionRequest, BuyTransmissionResponse, BuyResponse
from src.models.game_state import GameState, Phase


class Referee:
    """
    The Referee class is responsible for enforcing some of the game rules.
    It validates players requests, checks for win conditions, or determines when penalties should be applied
    (e.g., losing ice creams, losing lives of transmission lines, or eliminate players from the game).
    """

    # BEFORE MARKET COUPLING

    # TODO: shift _check_if_purchase_is_invalid from engine to referee
    # @overload
    # @classmethod
    # def _check_if_purchase_is_invalid(cls, gs: GameState, msg: BuyAssetRequest) -> list[BuyAssetResponse]: ...
    #
    # @overload
    # @classmethod
    # def _check_if_purchase_is_invalid(
    #     cls, gs: GameState, msg: BuyTransmissionRequest
    # ) -> list[BuyTransmissionResponse]: ...
    #
    # @staticmethod
    # def check_if_purchase_is_invalid(gs: GameState, msg) -> list[BuyResponse]:
    #     raise NotImplementedError()

    @staticmethod
    def deactivate_loads_of_players_in_debt(gs: GameState) -> tuple[GameState, list[LoadsDeactivatedMessage]]:

        def deactivate_player_loads(game_state: GameState, loads: list[AssetId]) -> GameState:
            asset_repo = game_state.assets.batch_deactivate(loads)
            return replace(game_state, assets=asset_repo)

        msgs = []
        ids_to_deactivate = []

        for player in gs.players:
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
    def melt_ice_creams(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        assert gs.market_coupling_result is not None, "Market coupling result must be available to melt ice creams."
        assert gs.phase == Phase.DA_AUCTION, "Ice creams only melt at the end of the DA auction phase."

        def generate_melted_ice_cream_messages(
            new_gs: GameState, asset_ids: list[AssetId]
        ) -> list[IceCreamMeltedMessage | GameUpdate]:
            return [
                IceCreamMeltedMessage(
                    player_id=new_gs.assets[asset_id].owner_player,
                    asset_id=asset_id,
                    message=f"Ice cream melted in Freezer {AssetId} due to insufficient power dispatch.",
                )
                for asset_id in asset_ids
            ]

        asset_repo = gs.assets
        ice_cream_loads = asset_repo.only_freezers
        assets_dispatch: dict[AssetId, float] = gs.market_coupling_result.assets_dispatch.loc[0, :].to_dict()
        melted_ids = []

        for load in ice_cream_loads:
            if assets_dispatch[load.id] < load.power_expected:
                asset_repo = asset_repo.melt_ice_cream(load.id)
                melted_ids.append(load.id)

        new_gs = replace(gs, assets=asset_repo)
        msgs = generate_melted_ice_cream_messages(new_gs, melted_ids)

        return new_gs, msgs

    @staticmethod
    def wear_overloaded_transmission(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()

    @staticmethod
    def wear_non_freezer_assets(gs: GameState) -> tuple[GameState, list[AssetWornMessage]]:
        assert gs.market_coupling_result is not None, "Market coupling result must be available to wear assets."
        assert gs.phase == Phase.DA_AUCTION, "Assets only suffer wear at the end DA auction phase."

        def generate_worn_asset_messages(new_gs: GameState, asset_ids: list[AssetId]) -> list[AssetWornMessage]:
            return [
                AssetWornMessage(
                    player_id=new_gs.assets[asset_id].owner_player,
                    asset_id=asset_id,
                    message=f"Asset {AssetId} has worn with time, it can only operate during the next {new_gs.assets[asset_id].health} rounds.",
                )
                for asset_id in asset_ids
            ]

        asset_repo = gs.assets
        wearable_assets = gs.assets.filter({"is_freezer": False})
        melted_ids: list[AssetId] = []

        for asset in wearable_assets:
            asset_repo = asset_repo.wear_asset(asset_id=asset.id)
            melted_ids.append(asset.id)

        new_gs = replace(gs, assets=asset_repo)
        msgs = generate_worn_asset_messages(new_gs=new_gs, asset_ids=melted_ids)

        return new_gs, msgs

    @staticmethod
    def eliminate_players(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()

    @staticmethod
    def check_for_winner(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()
