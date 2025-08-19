import asyncio
import json
import websockets
import uuid
from typing import Dict, Any

from src.app.game_manager import GameManager
from src.engine.engine import Engine
from src.models.game_state import GameState
from src.models.message import Message, MessageType, RegisterPlayer, LoadGame, PlayerAction, GameStateMessage, ErrorMessage, InfoMessage
from src.models.ids import PlayerId

# In-memory storage for active games and player connections
active_games: Dict[str, GameManager] = {}
player_connections: Dict[PlayerId, websockets.WebSocketServerProtocol] = {}
player_game_map: Dict[PlayerId, str] = {} # Map player ID to game ID

async def register_player(websocket, data: RegisterPlayer):
    """Registers a new player and sends back their assigned ID."""
    player_id = PlayerId(str(uuid.uuid4()))
    player_connections[player_id] = websocket
    await websocket.send(json.dumps(InfoMessage(message=f"Registered with ID: {player_id.id}").dict()))
    print(f"Player registered: {player_id}")

async def load_game(websocket, player_id: PlayerId, data: LoadGame):
    """Loads a game for a player."""
    game_id = data.game_id
    if game_id not in active_games:
        # In a real application, you would load the game state from a file or database
        # For this prototype, we'll create a new game if it doesn't exist
        print(f"Game {game_id} not found. Creating a new one.")
        engine = Engine() # You might need to pass initial settings here
        active_games[game_id] = GameManager(engine) # Pass a way to save/load later
        # Add the player to the new game (this logic might need adjustment based on your GameManager)
        # For now, assume adding a player is implicit or handled by GameManager
        active_games[game_id].add_player(player_id) # Assuming GameManager has this method
    else:
        # Add the player to an existing game
        active_games[game_id].add_player(player_id) # Assuming GameManager has this method

    player_game_map[player_id] = game_id
    game_manager = active_games[game_id]

    await send_game_state_to_player(player_id, game_manager.game_state)
    await websocket.send(json.dumps(InfoMessage(message=f"Loaded game: {game_id}").dict()))
    print(f"Player {player_id} loaded game {game_id}")


async def handle_player_action(websocket, player_id: PlayerId, data: PlayerAction):
    """Handles an action from a player."""
    game_id = player_game_map.get(player_id)
    if not game_id or game_id not in active_games:
        await websocket.send(json.dumps(ErrorMessage(message="Not in a game.").dict()))
        return

    game_manager = active_games[game_id]

    # Check if it's the player's turn
    if game_manager.game_state.current_player != player_id:
         await websocket.send(json.dumps(ErrorMessage(message="It's not your turn.").dict()))
         return

    # Process the action using the GameManager
    try:
        # This is a simplified example. You'll need to adapt this based on
        # the actual structure of your PlayerAction and GameManager methods.
        if data.action_type == "build":
            result = game_manager.build_asset(player_id, data.payload)
        elif data.action_type == "transmit":
             result = game_manager.transmit_power(player_id, data.payload)
        elif data.action_type == "end_turn":
            result = game_manager.end_turn(player_id)
        else:
            await websocket.send(json.dumps(ErrorMessage(message=f"Unknown action type: {data.action_type}").dict()))
            return

        # After processing, update all players in the game
        await broadcast_game_state(game_id, game_manager.game_state)
        print(f"Player {player_id} performed action {data.action_type} in game {game_id}")

    except Exception as e:
        await websocket.send(json.dumps(ErrorMessage(message=f"Error processing action: {e}").dict()))
        print(f"Error processing action for player {player_id}: {e}")


async def send_game_state_to_player(player_id: PlayerId, game_state: GameState):
    """Sends the current game state to a specific player."""
    if player_id in player_connections:
        websocket = player_connections[player_id]
        try:
            # Assuming GameState can be serialized to JSON
            await websocket.send(json.dumps(GameStateMessage(game_state=game_state.dict()).dict()))
        except websockets.exceptions.ConnectionClosedOK:
            print(f"Player {player_id} connection closed. Removing.")
            del player_connections[player_id]
            if player_id in player_game_map:
                del player_game_map[player_id]
        except Exception as e:
            print(f"Error sending game state to player {player_id}: {e}")

async def broadcast_game_state(game_id: str, game_state: GameState):
    """Sends the current game state to all players in a specific game."""
    player_ids_in_game = [pid for pid, gid in player_game_map.items() if gid == game_id]
    for player_id in player_ids_in_game:
        await send_game_state_to_player(player_id, game_state)

async def handler(websocket):
    """Handles incoming websocket connections and messages."""
    player_id = None
    try:
        async for message_text in websocket:
            try:
                message = Message(**json.loads(message_text))
                print(f"Received message from {player_id or 'unknown'}: {message.type}")

                if message.type == MessageType.REGISTER_PLAYER:
                    await register_player(websocket, RegisterPlayer(**message.payload))
                    # Get the newly assigned player_id
                    player_id = next(p for p, conn in player_connections.items() if conn == websocket)

                elif message.type == MessageType.LOAD_GAME:
                    if not player_id:
                        await websocket.send(json.dumps(ErrorMessage(message="Please register first.").dict()))
                        continue
                    await load_game(websocket, player_id, LoadGame(**message.payload))

                elif message.type == MessageType.PLAYER_ACTION:
                    if not player_id:
                        await websocket.send(json.dumps(ErrorMessage(message="Please register first.").dict()))
                        continue
                    await handle_player_action(websocket, player_id, PlayerAction(**message.payload))

                else:
                    await websocket.send(json.dumps(ErrorMessage(message="Unknown message type.").dict()))

            except json.JSONDecodeError:
                await websocket.send(json.dumps(ErrorMessage(message="Invalid JSON.").dict()))
            except Exception as e:
                await websocket.send(json.dumps(ErrorMessage(message=f"Server error: {e}").dict()))
                print(f"Error in handler: {e}")

    except websockets.exceptions.ConnectionClosedOK:
        print(f"Connection closed for {player_id}")
    finally:
        # Clean up connection and player info on disconnect
        if player_id in player_connections:
            del player_connections[player_id]
        if player_id in player_game_map:
            del player_game_map[player_id]
        print(f"Player {player_id} disconnected.")


async def main():
    """Starts the websocket server."""
    port = 8765
    async with websockets.serve(handler, "localhost", port):
        print(f"Websocket server started on ws://localhost:{port}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())