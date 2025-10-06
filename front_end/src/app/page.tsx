'use client'

import { useState, useEffect } from 'react'
import GridVisualization from '@/components/Game/GridVisualization'
import GameControls from '@/components/UI/GameControls'
import GameStatus from '@/components/UI/GameStatus'
import PlayerTable from '@/components/UI/PlayerTable'
import { GameState } from '@/types/game'

// Sample data matching the legacy frontend structure
const sampleGameState: GameState = {
    phase: 'CONSTRUCTION',
    round: 1,
    buses: [
        {
            id: '1',
            x: 100,
            y: 100,
            player_id: 'player_1',
            max_lines: 5,
            max_assets: 5,
            color: '#22c55e'
        },
        {
            id: '2',
            x: 300,
            y: 150,
            player_id: 'player_2',
            max_lines: 5,
            max_assets: 5,
            color: '#3b82f6'
        },
        {
            id: '3',
            x: 200,
            y: 250,
            player_id: 'npc',
            max_lines: 5,
            max_assets: 5,
            color: '#f59e0b'
        },
    ],
    transmissionLines: [
        {
            id: '1',
            bus1: '1',
            bus2: '2',
            owner_player: 'player_1',
            reactance: 0.1,
            capacity: 100,
            health: 5,
            fixed_operating_cost: 10,
            is_for_sale: false,
            minimum_acquisition_price: 0,
            is_active: true,
            is_open: false,
            birthday: 1,
            color: '#22c55e'
        },
        {
            id: '2',
            bus1: '2',
            bus2: '3',
            owner_player: 'player_2',
            reactance: 0.15,
            capacity: 100,
            health: 3,
            fixed_operating_cost: 12,
            is_for_sale: true,
            minimum_acquisition_price: 500,
            is_active: true,
            is_open: true, // This line is open
            birthday: 1,
            color: '#f59e0b'
        },
        {
            id: '3',
            bus1: '1',
            bus2: '3',
            owner_player: 'npc',
            reactance: 0.12,
            capacity: 75,
            health: 4,
            fixed_operating_cost: 8,
            is_for_sale: false,
            minimum_acquisition_price: 1200,
            is_active: true,
            is_open: false,
            birthday: 1,
            color: '#f59e0b'
        },
    ],
    assets: [
        {
            id: '1',
            asset_type: 'GENERATOR',
            bus: '1',
            owner_player: 'player_1',
            power_expected: 80,
            power_std: 5,
            marginal_cost: 25.50,
            is_for_sale: false,
            minimum_acquisition_price: 0,
            fixed_operating_cost: 50,
            bid_price: 30,
            is_freezer: false,
            health: 5,
            is_active: true,
            birthday: 1,
            color: '#dc2626'
        },
        {
            id: '2',
            asset_type: 'LOAD',
            bus: '3',
            owner_player: 'player_2',
            power_expected: 65,
            power_std: 3,
            marginal_cost: 0,
            is_for_sale: false,
            minimum_acquisition_price: 0,
            fixed_operating_cost: 0,
            bid_price: 0,
            is_freezer: true, // This is a freezer load
            health: 10, // Ice creams
            is_active: true,
            birthday: 1,
            color: '#7c3aed'
        },
        {
            id: '3',
            asset_type: 'GENERATOR',
            bus: '2',
            owner_player: 'npc',
            power_expected: 50,
            power_std: 3,
            marginal_cost: 30.00,
            is_for_sale: false,
            minimum_acquisition_price: 25000, // More expensive than player can afford
            fixed_operating_cost: 40,
            bid_price: 35,
            is_freezer: false,
            health: 3,
            is_active: true,
            birthday: 1,
            color: '#f59e0b'
        },
    ],
    players: [
        { id: 'player_1', name: 'Player 1', money: 15000, color: '#22c55e', assets: ['1'] },
        { id: 'player_2', name: 'Player 2', money: 12000, color: '#3b82f6', assets: ['2'] },
        { id: 'npc', name: 'NPC', money: 0, color: '#f59e0b', assets: [] },
    ],
}

export default function Home() {
    const [gameState, setGameState] = useState<GameState>(sampleGameState)
    const [hoveredElement, setHoveredElement] = useState<any>(null)
    const [currentPlayer] = useState('player_1') // For demo purposes, assume player_1 is active

    // This will be replaced with WebSocket connection to your backend
    useEffect(() => {
        // TODO: Connect to WebSocket for real-time updates
        console.log('Game initialized with state:', gameState)
    }, [])

    const handlePurchaseAsset = (assetId: string) => {
        const asset = gameState.assets.find(a => a.id === assetId)
        const player = gameState.players.find(p => p.id === currentPlayer)

        if (!asset || !player) return
        if (player.money < asset.minimum_acquisition_price) {
            alert(`Not enough money! Need $${asset.minimum_acquisition_price.toLocaleString()}, have $${player.money.toLocaleString()}`)
            return
        }

        // Update game state
        setGameState(prev => ({
            ...prev,
            assets: prev.assets.map(a =>
                a.id === assetId
                    ? { ...a, owner_player: currentPlayer, color: player.color }
                    : a
            ),
            players: prev.players.map(p =>
                p.id === currentPlayer
                    ? { ...p, money: p.money - asset.minimum_acquisition_price, assets: [...p.assets, assetId] }
                    : p.id === 'npc'
                        ? { ...p, assets: p.assets.filter(aid => aid !== assetId) }
                        : p
            )
        }))
    }

    const handlePurchaseTransmissionLine = (lineId: string) => {
        const line = gameState.transmissionLines.find(l => l.id === lineId)
        const player = gameState.players.find(p => p.id === currentPlayer)

        if (!line || !player) return
        if (player.money < line.minimum_acquisition_price) {
            alert(`Not enough money! Need $${line.minimum_acquisition_price.toLocaleString()}, have $${player.money.toLocaleString()}`)
            return
        }

        // Update game state
        setGameState(prev => ({
            ...prev,
            transmissionLines: prev.transmissionLines.map(l =>
                l.id === lineId
                    ? { ...l, owner_player: currentPlayer, color: player.color }
                    : l
            ),
            players: prev.players.map(p =>
                p.id === currentPlayer
                    ? { ...p, money: p.money - line.minimum_acquisition_price }
                    : p
            )
        }))
    }

    const handleBidAsset = (assetId: string, newBidPrice: number) => {
        // Update the bid price for the asset
        setGameState(prev => ({
            ...prev,
            assets: prev.assets.map(a =>
                a.id === assetId
                    ? { ...a, bid_price: newBidPrice }
                    : a
            )
        }))
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">Power Flow Game</h1>
                        <div className="flex-shrink-0 ml-4">
                            <GameStatus phase={gameState.phase} round={gameState.round} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Grid Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-xl font-bold mb-4 text-black">Grid Visualization</h2>
                            <GridVisualization
                                gameState={gameState}
                                onPurchaseAsset={handlePurchaseAsset}
                                onPurchaseTransmissionLine={handlePurchaseTransmissionLine}
                                onBidAsset={handleBidAsset}
                                currentPlayer={currentPlayer}
                            />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Game Controls */}
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h3 className="text-lg font-bold mb-4 text-black">Controls</h3>
                            <GameControls gameState={gameState} onAction={setGameState} />
                        </div>

                        {/* Player Information */}
                        <div className="bg-white rounded-lg shadow-sm border p-4">
                            <h3 className="text-lg font-bold mb-4 text-black">Players</h3>
                            <PlayerTable players={gameState.players} gameState={gameState} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}