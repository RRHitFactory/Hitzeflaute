"use client";
import React from "react";

interface NuclearProps {
  ownerColor: string;
  position: { x: number; y: number };
  scale: number;
}

const Nuclear: React.FC<NuclearProps> = ({ ownerColor, position, scale }) => {
  return (
    <g
      transform={`translate(${position.x - 30 * scale}, ${position.y - 40 * scale}) scale(${scale})`}
      className="nuclear-plant-interactive"
    >
      <defs>
        {/* Material Gradients: Clean, smooth concrete */}
        <linearGradient id="dome-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="20%" stopColor="#f8fafc" />
          <stop offset="80%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="reactor-hall-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="clean-tower-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="30%" stopColor="#f1f5f9" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Clean Steam & Radiation Glow Effects */}
        <radialGradient id="pure-steam" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
          <stop offset="50%" stopColor="rgba(241, 245, 249, 0.6)" />
          <stop offset="100%" stopColor="rgba(226, 232, 240, 0)" />
        </radialGradient>

        <radialGradient id="cherenkov-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(6, 182, 212, 1)" />
          <stop offset="50%" stopColor="rgba(59, 130, 246, 0.8)" />
          <stop offset="100%" stopColor="rgba(29, 78, 216, 0)" />
        </radialGradient>
      </defs>

      <style>
        {`
          .nuclear-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 4px 5px rgba(0, 0, 0, 0.3));
          }
          
          /* Hover State */
          .nuclear-plant-interactive:hover {
            filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.4)) brightness(1.1);
          }
          .nuclear-plant-interactive:hover .clean-plume {
            animation-duration: 1.5s;
          }
          .nuclear-plant-interactive:hover .reactor-pulse {
            animation-duration: 0.8s;
            transform: scale(1.1);
          }

          /* Plumes of clean water vapor */
          @keyframes vapor-rise {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            20% { opacity: 0.3; }
            30% { opacity: 1; }
            100% { transform: translate(6px, -20px) scale(2.2); opacity: 0; }
          }
          .clean-plume {
            animation: vapor-rise 5s infinite linear;
            transform-origin: center;
          }

          /* Cherenkov Radiation Glow */
          @keyframes blue-pulse {
            0%, 100% { transform: scale(0.9); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 4px #06b6d4); }
          }
          .reactor-pulse {
            animation: blue-pulse 2s infinite ease-in-out;
            transform-origin: center;
            transition: transform 0.3s ease;
          }
        `}
      </style>

      {/* 1. Base Platform (Owner Color) */}
      <path
        d="M-4 44 L 56 44 L 50 50 L 2 50 Z"
        fill={ownerColor}
        opacity="0.9"
      />
      <path d="M-4 44 L 56 44 L 56 45 L -4 45 Z" fill="#ffffff" opacity="0.3" />

      {/* Clean Water Vapor Steam */}
      <g transform="translate(38, 2)">
        <circle
          cx="-10"
          cy="-10"
          r="13"
          fill="url(#pure-steam)"
          className="clean-plume"
          style={{ animationDelay: "0s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="16"
          fill="url(#pure-steam)"
          className="clean-plume"
          style={{ animationDelay: "0.4s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="18"
          fill="url(#pure-steam)"
          className="clean-plume"
          style={{ animationDelay: "1.2s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="12"
          fill="url(#pure-steam)"
          className="clean-plume"
          style={{ animationDelay: "1.7s" }}
        />
        <circle
          cx="-10"
          cy="-10"
          r="10"
          fill="url(#pure-steam)"
          className="clean-plume"
          style={{ animationDelay: "2s" }}
        />
      </g>

      {/* 2. Massive Cooling Tower (Background Right) */}
      <path
        d="M 28 44 C 32 25 32 15 29 4 C 34 2.5 42 2.5 47 4 C 44 15 44 25 48 44 Z"
        fill="url(#clean-tower-grad)"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      {/* 2.5D Tower Opening */}
      <ellipse
        cx="38"
        cy="4"
        rx="9"
        ry="2"
        fill="#475569"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      <ellipse cx="38" cy="4" rx="7.5" ry="1.5" fill="#1e293b" />

      {/* 3. Auxiliary Reactor Hall (Middle Layer) */}
      <rect
        x="18"
        y="28"
        width="16"
        height="16"
        fill="url(#reactor-hall-grad)"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      {/* 2.5D Flat Roof */}
      <path
        d="M 18 28 L 24 24 L 40 24 L 34 28 Z"
        fill="#cbd5e1"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      {/* Structural Ribs */}
      <line
        x1="22"
        y1="28"
        x2="22"
        y2="44"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      <line
        x1="26"
        y1="28"
        x2="26"
        y2="44"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      <line
        x1="30"
        y1="28"
        x2="30"
        y2="44"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />

      {/* 4. Glowing Reactor Vent (Cherenkov Radiation) */}
      <rect x="23" y="34" width="8" height="4" rx="1" fill="#0f172a" />
      <circle
        cx="27"
        cy="36"
        r="4"
        fill="url(#cherenkov-glow)"
        className="reactor-pulse"
      />
      <rect
        x="24"
        y="35"
        width="6"
        height="2"
        fill="#67e8f9"
        opacity="0.9"
        className="reactor-pulse"
      />

      {/* 5. Main Containment Dome (Foreground Left) */}
      <path
        d="M 4 20 C 4 6 24 6 24 20 L 24 44 L 4 44 Z"
        fill="url(#dome-grad)"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      {/* Dome Panel Seams for Scale */}
      <path
        d="M 4 20 Q 14 24 24 20"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="0.5"
        opacity="0.6"
      />
      <line
        x1="14"
        y1="9"
        x2="14"
        y2="44"
        stroke="#94a3b8"
        strokeWidth="0.5"
        opacity="0.5"
      />

      {/* 6. Player Ownership Accent Stripe (Curved around Dome) */}
      <path
        d="M 4 34 Q 14 36 24 34 L 24 37 Q 14 39 4 37 Z"
        fill={ownerColor}
        opacity="0.9"
      />
      <path
        d="M 4 34 Q 14 36 24 34 L 24 35 Q 14 37 4 35 Z"
        fill="#ffffff"
        opacity="0.4"
      />

      {/* 7. Nuclear Trefoil Symbol */}
      <g
        transform="translate(14, 25) scale(0.25)"
        fill="#334155"
        stroke="#f8fafc"
        strokeWidth="1"
      >
        {/* Glowing backdrop for symbol */}
        <circle
          cx="0"
          cy="0"
          r="14"
          fill="#f8fafc"
          stroke="none"
          opacity="0.7"
        />
        <circle
          cx="0"
          cy="0"
          r="10"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
        />
        {/* Trefoil Wedges */}
        <path d="M 0,0 L -8.66,-5 L -8.66,5 Z" transform="rotate(0)" />
        <path d="M 0,0 L -8.66,-5 L -8.66,5 Z" transform="rotate(120)" />
        <path d="M 0,0 L -8.66,-5 L -8.66,5 Z" transform="rotate(240)" />
        {/* Center Dot */}
        <circle cx="0" cy="0" r="2" fill="#334155" stroke="none" />
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

export default Nuclear;
