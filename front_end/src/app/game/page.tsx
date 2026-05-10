"use client";

import BiddingTable from "@/components/Game/BiddingTable";
import GridVisualization from "@/components/Game/GridVisualization";
import GameControls from "@/components/UI/GameControls";
import GameStatus from "@/components/UI/GameStatus";
import PlayerTable from "@/components/UI/PlayerTable";
import { useGameWebSocket, type WebSocketMessage } from "@/lib/gameWebSocket";
import { GamePhase } from "@/types/game";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";

function GameContent() {
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get("gameId");
  const [gameId, setGameId] = useState<number | null>(null);
  const DEFAULT_PLAYER = 1;
  const [error, setError] = useState<string | null>(null);
  const [isEndingTurn, setIsEndingTurn] = useState(false);
  const hasConnectedRef = useRef(false);

  // Initialize gameId from URL param
  useEffect(() => {
    if (gameIdParam) {
      setGameId(parseInt(gameIdParam));
    }
  }, [gameIdParam]);

  // Memoize callback functions to prevent infinite re-renders
  const handleMessage = useCallback(
    (msg: WebSocketMessage) => {
      console.log("=== WebSocket Message Received ===");

      if (msg.message_type === "error") {
        console.error("=== SERVER ERROR ===");
        console.error(msg.data);
        setError(msg.data || "Unknown server error");
      } else if (msg.message_type === "GameUpdate") {
        if (isEndingTurn) {
          console.log("Game state updated, resetting isEndingTurn");
          setIsEndingTurn(false);
        }
      }

      console.log("=== End WebSocket Message Processing ===");
    },
    [isEndingTurn],
  );

  const handleError = useCallback((error: any) => {
    console.error("WebSocket error:", error);
    // Only show error if we've successfully connected before (not initial connection error)
    if (hasConnectedRef.current) {
      setError("WebSocket connection error");
    }
  }, []);

  const handleClose = useCallback((event: any) => {
    console.log("WebSocket closed:", event);
    hasConnectedRef.current = false;
  }, []);

  const callbacks = React.useMemo(
    () => ({
      onMessage: handleMessage,
      onError: handleError,
      onClose: handleClose,
    }),
    [handleMessage, handleError, handleClose],
  );

  const { client: wsClient, connectionState, gameState, isConnected } =
    useGameWebSocket(gameId || -1, DEFAULT_PLAYER, callbacks);

  // Track when we first connect successfully
  useEffect(() => {
    if (connectionState === "CONNECTED" && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
    }
  }, [connectionState]);

  const currentPlayer = React.useMemo(() => {
    if (!gameState) return DEFAULT_PLAYER;

    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    const activePlayer = playersArray.find((p: any) => p.is_having_turn);
    return activePlayer ? activePlayer.id : DEFAULT_PLAYER;
  }, [gameState]);

  const currentPlayerObj = React.useMemo(() => {
    if (!gameState) return null;

    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    return playersArray.find((p: any) => p.id === currentPlayer);
  }, [gameState, currentPlayer]);

  const currentPlayerName = React.useMemo(() => {
    return currentPlayerObj ? currentPlayerObj.name : `Player ${currentPlayer}`;
  }, [currentPlayerObj, currentPlayer]);

  const currentPlayerTrigram = React.useMemo(() => {
    return currentPlayerObj ? currentPlayerObj.trigram : `P${currentPlayer}`;
  }, [currentPlayerObj, currentPlayer]);

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

  const handleActivateLine = (lineId: number) => {
    setPendingActivations((prev) => ({
      ...prev,
      lines: { ...prev.lines, [lineId]: true },
    }));
    console.log(`Activating line ${lineId} - stored locally`);
  };

  const handleDeactivateLine = (lineId: number) => {
    setPendingActivations((prev) => ({
      ...prev,
      lines: { ...prev.lines, [lineId]: false },
    }));
    console.log(`Deactivating line ${lineId} - stored locally`);
  };

  const handleActivateAsset = (assetId: number) => {
    setPendingActivations((prev) => ({
      ...prev,
      assets: { ...prev.assets, [assetId]: true },
    }));
    console.log(`Activating asset ${assetId} - stored locally`);
  };

  const handleDeactivateAsset = (assetId: number) => {
    setPendingActivations((prev) => ({
      ...prev,
      assets: { ...prev.assets, [assetId]: false },
    }));
    console.log(`Deactivating asset ${assetId} - stored locally`);
  };

  const handleEndTurn = () => {
    if (!wsClient || !wsClient.isConnected() || isEndingTurn) {
      if (!isEndingTurn) setError("Not connected to server");
      return;
    }

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

    if (gameState?.phase === 2) {
      if (Object.keys(pendingBids).length > 0) {
        console.log("Submitting pending bids:", pendingBids);
        wsClient.submitBatchBids(pendingBids);
      }
    }

    setPendingActivations({ lines: {}, assets: {} });
    setPendingBids({});

    console.log("Ending turn");
    setIsEndingTurn(true);
    wsClient.endTurn();
  };

  const handleBidAsset = (assetId: number, newBidPrice: number) => {
    setPendingBids((prev) => ({
      ...prev,
      [assetId]: newBidPrice,
    }));
    console.log("Stored bid for asset:", assetId, "to:", newBidPrice);
  };

  // Show loading screen while initializing
  if (gameId === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
          <p className="text-gray-600 mt-2">Waiting for game ID...</p>
        </div>
      </div>
    );
  }

  if (!gameState || connectionState !== "CONNECTED") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Initializing Game...
          </h2>
          <p className="text-gray-600 mt-2">
            {connectionState === "CONNECTING"
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-200 shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">
              Power Flow Game
            </h1>
            <div className="flex items-center gap-4">
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

              <div className="flex-shrink-0">
                <GameStatus phase={gameState.phase} round={gameState.game_round} />
              </div>
            </div>
          </div>

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
          <div className="lg:col-span-2">
            <div className="bg-gray-200 rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold mb-4 text-black">Grid Visualization</h2>
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

          <div className="space-y-6">
            <GameControls
              gameState={gameState}
              gameId={gameId?.toString() || null}
              currentPlayerName={currentPlayerName}
              currentPlayerTrigram={currentPlayerTrigram}
              currentPlayerColor={currentPlayerObj?.color}
              isConnected={isConnected}
              onEndTurn={handleEndTurn}
              hasInsufficientFunds={hasInsufficientFunds}
              isEndingTurn={isEndingTurn}
            />

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

            <div className="bg-gray-200 rounded-lg shadow-sm border p-4">
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


export default function GamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
