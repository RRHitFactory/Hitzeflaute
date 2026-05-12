import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from src.app.game_manager import GameManager
from src.app.game_repo.base import BaseGameStateRepo
from src.app.game_ws_manager import GameWebSocketConnectionManager
from src.app.routes.logging import log_exception_with_traceback
from src.app.tools.reduce_message import reduce_message
from src.models.ids import GameId, PlayerId
from src.models.message import GameUpdate
from src.models.server_models import (
    CreateGameRequest,
    CreateGameResponse,
    GameStateResponse,
    WebsocketMessage,
)


def get_game_ws_router(ws_connection_manager: GameWebSocketConnectionManager, game_manager: GameManager) -> APIRouter:
    router = APIRouter(prefix="/ws/games", tags=["games"])

    @router.websocket("/{game_id}/{player_id}")
    async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str) -> None:
        """WebSocket endpoint for real-time game communication"""
        game_id_true = GameId(int(game_id))
        player_id_true = PlayerId(int(player_id))
        await ws_connection_manager.connect(websocket, game_id_true, player_id_true)

        game_repo = game_manager.game_repo

        # Send initial game state
        try:
            game_state = game_repo.read(GameId(int(game_id)))

            game_update = GameUpdate(game_id=game_id_true, game_state=game_state)
            data = reduce_message(game_update).to_simple_dict()

            message = WebsocketMessage(game_id=game_id_true, player_id=player_id_true, message_type=GameUpdate.__name__, data=data)
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
                    log_exception_with_traceback(f"Error handling invalid JSON: {err}", e)
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

        except WebSocketDisconnect:
            ws_connection_manager.disconnect(game_id_true, player_id_true)
            # Normal disconnect when client navigates away - don't log as error
            print(f"Player {player_id_true} disconnected from game {game_id_true}")

    async def handle_websocket_message(message: WebsocketMessage) -> None:
        """Handle incoming WebSocket messages and convert them to game messages"""

        print(f"Received message: {message}")

        try:
            if message.message_type == "get_game_state":
                await game_manager.update_players(game_id=message.game_id_obj)
            else:
                await game_manager.handle_player_message(game_id=message.game_id_obj, msg=message.to_py_message())

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


def get_game_rest_router(game_repo: BaseGameStateRepo) -> APIRouter:
    router = APIRouter(prefix="/api/games", tags=["games"])

    @router.post("", response_model=CreateGameResponse)
    async def create_game(request: CreateGameRequest):
        """Create a new game"""
        try:
            if not request.player_names or len(request.player_names) < 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least one player name is required",
                )

            game_id = GameManager.new_game(game_repo, request.player_names)

            return CreateGameResponse(
                game_id=str(game_id),
                message=f"Game created successfully with {len(request.player_names)} players",
            )
        except Exception as e:
            log_exception_with_traceback(f"Error creating game: {e}", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create game: {str(e)}",
            )

    @router.get("")
    async def list_games():
        """List all available games"""
        try:
            game_ids = game_repo.list_games()
            games_info = []
            for game_id in game_ids:
                try:
                    game_state = game_repo.read(GameId(int(game_id)))
                    player_names = [p.name for p in game_state.players.human_players]
                    games_info.append({"game_id": str(game_id), "players": player_names})
                except Exception:
                    # If can't load game state, just include id
                    games_info.append({"game_id": str(game_id), "players": []})
            return {"games": games_info, "count": len(games_info)}
        except Exception as e:
            log_exception_with_traceback(f"Error listing games: {e}", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list games: {str(e)}",
            )

    @router.get("/{game_id}", response_model=GameStateResponse)
    async def get_game_state(game_id: str):
        """Get current game state"""
        try:
            game_state = game_repo.read(GameId(int(game_id)))

            return GameStateResponse(
                game_state=game_state.to_simple_dict(),
                success=True,
                message="Game state retrieved successfully",
            )
        except Exception as e:
            log_exception_with_traceback(f"Error getting game state for {game_id}: {e}", e)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game {game_id} not found or error retrieving state: {str(e)}",
            )

    @router.delete("/{game_id}")
    async def delete_game(game_id: str):
        """Delete a game"""
        try:
            game_repo.delete(GameId(int(game_id)))
            return {"message": f"Game {game_id} deleted successfully"}
        except Exception as e:
            log_exception_with_traceback(f"Error deleting game {game_id}: {e}", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete game: {str(e)}",
            )

    return router
