"use client";

import React from "react";
import { GameState } from "@/types/game";

interface GameControlsProps {
  gameState: GameState;
  gameId: string | null;
  currentPlayerName: string;
  currentPlayerTrigram: string;
  currentPlayerColor: string;
  isConnected: boolean;
  onEndTurn: () => void;
  hasInsufficientFunds?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  gameId,
  currentPlayerName,
  currentPlayerTrigram,
  currentPlayerColor,
  isConnected,
  onEndTurn,
  hasInsufficientFunds = false,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-bold text-black">Controls</h3>
      {/* Current Player Info - Centered */}
      {currentPlayerTrigram && (
        <div className="flex justify-left items-center gap-3 pt-2 pb-4">
          {currentPlayerColor && (
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: currentPlayerColor }}
              title={`Player color: ${currentPlayerName}`}
            ></div>
          )}
          <span className="text-lg font-bold text-gray-900 whitespace-nowrap">
            {currentPlayerTrigram}
          </span>
        </div>
      )}
      <div className="space-y-4">

        <button
          onClick={onEndTurn}
          disabled={!isConnected || hasInsufficientFunds}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          End Turn
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
