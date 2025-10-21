from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.random import Generator

from src.models.buses import Bus
from src.models.game_state import GameState
from src.models.ids import AssetId, BusId, TransmissionId
from src.tools.random_choice import random_choice

type SocketSide = Literal["tr", "bl"]  # Top Right or Bottom Left
type BusOrientation = Literal["horizontal", "vertical"]  # Orientation of the bus


@dataclass(frozen=True)
class Socket:
    """
    A socket is a connection point on a bus that can be used for assets and transmission lines.
    Each bus has two sides and each side has a limited number of sockets.
    The sides are referred to as "tr" (top right) and "bl" (bottom left).
    """

    bus: BusId
    side: SocketSide
    number: int

    def __str__(self) -> str:
        return f"<Socket ({self.bus}:{self.side}:{self.number})>"

    def __repr__(self) -> str:
        return str(self)

    def __eq__(self, other: "Socket") -> bool:
        if not isinstance(other, Socket):
            return NotImplemented
        return str(self) == str(other)


class SocketProvider:
    def __init__(self, bus: Bus, random_generator: Generator | None = None) -> None:
        """
        :param bus: The bus containing the sockets
        :param random_generator: Optionally provide a random generator for reproducibility.
        """
        if random_generator is None:
            random_generator = np.random.default_rng(bus.id.as_int())
        self._random_generator = random_generator

        n = bus.sockets_per_side

        self._sockets: dict[SocketSide, list[Socket]] = {
            "tr": [Socket(bus=bus.id, side="tr", number=i) for i in range(n)],
            "bl": [Socket(bus=bus.id, side="bl", number=i) for i in range(n)],
        }

    def __str__(self) -> str:
        return "<SocketProvider>"

    def __repr__(self) -> str:
        return "<SocketProvider>"

    def get_n_sockets_free(self, side: SocketSide | None = None) -> int:
        if side is None:
            return len(self._sockets["tr"]) + len(self._sockets["bl"])
        return len(self._sockets[side])

    def get_socket(self, preferred_side: SocketSide | None = None) -> Socket:
        if self.get_n_sockets_free() == 0:
            raise IndexError("No remaining sockets available.")

        if preferred_side is not None:
            side = preferred_side
        else:
            if self.get_n_sockets_free("bl") == self.get_n_sockets_free("tr"):
                side: SocketSide = random_choice(  # type: ignore
                    x=["tr", "bl"], generator=self._random_generator
                )
            elif self.get_n_sockets_free("bl") < self.get_n_sockets_free("tr"):
                side = "tr"
            else:
                side = "bl"

        if self.get_n_sockets_free(side) == 0:
            side = self.get_other_side(side)

        return self._sockets[side].pop(0)

    @staticmethod
    def get_other_side(side: SocketSide) -> SocketSide:
        if side == "tr":
            return "bl"
        elif side == "bl":
            return "tr"
        else:
            raise ValueError(f"Invalid socket side: {side}. Must be 'tr' or 'bl'.")


class LayoutPlanner:
    @classmethod
    def get_sockets_for_assets_and_transmission(cls, game_state: GameState) -> tuple[dict[AssetId, Socket], dict[TransmissionId, tuple[Socket, Socket]]]:
        """
        :param game_state:
        :return:
        * A mapping of asset ids to sockets
        * A mapping of transmission ids to socket pairs (one for each side of the line)
        """
        random_generator = np.random.default_rng(game_state.game_id.as_int())

        asset_repo = game_state.assets
        transmission_repo = game_state.transmission
        bus_repo = game_state.buses

        sort_dict: list[dict[str, AssetId | TransmissionId | int | bool]] = []

        for asset in asset_repo:
            sort_dict.append(
                {
                    "id": asset.id,
                    "is_line": False,
                    "birthday": asset.birthday,
                }
            )
        for transmission in transmission_repo:
            sort_dict.append(
                {
                    "id": transmission.id,
                    "is_line": True,
                    "birthday": transmission.birthday,
                }
            )

        def sort_key(x: dict[str, AssetId | TransmissionId | int | bool]) -> float:
            return -1 * x["birthday"] - 0.5 * x["is_line"]

        sorted_ids: list[TransmissionId | AssetId] = [x["id"] for x in sorted(sort_dict, key=sort_key)]  # type: ignore

        socket_providers = {bus.id: SocketProvider(bus=bus, random_generator=random_generator) for bus in bus_repo}

        asset_sockets: dict[AssetId, Socket] = {}
        transmission_sockets: dict[TransmissionId, tuple[Socket, Socket]] = {}

        for x_id in sorted_ids:
            if isinstance(x_id, TransmissionId):
                line = transmission_repo[x_id]
                bus1 = bus_repo[line.bus1]
                bus2 = bus_repo[line.bus2]
                side1, side2 = cls.get_preferred_bus_sides_for_line(bus1=bus1, bus2=bus2)
                socket1 = socket_providers[bus1.id].get_socket(preferred_side=side1)
                socket2 = socket_providers[bus2.id].get_socket(preferred_side=side2)
                transmission_sockets[x_id] = (socket1, socket2)
            elif isinstance(x_id, AssetId):
                asset = asset_repo[x_id]
                bus = bus_repo[asset.bus]
                socket = socket_providers[bus.id].get_socket()
                asset_sockets[x_id] = socket
            else:
                raise TypeError(f"Expected AssetId or TransmissionId, got {type(x_id)}")

        return asset_sockets, transmission_sockets

    @classmethod
    def get_preferred_bus_sides_for_line(cls, bus1: Bus, bus2: Bus) -> tuple[SocketSide, SocketSide]:
        vector = bus2.point - bus1.point

        if cls.get_orientation_of_bus(bus=bus1) == "horizontal":
            preferred_side1 = "tr" if vector.y > 0 else "bl"
        else:
            preferred_side1 = "tr" if vector.x > 0 else "bl"

        if cls.get_orientation_of_bus(bus=bus2) == "horizontal":
            preferred_side2 = "bl" if vector.y > 0 else "tr"
        else:
            preferred_side2 = "bl" if vector.x > 0 else "tr"

        return preferred_side1, preferred_side2  # type: ignore[return]

    @classmethod
    def get_orientation_of_bus(cls, bus: Bus) -> BusOrientation:
        if abs(bus.point.y) > abs(bus.point.x):
            return "horizontal"
        else:
            return "vertical"
