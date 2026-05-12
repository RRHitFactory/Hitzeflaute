from fastapi import WebSocket

from src.app.routes.logging import console_logger, log_exception_with_traceback
from src.models.ids import GameId, PlayerId


class LobbyWebSocketConnectionManager:
    """Manages WebSocket connections for lobby real-time communication"""

    def __init__(self) -> None:
        # Dictionary mapping game_id -> player_id -> WebSocket
        self.active_connections: dict[GameId, dict[PlayerId, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: GameId, player_id: PlayerId):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
        self.active_connections[game_id][player_id] = websocket
        console_logger.info(f"Player {player_id} connected to lobby {game_id}")

    def disconnect(self, game_id: GameId, player_id: PlayerId):
        if game_id in self.active_connections:
            if player_id in self.active_connections[game_id]:
                del self.active_connections[game_id][player_id]
                console_logger.info(
                    f"Player {player_id} disconnected from lobby {game_id}"
                )
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def send_to_one_player(self, game_id: GameId, player_id: PlayerId, message: str) -> None:
        if (
            game_id in self.active_connections
            and player_id in self.active_connections[game_id]
        ):
            websocket = self.active_connections[game_id][player_id]
            try:
                await websocket.send_text(message)
            except Exception as e:
                error_msg = (
                    f"Error sending message to {player_id} in lobby {game_id}: {e}"
                )
                log_exception_with_traceback(error_msg, e)
                self.disconnect(game_id, player_id)

    async def broadcast_to_lobby(self, game_id: GameId, message: str) -> None:
        """Broadcast a message to all players in a lobby"""
        if game_id not in self.active_connections:
            console_logger.info(f"No active connections for lobby {game_id}")
            return

        for player_id, websocket in list(self.active_connections[game_id].items()):
            try:
                await websocket.send_text(message)
                console_logger.info(f"Broadcast to player {player_id} in lobby {game_id}")
            except Exception as e:
                error_msg = f"Error broadcasting to {player_id} in lobby {game_id}: {e}"
                log_exception_with_traceback(error_msg, e)
                self.disconnect(game_id, player_id)

    def get_lobby_connections(self, game_id: GameId) -> list[PlayerId]:
        """Get list of connected player IDs in a lobby"""
        if game_id not in self.active_connections:
            return []
        return list(self.active_connections[game_id].keys())
