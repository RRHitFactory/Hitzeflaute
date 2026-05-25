from dataclasses import dataclass
from enum import IntEnum
from functools import cached_property
from types import MappingProxyType

import dataframely as dy
import polars as pl
from randcraft import make_dirac, make_uniform
from randcraft.random_variable import RandomVariable

from src.ids import AssetId, BusId, PlayerId, Round
from src.models.data.light_dc import LightDc
from src.models.data.polar_repo import PolarRepo
from src.tools.polar import reorder

__all__ = ["AssetType", "AssetInfo", "AssetRepoSchema", "AssetRepo"]

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


class AssetRepoSchema(dy.Schema):
    id = AssetId._get_dy_column(primary_key=True)
    owner_player = PlayerId._get_dy_column()
    asset_type = AssetId._get_dy_column()
    bus = BusId._get_dy_column()
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
    technology = dy.String(max_length=30)

    @dy.rule()
    def valid_asset_type(self) -> pl.Expr:
        return pl.col("asset_type").is_in([at.value for at in AssetType])


is_generator = pl.col("asset_type") == AssetType.GENERATOR.value
is_load = pl.col("asset_type") == AssetType.LOAD.value
is_active = pl.col("is_active")
is_freezer = pl.col("is_freezer")
is_for_sale = pl.col("is_for_sale")


class AssetRepo(PolarRepo[AssetRepoSchema, AssetInfo, AssetId]):
    @classmethod
    def get_schema(cls) -> tuple[type[AssetRepoSchema], type[AssetInfo], type[AssetId]]:
        return AssetRepoSchema, AssetInfo, AssetId

    # READ
    @property
    def asset_ids(self) -> list[AssetId]:
        return [AssetId(x) for x in self.df["id"].to_list()]

    @property
    def only_active(self) -> "AssetRepo":
        return self._filter(is_active)

    @property
    def only_inactive(self) -> "AssetRepo":
        return self._filter(~is_active)

    @property
    def only_freezers(self) -> "AssetRepo":
        return self._filter(is_freezer)

    @property
    def not_freezers(self) -> "AssetRepo":
        return self._filter(~is_freezer)

    @property
    def only_loads(self) -> "AssetRepo":
        return self._filter(is_load)

    @property
    def only_generators(self) -> "AssetRepo":
        return self._filter(is_generator)

    @property
    def only_for_sale(self) -> "AssetRepo":
        return self._filter(is_for_sale)

    @property
    def not_for_sale(self) -> "AssetRepo":
        return self._filter(~is_for_sale)

    def get_wearable_asset_ids(self) -> list[AssetId]:
        return [AssetId(a) for a in self.df.filter(pl.col("health") > 0, ~pl.col("is_freezer"))["id"].to_list()]

    def get_all_assets_at_bus(self, bus_id: BusId, only_active: bool = False) -> "AssetRepo":
        filters = [pl.col("bus") == bus_id]
        if only_active:
            filters.append(is_active)
        return self._filter(filters)

    def get_all_for_player(self, player_id: PlayerId, only_active: bool = False) -> "AssetRepo":
        filters = [pl.col("owner_player") == int(player_id)]
        if only_active:
            filters.append(is_active)
        return self._filter(filters)

    def get_freezer_for_player(self, player_id: PlayerId) -> "AssetRepo":
        filters = [pl.col("owner_player") == int(player_id), is_freezer]
        return self._filter(filters)

    def get_remaining_ice_creams_multi(self, player_ids: list[PlayerId]) -> list[int]:
        int_ids = [int(id) for id in player_ids]
        df = self.df.filter(pl.col("id").is_in(player_ids)).select(["id", "health"])
        return reorder(x=df, ids=int_ids)["health"].to_list()

    def get_remaining_ice_creams(self, player_id: PlayerId) -> int:
        return self.get_freezer_for_player(player_id).df["health"].item()

    def get_total_generation_capacity(self) -> float:
        return self.df.filter(is_generator, is_active)["power_expected"].sum()

    def get_total_consumption_capacity(self) -> float:
        return self.df.filter(is_load, is_active)["power_expected"].sum()

    def asset_is_freezer(self, asset_id: AssetId) -> bool:
        return self.df.filter(pl.col("id") == int(asset_id)).limit(1)["is_freezer"].item()

    # UPDATE
    def change_owner(self, asset_id: AssetId, new_owner: PlayerId) -> "AssetRepo":
        return self.update_key_values(id=asset_id, key_values={"owner_player": int(new_owner), "is_for_sale": False})

    def update_bids(self, bids: MappingProxyType[AssetId, float]) -> "AssetRepo":
        return self.update_with_mapping(key="bid_price", mapping=bids)

    def migrate_asset(self, asset_id: AssetId, new_bus_id: BusId, round: Round) -> "AssetRepo":
        return self.update_key_values(id=asset_id, key_values={"bus": int(new_bus_id), "birthday": int(round)})

    def _decrease_health(self, asset_ids: list[AssetId]) -> "AssetRepo":
        repo = self.update_key_expressions(id=asset_ids, key_exprs={"health": (pl.col("health") - 1).clip(lower_bound=0)})
        repo = repo.update_key_expressions(id=asset_ids, key_exprs={"is_active": pl.col("is_active") & (pl.col("health") > 0)})
        return repo

    def melt_ice_cream(self, asset_id: AssetId) -> "AssetRepo":
        assert len(self.df.filter(pl.col("id") == int(asset_id), pl.col("is_freezer"))) == 1, f"Could not find freezer with id {asset_id}"
        return self._decrease_health([asset_id])

    def wear_assets(self, asset_ids: list[AssetId]) -> "AssetRepo":
        assert len(self.df.filter(pl.col("id").is_in(asset_ids), ~pl.col("is_freezer"))) == len(asset_ids), f"Could not find non-freezers with ids {asset_ids}"
        return self._decrease_health(asset_ids)

    def batch_deactivate(self, asset_ids: list[AssetId]) -> "AssetRepo":
        return self.update_key_values(id=asset_ids, key_values={"is_active": False})

    def update_activations(self, activations: MappingProxyType[AssetId, bool]) -> "AssetRepo":
        return self.update_with_mapping(key="is_active", mapping=activations)

    def eliminate_players(self, players: list[PlayerId]) -> "AssetRepo":
        int_ids = [int(p) for p in players]
        npc_id = int(PlayerId.get_npc())
        df = self.df.with_columns(pl.when(pl.col("owner_player").is_in(int_ids)).then(pl.lit(npc_id)).otherwise(pl.col("owner_player")))
        return self._make_quick(x=df)

    # DELETE
    def delete_for_player(self, player_id: PlayerId) -> "AssetRepo":
        return self._drop_items(pl.col("owner_player") == int(player_id))
