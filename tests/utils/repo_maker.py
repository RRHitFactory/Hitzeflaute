from abc import abstractmethod
from itertools import count
from typing import Generic, Self, Literal, Optional, TypeVar

import numpy as np

from src.models.assets import AssetRepo, AssetInfo, AssetType
from src.models.buses import Bus, BusRepo, BusSocketManager
from src.models.colors import Color
from src.models.data.ldc_repo import T_LdcRepo
from src.models.data.light_dc import T_LightDc
from src.models.ids import PlayerId, AssetId, BusId, TransmissionId
from src.models.player import PlayerRepo, Player
from src.models.transmission import TransmissionRepo, TransmissionInfo
from src.tools.random_choice import random_choice

T_RepoMaker = TypeVar("T_RepoMaker", bound="RepoMaker")


class RepoMaker(Generic[T_LdcRepo, T_LightDc]):
    def __init__(self, *args, **kwargs) -> None:
        self.dcs: list[T_LightDc] = []
        self.id_counter = count(start=0)

    @abstractmethod
    def _get_repo_type(self) -> type[T_LdcRepo]:
        pass

    @abstractmethod
    def _make_dc(self, *args, **kwargs) -> T_LightDc:
        pass

    def _pre_make_hook(self) -> None:
        pass

    def __add__(self: T_RepoMaker, dc: T_LightDc | list[T_LightDc]) -> T_RepoMaker:
        if isinstance(dc, list):
            self.dcs.extend(dc)
        else:
            self.dcs.append(dc)
        return self

    def add_n_random(self: T_RepoMaker, n: int) -> T_RepoMaker:
        new_dcs = [self._make_dc() for _ in range(n)]
        return self + new_dcs

    def make(self) -> T_LdcRepo:
        self._pre_make_hook()
        return self._get_repo_type()(dcs=self.dcs)


class BusRepoMaker(RepoMaker[BusRepo, Bus]):
    @classmethod
    def make_quick(cls, n_npc_buses: int = 10, players: list[PlayerId] | PlayerRepo | None = None) -> BusRepo:
        return cls(players=players).add_n_random(n_npc_buses).make()

    def __init__(self, players: list[PlayerId] | PlayerRepo | None = None) -> None:
        super().__init__()
        if players is None:
            players = [PlayerId(i) for i in range(3)]
        elif isinstance(players, PlayerRepo):
            players = players.human_player_ids
        self.player_ids = players

    def add_bus(self, player_id: PlayerId = PlayerId.get_npc()) -> Self:
        return self + self._make_dc(player_id=player_id)

    def _make_dc(self, player_id: PlayerId = PlayerId.get_npc()) -> Bus:
        map_width: float = 20.0
        half_width = map_width / 2

        centre_x, centre_y = self._get_current_centre()

        def centre_rand() -> float:
            """Generate a random number between -0.5 and 0.5."""
            return 2 * (np.random.rand() - 0.5)

        x = -centre_x + abs(half_width - centre_x) * centre_rand()
        y = -centre_y + abs(half_width - centre_y) * centre_rand()

        bus_id = next(self.id_counter)
        return Bus(id=BusId(bus_id), x=x, y=y, player_id=player_id, max_assets=20)

    def _get_current_centre(self) -> tuple[float, float]:
        """Get the current centre of the buses."""
        if not self.dcs:
            return 0.0, 0.0
        x_coords = [bus.x for bus in self.dcs]
        y_coords = [bus.y for bus in self.dcs]
        return float(np.mean(x_coords)), float(np.mean(y_coords))

    def _get_repo_type(self) -> type[BusRepo]:
        return BusRepo

    def _pre_make_hook(self) -> None:
        # Ensure that there is exactly one bus per non-npc player
        player_ids_with_buses = {bus.player_id for bus in self.dcs if bus.player_id != PlayerId.get_npc()}
        players_without_buses = set(self.player_ids) - player_ids_with_buses

        for player_id in players_without_buses:
            self.dcs.append(self._make_dc(player_id=player_id))


class PlayerRepoMaker(RepoMaker[PlayerRepo, Player]):
    @classmethod
    def make_quick(cls, n: int = 3) -> PlayerRepo:
        maker = cls()
        return maker.add_n_random(n).make()

    def _make_dc(self) -> Player:
        player_id = next(self.id_counter)
        hue = np.random.randint(0, 255)
        saturation = np.random.randint(200, 255)
        value = 200

        color = Color(x=(hue, saturation, value), color_model="hsv")
        return Player(
            id=PlayerId(player_id),
            name=f"Player {player_id}",
            color=color,
            money=float(np.random.rand() * 100),  # Just an example of money
            is_having_turn=False,
        )

    def _get_repo_type(self) -> type[PlayerRepo]:
        return PlayerRepo

    def _pre_make_hook(self) -> None:
        # Ensure that there is exactly one bus per non-npc player
        player_ids = [dc.id for dc in self.dcs]
        if PlayerId.get_npc() not in player_ids:
            self.dcs.append(Player.make_npc())


class AssetRepoMaker(RepoMaker[AssetRepo, AssetInfo]):
    @classmethod
    def make_quick(
        cls,
        n_normal_assets: int = 3,
        players: list[PlayerId] | PlayerRepo | None = None,
        bus_repo: Optional[BusRepo] = None,
    ) -> AssetRepo:
        return (
            cls(players=players, bus_repo=bus_repo)
            .add_n_random(n_normal_assets)
            .add_asset(owner=PlayerId.get_npc(), is_for_sale=True)
            .make()
        )

    def __init__(self, players: list[PlayerId] | PlayerRepo | None = None, bus_repo: Optional[BusRepo] = None) -> None:
        super().__init__()
        if players is None:
            players = [PlayerId(i) for i in range(3)]
        elif isinstance(players, PlayerRepo):
            players = players.human_player_ids

        if bus_repo is None:
            bus_repo = BusRepoMaker.make_quick(players=players)
        self.player_ids = players
        self.buses = bus_repo
        self._socket_manager = BusSocketManager({b.id: b.max_assets for b in bus_repo})

        for bus in self.buses.freezer_buses:
            freezer = self._make_dc(cat="Freezer", bus=bus.id, owner=bus.player_id, is_active=True)
            self._safe_append(freezer)

    def __add__(self, dc: AssetInfo | list[AssetInfo]) -> Self:
        if isinstance(dc, list):
            [self._safe_append(d) for d in dc]
        else:
            self._safe_append(dc)
        return self

    def add_n_random(self, n: int) -> Self:
        for _ in range(n):
            random_bus = self._socket_manager.get_bus_with_free_socket()
            new_asset = self._make_dc(bus=random_bus)
            self._safe_append(new_asset)
        return self

    def add_assets_to_buses(self, buses: list[BusId]) -> Self:
        """Add assets to specific buses."""
        for bus in buses:
            asset = self._make_dc(bus=bus)
            self._safe_append(asset)
        return self

    def add_asset(
        self,
        asset: Optional[AssetInfo] = None,
        cat: Optional[Literal["Generator", "Load", "Freezer"]] = None,
        owner: Optional[PlayerId] = None,
        bus: Optional[BusId] = None,
        power_std: Optional[float] = None,
        is_for_sale: Optional[bool] = None,
        bid_price: Optional[float] = None,
        is_active: Optional[bool] = None,
    ) -> Self:
        if asset is None:
            asset = self._make_dc(
                cat=cat,
                owner=owner,
                bus=bus,
                power_std=power_std,
                is_for_sale=is_for_sale,
                bid_price=bid_price,
                is_active=is_active,
            )
        else:
            for x in [cat, owner, bus]:
                assert x is None, "Cannot specify asset and any of cat, owner, or bus at the same time"

        self._safe_append(asset)
        return self

    def _safe_append(self, asset: AssetInfo) -> None:
        # Appends and consumes a socket
        self._socket_manager.use_socket(asset.bus)
        self.dcs.append(asset)

    def _get_random_player_id(self) -> PlayerId:
        return random_choice(self.player_ids) if random_choice([True, False]) else PlayerId.get_npc()

    def _make_dc(
        self,
        cat: Optional[Literal["Generator", "Load", "Freezer"]] = None,
        owner: Optional[PlayerId] = None,
        bus: Optional[BusId] = None,
        power_std: Optional[float] = None,
        is_for_sale: Optional[bool] = None,
        bid_price: Optional[float] = None,
        is_active: Optional[bool] = None,
    ) -> AssetInfo:
        asset_id = next(self.id_counter)

        if cat is None:
            cat = random_choice(["Generator", "Load"])

        if owner is None:
            owner = self._get_random_player_id()

        if bus is None:
            bus = self._socket_manager.get_bus_with_free_socket()

        if power_std is None:
            power_std = float(np.random.rand() * 10)

        if is_for_sale is None:
            is_for_sale = random_choice([True, False]) if owner is PlayerId.get_npc() else False

        if is_active is None:
            is_active = np.random.rand() > 0.2

        asset_type: AssetType = {
            "Generator": AssetType.GENERATOR,
            "Load": AssetType.LOAD,
            "Freezer": AssetType.LOAD,  # Ice cream is a special type of load
        }[cat]
        is_freezer = cat == "Freezer"
        health = 5 if is_freezer else 15
        offset = {"Generator": 0, "Load": 200, "Freezer": 500}[cat]

        marginal_cost = float(np.random.rand() * 50) + offset
        if bid_price is None:
            if asset_type == AssetType.GENERATOR:
                bid_price = marginal_cost + float(np.random.rand() * 50)
            else:
                bid_price = marginal_cost - float(np.random.rand() * 50)

        return AssetInfo(
            id=AssetId(asset_id),
            owner_player=owner,
            asset_type=asset_type,
            bus=bus,
            power_expected=float(np.random.rand() * 100),
            power_std=power_std,
            is_for_sale=is_for_sale,
            minimum_acquisition_price=float(np.random.rand() * 1000),
            fixed_operating_cost=float(np.random.rand() * 100),
            marginal_cost=marginal_cost,
            bid_price=bid_price,
            is_freezer=is_freezer,
            health=health,
            is_active=is_active,
        )

    def _get_repo_type(self) -> type[AssetRepo]:
        return AssetRepo


class TransmissionRepoMaker(RepoMaker[TransmissionRepo, TransmissionInfo]):
    @classmethod
    def make_quick(
        cls,
        n: Optional[int] = None,
        players: list[PlayerId] | PlayerRepo | None = None,
        buses: Optional[BusRepo] = None,
    ) -> TransmissionRepo:
        if n is None:
            n = min(10, round(sum([b.max_lines for b in buses]) * 0.4))
        maker = cls(players=players, buses=buses)
        return maker.add_n_random(n).make()

    def __init__(self, players: list[PlayerId] | PlayerRepo | None = None, buses: Optional[BusRepo] = None) -> None:
        super().__init__()
        if players is None:
            players = [PlayerId(i) for i in range(3)]
        elif isinstance(players, PlayerRepo):
            players = players.human_player_ids

        if buses is None:
            buses = BusRepoMaker.make_quick(players=players)

        self.player_ids = players
        self.buses = buses
        self._socket_manager = BusSocketManager({b.id: b.max_lines for b in buses})

    def __add__(self, dc: TransmissionInfo | list[TransmissionInfo]) -> Self:
        if isinstance(dc, list):
            [self._safe_append(d) for d in dc]
        else:
            self._safe_append(dc)
        return self

    def add_n_random(self, n: int) -> Self:
        for _ in range(n):
            random_buses = self._get_random_bus_pair()
            new_line = self._make_dc(buses=random_buses)
            self._safe_append(new_line)
        return self

    def _safe_append(self, dc: TransmissionInfo) -> None:
        # Adds the transmission line to the dcs and consumes the sockets
        bus1, bus2 = dc.bus1, dc.bus2
        self._socket_manager.use_socket(bus1)
        self._socket_manager.use_socket(bus2)
        self.dcs.append(dc)

    def _get_random_player_id(self) -> PlayerId:
        return random_choice(self.player_ids) if random_choice([True, False]) else PlayerId.get_npc()

    def _get_random_bus_pair(self) -> tuple[BusId, BusId]:
        sockets = self._socket_manager.get_buses_with_free_sockets(n=2)
        bus1, bus2 = sockets
        return min(bus1, bus2), max(bus1, bus2)

    def _make_dc(
        self, owner: Optional[PlayerId] = None, buses: Optional[tuple[BusId, BusId]] = None
    ) -> TransmissionInfo:
        transmission_id = TransmissionId(next(self.id_counter))
        if owner is None:
            owner = self._get_random_player_id()
        if buses is None:
            buses = self._get_random_bus_pair()

        assert len(buses) == 2, "Buses must be a tuple of two BusIds"
        bus1, bus2 = buses
        assert bus1 != bus2, "Buses must be different"

        return TransmissionInfo(
            id=transmission_id,
            owner_player=owner,
            bus1=bus1,
            bus2=bus2,
            reactance=float(np.random.rand() * 10 + 1),
            capacity=float(np.random.rand() * 100 + 50),
            health=int(np.random.randint(1, 6)),
            fixed_operating_cost=float(np.random.rand() * 100),
            is_for_sale=random_choice([True, False]),
            minimum_acquisition_price=float(np.random.rand() * 1000) if random_choice([True, False]) else 0.0,
            is_active=True,
        )

    def _get_repo_type(self) -> type[TransmissionRepo]:
        return TransmissionRepo

    def _pre_make_hook(self) -> None:
        # Connect islands before making the repo
        mentioned_buses = {t.bus1 for t in self.dcs} | {t.bus2 for t in self.dcs}
        islanded_buses = [bus for bus in self.buses.bus_ids if bus not in mentioned_buses]

        for i_bus in islanded_buses:
            other_bus = self._socket_manager.get_bus_with_free_socket(excluding=i_bus)
            bus1 = min(i_bus, other_bus)
            bus2 = max(i_bus, other_bus)
            new_line = self._make_dc(owner=self._get_random_player_id(), buses=(bus1, bus2))
            self._safe_append(new_line)
