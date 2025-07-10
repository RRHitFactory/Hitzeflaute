import numpy as np
import pandas as pd

from src.app.simple_front_end.plotting.po_rect import Rect
from src.models.colors import Color
from src.models.geometry import Shape, ShapeType, Point


def make_table(values: pd.DataFrame, colors: pd.DataFrame, rect: Shape) -> list[Rect]:
    assert rect.shape_type == ShapeType.Rectangle
    assert values.columns.equals(colors.columns)
    assert values.index.equals(colors.index)

    x_points = np.linspace(start=rect.min_x, stop=rect.max_x, num=len(values.columns) + 1, endpoint=True)
    y_points = np.linspace(start=rect.min_y, stop=rect.max_y, num=len(values.index) + 1, endpoint=True)

    objects: list[Rect] = []
    for i in range(len(values.index)):
        for j in range(len(values.columns)):
            x_min = float(x_points[j])
            x_max = float(x_points[j + 1])
            y_min = float(y_points[i])
            y_max = float(y_points[i + 1])
            value = str(values.iloc[i, j])
            color = Color.from_string(colors.iloc[i, j])

            obj = Rect(
                color_a=color,
                title_a=value,
                shape=Shape.make_rectangle(
                    bottom_left=Point(x=x_min, y=y_min), top_right=Point(x=x_max, y=y_max), closed=True
                ),
                centre_text=value,
                hover=False,
            )
            objects.append(obj)
    return objects
