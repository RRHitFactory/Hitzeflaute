"use client";
import React from "react";

interface CcgtProps {
  ownerColor: string;
  position: { x: number; y: number };
  scale: number;
}

const Ccgt: React.FC<CcgtProps> = ({ ownerColor, position, scale }) => {
  return (
    <g
      transform={`translate(${position.x - 30 * scale}, ${position.y - 40 * scale}) scale(${scale})`}
      className="ccgt-plant-interactive"
    >
      <defs>
        {/* Material Gradients */}
        <linearGradient id="metal-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        <linearGradient id="roof-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="concrete-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="20%" stopColor="#d1d5db" />
          <stop offset="80%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>

        {/* Smoke & Radiation Glow Effects */}
        <radialGradient id="smoke" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.84)" />
          <stop offset="50%" stopColor="rgba(241, 248, 249, 0.6)" />
          <stop offset="100%" stopColor="rgba(226, 232, 240, 0)" />
        </radialGradient>

        {/* Animation Effects */}
        <radialGradient id="electric-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(0, 255, 255, 1)" />
          <stop offset="40%" stopColor="rgba(0, 255, 255, 0.8)" />
          <stop offset="100%" stopColor="rgba(0, 255, 255, 0)" />
        </radialGradient>
      </defs>

      <style>
        {`
          .ccgt-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.3));
          }
          
          /* Hover State: Brighten and speed up activity */
          .ccgt-plant-interactive:hover {
            filter: drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.4)) brightness(1.1);
          }
          .ccgt-plant-interactive:hover .steam-puff {
            animation-duration: 1.2s;
          }
          .ccgt-plant-interactive:hover .spark-pulse {
            animation-duration: 0.5s;
          }

          /* Steam Animation */
          @keyframes rise-and-fade {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            20% { opacity: 0.7; }
            100% { transform: translateY(0) scale(1.2); opacity: 0; }
          }
          .steam-puff {
            animation: rise-and-fade 3.5s infinite ease-out;
            transform-origin: center;
          }

          /* Electricity Animation */
          @keyframes pulse-glow {
            0%, 100% { transform: scale(0.8); opacity: 0.4; }
            50% { transform: scale(1.3); opacity: 1; }
          }
          .spark-pulse {
            animation: pulse-glow 1.5s infinite ease-in-out;
            transform-origin: center;
          }
        `}
      </style>

      {/* Cooling Tower Steam Puffs */}
      <g transform="translate(20, -40)">
        <circle
          cx="-10"
          cy="-10"
          r="13"
          fill="url(#smoke)"
          className="steam-puff"
          style={{ animationDelay: "0s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="13"
          fill="url(#smoke)"
          className="steam-puff"
          style={{ animationDelay: "0.4s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="13"
          fill="url(#smoke)"
          className="steam-puff"
          style={{ animationDelay: "0.9s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="13"
          fill="url(#smoke)"
          className="steam-puff"
          style={{ animationDelay: "1.1s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="13"
          fill="url(#smoke)"
          className="steam-puff"
          style={{ animationDelay: "1.4s" }}
        />
      </g>

      {/* 1. Base Platform (Shows Owner Color) */}
      <path
        d="M-4 40 L 56 40 L 50 46 L 2 46 Z"
        fill={ownerColor}
        opacity="0.9"
      />
      <path d="M-4 40 L 56 40 L 56 41 L -4 41 Z" fill="#ffffff" opacity="0.3" />

      {/* 2. HRSG Exhaust Stack */}
      <rect
        x="8"
        y="4"
        width="4"
        height="18"
        fill="url(#metal-grad)"
        stroke="#475569"
        strokeWidth="0.5"
      />
      <path d="M 7 4 L 13 4 L 12 2 L 8 2 Z" fill="#334155" />

      {/* 3. Hyperboloid Cooling Tower */}
      <path
        d="M 35 40 C 38.5 25 38.5 15 36 6 C 40.5 4.5 45.5 4.5 50 6 C 47.5 15 47.5 25 51 40 Z"
        fill="url(#concrete-grad)"
      />
      <ellipse cx="43" cy="6" rx="7" ry="2" fill="#374151" />
      <ellipse cx="43" cy="6" rx="6" ry="1.2" fill="#111827" />

      {/* 4. Main Turbine Hall */}
      <rect
        x="2"
        y="22"
        width="30"
        height="18"
        fill="url(#metal-grad)"
        stroke="#475569"
        strokeWidth="0.5"
      />
      {/* Pitched Roof */}
      <path
        d="M 2 22 L 17 14 L 32 22 Z"
        fill="url(#roof-grad)"
        stroke="#64748b"
        strokeWidth="0.5"
      />
      {/* Structural Ribs */}
      <line x1="8" y1="22" x2="8" y2="40" stroke="#64748b" strokeWidth="0.5" />
      <line
        x1="14"
        y1="22"
        x2="14"
        y2="40"
        stroke="#64748b"
        strokeWidth="0.5"
      />
      <line
        x1="20"
        y1="22"
        x2="20"
        y2="40"
        stroke="#64748b"
        strokeWidth="0.5"
      />
      <line
        x1="26"
        y1="22"
        x2="26"
        y2="40"
        stroke="#64748b"
        strokeWidth="0.5"
      />

      {/* 5. Player Ownership Accent Stripe */}
      <rect x="2" y="30" width="30" height="3" fill={ownerColor} />
      <rect x="2" y="30" width="30" height="1" fill="#ffffff" opacity="0.4" />

      {/* 6. Substation / Transformer */}
      <rect
        x="24"
        y="34"
        width="10"
        height="6"
        rx="1"
        fill="#334155"
        stroke="#1e293b"
        strokeWidth="0.5"
      />
      <rect x="26" y="32" width="2" height="2" fill="#94a3b8" />
      <rect x="30" y="32" width="2" height="2" fill="#94a3b8" />

      {/* Electrical Spark / Output Glow */}
      <g transform="translate(29, 32)">
        <circle
          cx="0"
          cy="0"
          r="4.5"
          fill="url(#electric-glow)"
          className="spark-pulse"
        />
        <circle cx="0" cy="0" r="1.5" fill="#ffffff" className="spark-pulse" />
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

export default Ccgt;
