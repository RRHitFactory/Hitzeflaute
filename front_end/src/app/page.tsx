"use client";

import GridVisualization from "@/components/Game/GridVisualization";
import GameControls from "@/components/UI/GameControls";
import GameStatus from "@/components/UI/GameStatus";
import PlayerTable from "@/components/UI/PlayerTable";
import { useCreateGame } from "@/lib/gameAPI";
import { useGameWebSocket, type WebSocketMessage } from "@/lib/gameWebSocket";
import React, { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [gameId, setGameId] = useState<number | null>(null);
  const [currentPlayer] = useState(1); // For demo purposes, assume player_1 is active
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize callback functions to prevent infinite re-renders
  const handleMessage = useCallback((msg: WebSocketMessage) => {
    console.log("=== WebSocket Message Received ===");
    if (msg.message_type === "error") {
      console.error("=== SERVER ERROR ===");
      console.error(msg.data);
      setError(msg.data || "Unknown server error");
    }
    console.log("=== End WebSocket Message Processing ===");
  }, []);

  const handleError = useCallback((error: any) => {
    console.error("WebSocket error:", error);
    setError("WebSocket connection error");
  }, []);

  const handleClose = useCallback((event: any) => {
    console.log("WebSocket closed:", event);
  }, []);

  // Memoize the callbacks object to prevent infinite re-renders
  const callbacks = React.useMemo(
    () => ({
      onMessage: handleMessage,
      onError: handleError,
      onClose: handleClose,
    }),
    [handleMessage, handleError, handleClose],
  );

  // Use the WebSocket hook - always call to follow Rules of Hooks
  const {
    client: wsClient,
    connectionState,
    gameState,
    isConnected,
  } = useGameWebSocket(gameId || 0, currentPlayer, callbacks);

  // Calculate current player from gameState (who is having their turn)
  const currentPlayerFromGameState = React.useMemo(() => {
    if (!gameState) return currentPlayer;

    // Handle both array format (sample data) and repo format (backend)
    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    // Find the player who is currently having their turn
    const activePlayer = playersArray.find((p: any) => p.is_having_turn);
    return activePlayer ? activePlayer.id : currentPlayer;
  }, [gameState, currentPlayer]);

  // Calculate current player name from gameState
  const currentPlayerName = React.useMemo(() => {
    if (!gameState) return "Unknown Player";

    // Handle both array format (sample data) and repo format (backend)
    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    const player = playersArray.find(
      (p: any) => p.id === currentPlayerFromGameState,
    );
    return player ? player.name : `Player ${currentPlayerFromGameState}`;
  }, [gameState, currentPlayerFromGameState]);

  const { createGame, loading: creatingGame } = useCreateGame();

  // Create a new game on component mount
  useEffect(() => {
    console.log("🚀 Starting game initialization...");
    const initializeGame = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create a new game with two players
        const result = await createGame(["Player 1", "Player 2"]);
        const newGameId = result.game_id;
        setGameId(newGameId);

        // WebSocket connection is now handled by the useGameWebSocket hook
      } catch (err) {
        console.error("Failed to initialize game:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize game",
        );
      } finally {
        setLoading(false);
      }
    };

    initializeGame();

    // Cleanup is now handled by the useGameWebSocket hook
  }, []); // Run only once on mount

  const handlePurchaseAsset = (assetId: number) => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }

    console.log("Purchasing asset:", assetId);
    wsClient.buyAsset(assetId.toString());
  };

  const handlePurchaseTransmissionLine = (lineId: number) => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }

    console.log("Purchasing transmission line:", lineId);
    wsClient.buyTransmissionLine(lineId.toString());
  };

  const handleBidAsset = (assetId: number, newBidPrice: number) => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }

    console.log("Updating bid for asset:", assetId, "to:", newBidPrice);
    wsClient.updateBid(assetId.toString(), newBidPrice);
  };

  const handleEndTurn = () => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }

    console.log("Ending turn");
    wsClient.endTurn();
  };

  // Show loading screen while initializing
  if (loading || !gameState || connectionState !== "CONNECTED") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Initializing Game...
          </h2>
          <p className="text-gray-600 mt-2">
            {creatingGame
              ? "Creating new game..."
              : connectionState === "CONNECTING"
                ? "Connecting to server..."
                : connectionState === "DISCONNECTED"
                  ? "Waiting for connection..."
                  : "Loading game state..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">
              Power Flow Game
            </h1>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connectionState === "CONNECTED"
                      ? "bg-green-500"
                      : connectionState === "CONNECTING"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm text-gray-600">
                  {connectionState === "CONNECTED"
                    ? "Connected"
                    : connectionState === "CONNECTING"
                      ? "Connecting..."
                      : "Disconnected"}
                </span>
              </div>
              {/* Game Status */}
              <div className="flex-shrink-0">
                <GameStatus
                  phase={gameState.phase}
                  round={gameState.game_round}
                />
              </div>
            </div>
          </div>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Grid Visualization */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold mb-4 text-black">
                Grid Visualization
              </h2>
              <GridVisualization
                gameState={gameState}
                onPurchaseAsset={handlePurchaseAsset}
                onPurchaseTransmissionLine={handlePurchaseTransmissionLine}
                onBidAsset={handleBidAsset}
                currentPlayer={currentPlayerFromGameState}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Controls */}
            <GameControls
              gameState={gameState}
              gameId={gameId?.toString() || null}
              currentPlayerName={currentPlayerName}
              isConnected={isConnected}
              onEndTurn={handleEndTurn}
            />

            {/* Player Information */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-bold mb-4 text-black">Players</h3>
              <PlayerTable
                players={
                  Array.isArray(gameState.players)
                    ? gameState.players
                    : gameState.players?.data || []
                }
                gameState={gameState}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
