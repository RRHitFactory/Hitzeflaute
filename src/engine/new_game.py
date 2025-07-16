import math
from abc import ABC, abstractmethod
from dataclasses import replace
from itertools import combinations, count
from typing import Optional, Iterable, Generator

import numpy as np

from src.models.assets import AssetRepo, AssetInfo, AssetId, AssetType
from src.models.buses import BusRepo, Bus, BusSocketManager
from src.models.colors import Color, get_random_player_colors
from src.models.game_settings import GameSettings
from src.models.game_state import GameState, Phase
from src.models.geometry import Point, Shape
from src.models.ids import GameId, PlayerId, BusId
from src.models.player import Player, PlayerRepo
from src.models.transmission import TransmissionRepo, TransmissionInfo, TransmissionId
from src.tools.random_choice import random_choice


class BusTopologyMaker:

    @staticmethod
    def make_line(n_buses: int, length: int) -> list[Point]:
        line_layout = Shape.make_line(start=Point(x=0.0, y=0.0), end=Point(x=length, y=0.0), n_points=n_buses)
        return line_layout.points

    @staticmethod
    def make_grid(
        n_buses_per_row: int, n_buses_per_col: int, x_range: float = 10.0, y_range: float = 10.0
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
            start_corner=Point(x=0.0, y=0.0), width=x_range, height=y_range, n_points_in_x=n_bins, n_points_in_y=n_bins
        )
        selection = np.random.choice(grid_layout.points, n_buses, replace=False)
        return selection

    @classmethod
    def make_regular_polygon(cls, n_buses: int, radius: float = 10.0) -> list[Point]:
        circle_layout = Shape.make_regular_polygon(
            center=Point(x=0.0, y=0.0), radius=radius, n_points=n_buses, closed=False
        )
        return circle_layout.points

    @classmethod
    def make_layered_polygon(cls, n_buses: int, n_buses_per_layer: int, radius: float = 10.0) -> list[Point]:
        n_layers = math.ceil(n_buses / n_buses_per_layer)
        layered_polygon_layout = Shape.make_empty()
        for i in range(n_layers):
            layered_polygon_layout += Shape.make_regular_polygon(
                center=Point(x=0.0, y=0.0), radius=radius * (i + 1) / n_layers, n_points=n_buses_per_layer, closed=False
            )
        return layered_polygon_layout.points[:n_buses]


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
    def make_sequential(bus_repo: BusRepo) -> list[dict[str, BusId]]:
        """
        Create a linear transmission topology with the specified number of buses.
        :param bus_repo: BusRepo containing the buses in the game.
        :return: List of dictionaries containing bus connections.
        """
        return [{'bus1': bus_repo.bus_ids[i], 'bus2': bus_repo.bus_ids[i + 1]} for i in range(len(bus_repo))]

    @staticmethod
    def make_random(bus_repo: BusRepo, n_connections: int) -> list[dict[str, BusId]]:
        """
        Create a random transmission topology with the specified number of buses and connections.
        :param bus_repo: BusRepo containing the buses in the game.
        :param n_connections: Number of connections to create.
        :return: List of dictionaries containing bus connections.
        """
        connections = []
        possible_connections = TransmissionTopologyMaker._get_bus_combinations(bus_repo)
        for _ in range(n_connections):
            bus1, bus2 = np.random.choice(possible_connections, replace=False)
            connections.append({'bus1': BusId(bus1), 'bus2': BusId(bus2)})
        return connections

    @staticmethod
    def make_grid(bus_repo: BusRepo, n_buses_per_row: int) -> list[dict[str, BusId]]:
        """
        Create a grid transmission topology with the specified number of buses.
        :param bus_repo: BusRepo containing the buses in the game.
        :param n_buses_per_row: Number of buses per row in the grid.
        :return: List of dictionaries containing bus connections.
        """
        connections = []
        n_buses = len(bus_repo)
        for i in range(n_buses):
            if (i + 1) % n_buses_per_row != 0:  # Connect to the right bus
                connections.append({'bus1': bus_repo.bus_ids[i], 'bus2': bus_repo.bus_ids[i + 1]})
            if i + n_buses_per_row < n_buses:  # Connect to the bus below
                connections.append({'bus1': bus_repo.bus_ids[i], 'bus2': bus_repo.bus_ids[i + n_buses_per_row]})
        return connections

    @staticmethod
    def make_spiderweb(bus_repo: BusRepo, n_buses_per_layer: int) -> list[dict[str, BusId]]:
        """
        Create a spiderweb-like transmission topology.
        :param bus_repo: BusRepo containing the buses in the game.
        :param n_buses_per_layer: Number of buses per layer.
        :return: List of dictionaries containing bus connections.
        """
        connections = []
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
                    connections.append({'bus1': bus1, 'bus2': bus_repo.bus_ids[cw_bus_idx]})
                if i % n_buses_per_layer == 0 and ccw_bus_idx < n_buses:
                    connections.append({'bus1': bus1, 'bus2': bus_repo.bus_ids[ccw_bus_idx]})
                if layer + 1 < n_layers and upper_layer_bus_idx < n_buses:
                    connections.append({'bus1': bus1, 'bus2': bus_repo.bus_ids[upper_layer_bus_idx]})

        return connections

    @staticmethod
    def make_connect_n_closest(bus_repo: BusRepo, n_connections: int) -> list[dict[str, BusId]]:
        """
        Create a transmission topology that connects each bus to its n closest buses.
        :param bus_repo: BusRepo containing the buses to connect.
        :param n_connections: Number of connections per bus.
        :return: List of dictionaries containing bus connections.
        """
        # TODO: Autogenerated by Github Copilot, needs review
        connections = []
        for bus in bus_repo:
            distances = [
                (other_bus, np.linalg.norm(np.array([bus.x, bus.y]) - np.array([other_bus.x, other_bus.y])))
                for other_bus in bus_repo
                if other_bus.id != bus.id
            ]
            closest_buses = sorted(distances, key=lambda x: x[1])[:n_connections]
            for other_bus, _ in closest_buses:
                connections.append({'bus1': bus.id, 'bus2': other_bus.id})
        return connections


class BaseGameInitializer(ABC):
    """
    Abstract base class for initializing game components.
    Subclasses should implement methods to initialize buses, assets, and transmission.
    """

    def __init__(self, settings: GameSettings) -> None:
        """
        Initialize the game initializer with the provided game settings.
        :param settings: GameSettings instance containing the game configuration.
        """
        self.settings = settings

    def create_new_game(
        self, game_id: GameId, player_names: list[str], player_colors: Optional[list[str]] = None
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
        transmission_repo = self._ensure_no_islanded_buses(
            bus_repo=bus_repo,
            transmission_repo=self._create_transmission_repo(player_repo=player_repo, bus_repo=bus_repo),
        )

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
        new_game = replace(new_game, players=new_game.players.start_all_turns())
        return new_game

    def _create_player_repo(self, names: list[str], colors: list[Color]) -> PlayerRepo:
        assert len(names) == len(colors), "Number of player names and colors must match"

        players = [
            Player(
                id=PlayerId(i),
                name=name,
                color=color,
                money=self.settings.initial_funds,
                is_having_turn=False,  # Initial state, no player has a turn yet
            )
            for i, (name, color) in enumerate(zip(names, colors), start=1)
        ]
        players.append(Player.make_npc())

        return PlayerRepo(players)

    @staticmethod
    def _ensure_no_islanded_buses(bus_repo: BusRepo, transmission_repo: TransmissionRepo) -> TransmissionRepo:
        """
        Ensure that all buses are connected and no bus is islanded.
        :param bus_repo: The BusRepo containing all buses.
        :param transmission_repo: The TransmissionRepo containing all transmission lines.
        :return: A TransmissionRepo with no islanded buses.
        """
        additional_connections = []
        for bus in bus_repo:
            if len(transmission_repo.get_all_at_bus(bus.id)) == 0:
                bus_to_connect = bus_repo.get_random()
                id_bus1, id_bus2 = sorted([bus.id, bus_to_connect.id])
                additional_connections.append(
                    TransmissionInfo(
                        id=TransmissionId(transmission_repo.next_id()),
                        owner_player=PlayerId.get_npc(),  # NPC owns all initial transmissions
                        bus1=id_bus1,
                        bus2=id_bus2,
                        reactance=np.random.uniform(0.1, 1.0),  # Random reactance for each transmission
                        capacity=np.random.uniform(10, 100),  # Random capacity for each transmission
                        health=5,
                        fixed_operating_cost=np.random.uniform(0.01, 0.1),
                        is_for_sale=True,
                        minimum_acquisition_price=np.random.uniform(
                            10, 100
                        ),  # Random purchase cost for each transmission
                    )
                )
        if not additional_connections:
            return transmission_repo
        else:
            return transmission_repo + TransmissionRepo(additional_connections)

    @abstractmethod
    def _create_bus_repo(self, player_repo: PlayerRepo) -> BusRepo:
        """
        Create an initial BusRepo.
        :return: A new BusRepo instance.
        """
        # there must be at least one bus per player
        raise NotImplementedError("Initial bus configuration not implemented.")

    @abstractmethod
    def _create_asset_repo(self, player_repo: PlayerRepo, bus_repo: BusRepo) -> AssetRepo:
        """
        Create an initial AssetRepo.
        :return: A new AssetRepo instance.
        """
        # there must be at least one freezer per player
        raise NotImplementedError("Initial asset configuration not implemented.")

    @abstractmethod
    def _create_transmission_repo(self, player_repo: PlayerRepo, bus_repo: BusRepo) -> TransmissionRepo:
        """
        Create an initial TransmissionRepo.
        :return: A new TransmissionRepo instance.
        """
        # all buses need to be connected
        raise NotImplementedError("Initial transmission configuration not implemented.")


class DefaultGameInitializer(BaseGameInitializer):
    """
    Concrete implementation of NewGameInitializer for initializing game components with default settings.
    This class provides methods to create initial repositories for buses, assets, and transmission.
    """

    def _create_bus_repo(self, player_repo: PlayerRepo) -> BusRepo:

        topology = BusTopologyMaker.make_layered_polygon(
            n_buses=self.settings.n_buses,
            n_buses_per_layer=player_repo.n_human_players,
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
                    power_expected=50.0,
                    power_std=0.0,
                    is_for_sale=False,
                    minimum_acquisition_price=0.0,
                    fixed_operating_cost=self.settings.initial_funds / 20,
                    marginal_cost=0.0,
                    bid_price=self.settings.initial_funds / 2,
                    is_freezer=True,
                    health=self.settings.n_init_ice_cream,
                )
            )

        # Create the rest of the assets for NPC
        for _ in range(self.settings.n_init_assets):
            bus_id = socket_manager.get_bus_with_free_socket(use=True)

            assets.append(
                AssetInfo(
                    id=next(asset_ids),
                    owner_player=PlayerId.get_npc(),
                    asset_type=AssetType.GENERATOR,
                    bus=bus_id,
                    power_expected=60.0,
                    power_std=0.5,
                    is_for_sale=True,
                    minimum_acquisition_price=self.settings.initial_funds / 4,
                    fixed_operating_cost=self.settings.initial_funds / 20,
                    marginal_cost=self.settings.initial_funds / 20,
                    bid_price=np.random.uniform(self.settings.initial_funds / 20, self.settings.initial_funds / 2),
                    is_freezer=False,
                )
            )
        return AssetRepo(assets)

    def _create_transmission_repo(self, player_repo: PlayerRepo, bus_repo: BusRepo) -> TransmissionRepo:
        topology = TransmissionTopologyMaker.make_spiderweb(
            bus_repo=bus_repo, n_buses_per_layer=player_repo.n_human_players
        )

        def transmission_id_iterator(start: int = 1) -> Generator[TransmissionId, None, None]:
            for i in count(start):
                yield TransmissionId(i)

        t_id_iter = transmission_id_iterator(start=1)

        # TODO This should be considered during topology construction rather than just checking it at the end
        socket_manager = BusSocketManager(starting_sockets={bus.id: bus.max_lines for bus in bus_repo})

        lines: list[TransmissionInfo] = []
        for bus_pair in topology:
            bus1 = bus_pair["bus1"]
            bus2 = bus_pair["bus2"]

            # Ensure both buses have free sockets
            socket_manager.use_socket(bus1)
            socket_manager.use_socket(bus2)

            line = TransmissionInfo(
                id=next(t_id_iter),
                owner_player=PlayerId.get_npc(),  # NPC owns all initial transmissions
                bus1=bus_pair["bus1"],
                bus2=bus_pair["bus2"],
                reactance=np.random.uniform(0.1, 1.0),  # Random reactance for each transmission
                capacity=np.random.uniform(10, 100),  # Random capacity for each transmission
                health=5,
                fixed_operating_cost=np.random.uniform(0.01, 0.1),
                is_for_sale=True,
                minimum_acquisition_price=np.random.uniform(10, 100),  # Random purchase cost for each transmission
            )
            lines.append(line)

        return TransmissionRepo(lines)
