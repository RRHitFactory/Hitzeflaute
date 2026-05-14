"use client";

import { GamePhase, GameState, Player } from "@/types/game";
import React from "react";

interface GameControlsProps {
  gameState: GameState;
  gameId: string | null;
  currentPlayer?: Player;
  isConnected: boolean;
  onEndTurn: () => void;
  hasInsufficientFunds?: boolean;
  controlsEnabled: boolean;
  waitingForPlayers: Player[]
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  gameId,
  currentPlayer,
  isConnected,
  onEndTurn,
  hasInsufficientFunds = false,
  controlsEnabled,
  waitingForPlayers
}) => {
  // Show loading animation during DA ahead auction phase
  if (gameState.phase === GamePhase.DA_AUCTION) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-gray-900">Clearing auction</h3>
        </div>
      </div>
    );
  }

  if (!controlsEnabled) {
    if (waitingForPlayers.length == 0) {return}
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-bold text-black">Controls</h3>
      {/* Current Player Info - Centered */}
      {currentPlayer && (
        <div className="flex justify-left items-center gap-3 pt-2 pb-4">
          <div
            className="w-6 h-6 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: currentPlayer.color }}
            title={`Player color: ${currentPlayer.name}`}
          ></div>
          <span className="text-lg font-bold text-gray-900 whitespace-nowrap">
            {currentPlayer.trigram}
          </span>
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
