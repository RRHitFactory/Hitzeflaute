"""
FastAPI server for PowerFlowGame that bridges React frontend and Python backend.
Combines REST endpoints for serving the React app and managing games,
with WebSocket connections for real-time message communication.
"""

import logging
from collections.abc import Callable
from functools import cached_property
from types import MappingProxyType

from pydantic import BaseModel

from src.models.ids import AssetId, GameId, PlayerId, TransmissionId
from src.models.message import ActivationUpdateRequest, BuyRequest, EndTurn, GameToPlayerMessage, PlayerToGameMessage, UpdateBatchBidsRequest

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
        }
        name_func_mapping = {c.get_camel_case_name(): func for c, func in mapping.items()}
        func = name_func_mapping.get(self.message_type)
        if func is None:
            raise ValueError(f"Unknown message type: {self.message_type}. Valid names are {list(name_func_mapping.keys())}")
        return func()

    def _to_batch_bid_request(self) -> UpdateBatchBidsRequest:
        return UpdateBatchBidsRequest(game_id=self.game_id_obj, player_id=self.player_id_obj, bids=MappingProxyType({AssetId(int(k)): v for k, v in self.data["bids"].items()}))

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

    @classmethod
    def from_py_message(cls, msg: GameToPlayerMessage) -> "WebsocketMessage":
        return cls(game_id=msg.game_id, player_id=msg.player_id, message_type=msg.__class__.__name__, data=msg.to_simple_dict())

    @classmethod
    def from_string(cls, data: str) -> "WebsocketMessage":
        return cls.model_validate_json(data)

    @classmethod
    def make_error(cls, game_id: GameId, player_id: PlayerId, error_message: str) -> "WebsocketMessage":
        return cls(game_id=game_id.as_int(), player_id=player_id.as_int(), message_type="error", data={"err": error_message})
