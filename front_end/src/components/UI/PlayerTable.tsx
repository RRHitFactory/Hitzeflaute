'use client'

import React from 'react'
import { Player, GameState } from '@/types/game'

interface PlayerTableProps {
    players: Player[]
    gameState?: GameState
}

const PlayerTable: React.FC<PlayerTableProps> = ({ players, gameState }) => {
    const formatMoney = (amount: number) => `$${amount.toLocaleString()}`

    const getIceCreams = (playerId: number) => {
        if (!gameState) {
            console.log('No gameState provided to PlayerTable')
            return 0
        }

        const playerAssets = gameState.assets.data.filter(asset => asset.owner_player === playerId)
        const freezerAssets = playerAssets.filter(asset => asset.is_freezer)
        const totalIceCreams = freezerAssets.reduce((total, asset) => total + asset.health, 0)
        return totalIceCreams
    }

    return (
        <div className="w-full">
            <table className="w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                            Color
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '35%' }}>
                            Player
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '35%' }}>
                            Money
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                            Ice Creams
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                            <td className="px-2 py-2 whitespace-nowrap" style={{ width: '15%' }}>
                                <div
                                    className="w-4 h-4 rounded-full border border-gray-300"
                                    style={{ backgroundColor: player.color }}
                                    title={`${player.name}'s color: ${player.color}`}
                                />
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900" style={{ width: '35%' }}>
                                {player.name}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500" style={{ width: '35%' }}>
                                {formatMoney(player.money)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center" style={{ width: '15%' }}>
                                {getIceCreams(player.id)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default PlayerTable