'use client'

import React from 'react'
import { GameState, getNextPhase, getPhaseInfo, PHASE_ORDER } from '@/types/game'

interface GameControlsProps {
    gameState: GameState
    onAction: (newState: GameState) => void
}

const GameControls: React.FC<GameControlsProps> = ({ gameState, onAction }) => {
    const handleNextPhase = () => {
        const nextPhase = getNextPhase(gameState.phase)
        const newState = {
            ...gameState,
            phase: nextPhase,
            round: nextPhase === 'CONSTRUCTION' ? gameState.round + 1 : gameState.round
        }

        onAction(newState)
    }

    const nextPhaseInfo = getPhaseInfo(getNextPhase(gameState.phase))

    return (
        <div>
            <button
                onClick={handleNextPhase}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                title={`Next: ${nextPhaseInfo.displayName}`}
            >
                Next Phase → {nextPhaseInfo.displayName}
            </button>
        </div>
    )
}

export default GameControls