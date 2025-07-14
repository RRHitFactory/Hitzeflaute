from abc import ABC
from dataclasses import dataclass
from typing import Union, TypeVar, Generic
from typing import Union, Literal

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
    game_state: GameState
    message: str

    def __str__(self) -> str:
        return f"<{self.__class__.__name__}(Engine -> {self.player_id}: {self.message})>"

    def __repr__(self) -> str:
        return str(self)


ToGameMessage = Union[PlayerToGameMessage, InternalMessage]
FromGameMessage = Union[InternalMessage, GameToPlayerMessage]
T_Id = TypeVar("T_Id", bound=Union[AssetId, TransmissionId])


@dataclass(frozen=True)
class ConcludePhase(InternalMessage):
    phase: Phase


@dataclass(frozen=True)
class GameUpdate(GameToPlayerMessage):
    # The basic message that gets sent to a player to let them know the game state has
    pass


@dataclass(frozen=True)
class UpdateBidRequest(PlayerToGameMessage):
    asset_id: AssetId
    bid_price: float


@dataclass(frozen=True)
class UpdateBidResponse(GameToPlayerMessage):
    game_state: GameState
    success: bool
    asset_id: AssetId


@dataclass(frozen=True)
class BuyRequest(PlayerToGameMessage, Generic[T_Id]):
    purchase_id: T_Id


@dataclass(frozen=True)
class BuyResponse(GameToPlayerMessage, Generic[T_Id]):
    game_state = GameState
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
