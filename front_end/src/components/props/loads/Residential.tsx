'use client';
import React from 'react';

interface ResidentialProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Residential: React.FC<ResidentialProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 20}, ${position.y - 30})`}>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2" />
        </filter>
        <linearGradient id="wallGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes light-flicker {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.8; }
          }
          .house-light {
            animation: light-flicker 3s ease-in-out infinite;
          }
          .residential-building:hover .house-light {
            animation: light-flicker 1s ease-in-out infinite;
          }
        `}
      </style>
      <g className="residential-building" filter="url(#shadow)">
        {/* House Body */}
        <rect x="5" y="10" width="30" height="20" fill="url(#wallGradient)" stroke="#9ca3af" strokeWidth="0.5" />

        {/* Roof */}
        <path d="M 2,10 L 20,2 L 38,10 Z" fill="#b91c1c" stroke="#991b1b" strokeWidth="0.5" />

        {/* Door */}
        <rect x="16" y="20" width="8" height="10" fill={ownerColor} />

        {/* Window with light */}
        <rect x="26" y="15" width="8" height="6" fill="#fef08a" />
        <rect className="house-light" x="26" y="15" width="8" height="6" fill="#facc15" />

      </g>
    </g>
  );
};

export default Residential;
