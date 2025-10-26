# PowerFlowGame Server

A FastAPI-based server that bridges the React frontend and Python backend for the PowerFlowGame, providing both REST API endpoints and WebSocket communication for real-time gameplay.

## Architecture

The server combines:
- **REST API**: For serving the React frontend and managing games
- **WebSocket**: For real-time message communication between players and the game engine
- **Game Manager**: Interfaces with the existing Python game engine
- **File-based Game Repository**: Persists game states

## Features

### REST API Endpoints

- `GET /` - Serves the React application
- `POST /api/games` - Create a new game
- `GET /api/games` - List all games  
- `GET /api/games/{game_id}` - Get current game state
- `DELETE /api/games/{game_id}` - Delete a game
- `GET /health` - Health check endpoint

### WebSocket Communication

- `ws://localhost:8000/ws/{game_id}/{player_id}` - Real-time game communication
- Handles player actions: buy requests, bid updates, line operations, end turn
- Sends game state updates and messages to players

## Quick Start

### 1. Install Dependencies

```bash
cd back_end
uv sync  # Install Python dependencies including FastAPI, uvicorn, websockets
```

### 2. Build Frontend (Optional)

```bash
cd front_end
npm install
npm run build  # Creates dist/ folder for serving
```

### 3. Start the Server

**Option A: Using the batch file (Windows)**
```bash
cd back_end
start_server.bat
```

**Option B: Using Python directly**
```bash
cd back_end
.venv/Scripts/activate  # Windows
# or
source .venv/bin/activate  # Linux/Mac

python start_server.py
```

**Option C: Using uvicorn directly**
```bash
cd back_end
.venv/Scripts/activate
uvicorn src.app.server:app --reload --host 127.0.0.1 --port 8000
```

### 4. Access the Application

- **Frontend**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/health

## Frontend Integration

### Using the WebSocket Client

```javascript
import { GameWebSocketClient } from '@/lib/gameWebSocket';

// Initialize client
const client = new GameWebSocketClient(
    'game_1', 
    'player_1',
    (data) => console.log('Message received:', data),
    (error) => console.error('WebSocket error:', error),
    (event) => console.log('Connection closed:', event)
);

// Send game actions
client.buyAsset('asset_1');
client.updateBid('asset_2', 25.50);
client.operateLine('line_1', 'open');
client.endTurn();
```

### Using the React Hook

```javascript
import { useGameWebSocket } from '@/lib/gameWebSocket';

function GameComponent({ gameId, playerId }) {
    const { client, connectionState, gameState, messages, isConnected } = useGameWebSocket(
        gameId, 
        playerId,
        {
            onMessage: (data) => console.log('Received:', data),
            onError: (error) => console.error('Error:', error)
        }
    );

    const handleBuyAsset = (assetId) => {
        if (client) {
            client.buyAsset(assetId);
        }
    };

    return (
        <div>
            <p>Connection: {connectionState}</p>
            {gameState && <GameVisualization gameState={gameState} />}
        </div>
    );
}
```

### Using the REST API Client

```javascript
import { GameAPIClient, useCreateGame, useGamesList } from '@/lib/gameAPI';

// Direct usage
const apiClient = new GameAPIClient();
const gameResponse = await apiClient.createGame(['Alice', 'Bob']);
const games = await apiClient.listGames();

// React hooks
function GameLobby() {
    const { createGame, loading, error } = useCreateGame();
    const { games, refresh } = useGamesList();

    const handleCreateGame = async () => {
        try {
            const result = await createGame(['Alice', 'Bob']);
            console.log('Game created:', result.game_id);
            refresh(); // Refresh games list
        } catch (err) {
            console.error('Failed to create game:', err);
        }
    };

    return (
        <div>
            <button onClick={handleCreateGame} disabled={loading}>
                Create Game
            </button>
            <ul>
                {games.map(gameId => <li key={gameId}>{gameId}</li>)}
            </ul>
        </div>
    );
}
```

## Message Protocol

### Client to Server (WebSocket)

```json
{
    "type": "buy_request",
    "data": {
        "purchase_id": "asset_1"
    },
    "game_id": "1",
    "player_id": "player_1"
}
```

### Server to Client (WebSocket)

```json
{
    "type": "game_state",
    "data": {
        "phase": "CONSTRUCTION",
        "round": 1,
        "buses": [...],
        "assets": [...],
        "players": [...]
    }
}
```

```json
{
    "type": "game_message",
    "message_class": "BuyResponse",
    "data": {
        "player_id": "player_1",
        "success": true,
        "message": "Purchase successful",
        "purchase_id": "asset_1"
    }
}
```

## Development

### File Structure

```
back_end/
├── src/app/
│   ├── server.py          # FastAPI server implementation
│   ├── game_manager.py    # Game management logic
│   └── game_repo/         # Game state persistence
├── start_server.py        # Server startup script
├── start_server.bat       # Windows batch file
└── pyproject.toml         # Dependencies including FastAPI

front_end/
├── src/lib/
│   ├── gameWebSocket.js   # WebSocket client
│   └── gameAPI.js         # REST API client
└── dist/                  # Built React app (served by FastAPI)
```

### Adding New Message Types

1. **Python side**: Add message class to `src/models/message.py`
2. **Server side**: Handle in `handle_websocket_message()` in `server.py`
3. **Client side**: Add method to `GameWebSocketClient` class

### Configuration

The server runs on `127.0.0.1:8000` by default. To change:

```python
# In start_server.py
run_server(host="0.0.0.0", port=8080, reload=False)
```

### Logging

The server logs WebSocket connections, message handling, and errors. Check console output for debugging.

## Troubleshooting

### Common Issues

1. **"Virtual environment not found"**: Run `uv sync` in the back_end directory
2. **"Frontend not built"**: Run `npm run build` in the front_end directory  
3. **Connection refused**: Check if server is running on the correct port
4. **CORS errors**: Ensure frontend origin is added to CORS middleware in server.py

### Health Check

Visit http://127.0.0.1:8000/health to verify server status:

```json
{
    "status": "healthy",
    "message": "PowerFlowGame server is running",
    "active_games": 2,
    "active_connections": 4
}
```

## Production Deployment

For production deployment:

1. Set `reload=False` in server startup
2. Use a production ASGI server like Gunicorn with uvicorn workers
3. Configure proper CORS origins
4. Set up reverse proxy (nginx) for static file serving
5. Use a proper database instead of file-based storage