from dataclasses import dataclass
from enum import IntEnum
from functools import cached_property
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
    is_freezer: bool = False  # This is a special type of load
    health: int = 0
    is_active: bool = True
    birthday: int = 1  # Round when the asset was created

    def __post_init__(self) -> None:
        if self.is_freezer:
            assert self.asset_type == AssetType.LOAD, "Freezer asset must be of type LOAD"

    @cached_property
    def cashflow_sign(self) -> int:
        return 1 if self.asset_type == AssetType.GENERATOR else -1


class AssetRepo(LdcRepo[AssetInfo]):
    @classmethod
    def _get_dc_type(cls) -> type[AssetInfo]:
        return AssetInfo

    # GET
    @property
    def asset_ids(self) -> list[AssetId]:
        return [AssetId(x) for x in self.df.index.tolist()]

    @cached_property
    def only_active(self) -> Self:
        return self.filter({"is_active": True})

    @cached_property
    def only_freezers(self) -> Self:
        return self.filter({"is_freezer": True})

    @cached_property
    def only_loads(self) -> Self:
        return self.filter({"asset_type": AssetType.LOAD})

    @cached_property
    def only_generators(self) -> Self:
        return self.filter({"asset_type": AssetType.GENERATOR})

    def get_all_assets_at_bus(self, bus_id: BusId, only_active: bool = False) -> Self:
        oa_filter = {"is_active": True} if only_active else {}
        return self.filter({"bus": bus_id, **oa_filter})

    def get_all_for_player(self, player_id: PlayerId, only_active: bool = False) -> Self:
        oa_filter = {"is_active": True} if only_active else {}
        return self.filter({"owner_player": player_id, **oa_filter})

    def get_freezer_for_player(self, player_id: PlayerId) -> AssetInfo:
        assets = self.filter({"owner_player": player_id, "is_freezer": True})
        return assets.as_objs()[0]

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

    def _decrease_health(self, asset_id: AssetId) -> Self:
        if self.df.loc[asset_id, "health"] > 1:
            df = self.df.copy()
            df.loc[asset_id, "health"] -= 1
            return self.update_frame(df)
        else:
            df = self.df.copy()
            df.loc[asset_id, "health"] = 0
            df.loc[asset_id, "is_active"] = False
            return self.update_frame(df)

    def melt_ice_cream(self, asset_id: AssetId) -> Self:
        assert self.df.loc[asset_id, "is_freezer"], "Only freezer assets can melt ice cream"
        return self._decrease_health(asset_id)

    def wear_asset(self, asset_id: AssetId) -> Self:
        assert not self.df.loc[asset_id, "is_freezer"], "Only non-freezer assets can wear out"
        return self._decrease_health(asset_id)

    # DELETE
    def delete_for_player(self, player_id: PlayerId) -> Self:
        return self.drop_items({"owner_player": player_id})
