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
        <div className="flex items-center w-80">
            {/* Left half - Round info */}
            <div className="w-20 flex justify-start">
                <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                    Round {round}
                </span>
            </div>

            {/* Right half - Phase info */}
            <div className="w-80 flex justify-start">
                <div
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${phaseInfo.color} cursor-help whitespace-nowrap`}
                    title={phaseInfo.description}
                >
                    {phaseInfo.displayName} Phase
                </div>
            </div>
        </div>
    )
}

export default GameStatus