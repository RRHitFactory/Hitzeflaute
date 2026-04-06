"use client";
import React from "react";

interface LigniteProps {
  ownerColor: string;
  position: { x: number; y: number };
  scale: number;
}

const Lignite: React.FC<LigniteProps> = ({ ownerColor, position, scale }) => {
  return (
    <g
      transform={`translate(${position.x - 30 * scale}, ${position.y - 40 * scale}) scale(${scale})`}
      className="lignite-plant-interactive"
    >
      <defs>
        {/* Material Gradients */}
        <linearGradient id="warm-boiler-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8a29e" />
          <stop offset="100%" stopColor="#57534e" />
        </linearGradient>

        <linearGradient id="heavy-stack-2d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#78716c" />
          <stop offset="50%" stopColor="#d6d3d1" />
          <stop offset="100%" stopColor="#57534e" />
        </linearGradient>

        <linearGradient id="lignite-grad-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#713f12" />
          <stop offset="100%" stopColor="#291506" />
        </linearGradient>

        <radialGradient id="dirty-smoke-2d" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(87, 83, 78, 0.9)" />
          <stop offset="50%" stopColor="rgba(120, 113, 108, 0.6)" />
          <stop offset="100%" stopColor="rgba(168, 162, 158, 0)" />
        </radialGradient>

        <radialGradient id="ember-glow-2d" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(234, 88, 12, 1)" />
          <stop offset="50%" stopColor="rgba(194, 65, 12, 0.8)" />
          <stop offset="100%" stopColor="rgba(153, 27, 27, 0)" />
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
          .lignite-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3));
          }
          
          .lignite-plant-interactive:hover {
            filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.5)) brightness(1.1);
          }
          .lignite-plant-interactive:hover .sluggish-smoke {
            animation-duration: 2s;
          }

          @keyframes thick-drift {
            0% { transform: translate(26px, 5px); opacity: 0; }
            17% { opacity: 0; }
            30% { opacity: 1; }
            100% { transform: translate(20px, -50px); opacity: 0; }
          }
          .sluggish-smoke {
            animation: thick-drift 4s infinite linear;
            transform-origin: center;
          }

        `}
      </style>

      <g filter="url(#shadow-2d)">
        {/* 1. Heavy Concrete Smokestack */}
        <rect
          x="30"
          y="6"
          width="12"
          height="40"
          fill="url(#heavy-stack-2d)"
          stroke="#44403c"
          strokeWidth="0.5"
        />
        {/* Stack Top Rim */}
        <ellipse cx="36" cy="6" rx="6" ry="1.5" fill="#292524" />

        {/* Heavy Lignite Smoke Billows */}
        <g transform="translate(10, 4)">
          <circle
            cx="0"
            cy="0"
            r="7"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "0s" }}
          />
          <circle
            cx="-2"
            cy="-3"
            r="8"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "0.2s" }}
          />
          <circle
            cx="2"
            cy="-1"
            r="6"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "0.4s" }}
          />
          <circle
            cx="2"
            cy="-5"
            r="9"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "0.5s" }}
          />
          <circle
            cx="2"
            cy="-8"
            r="6"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "0.8s" }}
          />
          <circle
            cx="2"
            cy="0"
            r="5"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "0.9s" }}
          />
          <circle
            cx="2"
            cy="-5"
            r="6"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "1.1s" }}
          />
          <circle
            cx="2"
            cy="-7"
            r="9"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "1.3s" }}
          />
          <circle
            cx="2"
            cy="-5"
            r="8"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "1.5s" }}
          />
          <circle
            cx="2"
            cy="-4"
            r="6"
            fill="url(#dirty-smoke-2d)"
            className="sluggish-smoke"
            style={{ animationDelay: "1.6s" }}
          />
        </g>

        {/* 2. Main Boiler Building (Layered Rectangles for 2D Depth) */}
        {/* Back Tier */}
        <rect
          x="18"
          y="22"
          width="18"
          height="24"
          fill="#78716c"
          stroke="#44403c"
          strokeWidth="0.5"
        />
        {/* Front Tier */}
        <rect
          x="12"
          y="28"
          width="20"
          height="18"
          fill="url(#warm-boiler-2d)"
          stroke="#44403c"
          strokeWidth="0.5"
        />

        {/* 2D Roof Line Accents */}
        <rect x="11" y="28" width="22" height="2" fill="#d6d3d1" />
        <rect x="17" y="22" width="20" height="2" fill="#a8a29e" />

        {/* 3. Brown Coal (Lignite) Pile & Conveyor */}
        {/* Enclosed Conveyor */}
        <path
          d="M 10 38 L 18 26 L 21 28 L 13 40 Z"
          fill="#57534e"
          stroke="#292524"
          strokeWidth="0"
        />
        {/* Lignite Mound */}
        <path
          d="M 2 46 L 6 36 L 10 38 L 14 34 L 18 46 Z"
          fill="url(#lignite-grad-2d)"
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

        {/* 5. Player Ownership Accent Stripe */}
        <rect x="12" y="34" width="20" height="3" fill={ownerColor} />
        <rect
          x="12"
          y="34"
          width="20"
          height="1"
          fill="#ffffff"
          opacity="0.3"
        />

        {/* 6. Ember Glowing Furnace Vent */}
        <rect x="20" y="40" width="8" height="4" rx="1" fill="#1c1917" />
        <rect x="22" y="41" width="4" height="2" fill="#fdba74" opacity="0.9" />

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

export default Lignite;
