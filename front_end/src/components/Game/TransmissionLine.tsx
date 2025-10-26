'use client'

import React from 'react'
import { TransmissionLine, Bus, HoverableElement, Player } from '@/types/game'

interface TransmissionLineProps {
    line: TransmissionLine
    buses: Bus[]
    owner: Player
    onHover: (element: HoverableElement, event: React.MouseEvent) => void
    onLeave: () => void
    isPurchasable?: boolean
    onPurchase?: (lineId: number) => void
    playerMoney?: number
}

const TransmissionLineComponent: React.FC<TransmissionLineProps> = ({
    line,
    buses,
    owner,
    onHover,
    onLeave,
    isPurchasable = false,
    onPurchase,
    playerMoney = 0
}) => {
    const fromBus = buses.find(b => b.id === line.bus1)
    const toBus = buses.find(b => b.id === line.bus2)

    if (!fromBus || !toBus) return null

    const getLineData = () => {
        const data: { [key: string]: string } = {
            'Owner': owner.name,
            'Health': line.health.toString()
        }

        if (isPurchasable) {
            data['Purchase Price'] = `$${line.minimum_acquisition_price.toLocaleString()}`
        }

        if (line.is_open) {
            data['Status'] = 'OPEN'
        }

        return data
    }

    const handleMouseEnter = (event: React.MouseEvent) => {
        onHover({
            type: 'line',
            id: line.id,
            title: `Line${line.id}`,
            data: getLineData()
        }, event)
    }

    const handlePurchaseClick = (event: React.MouseEvent) => {
        event.stopPropagation()
        if (onPurchase) {
            onPurchase(line.id)
        }
    }

    const getLineColor = () => {
        if (line.is_open) {
            // Deactivate color similar to the Python implementation
            return adjustColor(owner.color, 0.5)
        }
        return owner.color
    }

    const adjustColor = (color: string, factor: number) => {
        // Simple color darkening for open lines
        const hex = color.replace('#', '')
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor)
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor)
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor)
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }

    // Create curved line with multiple points similar to the Python implementation
    // Use display coordinates if available, fallback to original coordinates
    const fromX = (fromBus as any).displayX || fromBus.x
    const fromY = (fromBus as any).displayY || fromBus.y
    const toX = (toBus as any).displayX || toBus.x
    const toY = (toBus as any).displayY || toBus.y

    const vector = { x: toX - fromX, y: toY - fromY }
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2

    // Add slight curve by offsetting the middle point
    const curveOffset = 0.1
    const offsetX = vector.y * curveOffset
    const offsetY = -vector.x * curveOffset

    const pathData = `M ${fromX} ${fromY} Q ${midX + offsetX} ${midY + offsetY} ${toX} ${toY}`

    // Check if player can afford this line
    const canAfford = !isPurchasable || (onPurchase && line.minimum_acquisition_price <= playerMoney)

    const handlePurchaseButtonHover = (event: React.MouseEvent) => {
        event.stopPropagation()
        onHover({
            type: 'line',
            id: line.id,
            title: `Purchase Line${line.id}`,
            data: {
                'Cost': `$${line.minimum_acquisition_price.toLocaleString()}`,
                'Action': 'Click to purchase this transmission line'
            }
        }, event)
    }

    return (
        <g>
            {/* Glow effect for purchasable lines */}
            {isPurchasable && (
                <path
                    d={pathData}
                    stroke="#ffd700"
                    strokeWidth={10}
                    fill="none"
                    opacity="0.6"
                    className="animate-pulse"
                />
            )}

            {/* Invisible wider hover area */}
            <path
                d={pathData}
                stroke="transparent"
                strokeWidth={12}
                fill="none"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={onLeave}
                style={{ cursor: 'pointer' }}
            />

            {/* Main transmission line */}
            <path
                d={pathData}
                stroke={isPurchasable ? "#ffd700" : getLineColor()}
                strokeWidth={isPurchasable ? 6 : 5}
                fill="none"
                opacity={0.9}
                pointerEvents="none"
            />

            {/* Purchase button for purchasable lines */}
            {isPurchasable && (
                <g className="purchase-button" opacity="0.9">
                    <circle
                        cx={midX}
                        cy={midY - 20}
                        r="10"
                        fill={canAfford ? "#22c55e" : "#9ca3af"}
                        stroke="white"
                        strokeWidth="2"
                        style={{ cursor: canAfford ? 'pointer' : 'not-allowed' }}
                        onClick={canAfford ? handlePurchaseClick : undefined}
                        onMouseEnter={handlePurchaseButtonHover}
                        onMouseLeave={onLeave}
                    />
                    <text
                        x={midX}
                        y={midY - 16}
                        textAnchor="middle"
                        fontSize="10"
                        fill="white"
                        pointerEvents="none"
                        fontWeight="bold"
                    >
                        $
                    </text>
                </g>
            )}
        </g>
    )
}

export default TransmissionLineComponent