from dataclasses import dataclass, fields, replace
from enum import IntEnum
from functools import cached_property
from typing import Self

from src.models.assets import AssetInfo, AssetRepo
from src.models.buses import BusFullException, BusRepo
from src.models.game_settings import GameSettings
from src.models.ids import BusId, GameId, PlayerId, Round
from src.models.market_coupling_result import MarketCouplingResult
from src.models.player import PlayerRepo
from src.models.transmission import TransmissionInfo, TransmissionRepo
from src.tools.serialization import simplify_type, un_simplify_type


class Phase(IntEnum):
    CONSTRUCTION = 0
    SNEAKY_TRICKS = 1
    BIDDING = 2
    DA_AUCTION = 3

    def __str__(self) -> str:
        return f"<{self.__class__.__name__}.{self.name}>"

    def __repr__(self) -> str:
        return str(self)

    @property
    def is_turn_based(self) -> bool:
        return True

    @property
    def nice_name(self) -> str:
        return self.name.replace("_", " ").lower()

    def get_next(self) -> "Phase":
        next_index = (self.value + 1) % len(Phase)
        return Phase(next_index)


type GameStateAttributes = Phase | PlayerRepo | BusRepo | AssetRepo | TransmissionRepo | MarketCouplingResult | Round


@dataclass(frozen=True)
class GameState:
    game_id: GameId
    game_settings: GameSettings
    phase: Phase
    players: PlayerRepo
    buses: BusRepo
    assets: AssetRepo
    transmission: TransmissionRepo
    market_coupling_result: MarketCouplingResult | None
    game_round: Round = Round(1)

    def __post_init__(self) -> None:
        assert isinstance(self.game_round, Round), f"game_round must be of type Round. Got {type(self.game_round)}"
        assert isinstance(self.game_id, GameId), f"game_id must be of type GameId. Got {type(self.game_id)}"

    @cached_property
    def current_players(self) -> list[PlayerId]:
        return self.players.get_currently_playing().player_ids

    def add_asset(self, asset: AssetInfo) -> Self:
        bus_id = asset.bus
        bus = self.buses[bus_id]
        n_assets_at_bus = len(self.assets.get_all_assets_at_bus(bus_id=bus_id))

        if (n_assets_at_bus + 1) > bus.max_assets:
            raise BusFullException(f"Cannot add new asset {asset.id} to bus {bus_id}")

        return self.update(self.assets + asset)

    def add_transmission_line(self, transmission_info: TransmissionInfo) -> Self:
        for bus_id in [transmission_info.bus1, transmission_info.bus2]:
            bus = self.buses[bus_id]
            n_lines_at_bus = len(self.transmission.get_all_at_bus(bus_id=bus_id))
            if (n_lines_at_bus + 1) > bus.max_lines:
                raise BusFullException(f"Cannot add new line {transmission_info.id} to bus {bus_id}")

        return self.update(self.transmission + transmission_info)

    def get_remaining_space_for_assets_at_bus(self, bus_id: BusId) -> int:
        bus = self.buses[bus_id]
        n_assets_at_bus = len(self.assets.get_all_assets_at_bus(bus_id=bus_id))
        return bus.max_assets - n_assets_at_bus

    def get_remaining_space_for_lines_at_bus(self, bus_id: BusId) -> int:
        bus = self.buses[bus_id]
        n_lines_at_bus = len(self.transmission.get_all_at_bus(bus_id=bus_id))
        return bus.max_lines - n_lines_at_bus

    def start_all_turns(self) -> Self:
        return self.update(self.players.start_all_turns())

    def update(
        self,
        /,
        *new_attributes: GameStateAttributes,
    ) -> Self:
        map_new_attributes = {}

        def append_to_map(key: str, attribute: GameStateAttributes) -> None:
            if key in map_new_attributes:
                raise ValueError(f"Cannot update {key} multiple times in one update call.")
            map_new_attributes[key] = attribute

        # Create a mapping from type to field name using dataclass fields
        attr_to_type: dict[str, type[GameStateAttributes]] = {f.name: f.type for f in fields(self)}  # type: ignore
        attr_to_type["market_coupling_result"] = MarketCouplingResult  # type: ignore
        type_to_attr: dict[type[GameStateAttributes], str] = {v: k for k, v in attr_to_type.items()}

        for k, attr in enumerate(new_attributes):
            attr_name = type_to_attr.get(type(attr), None)
            assert attr_name is not None, f"Attribute in position {k} of with value {attr} of {type(attr)} is not a valid GameState attribute."
            append_to_map(attr_name, attr)

        return replace(self, **map_new_attributes)

    def to_simple_dict(self) -> dict:
        return {
            "game_id": self.game_id.as_int(),
            "game_settings": self.game_settings.to_simple_dict(),
            "phase": simplify_type(self.phase),
            "players": self.players.to_simple_dict(),
            "buses": self.buses.to_simple_dict(),
            "assets": self.assets.to_simple_dict(),
            "transmission": self.transmission.to_simple_dict(),
            "market_coupling_result": (self.market_coupling_result.to_simple_dict() if self.market_coupling_result else None),
            "game_round": self.game_round,
        }

    @classmethod
    def from_simple_dict(cls, simple_dict: dict) -> Self:
        return cls(
            game_id=GameId(simple_dict["game_id"]),
            game_settings=GameSettings.from_simple_dict(simple_dict["game_settings"]),
            phase=un_simplify_type(x=simple_dict["phase"], t=Phase),
            players=PlayerRepo.from_simple_dict(simple_dict["players"]),
            buses=BusRepo.from_simple_dict(simple_dict["buses"]),
            assets=AssetRepo.from_simple_dict(simple_dict["assets"]),
            transmission=TransmissionRepo.from_simple_dict(simple_dict["transmission"]),
            market_coupling_result=(MarketCouplingResult.from_simple_dict(simple_dict["market_coupling_result"]) if simple_dict.get("market_coupling_result") else None),
            game_round=Round(simple_dict["game_round"]),
        )
