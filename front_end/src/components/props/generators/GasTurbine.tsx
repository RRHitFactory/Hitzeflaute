"use client";
import React from "react";

interface GasTurbineProps {
  ownerColor: string;
  position: { x: number; y: number };
  scale: number;
}

const GasTurbine: React.FC<GasTurbineProps> = ({
  ownerColor,
  position,
  scale,
}) => {
  return (
    <g
      transform={`translate(${position.x - 30 * scale}, ${position.y - 40 * scale}) scale(${scale})`}
      className="ocgt-plant-interactive"
    >
      <defs>
        {/* Material Gradients */}
        <linearGradient id="intake-grad-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Vertical shading for horizontal cylindrical turbine */}
        <linearGradient id="turbine-grad-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Horizontal shading for vertical cylindrical stack */}
        <linearGradient id="exhaust-grad-2d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="30%" stopColor="#94a3b8" />
          <stop offset="70%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Heat and Glow Effects */}
        <radialGradient id="heat-distortion-2d" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(253, 186, 116, 0.6)" />
          <stop offset="40%" stopColor="rgba(251, 146, 60, 0.3)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>

        <radialGradient id="combustion-glow-2d" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(245, 158, 11, 1)" />
          <stop offset="100%" stopColor="rgba(217, 119, 6, 0)" />
        </radialGradient>

        {/* Smoke & Radiation Glow Effects */}
        <radialGradient id="smoke" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.47)" />
          <stop offset="50%" stopColor="rgba(241, 245, 249, 0.4)" />
          <stop offset="100%" stopColor="rgba(226, 232, 240, 0)" />
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
          .ocgt-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3));
          }
          
          .ocgt-plant-interactive:hover {
            filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.5)) brightness(1.1);
          }
          .ocgt-plant-interactive:hover .heat-wave {
            animation-duration: 0.4s;
          }
          .ocgt-plant-interactive:hover .combustion-pulse {
            animation-duration: 0.3s;
          }

          @keyframes fast-shimmer {
            0% { transform: translate(35px, 10px); opacity: 0; }
            30% { opacity: 0.0; }
            40% { opacity: 1; }
            100% { transform: translate(35px, -40px); opacity: 0; }
          }
          .smoke {
            animation: fast-shimmer 1.5s infinite linear;
            transform-origin: bottom center;
          }

          @keyframes fast-pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; filter: drop-shadow(0 0 2px #f59e0b); }
          }
          .combustion-pulse {
            animation: fast-pulse 1s infinite ease-in-out;
            transform-origin: center;
            transition: transform 0.3s ease;
          }
        `}
      </style>

      <g filter="url(#shadow-2d)">
        {/* 1. Exhaust Silencer Stack (Right) */}
        <rect
          x="34"
          y="6"
          width="10"
          height="40"
          fill="url(#exhaust-grad-2d)"
          stroke="#1e293b"
          strokeWidth="0.5"
        />
        <ellipse cx="39" cy="6" rx="5" ry="1.5" fill="#0f172a" />

        {/* Smoke */}
        <g transform="translate(15, 10)">
          <circle
            cx="-10"
            cy="-10"
            r="13"
            fill="url(#smoke)"
            className="smoke"
            style={{ animationDelay: "0s" }}
          />
          <circle
            cx="-10"
            cy="-10"
            r="13"
            fill="url(#smoke)"
            className="smoke"
            style={{ animationDelay: "0.4s" }}
          />
          <circle
            cx="-10"
            cy="-10"
            r="13"
            fill="url(#smoke)"
            className="smoke"
            style={{ animationDelay: "0.9s" }}
          />
          <circle
            cx="-10"
            cy="-10"
            r="13"
            fill="url(#smoke)"
            className="smoke"
            style={{ animationDelay: "1.1s" }}
          />
          <circle
            cx="-10"
            cy="-10"
            r="13"
            fill="url(#smoke)"
            className="smoke"
            style={{ animationDelay: "1.4s" }}
          />
        </g>

        {/* 2. Air Intake Filter House (Left) */}
        <rect
          x="6"
          y="20"
          width="12"
          height="26"
          fill="url(#intake-grad-2d)"
          stroke="#334155"
          strokeWidth="0.5"
        />
        <rect
          x="5"
          y="18"
          width="14"
          height="2"
          fill="#94a3b8"
          stroke="#334155"
          strokeWidth="0.5"
        />

        {/* Louvers / Vents on Intake */}
        <line
          x1="8"
          y1="24"
          x2="16"
          y2="24"
          stroke="#1e293b"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="8"
          y1="28"
          x2="16"
          y2="28"
          stroke="#1e293b"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="8"
          y1="32"
          x2="16"
          y2="32"
          stroke="#1e293b"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="8"
          y1="36"
          x2="16"
          y2="36"
          stroke="#1e293b"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* 3. Main Turbine Enclosure (Center) */}
        <rect
          x="18"
          y="32"
          width="16"
          height="14"
          fill="url(#turbine-grad-2d)"
          stroke="#334155"
          strokeWidth="0.5"
        />

        {/* Turbine Structural Ribs */}
        <line
          x1="22"
          y1="32"
          x2="22"
          y2="46"
          stroke="#64748b"
          strokeWidth="1"
        />
        <line
          x1="26"
          y1="32"
          x2="26"
          y2="46"
          stroke="#64748b"
          strokeWidth="1"
        />
        <line
          x1="30"
          y1="32"
          x2="30"
          y2="46"
          stroke="#64748b"
          strokeWidth="1"
        />

        {/* 1. Base Platform (Owner Color) */}
        <path
          d="M-4 46 L 56 46 L 50 52 L 2 52 Z"
          fill={ownerColor}
          opacity="0.9"
        />
        <path
          d="M-4 46 L 56 46 L 56 47 L -4 47 Z"
          fill="#ffffff"
          opacity="0.2"
        />

        {/* 5. Player Ownership Accent Stripe (Continuous across intake and turbine) */}
        <rect x="6" y="40" width="28" height="3" fill={ownerColor} />
        <rect x="6" y="40" width="28" height="1" fill="#ffffff" opacity="0.4" />

        {/* 6. Combustion Glow Indicator */}
        <g transform="translate(26, 36)">
          <circle
            cx="0"
            cy="0"
            r="3.5"
            fill="url(#combustion-glow-2d)"
            className="combustion-pulse"
          />
          <circle
            cx="0"
            cy="0"
            r="1.5"
            fill="#fcd34d"
            className="combustion-pulse"
          />
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
    </g>
  );
};

export default GasTurbine;
