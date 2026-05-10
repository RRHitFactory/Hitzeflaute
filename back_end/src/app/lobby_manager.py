import threading

from src.app.game_manager import GameManager
from src.models.ids import GameId, PlayerId
from src.models.server_models import Lobby, LobbyPlayer


class LobbyManager:
    _lock = threading.Lock()

    def __init__(self, game_manager: GameManager) -> None:
        self._game_manager = game_manager
        self._lobbies: dict[GameId, Lobby] = {}
        self._player_name_map: dict[PlayerId, str] = {}  # Store player names by ID
        self._next_int_id = 0

    def get_next_player_id(self) -> PlayerId:
        with self._lock:
            player_id = PlayerId(self._next_int_id)
            self._next_int_id += 1
        return player_id

    def create_lobby(self) -> GameId:
        """Create a new lobby and return its game ID"""
        game_id = self._game_manager.game_repo.reserve_game_id()
        lobby = Lobby(game_id=game_id)
        self._lobbies[game_id] = lobby
        return game_id

    def get_lobby(self, game_id: GameId) -> Lobby | None:
        """Get a lobby by game ID"""
        return self._lobbies.get(game_id)

    def join_lobby(self, game_id: GameId, player_name: str) -> LobbyPlayer | None:
        """Join an existing lobby"""
        
        lobby = self.get_lobby(game_id)
        if not lobby:
            return None
        if lobby.is_full():
            return None
        if lobby.is_started:
            return None
        if player_name.lower() in [p.name.lower() for p in lobby.players.values()]:
            return None  # Player name already

        player_id = self.get_next_player_id()
        # Store player name
        self._player_name_map[player_id] = player_name

        # Add player to lobby
        return lobby.add_player(player_id, player_name)

    def leave_lobby(self, game_id: GameId, player_id: PlayerId) -> bool:
        """Remove a player from a lobby"""
        lobby = self.get_lobby(game_id)
        if not lobby:
            return False
        if player_id not in lobby.players:
            return False

        del lobby.players[player_id]

        # If host leaves and lobby is not started, delete the lobby
        if player_id == lobby.host_player_id and not lobby.is_started:
            self.delete_lobby(game_id)

        return True

    def delete_lobby(self, game_id: GameId) -> bool:
        """Delete a lobby"""
        if game_id in self._lobbies:
            del self._lobbies[game_id]
            return True
        return False

    def start_lobby(self, game_id: GameId) -> bool:
        """Mark a lobby as started"""
        lobby = self.get_lobby(game_id)
        if not lobby:
            return False

        lobby.is_started = True
        return True

    def list_lobbies(self) -> list[dict]:
        """List all active lobbies"""
        return [
            lobby.to_dict() for lobby in self._lobbies.values() if not lobby.is_started
        ]
