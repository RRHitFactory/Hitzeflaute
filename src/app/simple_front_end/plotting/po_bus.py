from dataclasses import dataclass
from functools import cached_property
from typing import Optional

import numpy as np
from plotly.graph_objs import Scatter

from src.app.simple_front_end.plotting.base_plot_object import PlotObject
from src.app.simple_front_end.layout_planner import SocketAddress, LayoutPlanner
from src.app.simple_front_end.plotting.po_rect import render_shape
from src.models.buses import Bus
from src.models.colors import Color
from src.models.geometry import Point, Shape
from src.models.player import Player


@dataclass(frozen=True)
class PlotBus(PlotObject):
    bus: Bus
    owner: Player
    width: float = 1.0
    length: float = 5.0

    @property
    def centre_text(self) -> Optional[str]:
        return None

    @property
    def title(self) -> str:
        return f"Bus{self.bus.id}"

    @property
    def color(self) -> Color:
        return self.owner.color

    @property
    def hover_text_locations(self) -> list[Point]:
        points = [self.centre]
        if self.is_horizontal:
            points += [Point(x=self.shape.min_x, y=self.centre.y), Point(x=self.shape.max_x, y=self.centre.y)]
            return points
        else:
            points += [Point(x=self.centre.x, y=self.shape.max_y), Point(x=self.centre.x, y=self.shape.min_y)]
            return points

    @property
    def data_dict(self) -> dict[str, str]:
        return {"Owner": self.owner.name}

    def get_socket_from_address(self, address: SocketAddress) -> Point:
        assert address.bus == self.bus.id, f"Socket address {address} does not match bus {self.bus.id}"

        tr_sockets, bl_sockets = self._socket_locations
        if address.side == "tr":
            return tr_sockets[address.number]
        elif address.side == "bl":
            return bl_sockets[address.number]
        else:
            raise ValueError(f"Invalid socket address: {address}")

    @cached_property
    def _socket_locations(self) -> tuple[list[Point], list[Point]]:
        half_sockets = self.bus.sockets_per_side
        relative_offsets = np.linspace(start=-0.4, stop=0.4, num=half_sockets)

        tr_offsets = [Point(x=float(offset) * self.length, y=self.width / 2) for offset in relative_offsets]
        bl_offsets = [Point(x=float(offset) * self.length, y=-1 * self.width / 2) for offset in relative_offsets]
        if self.is_horizontal:
            tr_sockets = [self.centre + o for o in tr_offsets]
            bl_sockets = [self.centre + o for o in bl_offsets]
        else:
            tr_sockets = [self.centre + o.transpose() for o in tr_offsets]
            bl_sockets = [self.centre + o.transpose() for o in bl_offsets]

        return tr_sockets, bl_sockets

    @property
    def centre(self) -> Point:
        return self.bus.point

    @cached_property
    def is_horizontal(self) -> bool:
        return LayoutPlanner.get_orientation_of_bus(bus=self.bus) == "horizontal"

    @cached_property
    def shape(self) -> Shape:
        right = Point(x=self.length / 2, y=0) if self.is_horizontal else Point(x=self.width / 2, y=0)
        up = Point(x=0, y=self.width / 2) if self.is_horizontal else Point(x=0, y=self.length / 2)
        left = right * -1
        down = up * -1

        dl = self.centre + down + left
        ur = self.centre + up + right
        return Shape.make_rectangle(bottom_left=dl, top_right=ur, closed=True)

    def render_shape(self) -> Scatter:
        return render_shape(shape=self.shape, fill_color=self.color, centre_text=self.centre_text, outline_width=0.0)
