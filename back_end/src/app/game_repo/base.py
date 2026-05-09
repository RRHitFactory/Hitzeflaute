from abc import ABC, abstractmethod

from src.models.game_state import GameState
from src.models.ids import GameId


class BaseGameStateRepo(ABC):
    @abstractmethod
    def reserve_game_id(self) -> GameId:
        pass

    @abstractmethod
    def create(self, game: GameState) -> None:
        pass

    @abstractmethod
    def read(self, game_id: GameId) -> GameState:
        pass

    @abstractmethod
    def update(self, game: GameState) -> None:
        pass

    @abstractmethod
    def delete(self, game_id: GameId, missing_ok: bool = True) -> None:
        pass

    @abstractmethod
    def list_games(self) -> list[GameId]:
        pass

