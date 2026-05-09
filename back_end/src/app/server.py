"""
FastAPI server for PowerFlowGame that bridges React frontend and Python backend.
Combines REST endpoints for serving the React app and managing games,
with WebSocket connections for real-time message communication.
"""

from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from back_end.src.app.lobby_manager import LobbyManager
from back_end.src.app.ws_manager import WebSocketConnectionManager
from src.app.game_manager import GameManager
from src.app.game_repo.file_game_repo import FileGameStateRepo
from src.app.routes.game import get_game_router
from src.app.routes.lobby import get_lobby_router
from src.app.routes.web_socket import get_ws_router
from src.engine.engine import Engine

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
    ],  # React dev server
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
# REST API Endpoints

lobby_router = get_lobby_router(game_manager=game_manager, lobby_manager=lobby_manager)
ws_router = get_ws_router(ws_connection_manager=ws_manager, game_manager=game_manager)
game_router = get_game_router(game_repo=game_repo)

# Mount lobby routes
app.include_router(lobby_router)
app.include_router(ws_router)
app.include_router(game_router)


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
def run_server(host: str = "127.0.0.1", port: int = 8000, reload: bool = True):
    """Run the FastAPI server"""
    uvicorn.run(
        "src.app.server:app", host=host, port=port, reload=reload, log_level="info"
    )


if __name__ == "__main__":
    run_server()
