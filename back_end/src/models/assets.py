from dataclasses import dataclass
from enum import IntEnum
from functools import cached_property
from types import MappingProxyType

import dataframely as dy
import polars as pl
from back_end.src.models.data.polar_repo import PolarRepo, PrSchema
from randcraft import make_dirac, make_uniform
from randcraft.random_variable import RandomVariable

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
    technology: str = ""

    def __post_init__(self) -> None:
        assert self.power_std >= 0, "Asset power standard deviation must be non-negative"
        if self.is_freezer:
            assert self.asset_type == AssetType.LOAD, "Freezer asset must be of type LOAD"
            assert self.power_std == 0, "Freezer asset must have zero power standard deviation"
        assert self.power_rv.get_min_value() >= 0, f"Asset power random variable must be non-negative but got {self.power_rv}"

    def sample_power(self) -> int:
        return round(self.power_rv.sample_one())

    @cached_property
    def power_rv(self) -> RandomVariable:
        if self.power_std <= 1e-3:
            return make_dirac(value=self.power_expected)
        abs_range = self.power_std * 12 ** (-0.5)
        low = self.power_expected - abs_range / 2
        high = self.power_expected + abs_range / 2
        return make_uniform(low=low, high=high)

    @cached_property
    def cashflow_sign(self) -> int:
        return 1 if self.asset_type == AssetType.GENERATOR else -1


class AssetRepoSchema(PrSchema):
    owner_player = dy.UInt8()
    asset_type = dy.String()
    bus = dy.UInt8()
    power_expected = dy.Float64(min=0.0)
    power_std = dy.Float64(min=0.0)
    is_for_sale = dy.Bool()
    minimum_acquisition_price = dy.Float64(min=0.0)
    fixed_operating_cost = dy.Float64(min=0.0)
    marginal_cost = dy.Float64(min=0.0)
    bid_price = dy.Float64()
    is_freezer = dy.Bool()
    health = dy.UInt8()
    is_active = dy.Bool()
    birthday = dy.UInt8()
    technology = dy.String()

    @dy.rule()
    def valid_asset_type(self) -> pl.Expr:
        return pl.col("asset_type").is_in(["GENERATOR", "LOAD"])


is_generator = pl.col("asset_type") == "GENERATOR"
is_load = pl.col("asset_type") == "LOAD"
is_active = pl.col("is_active")
is_freezer = pl.col("is_freezer")


class AssetPolarRepo(PolarRepo[AssetRepoSchema, AssetInfo, AssetId]):
    @classmethod
    def get_schema(cls) -> tuple[type[AssetRepoSchema], type[AssetInfo], type[AssetId]]:
        return AssetRepoSchema, AssetInfo, AssetId

    # READ
    @property
    def bus_ids(self) -> list[BusId]:
        return [BusId(x) for x in self.df["id"].to_list()]

    @property
    def only_active(self) -> "AssetPolarRepo":
        return self._filter(is_active)

    @property
    def only_inactive(self) -> "AssetPolarRepo":
        return self._filter(~is_active)

    @property
    def only_freezers(self) -> "AssetPolarRepo":
        return self._filter(is_freezer)

    @property
    def not_freezers(self) -> "AssetPolarRepo":
        return self._filter(~is_freezer)

    @property
    def only_loads(self) -> "AssetPolarRepo":
        return self._filter(is_load)

    @property
    def only_generators(self) -> "AssetPolarRepo":
        return self._filter(is_generator)

    def get_all_assets_at_bus(self, bus_id: BusId, only_active: bool = False) -> "AssetPolarRepo":
        filters = [pl.col("bus") == bus_id]
        if only_active:
            filters.append(is_active)
        return self._filter(filters)

    def get_all_for_player(self, player_id: PlayerId, only_active: bool = False) -> "AssetPolarRepo":
        filters = [pl.col("owner_player") == int(player_id)]
        if only_active:
            filters.append(is_active)
        return self._filter(filters)

    def get_freezer_for_player(self, player_id: PlayerId) -> AssetInfo:
        filters = [pl.col("owner_player") == int(player_id), is_freezer]
        assets = self._filter(filters)
        assert len(assets) == 1
        return assets[0]

    def get_remaining_ice_creams(self, player_id: PlayerId) -> int:
        return self.get_freezer_for_player(player_id).health

    def get_total_generation_capacity(self) -> float:
        return self.df.filter(is_generator, is_active)["power_expected"].sum()

    def get_total_consumption_capacity(self) -> float:
        return self.df.filter(is_load, is_active)["power_expected"].sum()

    # UPDATE
    def change_owner(self, asset_id: AssetId, new_owner: PlayerId) -> "AssetPolarRepo":
        return self.update_ikv(id=asset_id, key="owner_player", value=new_owner)

    def update_bids(self, bids: MappingProxyType[AssetId, float]) -> "AssetPolarRepo":
        df = self.df
        bid_df = pl.DataFrame({"id": list(bids.keys()), "new_bid": list(bids.values())})
        updated_df = df.join(bid_df, on="id", how="left").with_columns(pl.coalesce("new_bid", "bid").alias("bid")).drop("new_bid")
        return self.update_frame(updated_df)

    def migrate_asset(self, asset_id: AssetId, new_bus_id: BusId) -> "AssetPolarRepo":
        return self.update_ikv(id=asset_id, key="bus", value=new_bus_id)

    def _decrease_health(self, asset_id: AssetId) -> "AssetPolarRepo":
        current_health: int = self.df.filter(pl.col("id") == int(asset_id))["health"].item()
        if current_health > 1:
            return self.update_ik_expr(id=asset_id, key="health", expr=pl.col("health") - 1)
        else:
            df = self.df
            
            df.loc[asset_id, "health"] = 0
            df.loc[asset_id, "is_active"] = False
            return self.update_frame(df)

    def melt_ice_cream(self, asset_id: AssetId) -> "AssetRepo":
        assert self.df.loc[asset_id, "is_freezer"], "Only freezer assets can melt ice cream"
        return self._decrease_health(asset_id)

    def wear_asset(self, asset_id: AssetId) -> "AssetRepo":
        assert not self.df.loc[asset_id, "is_freezer"], "Only non-freezer assets can wear out"
        return self._decrease_health(asset_id)

    def batch_deactivate(self, asset_ids: list[AssetId]) -> "AssetRepo":
        df = self.df
        df.loc[asset_ids, "is_active"] = False
        return self.update_frame(df)

    def update_activations(self, activations: MappingProxyType[AssetId, bool]) -> "AssetRepo":
        df = self.df
        actives = [k for k, v in activations.items() if v]
        inactives = [k for k, v in activations.items() if not v]
        df.loc[actives, "is_active"] = True
        df.loc[inactives, "is_active"] = False
        return self.update_frame(df)

    # DELETE
    def delete_for_player(self, player_id: PlayerId) -> "AssetRepo":
        return self.drop_items({"owner_player": player_id})


class AssetRepo(LdcRepo[AssetInfo]):
    @classmethod
    def _get_dc_type(cls) -> type[AssetInfo]:
        return AssetInfo

    # GET
    # READ
    @property
    def bus_ids(self) -> list[BusId]:
        return [BusId(x) for x in self.df["id"].to_list()]

    @cached_property
    def only_active(self) -> "AssetRepo":
        return self._filter({"is_active": True})

    @cached_property
    def only_inactive(self) -> "AssetRepo":
        return self._filter({"is_active": False})

    @cached_property
    def only_freezers(self) -> "AssetRepo":
        return self._filter({"is_freezer": True})

    @cached_property
    def not_freezers(self) -> "AssetRepo":
        return self._filter({"is_freezer": False})

    @cached_property
    def only_loads(self) -> "AssetRepo":
        return self._filter({"asset_type": AssetType.LOAD})

    @cached_property
    def only_generators(self) -> "AssetRepo":
        return self._filter({"asset_type": AssetType.GENERATOR})

    def get_all_assets_at_bus(self, bus_id: BusId, only_active: bool = False) -> "AssetRepo":
        oa_filter = {"is_active": True} if only_active else {}
        return self._filter({"bus": bus_id, **oa_filter})

    def get_all_for_player(self, player_id: PlayerId, only_active: bool = False) -> "AssetRepo":
        oa_filter = {"is_active": True} if only_active else {}
        return self._filter({"owner_player": player_id, **oa_filter})

    def get_freezer_for_player(self, player_id: PlayerId) -> AssetInfo:
        assets = self._filter({"owner_player": player_id, "is_freezer": True})
        return assets.as_objs()[0]  # TODO: to make the game more fun, players should be allowed to have multiple freezers

    def get_remaining_ice_creams(self, player_id: PlayerId) -> int:
        freezers = self.get_all_for_player(player_id).only_freezers
        return freezers.df.health.sum()

    def get_total_generation_capacity(self) -> float:
        generators = self.only_generators.only_active
        return generators.df.power_expected.sum()

    def get_total_consumption_capacity(self) -> float:
        loads = self.only_loads.only_active
        return loads.df.power_expected.sum()

    # UPDATE
    def change_owner(self, asset_id: AssetId, new_owner: PlayerId) -> "AssetRepo":
        df = self.df
        df.loc[asset_id, "owner_player"] = simplify_type(new_owner)
        df.loc[asset_id, "is_for_sale"] = False
        return self.update_frame(df)

    def update_bids(self, bids: MappingProxyType[AssetId, float]) -> "AssetRepo":
        df = self.df
        asset_ids = list(bids.keys())
        prices = list(bids.values())
        df.loc[asset_ids, "bid_price"] = prices
        return self.update_frame(df)

    def migrate_asset(self, asset_id: AssetId, new_bus_id: BusId) -> "AssetRepo":
        df = self.df
        df.loc[asset_id, "bus"] = simplify_type(new_bus_id)
        return self.update_frame(df)

    def _decrease_health(self, asset_id: AssetId) -> "AssetRepo":
        if self.df.loc[asset_id, "health"] > 1:  # type: ignore
            df = self.df
            df.loc[asset_id, "health"] -= 1  # type: ignore
            return self.update_frame(df)
        else:
            df = self.df
            df.loc[asset_id, "health"] = 0
            df.loc[asset_id, "is_active"] = False
            return self.update_frame(df)

    def melt_ice_cream(self, asset_id: AssetId) -> "AssetRepo":
        assert self.df.loc[asset_id, "is_freezer"], "Only freezer assets can melt ice cream"
        return self._decrease_health(asset_id)

    def wear_asset(self, asset_id: AssetId) -> "AssetRepo":
        assert not self.df.loc[asset_id, "is_freezer"], "Only non-freezer assets can wear out"
        return self._decrease_health(asset_id)

    def batch_deactivate(self, asset_ids: list[AssetId]) -> "AssetRepo":
        df = self.df
        df.loc[asset_ids, "is_active"] = False
        return self.update_frame(df)

    def update_activations(self, activations: MappingProxyType[AssetId, bool]) -> "AssetRepo":
        df = self.df
        actives = [k for k, v in activations.items() if v]
        inactives = [k for k, v in activations.items() if not v]
        df.loc[actives, "is_active"] = True
        df.loc[inactives, "is_active"] = False
        return self.update_frame(df)

    # DELETE
    def delete_for_player(self, player_id: PlayerId) -> "AssetRepo":
        return self.drop_items({"owner_player": player_id})
