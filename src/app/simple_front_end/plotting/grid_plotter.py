import pandas as pd
import plotly.graph_objects as go

from src.app.simple_front_end.plotting.base_plot_object import PlotObject
from src.app.simple_front_end.plotting.po_asset import PlotAsset
from src.app.simple_front_end.plotting.po_bus import PlotBus
from src.app.simple_front_end.plotting.po_line import PlotTxLine
from src.app.simple_front_end.plotting.po_rect import Rect
from src.app.simple_front_end.plotting.po_table import make_table
from src.models.colors import Color
from src.models.game_state import GameState
from src.models.geometry import Point, Shape
from src.models.ids import BusId
from src.tools.money import format_money


class GridPlotter:
    def plot(self, game_state: GameState) -> None:
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
                margin=dict(b=20, l=5, r=5, t=40),
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, scaleanchor="y"),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            ),
        )
        fig.show()

    @staticmethod
    def get_plot_objects(game_state: GameState) -> list[PlotObject]:
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

        # TODO Add playable map area to state and use that to determine legend location
        legend_location = Point(x=21, y=19)

        players = game_state.players.as_objs()
        names = [p.name for p in players]
        money = [p.money for p in players]
        player_df = pd.DataFrame(index=names, columns=["Name", "Money"])
        player_df["Name"] = names
        player_df["Money"] = money
        player_df["Money"] = player_df["Money"].apply(format_money)
        player_df.loc["NPC", "Money"] = ""

        color_df = player_df.copy()
        for p in players:
            color_df.loc[p.name, :] = p.color.to_string()

        legend_rect = Shape.make_rectangle(
            bottom_left=Point(x=legend_location.x - 4, y=legend_location.y - 4),
            top_right=Point(x=legend_location.x + 1, y=legend_location.y + len(players)),
        )
        player_table = make_table(values=player_df, colors=color_df, rect=legend_rect)

        return buses + txs + assets + player_table
