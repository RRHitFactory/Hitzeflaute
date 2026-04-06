"use client";
import React from 'react';

interface IndustrialProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Industrial: React.FC<IndustrialProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 25}, ${position.y - 40})`}>
      <defs>
        <linearGradient id="factoryBuildingGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <radialGradient id="smokeCloudGradient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(209, 213, 219, 0.6)" />
            <stop offset="100%" stopColor="rgba(209, 213, 219, 0)" />
        </radialGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes smoke-puff {
            0% {
              transform: translateY(0) scale(1);
              opacity: 0.6;
            }
            100% {
              transform: translateY(-15px) scale(2);
              opacity: 0;
            }
          }
          .smoke-puff-animation {
            animation: smoke-puff 5s linear infinite;
          }
          .industrial-plant:hover .smoke-puff-animation {
            animation: smoke-puff 2.5s linear infinite;
          }
        `}
      </style>
      <g className="industrial-plant" filter="url(#shadow)">
        {/* Main Building */}
        <rect x="5" y="20" width="40" height="20" fill="url(#factoryBuildingGradient)" stroke="#4b5563" strokeWidth="0.5" />

        {/* Sawtooth Roof */}
        <path d="M 5 20 L 15 10 L 25 20 L 35 10 L 45 20" fill="#9ca3af" stroke="#4b5563" strokeWidth="0.5" />

        {/* Smokestack */}
        <rect x="35" y="5" width="8" height="25" fill="#6b7280" stroke="#4b5563" strokeWidth="0.5" />

        {/* Smoke Plume */}
        <g className="smoke-puff-animation">
            <circle cx="39" cy="0" r="4" fill="url(#smokeCloudGradient)" />
        </g>

        {/* Base with owner's color */}
        <rect x="3" y="38" width="44" height="4" fill={ownerColor} rx="1" />
      </g>
    </g>
  );
};

export default Industrial;
