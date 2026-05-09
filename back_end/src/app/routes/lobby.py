from fastapi import APIRouter, HTTPException, Request, Response, status

from back_end.src.app.routes.cookies import Cookies
from src.app.game_manager import GameManager
from src.app.lobby_manager import LobbyManager
from src.models.ids import GameId
from src.models.server_models import (
    CreateLobbyRequest,
    CreateLobbyResponse,
    JoinLobbyRequest,
    JoinLobbyResponse,
    LobbyInfoResponse,
    LobbyListResponse,
)


def get_lobby_router(
    game_manager: GameManager, lobby_manager: LobbyManager
) -> APIRouter:
    router = APIRouter(prefix="/api/lobby", tags=["lobby"])

    @router.post("/create", response_model=CreateLobbyResponse)
    async def create_lobby(
        request: Request,
        response: Response,
        lobby_request: CreateLobbyRequest,
    ):
        """Create a new lobby"""
        try:
            player_name = lobby_request.player_name

            # Create lobby
            game_id, player_id = lobby_manager.create_lobby(host_name=player_name)

            Cookies.set_player_id(response=response, player_id=player_id)
            Cookies.set_player_name(response=response, name=player_name)

            return CreateLobbyResponse(
                game_id=str(int(game_id)),
                player_id=str(int(player_id)),
                message=f"Lobby created successfully with game ID {game_id}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create lobby: {str(e)}",
            )

    @router.post("/join/{game_id}", response_model=JoinLobbyResponse)
    async def join_lobby(
        request: Request,
        response: Response,
        game_id: str,
        lobby_request: JoinLobbyRequest,
    ):
        """Join an existing lobby"""
        try:
            player_name = lobby_request.player_name

            # Join lobby
            lobby = lobby_manager.get_lobby(GameId(int(game_id)))
            if not lobby:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Lobby {game_id} not found",
                )

            result = lobby_manager.join_lobby(GameId(int(game_id)), player_name)
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to join lobby (may be full or already started)",
                )

            player_id = result.player_id

            # Set cookies
            Cookies.set_player_id(response=response, player_id=player_id)
            Cookies.set_player_name(response=response, name=player_name)

            return JoinLobbyResponse(
                game_id=game_id,
                player_id=str(int(player_id)),
                message=f"Successfully joined lobby {game_id}",
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to join lobby: {str(e)}",
            )

    @router.get("/{game_id}", response_model=LobbyInfoResponse)
    async def get_lobby(game_id: str):
        """Get lobby information"""
        try:
            lobby = lobby_manager.get_lobby(GameId(int(game_id)))
            if not lobby:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Lobby {game_id} not found",
                )

            return LobbyInfoResponse(**lobby.to_dict())
        except Exception as e:
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
        request: Request,
        game_id: str,
    ):
        """Start a lobby (host only)"""
        try:
            player_id = Cookies.get_player_id(request)
            lobby = lobby_manager.get_lobby(GameId(int(game_id)))

            if not lobby:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Lobby {game_id} not found",
                )

            # Check if player is host
            if lobby.host_player_id != player_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the host can start the lobby",
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
                game_repo=game_manager.game_repo, player_names=player_names
            )
            return {"message": f"Lobby started, game created with ID {game_id_obj}"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to start lobby: {str(e)}",
            )

    return router
