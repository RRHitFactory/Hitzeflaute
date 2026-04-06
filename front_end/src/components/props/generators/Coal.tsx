"use client";
import React from 'react';

interface CoalProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Coal: React.FC<CoalProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 25}, ${position.y - 50})`}>
      <defs>
        <linearGradient id="smokeStackGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="50%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
        <radialGradient id="smokeGradient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(55, 65, 81, 0.8)" />
            <stop offset="100%" stopColor="rgba(55, 65, 81, 0)" />
        </radialGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes smoke-drift {
            0% {
              transform: translateY(0) translateX(0) scale(1);
              opacity: 0.8;
            }
            100% {
              transform: translateY(-25px) translateX(15px) scale(2.5);
              opacity: 0;
            }
          }
          .smoke-plume {
            animation: smoke-drift 8s linear infinite;
          }
          .coal-plant:hover .smoke-plume {
            animation: smoke-drift 4s linear infinite;
          }
        `}
      </style>
      <g className="coal-plant" filter="url(#shadow)">
        {/* Smokestack */}
        <rect x="18" y="5" width="14" height="40" fill="url(#smokeStackGradient)" stroke="#111827" strokeWidth="0.5" />
        <ellipse cx="25" cy="5" rx="7" ry="2" fill="#374151" />

        {/* Plant building */}
        <rect x="5" y="30" width="40" height="20" fill="#6b7280" stroke="#4b5563" strokeWidth="0.5" />
        <rect x="8" y="25" width="34" height="5" fill="#4b5563" />

        {/* Base with owner's color */}
        <rect x="3" y="48" width="44" height="4" fill={ownerColor} rx="1" />

        {/* Smoke Plume */}
        <g className="smoke-plume">
            <circle cx="25" cy="0" r="6" fill="url(#smokeGradient)" />
            <circle cx="28" cy="-4" r="8" fill="url(#smokeGradient)" />
            <circle cx="23" cy="-8" r="5" fill="url(#smokeGradient)" />
        </g>

      </g>
    </g>
  );
};

export default Coal;
