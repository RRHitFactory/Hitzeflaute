'use client';
import React from 'react';

interface FreezerProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Freezer: React.FC<FreezerProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 15}, ${position.y - 30})`}>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2" />
        </filter>
        <linearGradient id="coneGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes melt-drip {
            0% {
              transform: translateY(0);
              opacity: 1;
            }
            100% {
              transform: translateY(10px);
              opacity: 0;
            }
          }
          .ice-cream:hover .drip {
            animation: melt-drip 1s ease-out infinite;
          }
        `}
      </style>
      <g className="ice-cream" filter="url(#shadow)">
        {/* Cone */}
        <path d="M 15,30 L 5,10 H 25 Z" fill="url(#coneGradient)" stroke="#ca8a04" strokeWidth="0.5" />
        <path d="M 5,10 Q 15,12 25,10" fill="none" stroke="#ca8a04" strokeWidth="0.5" />

        {/* Scoops */}
        <circle cx="15" cy="8" r="8" fill={ownerColor} />
        <circle cx="15" cy="2" r="7" fill={ownerColor} />

        {/* Drip animation */}
        <path className="drip" d="M 22 8 C 22 10 20 12 18 14 C 16 12 18 10 18 8" fill={ownerColor} opacity="0" />
      </g>
    </g>
  );
};

export default Freezer;
