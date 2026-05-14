"use client";
import PlayerTri from "@/components/UI/PlayerTri";
import { GamePhase, GameState, Player } from "@/types/game";
import React, { useEffect, useState } from "react";

interface GameControlsProps {
  gameState: GameState;
  gameId: string | null;
  currentPlayer?: Player;
  isConnected: boolean;
  onEndTurn: () => void;
  hasInsufficientFunds?: boolean;
  controlsEnabled: boolean;
  waitingForPlayers: Player[];
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  gameId,
  currentPlayer,
  isConnected,
  onEndTurn,
  hasInsufficientFunds = false,
  controlsEnabled,
  waitingForPlayers,
}) => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Show loading animation during DA ahead auction phase
  if (gameState.phase === GamePhase.DA_AUCTION) {
    return (
      <div className="bg-gray-200 rounded-lg shadow-sm border p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-gray-900">Clearing auction</h3>
        </div>
      </div>
    );
  }

  if (!controlsEnabled) {
    if (waitingForPlayers.length > 0) {
      return (
        <div className="bg-gray-200 rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-black">
            Waiting for player{waitingForPlayers.length > 1 ? "s" : ""}
            {".".repeat(dotCount)}
          </h3>
          <div className="flex flex-col gap-2 mt-4">
            {waitingForPlayers.map((player) => (
              <div key={player.id} className="flex items-center gap-2">
                <PlayerTri player={player} big={true} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-gray-200 rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-bold text-black">Controls</h3>
      {/* Current Player Info - Centered */}
      {currentPlayer && (
        <div className="flex justify-left items-center gap-3 pt-2 pb-4">
          <PlayerTri player={currentPlayer} big={true}/>
        </div>
      )}
      <div className="space-y-4">
        <button
          onClick={onEndTurn}
          disabled={
            !isConnected ||
            !controlsEnabled ||
            (hasInsufficientFunds && gameState.phase == GamePhase.BIDDING)
          }
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {controlsEnabled ? "End Turn" : "..."}
        </button>
        <div className="text-sm text-gray-600">
          <p>Game ID: {gameId}</p>
          <p>Round: {gameState.game_round}</p>
        </div>
      </div>
    </div>
  );
};

export default GameControls;
