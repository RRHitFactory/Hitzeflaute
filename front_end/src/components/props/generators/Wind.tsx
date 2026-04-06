"use client";
import React from "react";

interface WindProps {
  ownerColor: string;
  position: { x: number; y: number };
  scale: number;
}

const Wind: React.FC<WindProps> = ({ ownerColor, position, scale }) => {
  return (
    <g
      transform={`translate(${position.x - 30 * scale}, ${position.y - 40 * scale}) scale(${scale})`}
      className="wind-plant-interactive"
    >
      <defs>
        {/* Material Gradients */}
        <linearGradient id="tower-grad-wind" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="30%" stopColor="#f8fafc" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="nacelle-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="blade-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      <style>
        {`
          .wind-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.3));
          }
          
          /* Hover State: Brighten and speed up activity */
          .wind-plant-interactive:hover {
            filter: drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.4)) brightness(1.1);
          }
          .wind-plant-interactive:hover .rotor-spin {
            animation: fast-spin 1s linear infinite;
          }
          .wind-plant-interactive:hover .aviation-light {
            animation: light-pulse 0.8s infinite alternate;
          }

          /* Rotor Animation */
          @keyframes normal-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fast-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotor-spin {
            animation: normal-spin 6s linear infinite;
            /* Center of the hub */
            transform-origin: 27px 10px; 
          }

          /* Aviation Warning Light */
          @keyframes light-pulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 1; filter: drop-shadow(0 0 2px red); }
          }
          .aviation-light {
            animation: light-pulse 2s infinite alternate;
          }
        `}
      </style>

      {/* 1. Base Platform (Owner Color) */}
      <path
        d="M-4 44 L 56 44 L 50 50 L 2 50 Z"
        fill={ownerColor}
        opacity="0.9"
      />
      <path d="M-4 44 L 56 44 L 56 45 L -4 45 Z" fill="#ffffff" opacity="0.4" />

      {/* 2. Turbine Tower (Tapered Cylinder) */}
      <path
        d="M 23 44 L 26 10 L 28 10 L 31 44 Z"
        fill="url(#tower-grad-wind)"
      />

      {/* Base Flange (Connecting tower to ground) */}
      <ellipse cx="27" cy="44" rx="4.5" ry="1.5" fill="#94a3b8" />
      <path d="M 22.5 44 L 23 42 L 31 42 L 31.5 44 Z" fill="#64748b" />

      {/* 3. Player Ownership Accent Stripe (Upper Tower) */}
      <path
        d="M 25.5 16 L 28.5 16 L 28.6 18 L 25.4 18 Z"
        fill={ownerColor}
        opacity="0.9"
      />

      {/* 4. Nacelle (Generator Housing - pointing backwards/right) */}
      <rect
        x="25"
        y="7"
        width="10"
        height="4.5"
        rx="2"
        fill="url(#nacelle-grad)"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      <rect x="33" y="8" width="3" height="2.5" rx="1" fill="#cbd5e1" />

      {/* 5. Aviation Warning Light (Top of Nacelle) */}
      <circle cx="30" cy="7" r="1" fill="#ef4444" className="aviation-light" />

      {/* 6. Rotor Assembly (Animated) */}
      <g className="rotor-spin">
        {/* Blade 1 (Top) */}
        <path
          d="M 26 9 L 25 4 L 26 -12 L 27 -14 L 28 -12 L 29 4 L 28 9 Z"
          fill="url(#blade-grad)"
          stroke="#94a3b8"
          strokeWidth="0.25"
        />

        {/* Blade 2 (Bottom Right) */}
        <g transform="rotate(120, 27, 10)">
          <path
            d="M 26 9 L 25 4 L 26 -12 L 27 -14 L 28 -12 L 29 4 L 28 9 Z"
            fill="url(#blade-grad)"
            stroke="#94a3b8"
            strokeWidth="0.25"
          />
        </g>

        {/* Blade 3 (Bottom Left) */}
        <g transform="rotate(240, 27, 10)">
          <path
            d="M 26 9 L 25 4 L 26 -12 L 27 -14 L 28 -12 L 29 4 L 28 9 Z"
            fill="url(#blade-grad)"
            stroke="#94a3b8"
            strokeWidth="0.25"
          />
        </g>

        {/* Rotor Hub / Spinner */}
        <ellipse
          cx="27"
          cy="10"
          rx="2.5"
          ry="2.5"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.5"
        />
        {/* Center Owner Cap */}
        <circle cx="27" cy="10" r="1" fill={ownerColor} />
      </g>

      {/* Origin: for position debugging */}
      <circle
        cx={position.x + 30 * scale}
        cy={position.y + 40 * scale}
        r="4"
        fill="#ccff00"
        opacity="0"
      />
    </g>
  );
};

export default Wind;
