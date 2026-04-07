"use client";
import React from "react";

interface ResidentialProps {
  ownerColor: string;
  position: { x: number; y: number };
  scale: number;
}

const Residential: React.FC<ResidentialProps> = ({
  ownerColor,
  position,
  scale,
}) => {
  return (
    <g
      transform={`translate(${position.x - 30 * scale}, ${position.y - 40 * scale}) scale(${scale})`}
      className="residential-load-interactive"
    >
      <defs>
        {/* Material Gradients: clean concrete walls and red metal roof */}
        <linearGradient id="wall-grad-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        <linearGradient id="roof-grad-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>

        {/* Glowing Window Effects: Standard attractive household light */}
        <radialGradient id="window-glow-2d" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(253, 224, 71, 1)" />
          <stop offset="60%" stopColor="rgba(250, 204, 21, 0.6)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>

        <filter id="shadow-2d" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2"
            floodColor="#000000"
            floodOpacity="0.3"
          />
        </filter>
      </defs>

      <style>
        {`
          .residential-load-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3));
          }
          
          /* Hover State: Brighten standard slow logic */
          .residential-load-interactive:hover {
            filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.5)) brightness(1.1);
          }
          .residential-load-interactive:hover .light-pulse {
            animation-duration: 0.8s;
            transform: scale(1.1);
          }

          @keyframes light-flicker {
            0%, 100% { opacity: 0.4; fill: #facc15;}
            50% { opacity: 1.0; fill: #facc15;}
          }

          .house-light {
            animation: light-flicker 8s 0.2s steps(1, end) infinite;
          }
          .residential-building:hover .light-flicker {
            animation: hover-flicker 0.2s steps(1, end) infinite;
          }

        `}
      </style>

      <g filter="url(#shadow-2d)">
        {/* Chimney (back right, no smoke) */}
        <rect
          x="35"
          y="0"
          width="4"
          height="10"
          fill="#475569"
          stroke="#334155"
          strokeWidth="0.5"
        />
        {/* 1. Building Body (Layered Rectangles) */}
        {/* Back Tier (subtle depth) */}
        <rect
          x="10"
          y="5"
          width="30"
          height="25"
          fill="#cbd5e1"
          stroke="#475569"
          strokeWidth="0.5"
          opacity="0.6"
        />
        {/* Main Body */}
        <rect
          x="5"
          y="10"
          width="40"
          height="30"
          fill="url(#wall-grad-2d)"
          stroke="#475569"
          strokeWidth="0.5"
        />
        {/* 2D Roof Line Accents */}
        <rect
          x="9"
          y="5"
          width="32"
          height="1"
          fill="#cbd5e1"
          stroke="#475569"
          strokeWidth="0.5"
          opacity="0.8"
        />
        <rect
          x="4"
          y="10"
          width="42"
          height="1"
          fill="#e2e8f0"
          stroke="#475569"
          strokeWidth="0.5"
        />
        {/* 2. Flat Gable Roof */}
        {/* Sub-roof line */}
        <path
          d="M 7 5 L 25 0 L 43 5 Z"
          fill="#c53030"
          stroke="#991b1b"
          strokeWidth="0.5"
          opacity="0.8"
        />
        {/* Main Roof */}
        <path
          d="M 2 10 L 25 0 L 48 10 Z"
          fill="url(#roof-grad-2d)"
          stroke="#991b1b"
          strokeWidth="0.5"
        />
        {/* 3. Base Platform (Tiered Concrete and gravel tint) */}
        {/* Concrete Platform - clearly tiered */}
        <path
          d="M-6 38 L 54 38 L 48 44 L 0 44 Z"
          fill={ownerColor}
          stroke="#475569"
          strokeWidth="0.5"
        />
        {/* integrated for depth */}
        <path
          d="M 0 40 L 48 40 L 44 43 L 4 43 Z"
          fill="#4b5563"
          opacity="0.1"
        />
        {/* 4. Primary Visibility: Base platform trim using owner color */}
        {/* Front edge trim */}
        <path
          d="M 0 44 L 48 44 L 48 46 L 0 46 Z"
          fill={ownerColor}
          opacity="0.9"
        />
        {/* 3D Side trim */}
        <path
          d="M 48 44 L 54 38 L 54 40 L 48 46 Z"
          fill={ownerColor}
          opacity="0.85"
        />
        {/* Highlight edge */}
        <path
          d="M 0 44 L 48 44 L 48 45 L 0 45 Z"
          fill="#ffffff"
          opacity="0.3"
        />
        {/* gravel pattern on base */}
        <path
          d="M 5 40 L 48 40 L 44 43 L 8 43 Z"
          fill="#4b5563"
          opacity="0.1"
        />
        {/* 5. Player Ownership Accent Stripe (prominent horizontal) */}
        <rect x="5" y="15" width="40" height="3" fill={ownerColor} />
        <rect x="5" y="15" width="40" height="1" fill="#ffffff" opacity="0.4" />
        {/* 6. Building Details: Door, Window, Chimney (No Smoke) */}
        {/* Door (centered) */}
        <rect
          x="13"
          y="24"
          width="10"
          height="14"
          fill="#6b7280"
          stroke="#475569"
          strokeWidth="0.5"
        />
        <circle cx="28" cy="32" r="0.5" fill="#e2e8f0" /> {/* handle */}
        {/* Window with Glowing Light (Pulsing household logic) */}
        <rect
          x="30"
          y="20"
          width="10"
          height="12"
          fill="#0f172a"
          stroke="#475569"
          strokeWidth="0.5"
        />
        <rect
          x="30"
          y="20"
          width="10"
          height="12"
          fill="#38bdf8"
          opacity="0.3"
        />{" "}
        {/* cool glass tint */}
        <g className="house-light">
          <rect
            x="30"
            y="20"
            width="10"
            height="12"
            fill="#facc15"
            stroke="#475569"
            opacity="0.6"
          />
        </g>
        {/* Window Panes (more defined) */}
        <line
          x1="35"
          y1="20"
          x2="35"
          y2="32"
          stroke="#475569"
          strokeWidth="0.5"
        />
        <line
          x1="30"
          y1="26"
          x2="40"
          y2="26"
          stroke="#475569"
          strokeWidth="0.5"
        />
        {/* Origin: for position debugging */}
        <circle
          cx={position.x + 30 * scale}
          cy={position.y + 40 * scale}
          r="4"
          fill="#ccff00"
          opacity="0"
        />
      </g>
    </g>
  );
};

export default Residential;
