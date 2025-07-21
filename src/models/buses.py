from dataclasses import dataclass
from typing import Literal, Optional

from src.models.data.ldc_repo import LdcRepo
from src.models.data.light_dc import LightDc
from src.models.geometry import Point
from src.models.ids import PlayerId, BusId
from src.tools.random_choice import random_choice_multi, random_choice


@dataclass(frozen=True)
class Bus(LightDc):
    id: BusId
    x: float
    y: float
    player_id: PlayerId = PlayerId.get_npc()
    max_lines: int = 5
    max_assets: int = 5

    def __post_init__(self) -> None:
        assert self.max_assets >= 0, f"max_assets must be non-negative. Got {self.max_assets}"
        assert self.max_lines >= 0, f"max_lines must be non-negative. Got {self.max_lines}"

    @property
    def total_sockets(self) -> int:
        return self.max_assets + self.max_lines

    @property
    def point(self) -> Point:
        return Point(x=self.x, y=self.y)


class BusRepo(LdcRepo[Bus]):
    @classmethod
    def _get_dc_type(cls) -> type[Bus]:
        return Bus

    # GET
    @property
    def bus_ids(self) -> list[BusId]:
        return [BusId(x) for x in self.df.index.tolist()]

    @property
    def npc_bus_ids(self) -> list[BusId]:
        return self._filter({"player_id": PlayerId.get_npc()}).bus_ids

    @property
    def player_bus_ids(self) -> list[BusId]:
        return self._filter(operator="not", condition={"player_id": PlayerId.get_npc()}).bus_ids

    @property
    def freezer_buses(self) -> list[Bus]:
        return [self[b] for b in self.player_bus_ids]

    def get_bus_for_player(self, player_id: PlayerId) -> Bus:
        player_buses = self._filter({"player_id": player_id})
        assert len(player_buses) == 1
        return player_buses.as_objs()[0]


class BusFullException(Exception):
    # You have to sit on the bus driver's lap
    pass


class BusSocketManager:
    def __init__(self, starting_sockets: dict[BusId, int]) -> None:
        self._sockets: dict[BusId, int] = starting_sockets
        assert all(isinstance(k, BusId) for k in self._sockets.keys()), "All keys must be BusId"
        assert all(
            isinstance(v, int) and v >= 0 for v in self._sockets.values()
        ), "All values must be non-negative integers"

    def __str__(self) -> str:
        return f"<{self.__class__.__name__}>"

    def __repr__(self) -> str:
        return self.__str__()

    @property
    def free_buses(self) -> list[BusId]:
        return [bus_id for bus_id, count in self._sockets.items() if count > 0]

    def use_socket(self, bus_id: BusId) -> None:
        assert bus_id in self._sockets, f"Bus {bus_id} not found in socket manager"
        if self._sockets[bus_id] <= 0:
            raise BusFullException(f"No sockets available for bus {bus_id}")

        self._sockets[bus_id] -= 1
        return None

    def get_buses_with_free_sockets(self, n: int, use: bool = False) -> list[BusId]:
        assert n > 0, "Number of buses requested must be positive"
        if n > len(self.free_buses):
            raise BusFullException(
                f"Requested {n} buses, but only {len(self.free_buses)} buses with free sockets available."
            )
        buses = random_choice_multi(x=self.free_buses, size=n, replace=False)
        if use:
            [self.use_socket(b) for b in buses]
        return buses

    def get_bus_with_free_socket(self, use: bool = False, excluding: Optional[BusId] = None) -> BusId:
        if excluding is not None:
            usable_buses = [b for b in self.free_buses if b != excluding]
            if not len(usable_buses):
                raise BusFullException(f"No buses with free sockets available, excluding {excluding}")
            bus = random_choice(usable_buses)
            if use:
                self.use_socket(bus)
            return bus
        return self.get_buses_with_free_sockets(n=1, use=use)[0]
