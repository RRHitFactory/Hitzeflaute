from dataclasses import dataclass
from functools import cached_property

import numpy as np
import plotly.graph_objects as go
from plotly.graph_objs import Scatter

from src.app.simple_front_end.plotting.base_plot_object import PlotObject
from src.app.simple_front_end.layout_planner import SocketAddress
from src.app.simple_front_end.plotting.po_bus import PlotBus
from src.models.assets import AssetInfo, AssetType
from src.models.colors import get_contrasting_color, Color
from src.models.geometry import Point
from src.models.player import Player
from src.tools.money import format_money, format_price


@dataclass(frozen=True)
class PlotAsset(PlotObject):
    asset: AssetInfo
    owner: Player
    bus: PlotBus
    socket_address: SocketAddress
    radius: float = 0.5

    @property
    def title(self) -> str:
        if self.asset.asset_type is AssetType.GENERATOR:
            a_type = "Gen"
        elif self.asset.asset_type is AssetType.LOAD:
            a_type = "Load"
        else:
            raise ValueError(f"Unknown asset type: {self.asset.asset_type}")
        title = f"{a_type}{self.asset.id}"
        if self.asset.is_freezer:
            title += " (Freezer)"
        return title

    @property
    def color(self) -> Color:
        return self.owner.color

    @property
    def data_dict(self) -> dict[str, str]:
        data_dict = {
            "Owner": self.owner.name,
            "Expected Power": f"{self.asset.power_expected:.0f} MW",
            "Marginal Cost": format_price(self.asset.marginal_cost),
        }
        if self.asset.is_for_sale:
            data_dict["Price"] = format_money(self.asset.minimum_acquisition_price)
        if self.asset.is_freezer:
            data_dict["Ice Creams"] = str(self.asset.health)
        else:
            data_dict["Health"] = str(self.asset.health)
        return data_dict

    @cached_property
    def centre(self) -> Point:
        socket = self.bus.get_socket_from_address(address=self.socket_address)

        bus_to_socket_vector = socket - self.bus.centre
        if self.bus.is_horizontal:
            unit_offset_vector = Point(x=0, y=np.sign(bus_to_socket_vector.y))
        else:
            unit_offset_vector = Point(x=np.sign(bus_to_socket_vector.x), y=0)
        return socket + unit_offset_vector * self.radius

    def render_shape(self) -> Scatter:
        theta = np.linspace(0, 2 * np.pi, 100)
        x = self.centre.x + self.radius * np.cos(theta)
        y = self.centre.y + self.radius * np.sin(theta)
        x = np.append(x, self.centre.x)
        y = np.append(y, self.centre.y)

        if self.asset.asset_type is AssetType.GENERATOR:
            text = "G"
        elif self.asset.asset_type is AssetType.LOAD:
            text = "F" if self.asset.is_freezer else "L"
        else:
            raise ValueError(f"Unknown asset type: {self.asset.asset_type}")

        if self.asset.is_active:
            color = self.color
        else:
            color = self.deactivate_color(self.color)
        contrast_color = get_contrasting_color(color)

        main = go.Scatter(
            x=x,
            y=y,
            mode="lines+text",
            text=[""] * (len(x) - 1) + [text],
            fill="toself",
            fillcolor=color.rgb_hex_str,
            line={"width": 0.0},
            hoverinfo="skip",
            textfont={"size": 10, "color": contrast_color.rgb_hex_str},
        )
        return main
