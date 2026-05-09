import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from back_end.src.app.game_manager import GameManager
from back_end.src.app.routes.logging import log_exception_with_traceback
from back_end.src.app.ws_manager import WebSocketConnectionManager
from src.models.ids import GameId, PlayerId
from src.models.message import (
    GameUpdate,
)
from src.models.server_models import WebsocketMessage


def get_ws_router(
    ws_connection_manager: WebSocketConnectionManager, game_manager: GameManager
) -> APIRouter:
    router = APIRouter(prefix="/ws", tags=["games"])

    @router.websocket("/{game_id}/{player_id}")
    async def websocket_endpoint(
        websocket: WebSocket, game_id: str, player_id: str
    ) -> None:
        """WebSocket endpoint for real-time game communication"""
        game_id_true = GameId(int(game_id))
        player_id_true = PlayerId(int(player_id))
        await ws_connection_manager.connect(websocket, game_id_true, player_id_true)

        game_repo = game_manager.game_repo

        # Send initial game state
        try:
            game_state = game_repo.read(GameId(int(game_id)))
            message = WebsocketMessage.from_py_message(
                GameUpdate(
                    game_id=game_id_true,
                    player_id=player_id_true,
                    game_state=game_state,
                    message="",
                )
            )
            await websocket.send_text(message.to_string())
        except Exception as e:
            log_exception_with_traceback(f"Error sending initial game state: {e}", e)

        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()

                try:
                    message = WebsocketMessage.from_string(data)
                    await handle_websocket_message(message)
                except json.JSONDecodeError as e:
                    err = f"Invalid JSON received from {player_id_true} in game {game_id_true}: {data}"
                    log_exception_with_traceback(
                        f"Error handling invalid JSON: {err}", e
                    )
                    err_msg = WebsocketMessage.make_error(
                        game_id=game_id_true,
                        player_id=player_id_true,
                        error_message=err,
                    )
                    await websocket.send_text(err_msg.to_string())
                except Exception as e:
                    err = f"Error handling message from {player_id_true} in game {game_id_true}: {e}"
                    log_exception_with_traceback(err, e)
                    err_msg = WebsocketMessage.make_error(
                        game_id=game_id_true,
                        player_id=player_id_true,
                        error_message=err,
                    )
                    await websocket.send_text(err_msg.to_string())

        except WebSocketDisconnect as e:
            ws_connection_manager.disconnect(game_id_true, player_id_true)
            log_exception_with_traceback(
                f"Player {player_id_true} disconnected from game {game_id_true}", e
            )

    async def handle_websocket_message(message: WebsocketMessage) -> None:
        """Handle incoming WebSocket messages and convert them to game messages"""

        print(f"Received message: {message}")

        try:
            if message.message_type == "get_game_state":
                # Shortcut for requesting the game state
                await game_manager.update_players(
                    game_id=message.game_id_obj, players=[message.player_id_obj]
                )
            else:
                await game_manager.handle_player_message(
                    game_id=message.game_id_obj, msg=message.to_py_message()
                )

        except Exception as e:
            error_msg = f"Error creating player message: {e}"
            log_exception_with_traceback(error_msg, e)
            # Send error back to client
            message = WebsocketMessage.make_error(
                game_id=message.game_id_obj,
                player_id=message.player_id_obj,
                error_message=f"Error processing {message.message_type}: {str(e)}",
            )
            await ws_connection_manager.send_to_one_player(message)

    return router
