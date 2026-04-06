"use client";
import React from 'react';

interface GasTurbineProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const GasTurbine: React.FC<GasTurbineProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 20}, ${position.y - 35})`}>
        <defs>
            <linearGradient id="turbineBodyGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="50%" stopColor="#e5e7eb" />
                <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>
            <radialGradient id="heatHazeGradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="rgba(255, 165, 0, 0.3)" />
                <stop offset="100%" stopColor="rgba(255, 165, 0, 0)" />
            </radialGradient>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="1.5" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.2" />
            </filter>
        </defs>
        <style>
            {`
            @keyframes heat-haze {
                0% {
                    transform: translateY(0) scale(1, 1) skewX(0);
                    opacity: 0.5;
                }
                50% {
                    transform: translateY(-5px) scale(1.1, 1.2) skewX(5deg);
                    opacity: 0.2;
                }
                100% {
                    transform: translateY(-10px) scale(1, 1) skewX(-5deg);
                    opacity: 0;
                }
            }
            .heat-haze-effect {
                animation: heat-haze 1s linear infinite;
                transform-origin: 50% 100%;
            }
            .gas-turbine:hover .heat-haze-effect {
                animation: heat-haze 0.5s linear infinite;
            }
            `}
        </style>
        <g className="gas-turbine" filter="url(#shadow)">
            {/* Base */}
            <rect x="5" y="30" width="30" height="5" fill={ownerColor} rx="1" />

            {/* Turbine Body */}
            <rect x="10" y="15" width="20" height="15" fill="url(#turbineBodyGradient)" stroke="#6b7280" strokeWidth="0.5" />

            {/* Exhaust */}
            <rect x="28" y="18" width="8" height="8" fill="#6b7280" />

            {/* Heat Haze Effect */}
            <g className="heat-haze-effect">
                 <ellipse cx="36" cy="22" rx="5" ry="8" fill="url(#heatHazeGradient)" />
            </g>

            {/* Piping */}
            <path d="M 10 22 Q 5 22 5 18 L 5 10 Q 5 5 10 5 L 30 5 Q 35 5 35 10" fill="none" stroke="#9ca3af" strokeWidth="2" />
        </g>
    </g>
  );
};

export default GasTurbine;
