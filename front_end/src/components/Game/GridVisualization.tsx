'use client'

import React, { useState } from 'react'
import { GameState, HoverableElement } from '@/types/game'
import InfoPanel from './InfoPanel'
import BusComponent from './Bus'
import AssetComponent from './Asset'
import TransmissionLineComponent from './TransmissionLine'
import ConfirmationDialog from '../UI/ConfirmationDialog'

interface GridVisualizationProps {
    gameState: GameState
    onPurchaseAsset?: (assetId: string) => void
    onPurchaseTransmissionLine?: (lineId: string) => void
    onBidAsset?: (assetId: string, newBidPrice: number) => void
    currentPlayer?: string
}

const GridVisualization: React.FC<GridVisualizationProps> = ({
    gameState,
    onPurchaseAsset,
    onPurchaseTransmissionLine,
    onBidAsset,
    currentPlayer
}) => {
    const [hoveredElement, setHoveredElement] = useState<HoverableElement | null>(null)
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
    const [confirmationDialog, setConfirmationDialog] = useState<{
        isOpen: boolean
        type: 'asset' | 'line'
        id: string
        title: string
        price: number
    }>({ isOpen: false, type: 'asset', id: '', title: '', price: 0 })

    const handleElementHover = (element: HoverableElement, event: React.MouseEvent) => {
        const svgRect = event.currentTarget.closest('svg')?.getBoundingClientRect()
        const rect = event.currentTarget.getBoundingClientRect()

        if (svgRect) {
            // Position relative to the SVG container
            const elementX = rect.left + rect.width / 2 - svgRect.left
            const elementY = rect.top + rect.height / 2 - svgRect.top

            setHoveredElement(element)
            setHoverPosition({
                x: elementX,
                y: elementY
            })
        }
    }

    const handleMouseLeave = () => {
        setHoveredElement(null)
    }

    // Find bus by ID
    const getBusById = (id: string) => gameState.buses.find(bus => bus.id === id)

    // Get assets for a specific bus and calculate their positions
    const getAssetsForBus = (busId: string) => {
        const bus = getBusById(busId)
        if (!bus) return []

        const assets = gameState.assets.filter(asset => asset.bus === busId)
        return assets.map((asset, index) => {
            // Position assets around the bus similar to the socket system in the Python code
            const offsetRadius = 25
            const angleStep = (2 * Math.PI) / Math.max(assets.length, 4)
            const angle = index * angleStep

            const x = bus.x + offsetRadius * Math.cos(angle)
            const y = bus.y + offsetRadius * Math.sin(angle)

            return { asset, position: { x, y } }
        })
    }

    // Get player by ID
    const getPlayerById = (playerId: string) =>
        gameState.players.find(player => player.id === playerId)

    // Check if asset is purchasable
    const isAssetPurchasable = (asset: any) => {
        return gameState.phase === 'CONSTRUCTION' &&
            asset.owner_player === 'npc' &&
            asset.minimum_acquisition_price > 0
    }

    // Check if asset is biddable (owned by current player in bidding phase)
    const isAssetBiddable = (asset: any) => {
        return gameState.phase === 'BIDDING' &&
            asset.owner_player === (currentPlayer || 'player_1')
    }    // Check if transmission line is purchasable
    const isLinePurchasable = (line: any) => {
        return gameState.phase === 'CONSTRUCTION' &&
            line.owner_player === 'npc' &&
            line.minimum_acquisition_price > 0
    }

    // Get current player money
    const getCurrentPlayerMoney = () => {
        const player = getPlayerById(currentPlayer || 'player_1')
        return player?.money || 0
    }

    // Handle purchase confirmation for assets
    const handleAssetPurchaseRequest = (assetId: string) => {
        const asset = gameState.assets.find(a => a.id === assetId)
        if (asset) {
            setConfirmationDialog({
                isOpen: true,
                type: 'asset',
                id: assetId,
                title: `${asset.asset_type === 'GENERATOR' ? 'Gen' : 'Load'}${asset.id}`,
                price: asset.minimum_acquisition_price
            })
        }
    }

    // Handle purchase confirmation for transmission lines
    const handleLinePurchaseRequest = (lineId: string) => {
        const line = gameState.transmissionLines.find(l => l.id === lineId)
        if (line) {
            setConfirmationDialog({
                isOpen: true,
                type: 'line',
                id: lineId,
                title: `Line${line.id}`,
                price: line.minimum_acquisition_price
            })
        }
    }

    // Handle confirmation dialog actions
    const handleConfirmPurchase = () => {
        if (confirmationDialog.type === 'asset' && onPurchaseAsset) {
            onPurchaseAsset(confirmationDialog.id)
        } else if (confirmationDialog.type === 'line' && onPurchaseTransmissionLine) {
            onPurchaseTransmissionLine(confirmationDialog.id)
        }
        setConfirmationDialog({ isOpen: false, type: 'asset', id: '', title: '', price: 0 })
    }

    const handleCancelPurchase = () => {
        setConfirmationDialog({ isOpen: false, type: 'asset', id: '', title: '', price: 0 })
    }

    return (
        <div className="relative w-full h-96 bg-gray-50 rounded-lg border overflow-hidden">
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 500 400"
                className="grid-container"
                onMouseLeave={handleMouseLeave}
            >
                {/* Transmission Lines */}
                {gameState.transmissionLines.map(line => {
                    const owner = getPlayerById(line.owner_player)
                    if (!owner) return null
                    const isPurchasable = isLinePurchasable(line)
                    return (
                        <TransmissionLineComponent
                            key={line.id}
                            line={line}
                            buses={gameState.buses}
                            owner={owner}
                            onHover={handleElementHover}
                            onLeave={handleMouseLeave}
                            isPurchasable={isPurchasable}
                            onPurchase={handleLinePurchaseRequest}
                            playerMoney={getCurrentPlayerMoney()}
                        />
                    )
                })}

                {/* Buses */}
                {gameState.buses.map(bus => {
                    const owner = getPlayerById(bus.player_id)
                    if (!owner) return null
                    return (
                        <BusComponent
                            key={bus.id}
                            bus={bus}
                            owner={owner}
                            onHover={handleElementHover}
                            onLeave={handleMouseLeave}
                        />
                    )
                })}

                {/* Assets */}
                {gameState.buses.map(bus =>
                    getAssetsForBus(bus.id).map(({ asset, position }) => {
                        const owner = getPlayerById(asset.owner_player)
                        if (!owner) return null
                        const isPurchasable = isAssetPurchasable(asset)
                        return (
                            <AssetComponent
                                key={asset.id}
                                asset={asset}
                                bus={bus}
                                owner={owner}
                                position={position}
                                onHover={handleElementHover}
                                onLeave={handleMouseLeave}
                                isPurchasable={isPurchasable}
                                onPurchase={handleAssetPurchaseRequest}
                                playerMoney={getCurrentPlayerMoney()}
                                isBiddable={isAssetBiddable(asset)}
                                onBid={onBidAsset}
                                currentPlayer={currentPlayer}
                            />
                        )
                    })
                )}
            </svg>

            {/* Info Panel */}
            {hoveredElement && (
                <InfoPanel
                    element={hoveredElement}
                    position={hoverPosition}
                />
            )}

            {/* Purchase Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={confirmationDialog.isOpen}
                title={`Purchase ${confirmationDialog.title}`}
                message={`Are you sure you want to purchase ${confirmationDialog.title} for $${confirmationDialog.price.toLocaleString()}?`}
                confirmText="Purchase"
                cancelText="Cancel"
                onConfirm={handleConfirmPurchase}
                onCancel={handleCancelPurchase}
            />
        </div>
    )
}

export default GridVisualization