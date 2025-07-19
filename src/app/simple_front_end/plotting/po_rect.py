from dataclasses import dataclass, field
from typing import Optional

import plotly.graph_objects as go
from plotly.graph_objs import Scatter

from src.app.simple_front_end.plotting.base_plot_object import PlotObject
from src.models.colors import get_contrasting_color, Color
from src.models.geometry import Point, Shape, ShapeType


def render_shape(
    shape: Shape,
    fill_color: Optional[Color] = None,
    centre_text: Optional[str] = None,
    outline_width: float = 0.0,
    outline_color: Color = Color("black"),
) -> Scatter:
    if not shape.is_closed:
        shape = shape.close()

    points = [p for p in shape]

    text = None
    if centre_text is not None:
        points.append(shape.centre)
        text = [""] * (len(points) - 1) + [centre_text]

    if fill_color is not None:
        fill = "toself"
        fill_color_str = fill_color.rgb_hex_str
        contrast_color_str = get_contrasting_color(fill_color).rgb_hex_str
    else:
        fill = "none"
        fill_color_str = "#000000"
        contrast_color_str = "#000000"

    line = {
        "color": outline_color.rgb_hex_str,
        "width": outline_width,
    }

    scatter = go.Scatter(
        x=[p.x for p in points],
        y=[p.y for p in points],
        mode="lines+text",
        text=text,
        fill=fill,
        fillcolor=fill_color_str,
        line=line,
        textfont={"size": 10, "color": contrast_color_str},
        hoverinfo="skip",
    )
    return scatter


@dataclass(frozen=True)
class ShapePlotObject(PlotObject):
    title_text: str
    shape: Shape
    fill_color: Optional[Color] = None
    centre_text: Optional[str] = None
    outline_width: float = 0.0
    outline_color: Color = field(default_factory=Color)
    hover_data: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not isinstance(self.shape, Shape):
            raise TypeError(f"Expected 'shape' to be of type 'Shape', got {type(self.shape)}")

    @property
    def color(self) -> Color:
        return self.fill_color

    @property
    def title(self) -> str:
        return self.title_text

    @property
    def data_dict(self) -> dict[str, str]:
        return self.hover_data

    @property
    def centre(self) -> Point:
        return self.shape.centre

    @property
    def allow_hover_text(self) -> bool:
        return len(self.data_dict) > 0

    def render_shape(self) -> Scatter:
        return render_shape(
            shape=self.shape,
            fill_color=self.fill_color,
            centre_text=self.centre_text,
            outline_width=self.outline_width,
            outline_color=self.outline_color,
        )
