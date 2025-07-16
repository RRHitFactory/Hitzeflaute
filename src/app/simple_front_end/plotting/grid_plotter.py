from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go

from src.app.simple_front_end.plotting.base_plot_object import PlotObject
from src.app.simple_front_end.plotting.live_html import LiveHtml
from src.app.simple_front_end.plotting.po_asset import PlotAsset
from src.app.simple_front_end.plotting.po_bus import PlotBus
from src.app.simple_front_end.plotting.po_line import PlotTxLine
from src.app.simple_front_end.plotting.po_rect import ShapePlotObject
from src.app.simple_front_end.plotting.po_table import make_table
from src.directories import game_cache_dir
from src.models.colors import Color
from src.models.game_state import GameState
from src.models.geometry import Point, Shape
from src.models.ids import BusId
from src.tools.money import format_money


class GridPlotter:
    def __init__(self, html_path: Path = None) -> None:
        if html_path is None:
            html_path = game_cache_dir / "plot.html"
        self._html_path = html_path
        self._first_time: bool = True

    def make_figure(self, game_state: GameState) -> go.Figure:
        # TODO Use playable map area from game state. Plot a box around the playable area.
        plot_objects = self.get_plot_objects(game_state)

        hover_texts = [po.render_hover_text() for po in plot_objects]
        hover_texts = [ht for ht in hover_texts if ht is not None]
        shapes = [po.render_shape() for po in plot_objects]
        data = shapes + hover_texts

        fig = go.Figure(
            data=data,
            layout=go.Layout(
                title=dict(text="PowerFlowGame", font=dict(size=16)),
                showlegend=False,
                hovermode='closest',
                margin=dict(b=0, l=0, r=0, t=0),
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, scaleanchor="y"),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                paper_bgcolor="white",
                plot_bgcolor="white",
            ),
        )
        return fig

    def plot(self, game_state: GameState) -> None:
        fig = self.make_figure(game_state)
        self._write_fig(fig)

    def _write_fig(self, fig: go.Figure) -> None:
        if not self._first_time:
            fig.write_html(self._html_path, include_plotlyjs="cdn", auto_open=False)
            return
        self._html_path.parent.mkdir(parents=True, exist_ok=True)
        fig.write_html(self._html_path, include_plotlyjs="cdn", auto_open=False)
        live_html = LiveHtml(path=self._html_path)
        live_html.start()
        self._first_time = False

    @classmethod
    def get_plot_objects(cls, game_state: GameState) -> list[PlotObject]:
        bus_dict: dict[BusId, PlotBus] = {}
        for bus in game_state.buses:
            owner = game_state.players[bus.player_id]
            bus_dict[bus.id] = PlotBus(bus=bus, owner=owner)
        buses = list(bus_dict.values())

        txs: list[PlotTxLine] = []
        for tx in game_state.transmission:
            owner = game_state.players[tx.owner_player]
            bus1 = bus_dict[tx.bus1]
            bus2 = bus_dict[tx.bus2]
            txs.append(PlotTxLine(line=tx, owner=owner, buses=(bus1, bus2)))

        assets: list[PlotAsset] = []
        for asset in game_state.assets:
            owner = game_state.players[asset.owner_player]
            bus = bus_dict[asset.bus]
            assets.append(PlotAsset(asset=asset, owner=owner, bus=bus))

        playable_map = ShapePlotObject(
            shape=game_state.game_settings.map_area,
            title_text="",
            fill_color=Color("#D0D0D0"),
            outline_color=Color("black"),
            outline_width=1.0,
        )

        player_table = cls.make_player_table(game_state=game_state)
        top_table = cls.make_top_table(game_state=game_state)

        return player_table + top_table + [playable_map] + buses + txs + assets

    @classmethod
    def make_top_table(cls, game_state: GameState) -> list[ShapePlotObject]:
        top_df = pd.DataFrame(
            {
                "Round": ["Round", str(game_state.round)],
                "Phase": ["Phase", game_state.phase.name],
            }
        )
        color_df = pd.DataFrame(index=top_df.index, columns=top_df.columns)
        color_df.iloc[0, :] = Color("#A0A0A0").to_string()
        color_df.iloc[1, :] = Color("#D0D0D0").to_string()

        map_area = game_state.game_settings.map_area
        bottom_mid = Point(map_area.centre.x, map_area.max_y)
        rect = Shape.make_rectangle(
            bottom_left=Point(x=bottom_mid.x - 5, y=bottom_mid.y),
            top_right=Point(x=bottom_mid.x + 5, y=bottom_mid.y + 3),
            closed=True,
        )
        return make_table(values=top_df, colors=color_df, rect=rect)

    @classmethod
    def make_player_table(cls, game_state: GameState) -> list[ShapePlotObject]:
        players = game_state.players.human_players
        names = [p.name for p in players]
        money = [format_money(p.money) for p in players]
        freezers = [game_state.assets.get_freezer_for_player(player_id=p.id) for p in players]
        ice_cream_health = [fr.health if fr else 0 for fr in freezers]

        player_df = pd.DataFrame(index=names, columns=["Name", "Money"])
        player_df["Name"] = names
        player_df["Money"] = money
        player_df["Ice Creams"] = ice_cream_health

        top_row = pd.Series({c: c for c in player_df.columns})
        player_df = pd.concat([top_row.to_frame().T, player_df], axis=0)

        color_df = player_df.copy()
        color_df.iloc[0, :] = Color("gray").to_string()  # Color for the header row
        for p in players:
            color_df.loc[p.name, :] = p.color.to_string()

        y = game_state.game_settings.map_area.max_y
        x = game_state.game_settings.map_area.max_x

        legend_rect = Shape.make_rectangle(
            bottom_left=Point(x=x, y=y - 2 * len(player_df)),
            top_right=Point(x=x + 10, y=y),
        )

        shapes = make_table(values=player_df, colors=color_df, rect=legend_rect)

        y_points = np.linspace(start=legend_rect.max_y, stop=legend_rect.min_y, num=len(player_df) + 1, endpoint=True)
        y_midpoints = (y_points[1:] + y_points[:-1]) / 2

        x = legend_rect.max_x + 1.0
        for y, player in zip(y_midpoints[1:], players):
            if not player.is_having_turn:
                continue

            centre = Point(x=x, y=y)
            rect = ShapePlotObject(
                shape=Shape.make_regular_polygon(
                    center=centre,
                    radius=0.5,
                    n_points=100,
                    closed=True,
                ),
                title_text="",
                fill_color=Color("green"),
                centre_text="",
                hover_data={"Having turn": "Yes"},
            )
            shapes.append(rect)
        return shapes
