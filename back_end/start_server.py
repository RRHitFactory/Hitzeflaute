#!/usr/bin/env python3
"""
Startup script for PowerFlowGame Server
Run this to start the FastAPI server that serves the React frontend and handles WebSocket communication.
"""

import sys
from pathlib import Path

# Add the src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

if __name__ == "__main__":
    from src.app.server import run_server

    print("Starting PowerFlowGame Server...")
    print("Frontend will be served at: http://127.0.0.1:8000")
    print("API endpoints available at: http://127.0.0.1:8000/docs")
    print("WebSocket endpoint: ws://127.0.0.1:8000/ws/{game_id}/{player_id}")
    print("\nPress Ctrl+C to stop the server")

    run_server(host="127.0.0.1", port=8000, reload=True)
