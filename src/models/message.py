from abc import ABC
from dataclasses import dataclass
from typing import TypeVar, Optional
from typing import Union, Literal
from typing import TypeVar, Generic, Union, Literal

from src.models.game_state import GameState, Phase
from src.models.ids import PlayerId, AssetId, TransmissionId


@dataclass(frozen=True)
class Message(ABC):
    pass


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


type ToGameMessage = Union[PlayerToGameMessage, InternalMessage]
type FromGameMessage = Union[InternalMessage, GameToPlayerMessage]
T_Id = TypeVar("T_Id", bound=Union[AssetId, TransmissionId])


@dataclass(frozen=True)
class ConcludePhase(InternalMessage):
    phase: Phase


@dataclass(frozen=True)
class GameUpdate(GameToPlayerMessage):
    game_state: GameState


@dataclass(frozen=True)
class UpdateBidRequest(PlayerToGameMessage):
    asset_id: AssetId
    bid_price: float


@dataclass(frozen=True)
class UpdateBidResponse(GameToPlayerMessage):
    success: bool
    asset_id: AssetId


@dataclass(frozen=True)
class BuyRequest[T_Id](PlayerToGameMessage):
    purchase_id: T_Id


@dataclass(frozen=True)
class BuyResponse[T_Id](GameToPlayerMessage):
    success: bool
    purchase_id: T_Id


@dataclass(frozen=True)
class OperateLineRequest(PlayerToGameMessage):
    transmission_id: TransmissionId
    action: Literal["open", "close"]


@dataclass(frozen=True)
class OperateLineResponse(GameToPlayerMessage):
    request: OperateLineRequest
    result: Literal["success", "no_change", "failure"]


@dataclass(frozen=True)
class EndTurn(PlayerToGameMessage):
    player_id: PlayerId


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
    winner_id: Optional[PlayerId]
