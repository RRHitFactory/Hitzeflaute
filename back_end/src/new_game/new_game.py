import math
from collections.abc import Generator
from itertools import combinations, count

import numpy as np

from src.models.assets import AssetId, AssetInfo, AssetRepo, AssetType
from src.models.buses import Bus, BusRepo, BusSocketManager
from src.models.colors import Color, get_random_player_colors
from src.models.game_settings import GameSettings
from src.models.game_state import GameState, Phase
from src.models.geometry import Point, Shape
from src.models.ids import BusId, GameId, PlayerId, Round
from src.models.player import Player, PlayerRepo
from src.models.transmission import TransmissionId, TransmissionInfo, TransmissionRepo
from src.new_game.generators.generator_maker import GeneratorMaker
from src.new_game.loads.load_maker import LoadMaker
from src.new_game.trigram_maker import make_trigrams
from src.tools.random_choice import random_choice, random_choice_multi

__all__ = ["GameInitializer"]


class BusTopologyMaker:
    @staticmethod
    def make_line(n_buses: int, length: int) -> list[Point]:
        line_layout = Shape.make_line(start=Point(x=0.0, y=0.0), end=Point(x=length, y=0.0), n_points=n_buses)
        return line_layout.points

    @staticmethod
    def make_grid(
        n_buses_per_row: int,
        n_buses_per_col: int,
        x_range: float = 10.0,
        y_range: float = 10.0,
    ) -> list[Point]:
        grid_layout = Shape.make_grid(
            start_corner=Point(x=0.0, y=0.0),
            width=x_range,
            height=y_range,
            n_points_in_x=n_buses_per_row,
            n_points_in_y=n_buses_per_col,
        )
        return grid_layout.points

    @staticmethod
    def make_random(n_buses: int, x_range: float = 10.0, y_range: float = 10.0) -> list[Point]:
        n_bins = n_buses
        grid_layout = Shape.make_grid(
            start_corner=Point(x=0.0, y=0.0),
            width=x_range,
            height=y_range,
            n_points_in_x=n_bins,
            n_points_in_y=n_bins,
        )
        selection = random_choice_multi(grid_layout.points, n_buses, replace=False)
        return selection

    @classmethod
    def make_regular_polygon(cls, n_buses: int, radius: float = 10.0) -> list[Point]:
        circle_layout = Shape.make_regular_polygon(center=Point(x=0.0, y=0.0), radius=radius, n_points=n_buses, closed=False)
        return circle_layout.points

    @classmethod
    def make_layered_polygon(cls, n_buses: int, n_buses_per_layer: int, radius: float = 10.0) -> list[Point]:
        n_layers = math.ceil(n_buses / n_buses_per_layer)
        layered_polygon_layout = Shape.make_empty()
        for i in range(n_layers):
            layered_polygon_layout += Shape.make_regular_polygon(
                center=Point(x=0.0, y=0.0),
                radius=radius * (i + 1) / n_layers,
                n_points=n_buses_per_layer,
                closed=False,
            )
        return layered_polygon_layout.points[:n_buses]


type Topology = set[tuple[BusId, BusId]]


class TransmissionTopologyMaker:
    @staticmethod
    def _get_bus_combinations(bus_repo: BusRepo) -> list[tuple[BusId, BusId]]:
        """
        Generate all unique combinations of bus pairs for transmission lines.
        :param bus_repo: BusRepo containing the buses in the game.
        :return: List of tuples containing bus pairs.
        """
        return sorted(combinations(bus_repo.bus_ids, 2))

    @staticmethod
    def make_sequential(bus_repo: BusRepo) -> Topology:
        """
        Create a linear transmission topology with the specified number of buses
        """
        return {(bus_repo.bus_ids[i], bus_repo.bus_ids[i + 1]) for i in range(len(bus_repo))}

    @staticmethod
    def make_random(bus_repo: BusRepo, n_connections: int) -> Topology:
        """
        Create a random transmission topology with the specified number of buses and connections
        """
        possible_connections = TransmissionTopologyMaker._get_bus_combinations(bus_repo)
        return {random_choice(possible_connections) for _ in range(n_connections)}

    @staticmethod
    def make_grid(bus_repo: BusRepo, n_buses_per_row: int) -> Topology:
        """
        Create a grid transmission topology with the specified number of buses.
        :param bus_repo: BusRepo containing the buses in the game.
        :param n_buses_per_row: Number of buses per row in the grid.
        """
        connections: list[tuple[BusId, BusId]] = []
        n_buses = len(bus_repo)
        for i in range(n_buses):
            if (i + 1) % n_buses_per_row != 0:  # Connect to the right bus
                connections.append((bus_repo.bus_ids[i], bus_repo.bus_ids[i + 1]))
            if i + n_buses_per_row < n_buses:  # Connect to the bus below
                connections.append((bus_repo.bus_ids[i], bus_repo.bus_ids[i + n_buses_per_row]))
        return set(connections)

    @staticmethod
    def make_spiderweb(bus_repo: BusRepo, n_buses_per_layer: int) -> Topology:
        """
        Create a spiderweb-like transmission topology.
        :param bus_repo: BusRepo containing the buses in the game.
        :param n_buses_per_layer: Number of buses per layer.
        """
        connections: list[tuple[BusId, BusId]] = []
        n_buses = len(bus_repo)
        n_layers = math.ceil(n_buses / n_buses_per_layer)
        for layer in range(n_layers):
            for i in range(n_buses_per_layer):
                if layer * n_buses_per_layer + i >= n_buses:
                    break
                bus1 = bus_repo.bus_ids[layer * n_buses_per_layer + i]

                ccw_bus_idx = (layer + 1) * n_buses_per_layer + i - 1
                cw_bus_idx = layer * n_buses_per_layer + i + 1
                upper_layer_bus_idx = (layer + 1) * n_buses_per_layer + i

                if i + 1 < n_buses_per_layer and cw_bus_idx < n_buses:
                    connections.append((bus1, bus_repo.bus_ids[cw_bus_idx]))
                if i % n_buses_per_layer == 0 and ccw_bus_idx < n_buses:
                    connections.append((bus1, bus_repo.bus_ids[ccw_bus_idx]))
                if layer + 1 < n_layers and upper_layer_bus_idx < n_buses:
                    connections.append((bus1, bus_repo.bus_ids[upper_layer_bus_idx]))

        return set(connections)


class GameInitializer:
    def __init__(self, settings: GameSettings) -> None:
        """
        Initialize the game initializer with the provided game settings.
        :param settings: GameSettings instance containing the game configuration.
        """
        self.settings = settings

    def create_new_game(
        self,
        game_id: GameId,
        player_names: list[str],
        player_colors: list[Color] | None = None,
    ) -> GameState:
        """
        Create a new game state with the given game ID and settings.
        :param game_id: Unique identifier for the game.
        :param player_names: List of player names.
        :param player_colors: List of player colors.
        :return: A new GameState instance with the provided game ID and settings.
        """
        n_players = len(player_names)
        if player_colors is None:
            player_colors = get_random_player_colors(n_players)

        player_repo = self._create_player_repo(names=player_names, colors=player_colors)
        bus_repo = self._create_bus_repo(player_repo=player_repo)
        assets_repo = self._create_asset_repo(player_repo=player_repo, bus_repo=bus_repo)
        transmission_repo = self._create_transmission_repo(player_repo=player_repo, bus_repo=bus_repo)

        new_game = GameState(
            game_id=game_id,
            game_settings=self.settings,
            phase=Phase(0),
            players=player_repo,
            buses=bus_repo,
            assets=assets_repo,
            transmission=transmission_repo,
            market_coupling_result=None,
        )
        if Phase(0).is_turn_based:
            new_game = new_game.update(new_game.players.start_first_player_turn())
        else:
            new_game = new_game.update(new_game.players.start_all_turns())

        return new_game

    def _create_player_repo(self, names: list[str], colors: list[Color]) -> PlayerRepo:
        assert len(names) == len(colors), "Number of player names and colors must match"
        assert len(set(names)) == len(names), "Names must be unique"
        assert all(len(n) >= 1 for n in names), "Names must have at least one letter"
        trigrams = make_trigrams(names)

        ids = [PlayerId(i) for i in range(1, len(names) + 1)]
        players = [
            Player(
                id=pid,
                name=name,
                trigram=tri,
                color=color,
                money=self.settings.initial_funds,
                is_having_turn=False,  # Initial state, no player has a turn yet
            )
            for pid, name, tri, color in zip(ids, names, trigrams, colors)
        ]
        players.append(Player.make_npc())

        return PlayerRepo(players)

    def _create_bus_repo(self, player_repo: PlayerRepo) -> BusRepo:
        topology = BusTopologyMaker.make_layered_polygon(
            n_buses=self.settings.n_buses,
            n_buses_per_layer=self.settings.n_buses,
            radius=self.settings.map_area.height * 0.9 / 2,
        )

        bus_ids = iter([BusId(i + 1) for i in range(self.settings.n_buses)])
        topos = iter(topology)

        buses: list[Bus] = []
        for pid, top in zip(player_repo.player_ids, topos):
            buses.append(Bus(id=next(bus_ids), player_id=pid, x=top.x, y=top.y))

        for bus_id, top in zip(bus_ids, topos):
            buses.append(Bus(id=bus_id, player_id=PlayerId.get_npc(), x=top.x, y=top.y))

        return BusRepo(buses)

    def _create_asset_repo(self, player_repo: PlayerRepo, bus_repo: BusRepo) -> AssetRepo:
        assets: list[AssetInfo] = []

        def asset_id_iterator(start: int = 1) -> Generator[AssetId, None, None]:
            for i in count(start):
                yield AssetId(i)

        asset_ids = asset_id_iterator(start=1)

        socket_manager = BusSocketManager(starting_sockets={b.id: b.max_assets for b in bus_repo})

        # Create one freezer load for each player
        freezer_power = 50
        freezer_bid = int(np.floor(self.settings.initial_funds / freezer_power))
        # The initial freezer bid is the highest affordable bid for the player at the start of the game

        for player_id in player_repo.player_ids:
            if player_id == PlayerId.get_npc():
                continue

            bus_id = bus_repo.get_bus_for_player(player_id=player_id).id
            socket_manager.use_socket(bus_id=bus_id)

            assets.append(
                AssetInfo(
                    id=next(asset_ids),
                    owner_player=player_id,
                    asset_type=AssetType.LOAD,
                    bus=bus_id,
                    power_expected=freezer_power,
                    power_std=0.0,
                    is_for_sale=False,
                    minimum_acquisition_price=0.0,
                    fixed_operating_cost=0,
                    marginal_cost=0.0,
                    bid_price=freezer_bid,
                    is_freezer=True,
                    technology="freezer",
                    health=self.settings.n_init_ice_cream,
                )
            )

        # Create the rest of the assets for NPC
        gen_maker = GeneratorMaker()
        for _ in range(self.settings.n_init_assets):
            bus_id = socket_manager.get_bus_with_free_socket(use=True)
            asset = gen_maker.make_one(asset_id=next(asset_ids), bus_id=bus_id, current_round=Round(0), player_id=PlayerId.get_npc())
            assets.append(asset)

        load_maker = LoadMaker()
        for _ in range(self.settings.n_init_non_freezer_loads):
            bus_id = socket_manager.get_bus_with_free_socket(use=True)
            asset = load_maker.make_one(asset_id=next(asset_ids), bus_id=bus_id, current_round=Round(0), player_id=PlayerId.get_npc(), except_freezer=True)
            assets.append(asset)

        return AssetRepo(assets)

    def _create_transmission_repo(self, player_repo: PlayerRepo, bus_repo: BusRepo) -> TransmissionRepo:
        topology = TransmissionTopologyMaker.make_spiderweb(bus_repo=bus_repo, n_buses_per_layer=player_repo.n_human_players)
        self._assert_topology_has_no_islands(buses=bus_repo.bus_ids, topology=topology)

        def transmission_id_iterator(
            start: int = 1,
        ) -> Generator[TransmissionId, None, None]:
            for i in count(start):
                yield TransmissionId(i)

        t_id_iter = transmission_id_iterator(start=1)

        # TODO This should be considered during topology construction rather than just checking it at the end
        socket_manager = BusSocketManager(starting_sockets={bus.id: bus.max_lines for bus in bus_repo})

        rng = np.random.default_rng()

        lines: list[TransmissionInfo] = []
        for bus1, bus2 in topology:
            # Ensure both buses have free sockets
            socket_manager.use_socket(bus1)
            socket_manager.use_socket(bus2)

            line = TransmissionInfo(
                id=next(t_id_iter),
                owner_player=PlayerId.get_npc(),  # NPC owns all initial transmissions
                bus1=bus1,
                bus2=bus2,
                reactance=rng.uniform(0.1, 1.0),  # Random reactance for each transmission
                capacity=round(rng.uniform(10, 100)),
                health=5,
                fixed_operating_cost=1,
                is_for_sale=True,
                minimum_acquisition_price=round(rng.uniform(10, 100)),  # Random purchase cost for each transmission
            )
            lines.append(line)

        return TransmissionRepo(lines)

    def _assert_topology_has_no_islands(self, buses: list[BusId], topology: Topology) -> None:
        bus_on_the_chain = {b: False for b in buses}
        bus_on_the_chain[buses[0]] = True

        lines_on_the_chain: Topology = set()

        # Recursively run through all the lines to determine if each bus is connected to the first bus
        max_depth = len(buses)
        for _ in range(max_depth):
            lines_off_the_chain = topology - lines_on_the_chain
            for line in lines_off_the_chain:
                b1, b2 = line
                if bus_on_the_chain[b1] | bus_on_the_chain[b2]:
                    lines_on_the_chain.add(line)
                    bus_on_the_chain[b1] = True
                    bus_on_the_chain[b2] = True

        island_detected = any(v is False for v in bus_on_the_chain.values())
        assert not island_detected, "Island detected in topology"
