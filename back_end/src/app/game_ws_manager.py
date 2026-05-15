from fastapi import WebSocket

from src.app.prepare_gs import prepare_game_state_for_front_end
from src.app.routes.logging import console_logger, log_exception_with_traceback
from src.models.ids import GameId, PlayerId
from src.models.message import GameToPlayerMessage, GameUpdate
from src.models.server_models import WebsocketMessage


class GameWebSocketConnectionManager:
    """Manages WebSocket connections for real-time communication"""

    def __init__(self) -> None:
        # Dictionary mapping game_id -> player_id -> WebSocket
        self.active_connections: dict[GameId, dict[PlayerId, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: GameId, player_id: PlayerId):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
        self.active_connections[game_id][player_id] = websocket
        console_logger.info(f"Player {player_id} connected to game {game_id}")

    def disconnect(self, game_id: GameId, player_id: PlayerId):
        if game_id in self.active_connections:
            if player_id in self.active_connections[game_id]:
                del self.active_connections[game_id][player_id]
                console_logger.info(f"Player {player_id} disconnected from game {game_id}")
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def send_to_one_player(self, message: WebsocketMessage) -> None:
        game_id = message.game_id_obj
        player_id = message.player_id_obj
        if game_id in self.active_connections and player_id in self.active_connections[game_id]:
            websocket = self.active_connections[game_id][player_id]
            try:
                await websocket.send_text(message.to_string())
            except Exception as e:
                error_msg = f"Error sending message to {player_id} in game {game_id}: {e}"
                log_exception_with_traceback(error_msg, e)
                self.disconnect(game_id, player_id)

    async def handle_player_messages(self, msgs: list[GameToPlayerMessage]) -> None:
        """Handle messages from game engine and send to appropriate players via WebSocket"""
        for msg in msgs:
            try:
                # Convert message to simple dict for JSON serialization
                message = WebsocketMessage.from_py_message(msg)
                await self.send_to_one_player(message)

            except Exception as e:
                error_msg = f"Error handling message {msg}: {e}"
                log_exception_with_traceback(error_msg, e)

    async def broadcast_to_players(self, game_id: GameId, message: GameUpdate) -> None:
        """Broadcast a message to all players in a lobby"""
        if game_id not in self.active_connections:
            console_logger.info(f"No active connections for game {game_id}")
            return

        data = prepare_game_state_for_front_end(message.game_state)

        for player_id, websocket in list(self.active_connections[game_id].items()):
            try:
                ws_message = WebsocketMessage(game_id=game_id, player_id=player_id, message_type=message.__class__.__name__, data=data)
                await websocket.send_text(ws_message.to_string())
                console_logger.info(f"Broadcast to player {player_id} in lobby {game_id}")
            except Exception as e:
                error_msg = f"Error broadcasting to {player_id} in lobby {game_id}: {e}"
                log_exception_with_traceback(error_msg, e)
                self.disconnect(game_id, player_id)
