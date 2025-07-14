from abc import abstractmethod, ABC
from dataclasses import dataclass
from typing import Optional

import plotly.graph_objects as go
from plotly.graph_objs import Scatter

from src.app.simple_front_end.plotting.base_plot_object import PlotObject
from src.models.colors import get_contrasting_color, Color
from src.models.geometry import Point, Shape, ShapeType


@dataclass(frozen=True)
class RectBase(PlotObject, ABC):
    def __post_init__(self) -> None:
        if not isinstance(self.shape, Shape):
            raise TypeError(f"Expected 'shape' to be of type 'Shape', got {type(self.shape)}")
        assert self.shape.shape_type == ShapeType.Rectangle

    @property
    @abstractmethod
    def shape(self) -> Shape: ...

    @property
    @abstractmethod
    def centre_text(self) -> Optional[str]: ...

    @property
    def centre(self) -> Point:
        return self.shape.centre

    def render_shape(self) -> Scatter:
        points = [p for p in self.shape]

        text = None
        if self.centre_text is not None:
            points.append(self.centre)
            text = [""] * (len(points) - 1) + [self.centre_text]

        scatter = go.Scatter(
            x=[p.x for p in points],
            y=[p.y for p in points],
            mode="lines+text",
            text=text,
            fill="toself",
            fillcolor=self.color.rgb_hex_str,
            line=dict(color="black", width=0),
            textfont={"size": 10, "color": get_contrasting_color(self.color).rgb_hex_str},
            hoverinfo="skip",
        )
        return scatter


@dataclass(frozen=True)
class Rect(PlotObject):
    color_a: Color
    title_a: str
    shape: Shape
    hover: bool = True
    fill: bool = True
    centre_text: Optional[str] = None

    def __post_init__(self) -> None:
        if not isinstance(self.shape, Shape):
            raise TypeError(f"Expected 'shape' to be of type 'Shape', got {type(self.shape)}")
        assert self.shape.shape_type == ShapeType.Rectangle

    @property
    def color(self) -> Color:
        return self.color_a

    @property
    def title(self) -> str:
        return self.title_a

    @property
    def data_dict(self) -> dict[str, str]:
        return {}

    @property
    def centre(self) -> Point:
        return self.shape.centre

    @property
    def allow_hover_text(self) -> bool:
        return self.hover

    def render_shape(self) -> Scatter:
        points = [p for p in self.shape]

        text = None
        if self.centre_text is not None:
            points.append(self.centre)
            text = [""] * (len(points) - 1) + [self.centre_text]

        fill = "toself"
        if not self.fill:
            fill = "none"

        scatter = go.Scatter(
            x=[p.x for p in points],
            y=[p.y for p in points],
            mode="lines+text",
            text=text,
            fill=fill,
            fillcolor=self.color.rgb_hex_str,
            line=dict(color="black", width=0),
            textfont={"size": 10, "color": get_contrasting_color(self.color).rgb_hex_str},
            hoverinfo="skip",
        )
        return scatter
