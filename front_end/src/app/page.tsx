"use client";

import BiddingTable from "@/components/Game/BiddingTable";
import GridVisualization from "@/components/Game/GridVisualization";
import { GamePhase } from "@/types/game";
import GameControls from "@/components/UI/GameControls";
import GameStatus from "@/components/UI/GameStatus";
import PlayerTable from "@/components/UI/PlayerTable";
import { useCreateGame, useGamesList } from "@/lib/gameAPI";
import { useGameWebSocket, type WebSocketMessage } from "@/lib/gameWebSocket";
import React, { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [gameId, setGameId] = useState<number>(-1);
  const DEFAULT_PLAYER = 1; // For demo purposes, assume player_1 is active
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number>(-1);

  // Setup states
  const [showSetup, setShowSetup] = useState(true);
  const [gameMode, setGameMode] = useState<"local" | "online">("online");
  const [action, setAction] = useState<"create" | "load">("create");
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>([
    "Player 1",
    "Player 2",
  ]);

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
  } = useGameWebSocket(gameId, DEFAULT_PLAYER, callbacks);

  // Calculate current player from gameState (who is having their turn)
  const currentPlayer = React.useMemo(() => {
    if (!gameState) return DEFAULT_PLAYER;

    // Handle both array format (sample data) and repo format (backend)
    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    // Find the player who is currently having their turn
    const activePlayer = playersArray.find((p: any) => p.is_having_turn);
    return activePlayer ? activePlayer.id : DEFAULT_PLAYER;
  }, [gameState]);

  // Calculate current player object and name from gameState
  const currentPlayerObj = React.useMemo(() => {
    if (!gameState) return null;

    // Handle both array format (sample data) and repo format (backend)
    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    return playersArray.find((p: any) => p.id === currentPlayer);
  }, [gameState, currentPlayer]);

  // Calculate current player name and trigram from gameState
  const currentPlayerName = React.useMemo(() => {
    return currentPlayerObj ? currentPlayerObj.name : `Player ${currentPlayer}`;
  }, [currentPlayerObj, currentPlayer]);

  const currentPlayerTrigram = React.useMemo(() => {
    return currentPlayerObj ? currentPlayerObj.trigram : `P${currentPlayer}`;
  }, [currentPlayerObj, currentPlayer]);

  const { createGame, loading: creatingGame } = useCreateGame();
  const { games, loading: gamesLoading, error: gamesError } = useGamesList();

  const startGame = async () => {
    try {
      setLoading(true);
      setError(null);

      if (action === "create") {
        const result = await createGame(playerNames);
        setGameId(parseInt(result.game_id));
      } else if (action === "load" && selectedGameId !== -1) {
        setGameId(selectedGameId);
      }

      setShowSetup(false);
    } catch (err) {
      console.error("Failed to start game:", err);
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  // Update playerNames when numPlayers changes
  React.useEffect(() => {
    if (action === "create") {
      const newNames = Array.from(
        { length: numPlayers },
        (_, i) => `Player ${i + 1}`,
      );
      setPlayerNames(newNames);
    }
  }, [numPlayers, action]);

  // Set WebSocket currentPlayerId based on gameMode
  React.useEffect(() => {
    if (wsClient && !showSetup) {
      if (gameMode === "local") {
        wsClient.setCurrentPlayerId(currentPlayer);
      } else {
        wsClient.setCurrentPlayerId(DEFAULT_PLAYER);
      }
    }
  }, [wsClient, showSetup, gameMode, currentPlayer]);

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

  const [pendingActivations, setPendingActivations] = useState<{
    lines: Record<number, boolean>;
    assets: Record<number, boolean>;
  }>({ lines: {}, assets: {} });
  const [pendingBids, setPendingBids] = useState<Record<number, number>>({});

  // State to track insufficient funds status from BiddingTable
  const [hasInsufficientFunds, setHasInsufficientFunds] = useState(false);

  // Reset pending activations when current player or phase changes
  useEffect(() => {
    setPendingActivations({ lines: {}, assets: {} });
    setPendingBids({});
  }, [gameState?.phase, currentPlayer]);

  const handleActivateLine = (lineId: number) => {
    // Store activation in pending state
    setPendingActivations((prev) => ({
      ...prev,
      lines: { ...prev.lines, [lineId]: true },
    }));
    console.log(`Activating line ${lineId} - stored locally`);
  };

  const handleDeactivateLine = (lineId: number) => {
    // Store deactivation in pending state
    setPendingActivations((prev) => ({
      ...prev,
      lines: { ...prev.lines, [lineId]: false },
    }));
    console.log(`Deactivating line ${lineId} - stored locally`);
  };

  const handleActivateAsset = (assetId: number) => {
    // Store activation in pending state
    setPendingActivations((prev) => ({
      ...prev,
      assets: { ...prev.assets, [assetId]: true },
    }));
    console.log(`Activating asset ${assetId} - stored locally`);
  };

  const handleDeactivateAsset = (assetId: number) => {
    // Store deactivation in pending state
    setPendingActivations((prev) => ({
      ...prev,
      assets: { ...prev.assets, [assetId]: false },
    }));
    console.log(`Deactivating asset ${assetId} - stored locally`);
  };

  const handleEndTurn = () => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }

    // Submit pending activations if in sneaky tricks phase
    if (gameState?.phase === 1) {
      const hasActivations =
        Object.keys(pendingActivations.lines).length > 0 ||
        Object.keys(pendingActivations.assets).length > 0;
      if (hasActivations) {
        console.log("Submitting activation updates:", pendingActivations);
        wsClient.activationUpdate({
          line_activation: pendingActivations.lines,
          asset_activation: pendingActivations.assets,
        });
      }
    }

    // Submit pending bids if in bidding phase
    if (gameState?.phase === 2) {
      if (Object.keys(pendingBids).length > 0) {
        console.log("Submitting pending bids:", pendingBids);
        wsClient.submitBatchBids(pendingBids);
      }
    }

    // Clear pending activations and bids at end of turn
    setPendingActivations({ lines: {}, assets: {} });
    setPendingBids({});

    console.log("Ending turn");
    wsClient.endTurn();
  };

  const handleBidAsset = (assetId: number, newBidPrice: number) => {
    // Store bid locally instead of sending immediately
    setPendingBids((prev) => ({
      ...prev,
      [assetId]: newBidPrice,
    }));
    console.log("Stored bid for asset:", assetId, "to:", newBidPrice);
  };

  // Show setup screen if not yet started
  if (showSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Power Flow Game Setup
          </h1>

          {/* Game Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center text-gray-500">
                <input
                  type="radio"
                  value="local"
                  checked={gameMode === "local"}
                  onChange={(e) =>
                    setGameMode(e.target.value as "local" | "online")
                  }
                  className="mr-2"
                />
                Local Multiplayer
              </label>
              <label className="flex items-center text-gray-500">
                <input
                  type="radio"
                  value="online"
                  checked={gameMode === "online"}
                  onChange={(e) =>
                    setGameMode(e.target.value as "local" | "online")
                  }
                  className="mr-2"
                />
                Online Multiplayer
              </label>
            </div>
          </div>

          {/* Action Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <div className="space-y-2">
              <label className="flex items-center text-gray-500">
                <input
                  type="radio"
                  value="create"
                  checked={action === "create"}
                  onChange={(e) =>
                    setAction(e.target.value as "create" | "load")
                  }
                  className="mr-2"
                />
                Create New Game
              </label>
              <label className="flex items-center text-gray-500">
                <input
                  type="radio"
                  value="load"
                  checked={action === "load"}
                  onChange={(e) =>
                    setAction(e.target.value as "create" | "load")
                  }
                  className="mr-2"
                />
                Load Existing Game
              </label>
            </div>
          </div>

          {/* Conditional Content */}
          {action === "load" ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Game
              </label>
              {gamesLoading ? (
                <p>Loading games...</p>
              ) : gamesError ? (
                <p className="text-red-600">
                  Error loading games:{" "}
                  {(gamesError as Error)?.message || "Unknown error"}
                </p>
              ) : games.length === 0 ? (
                <p>No saved games found.</p>
              ) : (
                <select
                  value={selectedGameId !== -1 ? selectedGameId : -1}
                  onChange={(e) =>
                    setSelectedGameId(
                      e.target.value ? parseInt(e.target.value) : -1,
                    )
                  }
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-500"
                >
                  <option value="">Select a game...</option>
                  {(games as Array<{ game_id: number; players: string[] }>).map(
                    (game) => (
                      <option key={game.game_id} value={game.game_id}>
                        Game {game.game_id} - Players: {game.players.join(", ")}
                      </option>
                    ),
                  )}
                </select>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Players
              </label>
              <div className="flex gap-2 mb-4">
                {[2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setNumPlayers(num)}
                    className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors ${
                      numPlayers === num
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Names
              </label>
              {playerNames.map((name, index) => (
                <input
                  key={index}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newNames = [...playerNames];
                    newNames[index] = e.target.value;
                    setPlayerNames(newNames);
                  }}
                  placeholder={`Player ${index + 1}`}
                  className="w-full p-2 mb-2 border border-gray-300 rounded-md text-gray-500"
                />
              ))}
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={startGame}
            disabled={
              (action === "load" && selectedGameId === -1) ||
              (action === "create" && playerNames.some((name) => !name.trim()))
            }
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

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
                onActivateLine={handleActivateLine}
                onDeactivateLine={handleDeactivateLine}
                onActivateAsset={handleActivateAsset}
                onDeactivateAsset={handleDeactivateAsset}
                currentPlayer={currentPlayer}
                pendingActivations={pendingActivations}
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
              currentPlayerTrigram={currentPlayerTrigram}
              currentPlayerColor={currentPlayerObj?.color}
              isConnected={isConnected}
              onEndTurn={handleEndTurn}
              hasInsufficientFunds={hasInsufficientFunds}
            />

            {/* Bidding Table (only shown during bidding phase) */}
            {gameState.phase === GamePhase.BIDDING && (
              <BiddingTable
                assets={gameState.assets.data}
                currentPlayer={currentPlayer}
                playerMoney={currentPlayerObj?.money || 0}
                pendingBids={pendingBids}
                onBidChange={handleBidAsset}
                onInsufficientFundsChange={setHasInsufficientFunds}
              />
            )}

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
