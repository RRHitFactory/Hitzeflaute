'use client'

import React from 'react'
import { GameState } from '@/types/game'

interface GameControlsProps {
    gameState: GameState
    gameId: string | null
    currentPlayerName: string
    isConnected: boolean
    onEndTurn: () => void
}

const GameControls: React.FC<GameControlsProps> = ({
    gameState,
    gameId,
    currentPlayerName,
    isConnected,
    onEndTurn
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-bold mb-4 text-black">Controls</h3>
            <div className="space-y-4">
                <button
                    onClick={onEndTurn}
                    disabled={!isConnected}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                    End Turn
                </button>
                <div className="text-sm text-gray-600">
                    <p>Game ID: {gameId}</p>
                    <p>Current Player: {currentPlayerName}</p>
                    <p>Round: {gameState.game_round}</p>
                </div>
            </div>
        </div>
    )
}

export default GameControls