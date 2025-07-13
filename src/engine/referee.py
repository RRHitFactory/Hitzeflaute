from dataclasses import replace

import pandas as pd

from src.models.ids import AssetId
from src.models.message import GameUpdate #, BuyAssetRequest, BuyAssetResponse, BuyTransmissionRequest, BuyTransmissionResponse, BuyResponse
from src.models.game_state import GameState


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
    def deactivate_loads_of_players_in_debt(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()

    # AFTER MARKET COUPLING

    @staticmethod
    def melt_ice_creams(gs: GameState) -> tuple[GameState, list[GameUpdate]]:

        def generate_melted_ice_cream_message(new_gs: GameState, asset_id: AssetId) -> GameUpdate:
            return GameUpdate(
                player_id=gs.assets[asset_id].owner_player,
                game_state=new_gs,
                message=f"An ice cream melted for Load {asset_id}."
            )

        asset_repo = gs.assets
        ice_cream_loads = asset_repo.filter({"is_ice_cream": True})
        assets_dispatch: dict[AssetId, float] = gs.market_coupling_result.assets_dispatch.loc[0, :].to_dict()
        melted_ids = []

        for load in ice_cream_loads:
            if assets_dispatch[load.id] < load.power_expected:
                asset_repo.melt_ice_cream(load.id)
                melted_ids.append(load.id)

        new_gs = replace(gs, assets=asset_repo)

        return new_gs, [generate_melted_ice_cream_message(new_gs, asset_id) for asset_id in melted_ids]

    @staticmethod
    def wear_overloaded_transmission(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()

    @staticmethod
    def eliminate_players(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()

    @staticmethod
    def check_for_winner(gs: GameState) -> tuple[GameState, list[GameUpdate]]:
        raise NotImplementedError()
