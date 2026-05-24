from dataclasses import dataclass
from types import MappingProxyType
from typing import Self

import dataframely as dy
import polars as pl

from src.models.data.light_dc import LightDc
from src.models.data.polar_repo import PolarRepo
from src.models.ids import BusId, PlayerId, TransmissionId

__all__ = ["TransmissionInfo", "TransmissionRepo"]


@dataclass(frozen=True)
class TransmissionInfo(LightDc):
    id: TransmissionId
    owner_player: PlayerId
    bus1: BusId
    bus2: BusId
    reactance: float
    capacity: float = 100.0
    health: int = 5
    fixed_operating_cost: float = 0.0
    is_for_sale: bool = False
    minimum_acquisition_price: float = 0.0  # 0 = Not for sale
    is_active: bool = True
    birthday: int = 1  # Round when the asset was created
    line_or_link: str = "Line"

    @property
    def is_open(self) -> bool:
        return not self.is_active

    @property
    def is_closed(self) -> bool:
        return self.is_active

    @property
    def is_link(self) -> bool:
        return self.line_or_link == "Link"

    @property
    def is_line(self) -> bool:
        return not self.is_link

    def __post_init__(self) -> None:
        assert self.bus2 > self.bus1, f"bus2 must be greater than bus1. Got {self.bus2} and {self.bus1}"
        assert self.reactance > 0, f"Reactance must be positive. Got {self.reactance}"
        assert self.line_or_link in ["Line", "Link"], f"line_or_link must be either 'Line' or 'Link'. Got {self.line_or_link}"


class TransmissionRepoSchema(dy.Schema):
    id = TransmissionId._get_dy_column(primary_key=True)
    owner_player = PlayerId._get_dy_column()
    bus1 = BusId._get_dy_column()
    bus2 = BusId._get_dy_column()
    reactance = dy.Float64(min=0.0)
    capacity = dy.Float64(min=0.0)
    health = dy.UInt8()
    fixed_operating_cost = dy.Float64(min=0.0)
    is_for_sale = dy.Bool()
    minimum_acquisition_price = dy.Float64()
    is_active = dy.Bool()
    birthday = dy.UInt16()
    line_or_link = dy.String(min_length=4, max_length=4)

    @dy.rule()
    def valid_lol(self) -> pl.Expr:
        return pl.col("line_or_link").is_in(["Line", "Link"])


is_closed = pl.col("is_active")
is_active = is_closed
is_for_sale = pl.col("is_for_sale")


class TransmissionRepo(PolarRepo[TransmissionRepoSchema, TransmissionInfo, TransmissionId]):
    @classmethod
    def get_schema(cls) -> tuple[type[TransmissionRepoSchema], type[TransmissionInfo], type[TransmissionId]]:
        return TransmissionRepoSchema, TransmissionInfo, TransmissionId

    # GET
    @property
    def transmission_ids(self) -> list[TransmissionId]:
        return [TransmissionId(x) for x in self.df["id"].to_list()]

    @property
    def only_closed(self) -> Self:
        return self._filter(is_closed)

    @property
    def only_open(self) -> Self:
        return self._filter(~is_closed)

    @property
    def only_for_sale(self) -> Self:
        return self._filter(is_for_sale)

    @property
    def not_for_sale(self) -> Self:
        return self._filter(~is_for_sale)

    def get_all_for_player(self, player_id: PlayerId, only_active: bool = False) -> Self:
        filters = [pl.col("owner_player") == int(player_id)]
        if only_active:
            filters.append(is_active)
        return self._filter(filters)

    def get_all_at_bus(self, bus_id: BusId, only_active: bool = False) -> Self:
        filters = [(pl.col("bus1") == int(bus_id)) | (pl.col("bus2") == int(bus_id))]
        if only_active:
            filters.append(is_active)
        return self._filter(filters)

    def get_all_between_buses(self, bus1: BusId, bus2: BusId, only_active: bool = False) -> Self:
        assert bus1 != bus2, f"bus1 and bus2 must be different. Got {bus1} and {bus2}"
        min_bus = min(bus1, bus2)
        max_bus = max(bus1, bus2)

        filters = [pl.col("bus1") == int(min_bus), pl.col("bus2") == int(max_bus)]
        if only_active:
            filters.append(is_active)
        return self._filter(filters)

    def get_all_bus_pairs(self) -> list[tuple[BusId, BusId]]:
        from_buses = self.df["bus1"].to_list()
        to_buses = self.df["bus2"].to_list()
        return [(BusId(f), BusId(t)) for f, t in zip(from_buses, to_buses)]

    # UPDATE
    def open_line(self, transmission_id: TransmissionId) -> Self:
        return self.update_key_value(id=transmission_id, key="is_active", value=False)

    def close_line(self, transmission_id: TransmissionId) -> Self:
        return self.update_key_value(id=transmission_id, key="is_active", value=True)

    def update_activations(self, activations: MappingProxyType[TransmissionId, bool]) -> Self:
        actives = [k for k, v in activations.items() if v]
        inactives = [k for k, v in activations.items() if not v]
        return self.update_key_values(id=actives, key_values={"is_active": True}).update_key_values(id=inactives, key_values={"is_active": False})

    def change_owner(self, transmission_id: TransmissionId, new_owner: PlayerId) -> Self:
        return self.update_key_values(id=transmission_id, key_values={"owner_player": int(new_owner), "is_for_sale": False})

    def wear_transmission(self, transmission_id: TransmissionId) -> Self:
        health: float = self.df.filter(pl.col("id") == int(transmission_id))["health"].item()
        if health > 1:
            return self.update_key_value(id=transmission_id, key="health", value=health - 1)
        else:
            return self.update_key_values(id=transmission_id, key_values={"health": 0, "is_active": False})

    # DELETE
    def delete_for_player(self, player_id: PlayerId) -> Self:
        return self._drop_items(pl.col("owner_player") == int(player_id))
