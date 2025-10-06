'use client'

import React from 'react'
import { Bus, HoverableElement, Player } from '@/types/game'

interface BusProps {
    bus: Bus
    owner: Player
    onHover: (element: HoverableElement, event: React.MouseEvent) => void
    onLeave: () => void
}

const BusComponent: React.FC<BusProps> = ({ bus, owner, onHover, onLeave }) => {
    const handleMouseEnter = (event: React.MouseEvent) => {
        onHover({
            type: 'bus',
            id: bus.id,
            title: `Bus${bus.id}`,
            data: {
                'Owner': owner.name
            }
        }, event)
    }

    return (
        <g>
            {/* Invisible larger hover area */}
            <rect
                x={bus.x - 35}
                y={bus.y - 10}
                width={70}
                height={20}
                fill="transparent"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={onLeave}
                style={{ cursor: 'pointer' }}
            />
            {/* Visible bus */}
            <rect
                x={bus.x - 30}
                y={bus.y - 7}
                width={60}
                height={14}
                fill={bus.color}
                stroke="#374151"
                strokeWidth="1"
                rx="3"
                pointerEvents="none"
            />
        </g>
    )
}

export default BusComponent