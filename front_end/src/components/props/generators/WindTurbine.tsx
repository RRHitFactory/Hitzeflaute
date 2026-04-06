"use client";
import React from 'react';

interface WindTurbineProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const WindTurbine: React.FC<WindTurbineProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 15}, ${position.y - 30})`}>
      <defs>
        <linearGradient id="towerGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .wind-turbine-blades {
            animation: rotate 8s linear infinite;
            transform-origin: 15px 12px;
          }
          .wind-turbine:hover .wind-turbine-blades {
            animation: rotate 1.5s linear infinite;
          }
        `}
      </style>
      <g className="wind-turbine" filter="url(#shadow)">
        {/* Tower */}
        <path
          d="M 14,30 L 12,12 h 6 l -2,18 z"
          fill="url(#towerGradient)"
          stroke="#6b7280"
          strokeWidth="0.5"
        />
        {/* Base of the tower with owner's color */}
        <rect x="11" y="29" width="8" height="2" fill={ownerColor} rx="1" />

        {/* Nacelle */}
        <ellipse cx="15" cy="10" rx="4" ry="2" fill="#d1d5db" stroke="#6b7280" strokeWidth="0.5" />

        {/* Blades */}
        <g className="wind-turbine-blades">
            <path d="M 15,12 Q 28,5 30,2" fill="none" stroke="#f9fafb" strokeWidth="2.5" strokeLinecap="round" transform="rotate(0 15 12)"/>
            <path d="M 15,12 Q 28,5 30,2" fill="none" stroke="#f9fafb" strokeWidth="2.5" strokeLinecap="round" transform="rotate(120 15 12)"/>
            <path d="M 15,12 Q 28,5 30,2" fill="none" stroke="#f9fafb" strokeWidth="2.5" strokeLinecap="round" transform="rotate(240 15 12)"/>
        </g>

        {/* Blade Hub */}
        <circle cx="15" cy="12" r="2.5" fill={ownerColor} />
        <circle cx="15" cy="12" r="1.5" fill="#f9fafb" />
      </g>
    </g>
  );
};

export default WindTurbine;
