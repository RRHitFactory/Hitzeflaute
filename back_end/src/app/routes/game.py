from fastapi import APIRouter, HTTPException, status

from back_end.src.app.game_repo.base import BaseGameStateRepo
from back_end.src.app.routes.logging import log_exception_with_traceback
from src.app.game_manager import GameManager
from src.models.ids import GameId
from src.models.server_models import (
    CreateGameRequest,
    CreateGameResponse,
    GameStateResponse,
)


def get_game_router(game_repo: BaseGameStateRepo) -> APIRouter:
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
                    games_info.append(
                        {"game_id": str(game_id), "players": player_names}
                    )
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
            log_exception_with_traceback(
                f"Error getting game state for {game_id}: {e}", e
            )
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
