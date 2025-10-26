'use client'

import React, { useState, useEffect } from 'react'
import GridVisualization from '@/components/Game/GridVisualization'
import GameControls from '@/components/UI/GameControls'
import GameStatus from '@/components/UI/GameStatus'
import PlayerTable from '@/components/UI/PlayerTable'
import { GameState } from '@/types/game'
import { GameAPIClient, useCreateGame, useGamesList } from '@/lib/gameAPI'

// Sample data
const sampleGameState: GameState = {
    game_id: 0,
    game_settings: {
        n_buses: 5,
        max_rounds: 20,
        n_init_ice_cream: 5,
        n_init_assets: 10,
        n_init_non_freezer_loads: 4,
        min_bid_price: -1000,
        max_bid_price: 1000,
        initial_funds: 1000,
        max_connections_per_bus: 7,
        map_area: {
            points: [
                { x: -30, y: -15 },  // bottom_left
                { x: 30, y: -15 },   // bottom_right
                { x: 30, y: 15 },    // top_right
                { x: -30, y: 15 }    // top_left
            ],
            shape_type: 'rectangle'
        }
    },
    phase: 0, // CONSTRUCTION phase from backend
    round: 1,
    market_coupling_result: null,
    buses: {
        class: 'BusRepo',
        data: [
            {
                id: 1,
                x: -50,
                y: -5,
                player_id: 1,
                max_lines: 5,
                max_assets: 5,
                color: '#22c55e'
            },
            {
                id: 2,
                x: 15,
                y: 0,
                player_id: 2,
                max_lines: 5,
                max_assets: 5,
                color: '#3b82f6'
            },
            {
                id: 3,
                x: 0,
                y: 10,
                player_id: -1,
                max_lines: 5,
                max_assets: 5,
                color: '#f59e0b'
            },
        ]
    },
    transmission: {
        class: 'TransmissionRepo',
        data: [
            {
                id: 1,
                bus1: 1,
                bus2: 2,
                owner_player: 1,
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
                id: 2,
                bus1: 2,
                bus2: 3,
                owner_player: 2,
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
                id: 3,
                bus1: 1,
                bus2: 3,
                owner_player: -1,
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
        ]
    },
    assets: {
        class: 'AssetRepo',
        data: [
            {
                id: 1,
                asset_type: 'GENERATOR',
                bus: 1,
                owner_player: 1,
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
                id: 2,
                asset_type: 'LOAD',
                bus: 3,
                owner_player: 2,
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
                id: 3,
                asset_type: 'GENERATOR',
                bus: 2,
                owner_player: -1,
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
        ]
    },
    players: {
        class: 'PlayerRepo',
        data: [
            { id: 1, name: 'Player 1', money: 15000, color: '#22c55e', assets: [1] },
            { id: 2, name: 'Player 2', money: 12000, color: '#3b82f6', assets: [2] },
            { id: -1, name: 'NPC', money: 0, color: '#f59e0b', assets: [] },
        ]
    },
}

export default function Home() {
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [gameId, setGameId] = useState<string | null>(null)
    const [currentPlayer] = useState(1) // For demo purposes, assume player_1 is active
    const [wsClient, setWsClient] = useState<any | null>(null)

    // Calculate current player name from gameState
    const currentPlayerName = React.useMemo(() => {
        if (!gameState) return 'Unknown Player'

        // Handle both array format (sample data) and repo format (backend)
        const playersArray = Array.isArray(gameState.players)
            ? gameState.players
            : gameState.players?.data || []

        const player = playersArray.find(p => p.id === currentPlayer)
        return player ? player.name : `Player ${currentPlayer}`
    }, [gameState, currentPlayer])
    const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { createGame, loading: creatingGame } = useCreateGame()
    const { games, refresh: refreshGames } = useGamesList()
    const apiClient = new GameAPIClient()

    // Create a new game on component mount
    useEffect(() => {
        const initializeGame = async () => {
            try {
                setLoading(true)
                setError(null)

                // Create a new game with two players
                const result = await createGame(['Player 1', 'Player 2'])
                const newGameId = result.game_id
                setGameId(newGameId)

                // Connect to WebSocket with dynamic import
                const { GameWebSocketClient } = await import('@/lib/gameWebSocket')
                const client = new GameWebSocketClient(
                    newGameId,
                    currentPlayer,
                    (data: any) => {
                        console.log('WebSocket message received:', data)
                        if (data.type === 'game_state') {
                            setGameState(data.data)
                        } else if (data.type === 'game_message') {
                            console.log('Game message:', data.message_class, data.data)
                        } else if (data.type === 'error') {
                            setError(data.message || 'Unknown server error')
                        }
                    },
                    (error: any) => {
                        console.error('WebSocket error:', error)
                        setError('WebSocket connection error')
                    },
                    (event: any) => {
                        console.log('WebSocket closed:', event)
                        setConnectionStatus('DISCONNECTED')
                    }
                )

                setWsClient(client)

                // Monitor connection status
                const statusInterval = setInterval(() => {
                    if (client) {
                        setConnectionStatus(client.getConnectionState())
                    }
                }, 1000)

                return () => clearInterval(statusInterval)

            } catch (err) {
                console.error('Failed to initialize game:', err)
                setError(err instanceof Error ? err.message : 'Failed to initialize game')
            } finally {
                setLoading(false)
            }
        }

        initializeGame()

        // Cleanup on unmount
        return () => {
            if (wsClient) {
                wsClient.disconnect()
            }
        }
    }, [])

    const handlePurchaseAsset = (assetId: number) => {
        if (!wsClient || !wsClient.isConnected()) {
            setError('Not connected to server')
            return
        }

        console.log('Purchasing asset:', assetId)
        wsClient.buyAsset(assetId)
    }

    const handlePurchaseTransmissionLine = (lineId: number) => {
        if (!wsClient || !wsClient.isConnected()) {
            setError('Not connected to server')
            return
        }

        console.log('Purchasing transmission line:', lineId)
        wsClient.buyTransmissionLine(lineId)
    }

    const handleBidAsset = (assetId: number, newBidPrice: number) => {
        if (!wsClient || !wsClient.isConnected()) {
            setError('Not connected to server')
            return
        }

        console.log('Updating bid for asset:', assetId, 'to:', newBidPrice)
        wsClient.updateBid(assetId, newBidPrice)
    }

    const handleEndTurn = () => {
        if (!wsClient || !wsClient.isConnected()) {
            setError('Not connected to server')
            return
        }

        console.log('Ending turn')
        wsClient.endTurn()
    }

    // Show loading screen while initializing
    if (loading || !gameState) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900">Initializing Game...</h2>
                    <p className="text-gray-600 mt-2">
                        {creatingGame ? 'Creating new game...' : 'Connecting to server...'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">Power Flow Game</h1>
                        <div className="flex items-center gap-4">
                            {/* Connection Status */}
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500' :
                                    connectionStatus === 'CONNECTING' ? 'bg-yellow-500' :
                                        'bg-red-500'
                                    }`}></div>
                                <span className="text-sm text-gray-600">
                                    {connectionStatus === 'CONNECTED' ? 'Connected' :
                                        connectionStatus === 'CONNECTING' ? 'Connecting...' :
                                            'Disconnected'}
                                </span>
                            </div>
                            {/* Game Status */}
                            <div className="flex-shrink-0">
                                <GameStatus phase={gameState.phase} round={gameState.round} />
                            </div>
                        </div>
                    </div>
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                    <button
                                        onClick={() => setError(null)}
                                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                            <div className="space-y-4">
                                <button
                                    onClick={handleEndTurn}
                                    disabled={!wsClient || !wsClient.isConnected()}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    End Turn
                                </button>
                                <div className="text-sm text-gray-600">
                                    <p>Game ID: {gameId}</p>
                                    <p>Current Player: {currentPlayerName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Player Information */}
                        <div className="bg-white rounded-lg shadow-sm border p-4">
                            <h3 className="text-lg font-bold mb-4 text-black">Players</h3>
                            <PlayerTable
                                players={Array.isArray(gameState.players) ? gameState.players : gameState.players?.data || []}
                                gameState={gameState}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}