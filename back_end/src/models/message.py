from abc import ABC
from dataclasses import dataclass
from types import MappingProxyType
from typing import TypeVar

from src.models.assets import AssetId
from src.models.game_state import GameState, Phase
from src.models.ids import GameId, PlayerId
from src.models.transmission import TransmissionId
from src.tools.serialization import SerializableDcSimple


@dataclass(frozen=True, repr=False)
class Message(ABC, SerializableDcSimple):
    game_id: GameId

    def __str__(self) -> str:
        return f"<{self.__class__.__name__}>"

    def __repr__(self) -> str:
        return str(self)



@dataclass(frozen=True, repr=False)
class InternalMessage(Message, ABC): ... # A message from the game to itself

@dataclass(frozen=True, repr=False)
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


@dataclass(frozen=True, repr=False)
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


@dataclass(frozen=True, repr=False)
class ConcludePhase(InternalMessage):
    phase: Phase

    @property
    def new_phase(self) -> Phase:
        return self.phase.get_next()


@dataclass(frozen=True, repr=False)
class ClearAuction(InternalMessage): ...


@dataclass(frozen=True, repr=False)
class GameUpdate(GameToPlayerMessage):
    game_state: GameState


@dataclass(frozen=True, repr=False)
class PlayerNotInTurn(GameToPlayerMessage):
    pass


@dataclass(frozen=True, repr=False)
class UpdateBidResponse(GameToPlayerMessage):
    success: bool
    asset_id: AssetId


@dataclass(frozen=True, repr=False)
class Ack(GameToPlayerMessage):
    message: str = "👍"


@dataclass(frozen=True, repr=False)
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


# update_batch_bids_request
@dataclass(frozen=True, repr=False)
class UpdateBatchBidResponse(GameToPlayerMessage):
    success: bool


@dataclass(frozen=True, repr=False)
class UpdateBatchBidsRequest(PlayerToGameMessage):
    bids: MappingProxyType[AssetId, float]

    def make_response(self, success: bool, message: str) -> UpdateBatchBidResponse:
        return UpdateBatchBidResponse(game_id=self.game_id, player_id=self.player_id, success=success, message=message)


@dataclass(frozen=True, repr=False)
class BuyResponse[T_Id](GameToPlayerMessage):
    success: bool
    purchase_id: T_Id


@dataclass(frozen=True, repr=False)
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


@dataclass(frozen=True, repr=False)
class ActivationUpdateRequest(PlayerToGameMessage):
    """
    Describes the activation state of all lines and assets (if they are active or not)
    """

    line_activation: MappingProxyType[TransmissionId, bool]
    asset_activation: MappingProxyType[AssetId, bool]


@dataclass(frozen=True, repr=False)
class EndTurn(PlayerToGameMessage):
    pass


@dataclass(frozen=True, repr=False)
class AuctionClearedMessage(GameToPlayerMessage):
    pass


@dataclass(frozen=True, repr=False)
class IceCreamMeltedMessage(GameToPlayerMessage):
    asset_id: AssetId


@dataclass(frozen=True, repr=False)
class GridExpansionMessage(GameToPlayerMessage):
    asset_id: AssetId


@dataclass(frozen=True, repr=False)
class AssetBuiltMessage(GridExpansionMessage):
    pass


@dataclass(frozen=True, repr=False)
class TransmissionBuiltMessage(GridExpansionMessage):
    pass


@dataclass(frozen=True, repr=False)
class AssetWornMessage(GameToPlayerMessage):
    asset_id: AssetId


@dataclass(frozen=True, repr=False)
class TransmissionWornMessage(GameToPlayerMessage):
    transmission_id: TransmissionId


@dataclass(frozen=True, repr=False)
class LoadsDeactivatedMessage(GameToPlayerMessage):
    asset_ids: list[AssetId]


@dataclass(frozen=True, repr=False)
class PlayerEliminatedMessage(GameToPlayerMessage):
    pass


@dataclass(frozen=True, repr=False)
class GameOverMessage(GameToPlayerMessage):
    winner_id: PlayerId | None
