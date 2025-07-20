from dataclasses import dataclass
from functools import cached_property
from typing import Self

from src.models.data.ldc_repo import LdcRepo
from src.models.data.light_dc import LightDc
from src.models.ids import TransmissionId, BusId, PlayerId
from src.tools.serialization import simplify_type


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

    @property
    def is_open(self) -> bool:
        return not self.is_active

    @property
    def is_closed(self) -> bool:
        return self.is_active

    def __post_init__(self) -> None:
        assert self.bus2 > self.bus1, f"bus2 must be greater than bus1. Got {self.bus2} and {self.bus1}"
        assert self.reactance > 0, f"Reactance must be positive. Got {self.reactance}"


class TransmissionRepo(LdcRepo[TransmissionInfo]):
    @classmethod
    def _get_dc_type(cls) -> type[TransmissionInfo]:
        return TransmissionInfo

    # GET
    @property
    def transmission_ids(self) -> list[TransmissionId]:
        return [TransmissionId(x) for x in self.df.index.tolist()]

    @cached_property
    def only_closed(self) -> Self:
        return self.filter({"is_active": True})

    @cached_property
    def only_open(self) -> Self:
        return self.filter({"is_active": False})

    def get_all_for_player(self, player_id: PlayerId, only_active: bool = False) -> Self:
        oa_filter = {"is_active": True} if only_active else {}
        return self.filter({"owner_player": player_id, **oa_filter})

    def get_all_at_bus(self, bus_id: BusId, only_active: bool = False) -> Self:
        repo = self.only_closed if only_active else self
        return repo.filter({"bus1": bus_id}, "or", {"bus2": bus_id})

    def get_all_between_buses(self, bus1: BusId, bus2: BusId, only_active: bool = False) -> Self:
        oa_filter = {"is_active": True} if only_active else {}

        assert bus1 != bus2, f"bus1 and bus2 must be different. Got {bus1} and {bus2}"
        min_bus = min(bus1, bus2)
        max_bus = max(bus1, bus2)

        return self.filter({"bus1": min_bus, "bus2": max_bus, **oa_filter})

    # UPDATE
    def open_line(self, transmission_id: TransmissionId) -> Self:
        df = self.df
        df.loc[transmission_id, "is_active"] = False
        return self.update_frame(df)

    def close_line(self, transmission_id: TransmissionId) -> Self:
        df = self.df
        df.loc[transmission_id, "is_active"] = True
        return self.update_frame(df)

    def change_owner(self, transmission_id: TransmissionId, new_owner: PlayerId) -> Self:
        df = self.df.copy()
        df.loc[transmission_id, "owner_player"] = simplify_type(new_owner)
        df.loc[transmission_id, "is_for_sale"] = False
        return self.update_frame(df)

    # DELETE
    def delete_for_player(self, player_id: PlayerId) -> Self:
        return self.drop_items({"owner_player": player_id})
