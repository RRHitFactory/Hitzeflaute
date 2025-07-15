from dataclasses import dataclass, replace
from enum import IntEnum
from functools import cached_property
from typing import Self, Optional

from src.models.assets import AssetRepo, AssetInfo
from src.models.buses import BusRepo, BusFullException
from src.models.game_settings import GameSettings
from src.models.ids import PlayerId, GameId
from src.models.market_coupling_result import MarketCouplingResult
from src.models.player import PlayerRepo
from src.models.transmission import TransmissionRepo, TransmissionInfo
from src.tools.serialization import simplify_type, un_simplify_type


class Phase(IntEnum):
    CONSTRUCTION = 0
    SNEAKY_TRICKS = 1
    DA_AUCTION = 2

    def get_next(self) -> Self:
        next_index = (self.value + 1) % len(Phase)
        return Phase(next_index)


@dataclass(frozen=True)
class GameState:
    game_id: GameId
    game_settings: GameSettings
    phase: Phase
    players: PlayerRepo
    buses: BusRepo
    assets: AssetRepo
    transmission: TransmissionRepo
    market_coupling_result: Optional[MarketCouplingResult]

    @cached_property
    def current_players(self) -> list[PlayerId]:
        return self.players.get_currently_playing().player_ids

    def add_asset(self, asset: AssetInfo) -> Self:
        bus_id = asset.bus
        bus = self.buses[bus_id]
        n_assets_at_bus = len(self.assets.get_all_assets_at_bus(bus_id=bus_id))

        if (n_assets_at_bus + 1) > bus.max_assets:
            raise BusFullException(f"Cannot add new asset {asset.id} to bus {bus_id}")

        return replace(self, assets=self.assets + asset)

    def add_transmission_line(self, transmission_info: TransmissionInfo) -> Self:
        for bus_id in [transmission_info.bus1, transmission_info.bus2]:
            bus = self.buses[bus_id]
            n_lines_at_bus = len(self.assets.get_all_assets_at_bus(bus_id=bus_id))
            if (n_lines_at_bus + 1) > bus.max_assets:
                raise BusFullException(f"Cannot add new line {transmission_info.id} to bus {bus_id}")

        return replace(self, transmission=self.transmission + transmission_info)

    def start_all_turns(self) -> Self:
        return replace(self, players=self.players.start_all_turns())

    def to_simple_dict(self) -> dict:
        return {
            "game_id": self.game_id,
            "game_settings": self.game_settings.to_simple_dict(),
            "phase": simplify_type(self.phase),
            "players": self.players.to_simple_dict(),
            "buses": self.buses.to_simple_dict(),
            "assets": self.assets.to_simple_dict(),
            "transmission": self.transmission.to_simple_dict(),
            "market_coupling_result": (
                self.market_coupling_result.to_simple_dict() if self.market_coupling_result else None
            ),
        }

    @classmethod
    def from_simple_dict(cls, simple_dict: dict) -> Self:
        return cls(
            game_id=simple_dict["game_id"],
            game_settings=GameSettings.from_simple_dict(simple_dict["game_settings"]),
            phase=un_simplify_type(x=simple_dict["phase"], t=Phase),
            players=PlayerRepo.from_simple_dict(simple_dict["players"]),
            buses=BusRepo.from_simple_dict(simple_dict["buses"]),
            assets=AssetRepo.from_simple_dict(simple_dict["assets"]),
            transmission=TransmissionRepo.from_simple_dict(simple_dict["transmission"]),
            market_coupling_result=(
                MarketCouplingResult.from_simple_dict(simple_dict["market_coupling_result"])
                if simple_dict.get("market_coupling_result")
                else None
            ),
        )
