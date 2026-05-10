from dataclasses import dataclass

import dataframely as dy

from src.models.data.light_dc import LightDc
from src.models.data.polar_repo import PolarRepo, PrSchema
from src.models.ids import BusId
from src.tools.random_choice import random_choice, random_choice_multi


@dataclass(frozen=True)
class Bus(LightDc):
    id: BusId
    x: float
    y: float


class BusRepoSchema(PrSchema):
    x = dy.Float64()
    y = dy.Float64()


class BusPolarRepo(PolarRepo[BusRepoSchema, Bus, BusId]):
    @classmethod
    def get_schema(cls) -> tuple[type[BusRepoSchema], type[Bus], type[BusId]]:
        return BusRepoSchema, Bus, BusId

    # READ
    @property
    def bus_ids(self) -> list[BusId]:
        return [BusId(x) for x in self.df["id"].to_list()]


class BusFullException(Exception):
    # You have to sit on the bus driver's lap
    pass


class BusSocketManager:
    def __init__(self, starting_sockets: dict[BusId, int]) -> None:
        self._sockets: dict[BusId, int] = starting_sockets
        assert all(isinstance(k, BusId) for k in self._sockets.keys()), "All keys must be BusId"
        assert all(isinstance(v, int) and v >= 0 for v in self._sockets.values()), "All values must be non-negative integers"

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
            raise BusFullException(f"Requested {n} buses, but only {len(self.free_buses)} buses with free sockets available.")
        buses = random_choice_multi(x=self.free_buses, size=n, replace=False)
        if use:
            for b in buses:
                self.use_socket(b)
        return buses

    def get_bus_with_free_socket(self, use: bool = False, excluding: BusId | None = None) -> BusId:
        if excluding is not None:
            usable_buses = [b for b in self.free_buses if b != excluding]
            if not len(usable_buses):
                raise BusFullException(f"No buses with free sockets available, excluding {excluding}")
            bus = random_choice(usable_buses)
            if use:
                self.use_socket(bus)
            return bus
        return self.get_buses_with_free_sockets(n=1, use=use)[0]
