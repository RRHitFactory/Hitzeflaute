from abc import ABC
from dataclasses import dataclass
from typing import Literal, TypeVar

from src.models.assets import AssetId
from src.models.game_state import GameState, Phase
from src.models.ids import GameId, PlayerId
from src.models.transmission import TransmissionId
from src.tools.serialization import SerializableDcRecursive


@dataclass(frozen=True)
class Message(ABC, SerializableDcRecursive):
    game_id: GameId


@dataclass(frozen=True)
class InternalMessage(Message, ABC):
    # A message from the game to itself
    def __str__(self) -> str:
        return f"<{self.__class__.__name__}>"

    def __repr__(self) -> str:
        return str(self)


@dataclass(frozen=True)
class PlayerToGameMessage(Message, ABC):
    player_id: PlayerId

    @classmethod
    def get_camel_case_name(cls) -> str:
        """Convert class name from PascalCase to camelCase"""
        class_name = cls.__name__
        result = class_name[0].lower()
        for char in class_name[1:]:
            if char.isupper():
                # Don't add anything, just lowercase it
                result += "_"
                result += char.lower()
            else:
                result += char
        return result

    def __str__(self) -> str:
        return f"<{self.__class__.__name__}({self.player_id} -> Game)>"

    def __repr__(self) -> str:
        return str(self)


@dataclass(frozen=True)
class GameToPlayerMessage(Message, ABC):
    player_id: PlayerId
    message: str

    def __str__(self) -> str:
        return f"<{self.__class__.__name__}(Engine -> {self.player_id}: {self.message})>"

    def __repr__(self) -> str:
        return str(self)


type ToGameMessage = PlayerToGameMessage | InternalMessage
type FromGameMessage = InternalMessage | GameToPlayerMessage
T_Id = TypeVar("T_Id", bound=AssetId | TransmissionId)


@dataclass(frozen=True)
class ConcludePhase(InternalMessage):
    phase: Phase

    @property
    def new_phase(self) -> Phase:
        return self.phase.get_next()


@dataclass(frozen=True)
class GameUpdate(GameToPlayerMessage):
    game_state: GameState


@dataclass(frozen=True)
class UpdateBidResponse(GameToPlayerMessage):
    success: bool
    asset_id: AssetId


@dataclass(frozen=True)
class UpdateBidRequest(PlayerToGameMessage):
    asset_id: AssetId
    bid_price: float

    def make_response(self, success: bool, message: str) -> UpdateBidResponse:
        return UpdateBidResponse(
            game_id=self.game_id,
            player_id=self.player_id,
            asset_id=self.asset_id,
            success=success,
            message=message,
        )


@dataclass(frozen=True)
class BuyResponse[T_Id](GameToPlayerMessage):
    success: bool
    purchase_id: T_Id


@dataclass(frozen=True)
class BuyRequest[T_Id](PlayerToGameMessage):
    purchase_id: T_Id

    def make_response(self, success: bool, message: str) -> BuyResponse[T_Id]:
        return BuyResponse(
            game_id=self.game_id,
            player_id=self.player_id,
            success=success,
            purchase_id=self.purchase_id,
            message=message,
        )


@dataclass(frozen=True)
class OperateLineRequest(PlayerToGameMessage):
    transmission_id: TransmissionId
    action: Literal["open", "close"]


@dataclass(frozen=True)
class OperateLineResponse(GameToPlayerMessage):
    request: OperateLineRequest
    result: Literal["success", "no_change", "failure"]


@dataclass(frozen=True)
class OperateAssetRequest(PlayerToGameMessage):
    asset_id: AssetId
    action: Literal["shutdown", "startup"]


@dataclass(frozen=True)
class OperateAssetResponse(GameToPlayerMessage):
    request: OperateAssetRequest
    result: Literal["success", "no_change", "failure"]


@dataclass(frozen=True)
class EndTurn(PlayerToGameMessage):
    pass


@dataclass(frozen=True)
class AuctionClearedMessage(GameToPlayerMessage):
    pass


@dataclass(frozen=True)
class IceCreamMeltedMessage(GameToPlayerMessage):
    asset_id: AssetId


@dataclass(frozen=True)
class AssetWornMessage(GameToPlayerMessage):
    asset_id: AssetId


@dataclass(frozen=True)
class TransmissionWornMessage(GameToPlayerMessage):
    transmission_id: TransmissionId


@dataclass(frozen=True)
class LoadsDeactivatedMessage(GameToPlayerMessage):
    asset_ids: list[AssetId]


@dataclass(frozen=True)
class PlayerEliminatedMessage(GameToPlayerMessage):
    pass


@dataclass(frozen=True)
class GameOverMessage(GameToPlayerMessage):
    winner_id: PlayerId | None
