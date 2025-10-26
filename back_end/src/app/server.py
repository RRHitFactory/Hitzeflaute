"""
FastAPI server for PowerFlowGame that bridges React frontend and Python backend.
Combines REST endpoints for serving the React app and managing games,
with WebSocket connections for real-time message communication.
"""

import json
import logging
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.app.game_manager import GameManager
from src.app.game_repo.file_game_repo import FileGameStateRepo
from src.engine.engine import Engine
from src.models.ids import GameId, PlayerId
from src.models.message import (
    BuyRequest,
    EndTurn,
    GameToPlayerMessage,
    OperateLineRequest,
    UpdateBidRequest,
)

# Serialization handled by message objects directly

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses
class CreateGameRequest(BaseModel):
    player_names: list[str]


class CreateGameResponse(BaseModel):
    game_id: str
    message: str


class GameStateResponse(BaseModel):
    game_state: dict
    success: bool
    message: str


class ConnectionManager:
    """Manages WebSocket connections for real-time communication"""

    def __init__(self):
        # Dictionary mapping game_id -> player_id -> WebSocket
        self.active_connections: dict[GameId, dict[PlayerId, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: GameId, player_id: PlayerId):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
        self.active_connections[game_id][player_id] = websocket
        logger.info(f"Player {player_id} connected to game {game_id}")

    def disconnect(self, game_id: GameId, player_id: PlayerId):
        if game_id in self.active_connections:
            if player_id in self.active_connections[game_id]:
                del self.active_connections[game_id][player_id]
                logger.info(f"Player {player_id} disconnected from game {game_id}")
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def send_to_one_player(self, message: str, game_id: GameId, player_id: PlayerId):
        if game_id in self.active_connections and player_id in self.active_connections[game_id]:
            websocket = self.active_connections[game_id][player_id]
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {player_id} in game {game_id}: {e}")
                self.disconnect(game_id, player_id)

    async def send_to_all_players(self, message: str, game_id: GameId):
        """Send message to all players in a game"""
        if game_id in self.active_connections:
            disconnected_players = []
            for player_id, websocket in self.active_connections[game_id].items():
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending message to {player_id} in game {game_id}: {e}")
                    disconnected_players.append(player_id)

            # Clean up disconnected players
            for player_id in disconnected_players:
                self.disconnect(game_id, player_id)


class WebSocketFrontEnd:
    """Frontend adapter that sends messages via WebSocket"""

    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager

    def handle_player_messages(self, msgs: list[GameToPlayerMessage]) -> None:
        """Handle messages from game engine and send to appropriate players via WebSocket"""
        for msg in msgs:
            try:
                # Convert message to simple dict for JSON serialization
                message_data = {"type": "game_message", "message_class": msg.__class__.__name__, "data": msg.to_simple_dict()}

                import asyncio

                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If we're in an async context, create a task
                    asyncio.create_task(self.connection_manager.send_to_one_player(json.dumps(message_data), msg.game_id, msg.player_id))
                else:
                    # If not in async context, run it
                    loop.run_until_complete(self.connection_manager.send_to_one_player(json.dumps(message_data), msg.game_id, msg.player_id))

            except Exception as e:
                logger.error(f"Error handling message {msg}: {e}")


# Initialize FastAPI app
app = FastAPI(title="PowerFlowGame Server", description="Server for PowerFlowGame with REST API and WebSocket support", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize connection manager and components
connection_manager = ConnectionManager()
websocket_frontend = WebSocketFrontEnd(connection_manager)
game_repo = FileGameStateRepo()
game_manager = GameManager(game_repo=game_repo, game_engine=Engine(), front_end=websocket_frontend)

# Frontend static file serving
frontend_dist_path = Path(__file__).parent.parent.parent.parent / "front_end" / "dist"
if frontend_dist_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dist_path / "static")), name="static")


@app.get("/")
async def serve_react_app():
    """Serve the React application"""
    index_path = frontend_dist_path / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    else:
        return HTMLResponse(content="<h1>PowerFlowGame Server</h1><p>Frontend not built. Run <code>npm run build</code> in the front_end directory.</p>", status_code=200)


# REST API Endpoints


@app.post("/api/games", response_model=CreateGameResponse)
async def create_game(request: CreateGameRequest):
    """Create a new game"""
    try:
        if not request.player_names or len(request.player_names) < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one player name is required")

        game_id = GameManager.new_game(game_repo, request.player_names)

        return CreateGameResponse(game_id=str(game_id), message=f"Game created successfully with {len(request.player_names)} players")
    except Exception as e:
        logger.error(f"Error creating game: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create game: {str(e)}")


@app.get("/api/games")
async def list_games():
    """List all available games"""
    try:
        game_ids = game_repo.list_game_ids()
        return {"games": [str(game_id) for game_id in game_ids], "count": len(game_ids)}
    except Exception as e:
        logger.error(f"Error listing games: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to list games: {str(e)}")


@app.get("/api/games/{game_id}", response_model=GameStateResponse)
async def get_game_state(game_id: str):
    """Get current game state"""
    try:
        game_state = game_repo.get_game_state(GameId(int(game_id)))

        return GameStateResponse(game_state=game_state.to_simple_dict(), success=True, message="Game state retrieved successfully")
    except Exception as e:
        logger.error(f"Error getting game state for {game_id}: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Game {game_id} not found or error retrieving state: {str(e)}")


@app.delete("/api/games/{game_id}")
async def delete_game(game_id: str):
    """Delete a game"""
    try:
        game_repo.delete_game_state(GameId(int(game_id)))
        return {"message": f"Game {game_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting game {game_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete game: {str(e)}")


# WebSocket endpoint for real-time communication


@app.websocket("/ws/{game_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    """WebSocket endpoint for real-time game communication"""
    game_id_true = GameId(int(game_id))
    player_id_true = PlayerId(int(player_id))
    await connection_manager.connect(websocket, game_id_true, player_id_true)

    # Send initial game state
    try:
        game_state = game_repo.get_game_state(GameId(int(game_id)))
        initial_message = {"type": "game_state", "data": game_state.to_simple_dict()}
        await websocket.send_text(json.dumps(initial_message))
    except Exception as e:
        logger.error(f"Error sending initial game state: {e}")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
                await handle_websocket_message(message_data, game_id_true, player_id_true)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from {player_id_true} in game {game_id_true}: {data}")
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON format"}))
            except Exception as e:
                logger.error(f"Error handling message from {player_id_true} in game {game_id_true}: {e}")
                await websocket.send_text(json.dumps({"type": "error", "message": f"Error processing message: {str(e)}"}))

    except WebSocketDisconnect:
        connection_manager.disconnect(game_id_true, player_id_true)
        logger.info(f"Player {player_id_true} disconnected from game {game_id_true}")


async def handle_websocket_message(message_data: dict, game_id: GameId, player_id: PlayerId):
    """Handle incoming WebSocket messages and convert them to game messages"""

    message_type = message_data.get("type")
    data = message_data.get("data", {})

    # Create the appropriate PlayerToGameMessage based on message type
    player_message = None

    try:
        if message_type == "buy_request":
            player_message = BuyRequest.from_simple_dict({**data, "player_id": PlayerId(player_id), "game_id": GameId(int(game_id))})
        elif message_type == "update_bid_request":
            player_message = UpdateBidRequest.from_simple_dict({**data, "player_id": PlayerId(player_id), "game_id": GameId(int(game_id))})
        elif message_type == "operate_line_request":
            player_message = OperateLineRequest.from_simple_dict({**data, "player_id": PlayerId(player_id), "game_id": GameId(int(game_id))})
        elif message_type == "end_turn":
            player_message = EndTurn(player_id=PlayerId(player_id), game_id=GameId(int(game_id)))
        else:
            logger.warning(f"Unknown message type: {message_type}")
            return

        if player_message:
            # Handle the message through GameManager
            game_manager.handle_player_message(GameId(int(game_id)), player_message)

    except Exception as e:
        logger.error(f"Error creating player message: {e}")
        # Send error back to client
        error_message = {"type": "error", "message": f"Error processing {message_type}: {str(e)}"}
        await connection_manager.send_to_one_player(json.dumps(error_message), game_id, player_id)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "PowerFlowGame server is running",
        "active_games": len(game_repo.list_game_ids()),
        "active_connections": sum(len(players) for players in connection_manager.active_connections.values()),
    }


# Development server runner
def run_server(host: str = "127.0.0.1", port: int = 8000, reload: bool = True):
    """Run the FastAPI server"""
    uvicorn.run("src.app.server:app", host=host, port=port, reload=reload, log_level="info")


if __name__ == "__main__":
    run_server()
