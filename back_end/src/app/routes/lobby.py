import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from src.app.game_manager import GameManager
from src.app.lobby_manager import LobbyManager
from src.app.lobby_ws_manager import LobbyWebSocketConnectionManager
from src.app.routes.logging import log_exception_with_traceback
from src.models.ids import GameId, PlayerId
from src.models.server_models import (
    CreateLobbyResponse,
    JoinLobbyRequest,
    JoinLobbyResponse,
    LobbyInfoResponse,
    LobbyListResponse,
)


def get_lobby_ws_router(
    lobby_ws_manager: LobbyWebSocketConnectionManager,
) -> APIRouter:
    router = APIRouter(prefix="/ws/lobby", tags=["lobby_websocket"])

    @router.websocket("/{game_id}/{player_id}")
    async def lobby_websocket_endpoint(
        websocket: WebSocket, game_id: str, player_id: str
    ) -> None:
        """WebSocket endpoint for real-time lobby communication"""
        game_id_true = GameId(int(game_id))
        player_id_true = PlayerId(int(player_id))

        await lobby_ws_manager.connect(websocket, game_id_true, player_id_true)

        try:
            while True:
                # Receive message from client (we mostly just keep connection alive)
                data = await websocket.receive_text()

                try:
                    message = json.loads(data)
                    # For now, we just keep the connection open
                    # In the future, we could handle lobby-specific messages
                    console_logger = print  # Use print for now
                    console_logger(f"Received lobby message: {message}")
                except json.JSONDecodeError as e:
                    error_msg = f"Invalid JSON from {player_id_true} in lobby {game_id_true}: {data}"
                    log_exception_with_traceback(error_msg, e)

        except WebSocketDisconnect:
            lobby_ws_manager.disconnect(game_id_true, player_id_true)
            # Normal disconnect when client navigates away - don't log as error
            console_logger = print
            console_logger(f"Player {player_id_true} disconnected from lobby {game_id_true}")

    return router


def get_lobby_rest_router(
    game_manager: GameManager,
    lobby_manager: LobbyManager,
    lobby_ws_manager: LobbyWebSocketConnectionManager,
) -> APIRouter:
    router = APIRouter(prefix="/api/lobby", tags=["lobby"])

    @router.post("/create", response_model=CreateLobbyResponse)
    async def create_lobby():
        """Create a new lobby"""
        try:
            game_id = lobby_manager.create_lobby()

            return CreateLobbyResponse(
                game_id=game_id,
                message="Lobby created successfully",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create lobby: {str(e)}",
            )

    @router.post("/join/{game_id}", response_model=JoinLobbyResponse)
    async def join_lobby(
        game_id: int,
        lobby_request: JoinLobbyRequest,
    ):
        """Join an existing lobby"""
        try:
            player_name = lobby_request.player_name

            # Join lobby
            lobby = lobby_manager.get_lobby(GameId(game_id))
            if not lobby:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Lobby {game_id} not found",
                )

            # Check if player is already in the lobby
            existing_player = None
            for pid, player in lobby.players.items():
                if player.name == player_name:
                    existing_player = player
                    break

            if existing_player:
                # Player already joined, return their player_id
                player_id = existing_player.player_id
            else:
                result = lobby_manager.join_lobby(GameId(game_id), player_name)
                if not result:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to join lobby (may be full or already started)",
                    )
                player_id = result.player_id

            # Broadcast to all lobby members the new list of players
            lobby_msg = LobbyInfoResponse(**lobby.to_dict()).model_dump_json()
            message = json.dumps({"message_type": "lobby_update", "message": lobby_msg})
            await lobby_ws_manager.broadcast_to_lobby(GameId(int(game_id)), message)

            return JoinLobbyResponse(
                game_id=game_id,
                player_id=str(player_id),
                message="Successfully joined lobby",
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to join lobby: {str(e)}",
            )

    @router.get("/info/{game_id}", response_model=LobbyInfoResponse)
    async def get_lobby(game_id: int):
        """Get lobby information"""
        try:
            lobby = lobby_manager.get_lobby(GameId(game_id))
            if not lobby:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Lobby {game_id} not found",
                )

            return LobbyInfoResponse(**lobby.to_dict())
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get lobby info: {str(e)}",
            )

    @router.get("", response_model=LobbyListResponse)
    async def list_lobbies():
        """List all active lobbies"""
        try:
            lobbies = lobby_manager.list_lobbies()
            return LobbyListResponse(lobbies=lobbies, count=len(lobbies))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list lobbies: {str(e)}",
            )

    @router.post("/start/{game_id}")
    async def start_lobby(
        game_id: str,
    ):
        """Start a lobby (host only) - requires game_id in request body or query"""
        try:
            # For now, skip host check since we don't have player_id from cookies
            # In a full implementation, you'd need to pass player_id in the request
            lobby = lobby_manager.get_lobby(GameId(int(game_id)))

            if not lobby:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Lobby {game_id} not found",
                )

            # Start the lobby
            success = lobby_manager.start_lobby(GameId(int(game_id)))
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot start lobby (need at least 2 players)",
                )

            # Create the actual game from lobby
            player_names = lobby.get_player_names()
            game_id_obj = game_manager.new_game(
                game_repo=game_manager.game_repo, player_names=player_names, turn_type="online"
            )

            # Broadcast to all lobby members that game has started
            message = json.dumps(
                {"message_type": "game_started", "game_id": int(game_id_obj)}
            )
            await lobby_ws_manager.broadcast_to_lobby(GameId(int(game_id)), message)

            return {
                "message": f"Lobby started, game created with ID {game_id_obj}",
                "game_id": int(game_id_obj),
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to start lobby: {str(e)}",
            )

    return router
