from dataclasses import dataclass
from functools import cached_property

import plotly.graph_objects as go
from plotly.graph_objs import Scatter

from src.app.simple_front_end.plotting.base_plot_object import PlotObject
from src.app.simple_front_end.layout_planner import SocketAddress
from src.app.simple_front_end.plotting.po_bus import PlotBus
from src.models.colors import Color
from src.models.geometry import Point, Shape
from src.models.player import Player
from src.models.transmission import TransmissionInfo


@dataclass(frozen=True)
class PlotTxLine(PlotObject):
    line: TransmissionInfo
    owner: Player
    buses: tuple[PlotBus, PlotBus]
    socket_addresses: tuple[SocketAddress, SocketAddress]

    @property
    def title(self) -> str:
        return f"Line{self.line.id}"

    @property
    def color(self) -> Color:
        if self.line.is_open:
            return self.deactivate_color(self.owner.color)
        return self.owner.color

    @property
    def data_dict(self) -> dict[str, str]:
        data_dict = {"Owner": self.owner.name, "Health": self.line.health}
        if self.line.is_open:
            data_dict["Status"] = "OPEN"
        return data_dict

    @cached_property
    def centre(self) -> Point:
        bus1, bus2 = self.buses
        return (bus1.centre + bus2.centre) / 2

    @cached_property
    def vertices(self) -> list[Point]:
        bus1, bus2 = self.buses
        sa1, sa2 = self.socket_addresses

        vector = bus2.centre - bus1.centre

        start = bus1.get_socket_from_address(address=sa1)
        end = bus2.get_socket_from_address(address=sa2)

        if bus1.is_horizontal:
            p1 = start + Point(x=0, y=vector.y * 0.1)
        else:
            p1 = start + Point(x=vector.x * 0.1, y=0)
        if bus2.is_horizontal:
            p2 = end - Point(x=0, y=vector.y * 0.1)
        else:
            p2 = end - Point(x=vector.x * 0.1, y=0)

        mid_points = Shape.make_line(start=p1, end=p2, n_points=5)
        points = [start, *mid_points.points, end]
        return points

    @property
    def hover_text_locations(self) -> list[Point]:
        return self.vertices

    def render_shape(self) -> Scatter:
        points = self.vertices

        scatter = go.Scatter(
            x=[p.x for p in points],
            y=[p.y for p in points],
            line=dict(color=self.color.rgb_hex_str, width=3),
            opacity=0.8,
            mode="lines",
            hoverinfo="skip",
        )
        return scatter
