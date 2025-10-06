'use client'

import React from 'react'
import { GamePhase, getPhaseInfo } from '@/types/game'

interface GameStatusProps {
    phase: GamePhase
    round: number
}

const GameStatus: React.FC<GameStatusProps> = ({ phase, round }) => {
    const phaseInfo = getPhaseInfo(phase)

    return (
        <div className="flex items-center justify-center w-full">
            {/* Left side - Round text (right aligned to center) */}
            <div className="flex-1 text-right pr-2">
                <span className="text-sm text-gray-600 font-medium">
                    Round {round}
                </span>
            </div>

            {/* Right side - Phase text (left aligned from center) */}
            <div className="flex-1 text-left pl-2">
                <div
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${phaseInfo.color} cursor-help`}
                    title={phaseInfo.description}
                >
                    {phaseInfo.displayName} Phase
                </div>
            </div>
        </div>
    )
}

export default GameStatus