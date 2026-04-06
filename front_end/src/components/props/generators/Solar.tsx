"use client";
import React from 'react';

interface SolarProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Solar: React.FC<SolarProps> = ({ ownerColor, position }) => {
  return (
    <g transform={`translate(${position.x - 20}, ${position.y - 20})`}>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2" />
        </filter>
        <linearGradient id="panelGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes sun-glint {
            0% {
              transform: translate(-10px, -10px) scale(0);
              opacity: 0;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              transform: translate(20px, 20px) scale(1);
              opacity: 0;
            }
          }
          .solar-panel-glint {
            animation: sun-glint 4s linear infinite;
          }
          .solar-panel:hover .solar-panel-glint {
            animation: sun-glint 2s linear infinite;
          }
        `}
      </style>
      <g className="solar-panel" filter="url(#shadow)">
        {/* Base */}
        <rect x="0" y="28" width="40" height="4" fill={ownerColor} rx="1" />
        
        {/* Panel */}
        <rect x="5" y="5" width="30" height="20" fill="url(#panelGradient)" stroke="#1e3a8a" strokeWidth="1" transform="rotate(-20 20 20)"/>

        {/* Glint effect */}
        <g className="solar-panel-glint" transform="rotate(-20 20 20)">
            <path d="M 10 10 L 15 5 L 20 10 L 15 15 Z" fill="white" opacity="0.8" />
        </g>

        {/* Panel divisions */}
        <g transform="rotate(-20 20 20)">
            <line x1="5" y1="11.67" x2="35" y2="11.67" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
            <line x1="5" y1="18.33" x2="35" y2="18.33" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
            <line x1="17.5" y1="5" x2="17.5" y2="25" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
        </g>
      </g>
    </g>
  );
};

export default Solar;
