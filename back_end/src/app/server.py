"""
FastAPI server for PowerFlowGame that bridges React frontend and Python backend.
Combines REST endpoints for serving the React app and managing games,
with WebSocket connections for real-time message communication.
"""

from pathlib import Path
import socket

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from src.app.lobby_manager import LobbyManager
from src.app.lobby_ws_manager import LobbyWebSocketConnectionManager
from src.app.ws_manager import WebSocketConnectionManager
from src.app.game_manager import GameManager
from src.app.game_repo.file_game_repo import FileGameStateRepo
from src.app.routes.game import get_game_rest_router, get_game_ws_router
from src.app.routes.lobby import get_lobby_rest_router, get_lobby_ws_router
from src.engine.engine import Engine

def get_local_ip():
    """Get the local network IP address"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


# Initialize FastAPI app
app = FastAPI(
    title="PowerFlowGame Server",
    description="Server for PowerFlowGame with REST API and WebSocket support",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://127.0.0.1",
        "capacitor://localhost",
        f"http://{get_local_ip()}:8000",
        f"http://{get_local_ip()}:3000",
    ],  # React dev server + mobile origins + local network IP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize connection manager and components

game_repo = FileGameStateRepo()
game_manager = GameManager(game_repo=game_repo, game_engine=Engine())
ws_manager = WebSocketConnectionManager()
game_manager.set_front_end(ws_manager)


lobby_manager = LobbyManager(game_manager=game_manager)
lobby_ws_manager = LobbyWebSocketConnectionManager()
# REST API Endpoints

lobby_rest_router = get_lobby_rest_router(
    game_manager=game_manager,
    lobby_manager=lobby_manager,
    lobby_ws_manager=lobby_ws_manager,
)
lobby_ws_router = get_lobby_ws_router(lobby_ws_manager=lobby_ws_manager)
game_ws_router = get_game_ws_router(
    ws_connection_manager=ws_manager, game_manager=game_manager
)
game_rest_router = get_game_rest_router(game_repo=game_repo)

# Mount lobby routes
app.include_router(lobby_rest_router)
app.include_router(lobby_ws_router)
app.include_router(game_ws_router)
app.include_router(game_rest_router)


# Frontend static file serving
frontend_dist_path = Path(__file__).parent.parent.parent.parent / "front_end" / "dist"
if frontend_dist_path.exists():
    app.mount(
        "/static",
        StaticFiles(directory=str(frontend_dist_path / "static")),
        name="static",
    )


@app.get("/")
async def serve_react_app():
    """Serve the React application"""
    index_path = frontend_dist_path / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    else:
        return HTMLResponse(
            content="<h1>PowerFlowGame Server</h1><p>Frontend not built. Run <code>npm run build</code> in the front_end directory.</p>",
            status_code=200,
        )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "PowerFlowGame server is running",
        "active_games": len(game_repo.list_games()),
        "active_connections": sum(
            len(players) for players in ws_manager.active_connections.values()
        ),
    }


# Development server runner
def run_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = True):
    """Run the FastAPI server"""
    uvicorn.run(
        "src.app.server:app", host=host, port=port, reload=reload, log_level="info"
    )


if __name__ == "__main__":
    run_server()
