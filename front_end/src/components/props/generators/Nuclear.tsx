'use client';
import React from 'react';

interface NuclearProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Nuclear: React.FC<NuclearProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 25}, ${position.y - 40})`}>
        <defs>
            <linearGradient id="coolingTowerGradient" x1="0.5" x2="0.5" y1="0" y2="1">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="50%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
            <radialGradient id="steamGradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
            </filter>
        </defs>
        <style>
            {`
            @keyframes steam-rise {
                0% {
                    transform: translateY(0) scale(1);
                    opacity: 0.8;
                }
                100% {
                    transform: translateY(-15px) scale(1.5);
                    opacity: 0;
                }
            }
            .steam-plume {
                animation: steam-rise 5s linear infinite;
                transform-origin: 50% 100%;
            }
            .nuclear-plant:hover .steam-plume {
                animation: steam-rise 2.5s linear infinite;
            }
            `}
        </style>
        <g className="nuclear-plant" filter="url(#shadow)">

            {/* Cooling Tower */}
            <path
                d="M 10,40 C 10,30 15,30 15,20 L 15,10 C 15,0 35,0 35,10 L 35,20 C 35,30 40,30 40,40 Z"
                fill="url(#coolingTowerGradient)"
                stroke="#6b7280"
                strokeWidth="0.5"
            />
            <ellipse cx="25" cy="10" rx="10" ry="3" fill="#9ca3af" />

            {/* Reactor Building */}
            <rect x="15" y="25" width="20" height="15" fill="#e5e7eb" stroke="#6b7280" strokeWidth="0.5" />
            <path d="M 15,25 Q 25,15 35,25" fill="#d1d5db" stroke="#6b7280" strokeWidth="0.5" />

            {/* Base with owner's color */}
            <rect x="8" y="38" width="34" height="4" fill={ownerColor} rx="1" />

            {/* Steam Plume */}
            <g className="steam-plume">
                <circle cx="25" cy="5" r="8" fill="url(#steamGradient)"/>
                <circle cx="22" cy="0" r="6" fill="url(#steamGradient)"/>
                <circle cx="28" cy="-2" r="5" fill="url(#steamGradient)"/>
            </g>

             {/* Nuclear Symbol */}
             <g transform="translate(25, 32) scale(0.3)" fill={ownerColor} stroke="white" strokeWidth="2">
                <circle cx="0" cy="0" r="10" fill="none" stroke={ownerColor} strokeWidth="3"/>
                <path d="M 0,0 L -8.66,-5 L -8.66,5 Z" transform="rotate(0)"/>
                <path d="M 0,0 L -8.66,-5 L -8.66,5 Z" transform="rotate(120)"/>
                <path d="M 0,0 L -8.66,-5 L -8.66,5 Z" transform="rotate(240)"/>
            </g>

        </g>
    </g>
  );
};

export default Nuclear;
