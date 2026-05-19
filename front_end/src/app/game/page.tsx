"use client";

import BiddingTable from "@/components/Game/BiddingTable";
import GridVisualization from "@/components/Game/GridVisualization";
import Header from "@/components/Game/Header";
import GameControls from "@/components/UI/GameControls";
import PlayerTable from "@/components/UI/PlayerTable";
import WinLossAnimation from "@/components/UI/WinLossAnimation";
import { usePlayerTurn } from "@/hooks/usePlayerTurn";
import GameWebSocketClient, {
  useGameWebSocket,
  type WebSocketMessage,
} from "@/lib/gameWebSocket";
import { GamePhase, Player } from "@/types/game";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function GameContent() {
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get("gameId");
  const [gameId, setGameId] = useState<number | null>(null);
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

  // Message queue for win/loss messages
  const [messageQueue, setMessageQueue] = useState<WebSocketMessage[]>([]);

  // Basic message handler that doesn't depend on hooks
  const basicHandleMessage = useCallback((msg: WebSocketMessage) => {
    console.log("=== WebSocket Message Received ===");
    console.log("Received message of type " + msg.message_type);

    if (msg.message_type === "error") {
      console.error("=== SERVER ERROR ===");
      console.error(msg.data);
      setError(msg.data || "Unknown server error");
    } else if (msg.message_type === "GameUpdate") {
      // Controls are now managed by the usePlayerTurn hook based on currentPlayer.is_having_turn
    } else if (msg.message_type === "PlayerEliminatedMessage" || msg.message_type === "GameOverMessage") {
      // Queue win/loss messages for processing after dependencies are available
      setMessageQueue(prev => [...prev, msg]);
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

  // Initialize WebSocket with effective player ID
  const {
    client: wsClient,
    connectionState,
    gameState,
    isConnected,
  } = useGameWebSocket(gameId || -1, websocketPlayerId, {
    onMessage: basicHandleMessage,
    onError: handleError,
    onClose: handleClose,
  });

  const callbacks = useMemo(
    () => ({
      onMessage: basicHandleMessage,
      onError: handleError,
      onClose: handleClose,
    }),
    [basicHandleMessage, handleError, handleClose],
  );

  // Use the new player turn hook to handle all player-related logic
  const {
    cookiePlayerId,
    currentPlayer,
    waitingForPlayers,
    isHotseatMode,
    controlsEnabled,
    setControlsEnabled,
  } = usePlayerTurn(gameState, gameId);

  // State for win/loss animations
  const [winLossAnimation, setWinLossAnimation] = useState<{
    isOpen: boolean;
    type: "win" | "loss";
    playerName?: string;
  } | null>(null);

  // Process message queue when dependencies are available
  useEffect(() => {
    if (!gameState || messageQueue.length === 0) return;

    const msg = messageQueue[0]; // Process the first message in the queue
    
    if (msg.message_type === "PlayerEliminatedMessage") {
      console.log("=== PLAYER ELIMINATED ===");
      console.log("Player eliminated data:", msg.data);
      
      // Show loss animation
      if (isHotseatMode) {
        // In hotseat mode, show the player name who lost
        const playerId = msg.data.player_id;
        const eliminatedPlayer = gameState?.players.data.find(p => p.id === playerId);
        setWinLossAnimation({
          isOpen: true,
          type: "loss",
          playerName: eliminatedPlayer?.name || `Player ${playerId}`
        });
      } else {
        // In online mode, check if it's the current player
        if (currentPlayer?.id === msg.data.player_id) {
          setWinLossAnimation({
            isOpen: true,
            type: "loss",
            playerName: undefined // "You lost"
          });
        } else {
          // Show notification for other players
          const eliminatedPlayer = gameState?.players.data.find(p => p.id === msg.data.player_id);
          setWinLossAnimation({
            isOpen: true,
            type: "loss",
            playerName: eliminatedPlayer?.name || `Player ${msg.data.player_id}`
          });
        }
      }
    } else if (msg.message_type === "GameOverMessage") {
      console.log("=== GAME OVER ===");
      console.log("Game over data:", msg.data);
      
      if (msg.data.winner_id) {
        // Someone won
        if (isHotseatMode) {
          // In hotseat mode, show the winner name
          const winner = gameState?.players.data.find(p => p.id === msg.data.winner_id);
          setWinLossAnimation({
            isOpen: true,
            type: "win",
            playerName: winner?.name || `Player ${msg.data.winner_id}`
          });
        } else {
          // In online mode, check if current player won
          if (currentPlayer?.id === msg.data.winner_id) {
            setWinLossAnimation({
              isOpen: true,
              type: "win",
              playerName: undefined // "You win!"
            });
          } else {
            // Show who won to other players
            const winner = gameState?.players.data.find(p => p.id === msg.data.winner_id);
            setWinLossAnimation({
              isOpen: true,
              type: "win",
              playerName: winner?.name || `Player ${msg.data.winner_id}`
            });
          }
        }
      } else {
        // Game ended with no winner (all eliminated)
        setWinLossAnimation({
          isOpen: true,
          type: "loss",
          playerName: "Everyone" // "Everyone lost!"
        });
      }
    }

    // Remove the processed message from the queue
    setMessageQueue(prev => prev.slice(1));
  }, [currentPlayer, gameState, isHotseatMode, messageQueue]);

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

  const getWsAndCurrentPlayer = ():
    | { ws: GameWebSocketClient; player: Player }
    | undefined => {
    if (!wsClient || !wsClient.isConnected()) {
      setError("Not connected to server");
      return;
    }
    if (!currentPlayer) {
      setError("No curent player");
      return;
    }
    return { ws: wsClient, player: currentPlayer };
  };

  // Reset pending activations when current player or phase changes
  useEffect(() => {
    setPendingActivations({ lines: {}, assets: {} });
    setPendingBids({});
  }, [gameState?.phase, currentPlayer?.id]);

  const handlePurchaseAsset = (assetId: number) => {
    const wsAndCurrentPlayer = getWsAndCurrentPlayer();
    if (!wsAndCurrentPlayer) {
      return;
    }
    const { ws, player } = wsAndCurrentPlayer;
    console.log("Purchasing asset:", assetId);
    ws.buyAsset(assetId.toString(), player.id);
  };

  const handlePurchaseTransmissionLine = (lineId: number) => {
    const wsAndCurrentPlayer = getWsAndCurrentPlayer();
    if (!wsAndCurrentPlayer) {
      return;
    }
    const { ws, player } = wsAndCurrentPlayer;

    console.log("Purchasing transmission line:", lineId);
    ws.buyTransmissionLine(lineId.toString(), player.id);
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

  const handleBusClickForMigration = (busId: number) => {
    const wsAndCurrentPlayer = getWsAndCurrentPlayer();
    if (!wsAndCurrentPlayer) {
      return;
    }
    const { ws, player } = wsAndCurrentPlayer;

    console.log(`Migrating freezer to bus ${busId}`);
    ws.freezerMigrationRequest(null, busId, player.id);
    setControlsEnabled(false); // End the player's turn
  };

  const handleEndTurn = () => {
    const wsAndCurrentPlayer = getWsAndCurrentPlayer();
    if (!wsAndCurrentPlayer) {
      return;
    }
    const { ws, player } = wsAndCurrentPlayer;

    setControlsEnabled(false);

    if (gameState?.phase === 1) {
      const hasActivations =
        Object.keys(pendingActivations.lines).length > 0 ||
        Object.keys(pendingActivations.assets).length > 0;

      if (hasActivations) {
        console.log("Submitting activation updates:", pendingActivations);
        ws.activationUpdate(
          {
            line_activation: pendingActivations.lines,
            asset_activation: pendingActivations.assets,
          },
          player.id,
        );
      }
    }

    if (gameState?.phase === 2) {
      if (Object.keys(pendingBids).length > 0) {
        console.log("Submitting pending bids:", pendingBids);
        ws.submitBatchBids(pendingBids, player.id);
      }
    }

    setPendingActivations({ lines: {}, assets: {} });
    setPendingBids({});

    console.log("Ending turn");
    ws.endTurn(player.id);
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
      <Header
        connectionState={connectionState}
        gameState={gameState}
        error={error}
        setError={setError}
      />

      {/* Win/Loss Animation Modal */}
      <WinLossAnimation
        isOpen={winLossAnimation?.isOpen || false}
        type={winLossAnimation?.type || "loss"}
        playerName={winLossAnimation?.playerName}
        onClose={() => setWinLossAnimation(null)}
      />

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grid Visualization - spans 2 columns on desktop, appears second on mobile */}
          <div className="lg:col-span-2 order-2 lg:order-none">
            <GridVisualization
              gameState={gameState}
              onPurchaseAsset={handlePurchaseAsset}
              onPurchaseTransmissionLine={handlePurchaseTransmissionLine}
              onActivateLine={handleActivateLine}
              onDeactivateLine={handleDeactivateLine}
              onActivateAsset={handleActivateAsset}
              onDeactivateAsset={handleDeactivateAsset}
              onBusClickForMigration={handleBusClickForMigration}
              currentPlayer={currentPlayer}
              pendingActivations={pendingActivations}
              controlsEnabled={controlsEnabled}
            />
          </div>

          {/* Right sidebar - appears first on mobile, stays on right on desktop */}
          <div className="space-y-6 order-1 lg:order-none">
            {/* Game Controls - appears first on mobile */}
            <div className="lg:hidden order-1">
              <GameControls
                gameState={gameState}
                currentPlayer={currentPlayer}
                onEndTurn={handleEndTurn}
                hasInsufficientFunds={hasInsufficientFunds}
                controlsEnabled={controlsEnabled}
                waitingForPlayers={waitingForPlayers}
              />
            </div>

            {/* Players - appears second on mobile */}
            <div className="bg-gray-200 rounded-lg shadow-sm border p-4 order-2 lg:order-none">
              <h3 className="text-lg font-bold mb-4 text-black">Players</h3>
              <PlayerTable
                players={
                  Array.isArray(gameState.players)
                    ? gameState.players
                    : gameState.players?.data || []
                }
                gameState={gameState}
                cookiePlayerId={cookiePlayerId}
              />
            </div>

            {/* Game Controls - appears on desktop only, in right sidebar */}
            <div className="hidden lg:block">
              <GameControls
                gameState={gameState}
                currentPlayer={currentPlayer}
                onEndTurn={handleEndTurn}
                hasInsufficientFunds={hasInsufficientFunds}
                controlsEnabled={controlsEnabled}
                waitingForPlayers={waitingForPlayers}
              />
            </div>

            {gameState.phase === GamePhase.BIDDING &&
              currentPlayer &&
              controlsEnabled && (
                <BiddingTable
                  assets={gameState.assets.data}
                  currentPlayer={currentPlayer}
                  pendingBids={pendingBids}
                  onBidChange={handleBidAsset}
                  onInsufficientFundsChange={setHasInsufficientFunds}
                />
              )}
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
