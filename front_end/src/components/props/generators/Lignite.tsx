"use client";
import React from 'react';

interface LigniteProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Lignite: React.FC<LigniteProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 25}, ${position.y - 50})`}>
      <defs>
        <linearGradient id="smokeStackGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="50%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <radialGradient id="smokeGradient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(107, 114, 128, 0.7)" />
            <stop offset="100%" stopColor="rgba(107, 114, 128, 0)" />
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
              opacity: 0.7;
            }
            100% {
              transform: translateY(-20px) translateX(10px) scale(2);
              opacity: 0;
            }
          }
          .smoke-plume {
            animation: smoke-drift 6s linear infinite;
          }
          .lignite-plant:hover .smoke-plume {
            animation: smoke-drift 3s linear infinite;
          }
        `}
      </style>
      <g className="lignite-plant" filter="url(#shadow)">
        {/* Smokestack */}
        <rect x="18" y="10" width="14" height="35" fill="url(#smokeStackGradient)" stroke="#854d0e" strokeWidth="0.5" />
        <ellipse cx="25" cy="10" rx="7" ry="2" fill="#ca8a04" />

        {/* Plant building */}
        <rect x="5" y="30" width="40" height="15" fill="#d1d5db" stroke="#6b7280" strokeWidth="0.5" />
        <rect x="8" y="25" width="34" height="5" fill="#b0b0b0" />

        {/* Base with owner's color */}
        <rect x="3" y="43" width="44" height="4" fill={ownerColor} rx="1" />

        {/* Smoke Plume */}
        <g className="smoke-plume">
            <circle cx="25" cy="5" r="5" fill="url(#smokeGradient)" />
            <circle cx="27" cy="2" r="6" fill="url(#smokeGradient)" />
            <circle cx="24" cy="-2" r="4" fill="url(#smokeGradient)" />
        </g>

      </g>
    </g>
  );
};

export default Lignite;
