"use client";
import React from 'react';

interface CcgtProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Ccgt: React.FC<CcgtProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 25}, ${position.y - 45})`}>
        <defs>
            <linearGradient id="ccgtStackGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>
            <radialGradient id="steamGradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
            </filter>
        </defs>
        <style>
            {`
            @keyframes steam-plume-animation {
                0% {
                    transform: translateY(0) scale(1);
                    opacity: 0.7;
                }
                100% {
                    transform: translateY(-20px) scale(1.8);
                    opacity: 0;
                }
            }
            .steam-plume {
                animation: steam-plume-animation 4s linear infinite;
            }
            .ccgt-plant:hover .steam-plume {
                animation: steam-plume-animation 2s linear infinite;
            }
            `}
        </style>
        <g className="ccgt-plant" filter="url(#shadow)">
            {/* Combined Cycle Building */}
            <rect x="5" y="20" width="40" height="25" fill="#b0c4de" stroke="#4682b4" strokeWidth="0.5" />
            
            {/* Gas Turbine Hall */}
            <rect x="8" y="15" width="15" height="20" fill="#d1d5db" stroke="#6b7280" strokeWidth="0.5" />

            {/* Heat Recovery Steam Generator */}
            <rect x="23" y="10" width="18" height="35" fill="#9ca3af" stroke="#6b7280" strokeWidth="0.5" />

            {/* Stack */}
            <rect x="28" y="0" width="8" height="20" fill="url(#ccgtStackGradient)" stroke="#6b7280" strokeWidth="0.5" />
            <ellipse cx="32" cy="0" rx="4" ry="1.5" fill="#9ca3af" />

             {/* Base with owner's color */}
             <rect x="3" y="43" width="44" height="4" fill={ownerColor} rx="1" />

            {/* Steam Plume */}
            <g className="steam-plume">
                 <circle cx="32" cy="-5" r="5" fill="url(#steamGradient)"/>
            </g>
        </g>
    </g>
  );
};

export default Ccgt;
