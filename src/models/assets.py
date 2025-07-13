from dataclasses import dataclass
from enum import IntEnum
from typing import Self

from src.models.data.ldc_repo import LdcRepo
from src.models.data.light_dc import LightDc
from src.models.ids import AssetId, BusId, PlayerId
from src.tools.serialization import simplify_type


class AssetType(IntEnum):
    GENERATOR = 0
    LOAD = 1


@dataclass(frozen=True)
class AssetInfo(LightDc):
    id: AssetId
    owner_player: PlayerId
    asset_type: AssetType
    bus: BusId
    power_expected: float
    power_std: float
    is_for_sale: bool = False
    minimum_acquisition_price: float = 0.0
    fixed_operating_cost: float = 0.0
    marginal_cost: float = 0.0
    bid_price: float = 0.0
    is_ice_cream: bool = False  # This is a special type of load
    n_ice_cream: int = 0
    is_active: bool = True

    def __post_init__(self) -> None:
        if self.is_ice_cream:
            assert self.asset_type == AssetType.LOAD, "Ice cream asset must be of type LOAD"
            assert self.n_ice_cream > 0, "Ice cream asset must have a positive number of ice creams"


class AssetRepo(LdcRepo[AssetInfo]):
    @classmethod
    def _get_dc_type(cls) -> type[AssetInfo]:
        return AssetInfo

    # GET
    @property
    def asset_ids(self) -> list[AssetId]:
        return [AssetId(x) for x in self.df.index.tolist()]

    def get_all_assets_at_bus(self, bus_id: BusId) -> Self:
        return self.filter({"bus": bus_id})

    def get_all_for_player(self, player_id: PlayerId, only_active: bool = False) -> Self:
        if only_active:
            return self.filter({"owner_player": player_id, "is_active": True})
        else:
            return self.filter({"owner_player": player_id})

    def get_cashflow_sign(self, asset_id: AssetId) -> int:
        asset = self.df.loc[asset_id]
        return 1 if asset["asset_type"] == AssetType.GENERATOR else -1

    # UPDATE
    def change_owner(self, asset_id: AssetId, new_owner: PlayerId) -> Self:
        df = self.df.copy()
        df.loc[asset_id, "owner_player"] = simplify_type(new_owner)
        df.loc[asset_id, "is_for_sale"] = False
        return self.update_frame(df)

    def update_bid_price(self, asset_id: AssetId, bid_price: float) -> Self:
        df = self.df.copy()
        df.loc[asset_id, "bid_price"] = bid_price
        return self.update_frame(df)

    def melt_ice_cream(self, asset_id: AssetId) -> Self:
        df = self.df.copy()
        if df.loc[asset_id, "n_ice_cream"] > 0:
            df.loc[asset_id, "n_ice_cream"] -= 1
        return self.update_frame(df)

    # DELETE
    def delete_for_player(self, player_id: PlayerId) -> Self:
        return self.drop_items({"owner_player": player_id})
