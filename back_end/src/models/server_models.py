"""
FastAPI server for PowerFlowGame that bridges React frontend and Python backend.
Combines REST endpoints for serving the React app and managing games,
with WebSocket connections for real-time message communication.
"""

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from functools import cached_property
from types import MappingProxyType

from pydantic import BaseModel

from src.models.ids import AssetId, BusId, GameId, PlayerId, TransmissionId
from src.models.message import (
    ActivationUpdateRequest,
    BuyRequest,
    EndTurn,
    FreezerMigrationRequest,
    GameToPlayerMessage,
    PlayerToGameMessage,
    UpdateBatchBidsRequest,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses
class CreateGameRequest(BaseModel):
    player_names: list[str]


class CreateGameResponse(BaseModel):
    game_id: str
    message: str


class GameStateResponse(BaseModel):
    game_state: dict
    success: bool
    message: str


class WebsocketMessage(BaseModel):
    game_id: int
    player_id: int
    message_type: str
    data: dict

    @cached_property
    def game_id_obj(self) -> GameId:
        return GameId(self.game_id)

    @cached_property
    def player_id_obj(self) -> PlayerId:
        return PlayerId(self.player_id)

    def to_string(self) -> str:
        return self.model_dump_json()

    def to_py_message(self) -> PlayerToGameMessage:
        mapping: dict[type[PlayerToGameMessage], Callable[[], PlayerToGameMessage]] = {
            UpdateBatchBidsRequest: self._to_batch_bid_request,
            BuyRequest: self._to_buy_request,
            ActivationUpdateRequest: self._to_activation_update_request,
            EndTurn: self._to_end_turn,
            FreezerMigrationRequest: self._to_freezer_migrate,
        }
        name_func_mapping = {c.get_camel_case_name(): func for c, func in mapping.items()}
        func = name_func_mapping.get(self.message_type)
        if func is None:
            raise ValueError(f"Unknown message type: {self.message_type}. Valid names are {list(name_func_mapping.keys())}")
        return func()

    def _to_batch_bid_request(self) -> UpdateBatchBidsRequest:
        return UpdateBatchBidsRequest(
            game_id=self.game_id_obj,
            player_id=self.player_id_obj,
            bids=MappingProxyType({AssetId(int(k)): v for k, v in self.data["bids"].items()}),
        )

    def _to_buy_request(self) -> BuyRequest[AssetId | TransmissionId]:
        id_type = {"asset": AssetId, "transmission": TransmissionId}[self.data["purchase_type"]]
        return BuyRequest(
            game_id=self.game_id_obj,
            player_id=self.player_id_obj,
            purchase_id=id_type(self.data["purchase_id"]),
        )

    def _to_activation_update_request(self) -> ActivationUpdateRequest:
        return ActivationUpdateRequest(
            game_id=self.game_id_obj,
            player_id=self.player_id_obj,
            asset_activation=MappingProxyType({AssetId(int(k)): bool(v) for k, v in self.data["asset_activation"].items()}),
            line_activation=MappingProxyType({TransmissionId(int(k)): bool(v) for k, v in self.data["line_activation"].items()}),
        )

    def _to_end_turn(self) -> EndTurn:
        return EndTurn(
            game_id=self.game_id_obj,
            player_id=self.player_id_obj,
        )

    def _to_freezer_migrate(self) -> FreezerMigrationRequest:
        return FreezerMigrationRequest(game_id=self.game_id_obj, player_id=self.player_id_obj, asset_id=None, bus=BusId(self.data["bus"]))

    @classmethod
    def from_py_message(cls, msg: GameToPlayerMessage) -> "WebsocketMessage":
        return cls(
            game_id=msg.game_id,
            player_id=msg.player_id,
            message_type=msg.__class__.__name__,
            data=msg.to_simple_dict(),
        )

    @classmethod
    def from_string(cls, data: str) -> "WebsocketMessage":
        return cls.model_validate_json(data)

    @classmethod
    def make_error(cls, game_id: GameId, player_id: PlayerId, error_message: str) -> "WebsocketMessage":
        return cls(
            game_id=game_id.as_int(),
            player_id=player_id.as_int(),
            message_type="error",
            data={"err": error_message},
        )


# Lobby API models
class CreateLobbyRequest(BaseModel):
    player_name: str


class CreateLobbyResponse(BaseModel):
    game_id: int
    message: str


class JoinLobbyRequest(BaseModel):
    player_name: str


class JoinLobbyResponse(BaseModel):
    game_id: int
    player_id: str
    message: str


class LobbyInfoResponse(BaseModel):
    game_id: int
    players: list[dict]
    created_at: str
    max_players: int
    is_started: bool
    player_count: int


class LobbyListResponse(BaseModel):
    lobbies: list[dict]
    count: int


"""
Lobby models for PowerFlowGame multiplayer lobby system
"""

LobbyHostId = PlayerId(1)


@dataclass
class LobbyPlayer:
    player_id: PlayerId
    name: str
    joined_at: datetime = field(default_factory=datetime.now)

    @property
    def is_host(self) -> bool:
        return self.player_id == LobbyHostId

    def to_dict(self) -> dict:
        return {
            "player_id": int(self.player_id),
            "name": self.name,
            "joined_at": self.joined_at.isoformat(),
        }


@dataclass
class Lobby:
    game_id: GameId
    players: dict[PlayerId, LobbyPlayer] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    max_players: int = 5
    is_started: bool = False
    next_player_int_id: int = 1

    @property
    def host_player_id(self) -> PlayerId:
        return PlayerId(1)

    def add_player(self, name: str) -> LobbyPlayer:
        """Add a player to the lobby"""
        player_id = PlayerId(self.next_player_int_id)
        self.next_player_int_id += 1
        player = LobbyPlayer(player_id=player_id, name=name)
        self.players[player_id] = player
        return player

    def get_player_list(self) -> list[dict]:
        """Get list of players in the lobby"""
        return [p.to_dict() for p in self.players.values()]

    def get_player_names(self) -> list[str]:
        """Get list of player names"""
        return [p.name for p in self.players.values()]

    def is_full(self) -> bool:
        """Check if lobby is full"""
        return len(self.players) >= self.max_players

    def to_dict(self) -> dict:
        """Convert lobby to dictionary"""
        return {
            "game_id": int(self.game_id),
            "players": self.get_player_list(),
            "created_at": self.created_at.isoformat(),
            "max_players": self.max_players,
            "is_started": self.is_started,
            "player_count": len(self.players),
        }
