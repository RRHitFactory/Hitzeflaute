"use client";

import BiddingTable from "@/components/Game/BiddingTable";
import GridVisualization from "@/components/Game/GridVisualization";
import GameControls from "@/components/UI/GameControls";
import GameStatus from "@/components/UI/GameStatus";
import PlayerTable from "@/components/UI/PlayerTable";
import { useGameWebSocket, type WebSocketMessage } from "@/lib/gameWebSocket";
import { GamePhase } from "@/types/game";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { usePlayerTurn } from "@/hooks/usePlayerTurn";

function GameContent() {
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get("gameId");
  const [gameId, setGameId] = useState<number | null>(null);
  const DEFAULT_PLAYER = 1;
  const [error, setError] = useState<string | null>(null);
  const hasConnectedRef = useRef(false);
  const hasSetPlayerRef = useRef(false);

  // Initialize gameId from URL param
  useEffect(() => {
    if (gameIdParam) {
      setGameId(parseInt(gameIdParam));
    }
  }, [gameIdParam]);

  // State for effective player ID - starts with NPC, switches to cookiePlayerId for online mode
  const [websocketPlayerId, setWebSocketPlayerId] = useState<number>(-1);

  // Memoize callback functions to prevent infinite re-renders
  const handleMessage = useCallback((msg: WebSocketMessage) => {
    console.log("=== WebSocket Message Received ===");

    if (msg.message_type === "error") {
      console.error("=== SERVER ERROR ===");
      console.error(msg.data);
      setError(msg.data || "Unknown server error");
    } else if (msg.message_type === "GameUpdate") {
      // Controls are now managed by the usePlayerTurn hook based on currentPlayerObj.is_having_turn
    }

    console.log("=== End WebSocket Message Processing ===");
  }, []);

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

  const callbacks = useMemo(
    () => ({
      onMessage: handleMessage,
      onError: handleError,
      onClose: handleClose,
    }),
    [handleMessage, handleError, handleClose],
  );

  // Initialize WebSocket with effective player ID
  const {
    client: wsClient,
    connectionState,
    gameState,
    isConnected,
  } = useGameWebSocket(gameId || -1, websocketPlayerId, callbacks);

  // Use the new player turn hook to handle all player-related logic
  const {
    cookiePlayerId,
    currentPlayerId,
    currentPlayerObj,
    isHotseatMode,
    controlsEnabled,
    setControlsEnabled,
  } = usePlayerTurn(gameState, gameId);

  // After getting the first gameState, check if it's online mode and switch to cookiePlayerId
  useEffect(() => {
    if (!gameState || hasSetPlayerRef.current) return;
    if (!isHotseatMode && cookiePlayerId !== null) {
      hasSetPlayerRef.current = true;
      setWebSocketPlayerId(cookiePlayerId);
    }
  }, [gameState, isHotseatMode, cookiePlayerId]);

  // Track when we first connect successfully
  useEffect(() => {
    if (connectionState === "CONNECTED" && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
    }
  }, [connectionState]);

  // Extract player info from the local player object

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
  }, [gameState?.phase, currentPlayerId]);

  const handlePurchaseAsset = (assetId: number) => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }

    console.log("Purchasing asset:", assetId);
    wsClient.buyAsset(assetId.toString(), currentPlayerId || DEFAULT_PLAYER);
  };

  const handlePurchaseTransmissionLine = (lineId: number) => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }

    console.log("Purchasing transmission line:", lineId);
    wsClient.buyTransmissionLine(
      lineId.toString(),
      currentPlayerId || DEFAULT_PLAYER,
    );
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
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }
    if (!currentPlayerId) {
      return;
    }
    setControlsEnabled(false);

    if (gameState?.phase === 1) {
      const hasActivations =
        Object.keys(pendingActivations.lines).length > 0 ||
        Object.keys(pendingActivations.assets).length > 0;

      if (hasActivations) {
        console.log("Submitting activation updates:", pendingActivations);
        wsClient.activationUpdate(
          {
            line_activation: pendingActivations.lines,
            asset_activation: pendingActivations.assets,
          },
          currentPlayerId,
        );
      }
    }

    if (gameState?.phase === 2) {
      if (Object.keys(pendingBids).length > 0) {
        console.log("Submitting pending bids:", pendingBids);
        wsClient.submitBatchBids(pendingBids, currentPlayerId);
      }
    }

    setPendingActivations({ lines: {}, assets: {} });
    setPendingBids({});

    console.log("Ending turn");
    wsClient.endTurn(currentPlayerId);
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
                <GameStatus
                  phase={gameState.phase}
                  round={gameState.game_round}
                />
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
        {/* Debug information */}
        <div className="text-xs text-gray-500 bg-white p-2 rounded border mb-4 max-w-[400px]">
          <div>
            <span className="font-semibold">Cookie Player ID:</span>{" "}
            {cookiePlayerId ?? "null"}
          </div>
          <div>
            <span className="font-semibold">Current Player:</span>{" "}
            {currentPlayerObj ? JSON.stringify(currentPlayerObj) : "null"}
          </div>
          <div>
            <span className="font-semibold">Controls Enabled:</span>{" "}
            {controlsEnabled.toString()}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-200 rounded-lg shadow-sm border p-6">
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
                currentPlayerObj={currentPlayerObj}
                pendingActivations={pendingActivations}
                controlsEnabled={controlsEnabled}
              />
            </div>
          </div>

          <div className="space-y-6">
            <GameControls
              gameState={gameState}
              gameId={gameId?.toString() || null}
              currentPlayerObj={currentPlayerObj}
              isConnected={isConnected}
              onEndTurn={handleEndTurn}
              hasInsufficientFunds={hasInsufficientFunds}
              controlsEnabled={controlsEnabled}
            />

            {gameState.phase === GamePhase.BIDDING && (
              <BiddingTable
                assets={gameState.assets.data}
                currentPlayer={currentPlayerObj?.id || DEFAULT_PLAYER}
                playerMoney={currentPlayerObj?.money || 0}
                pendingBids={pendingBids}
                onBidChange={handleBidAsset}
                onInsufficientFundsChange={setHasInsufficientFunds}
                isCurrentPlayersTurn={controlsEnabled}
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
