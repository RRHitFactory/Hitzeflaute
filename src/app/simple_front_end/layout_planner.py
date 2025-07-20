from dataclasses import dataclass
from typing import Literal, Optional

import numpy as np
from numpy.random import Generator

from src.models.buses import Bus
from src.models.game_state import GameState
from src.models.ids import AssetId, TransmissionId, BusId
from src.tools.random_choice import random_choice

SocketSide = Literal["tr", "bl"]  # Top Right or Bottom Left
BusOrientation = Literal["horizontal", "vertical"]  # Orientation of the bus


@dataclass(frozen=True)
class Socket:
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
    def __init__(self, bus: Bus, random_generator: Generator) -> None:
        n = bus.sockets_per_side
        self._random_generator = random_generator
        self._tr_sockets = [Socket(bus=bus.id, side="tr", number=i) for i in range(n)]
        self._bl_sockets = [Socket(bus=bus.id, side="bl", number=i) for i in range(n)]
        self._tr_assigned = 0
        self._bl_assigned = 0

    def __str__(self) -> str:
        return "<SocketProvider>"

    def __repr__(self) -> str:
        return "<SocketProvider>"

    def get_socket(self, preferred_side: Optional[SocketSide] = None) -> Socket:
        if not self._has_remaining_sockets():
            raise IndexError("No remaining sockets available.")

        if preferred_side is None:
            if self._tr_assigned == self._bl_assigned:
                preferred_side: SocketSide = random_choice(  # type: ignore
                    x=["tr", "bl"], generator=self._random_generator
                )
            elif self._tr_assigned < self._bl_assigned:
                preferred_side = "tr"
            else:
                preferred_side = "bl"

        if self._has_remaining_sockets(preferred_side):
            if preferred_side == "tr":
                socket = self._tr_sockets[self._tr_assigned]
                self._tr_assigned += 1
            else:
                socket = self._bl_sockets[self._bl_assigned]
                self._bl_assigned += 1
            return socket

        return self.get_socket()

    def _has_remaining_sockets(self, side: Optional[SocketSide] = None) -> bool:
        if side == "tr":
            return len(self._tr_sockets) > self._tr_assigned
        elif side == "bl":
            return len(self._bl_sockets) > self._bl_assigned
        elif side is None:
            return self._has_remaining_sockets("tr") or self._has_remaining_sockets("bl")
        else:
            raise ValueError(f"Invalid side: {side}. Must be 'tr', 'bl', or None.")


class LayoutPlanner:
    @classmethod
    def get_sockets_for_assets_and_transmission(
        cls, game_state: GameState
    ) -> tuple[dict[AssetId, Socket], dict[TransmissionId, tuple[Socket, Socket]]]:
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

        sorted_ids: list[TransmissionId | AssetId] = [x["id"] for x in sorted(sort_dict, key=sort_key)]

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
