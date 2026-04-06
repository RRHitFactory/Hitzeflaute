'use client';
import React from 'react';

interface CoalProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Coal: React.FC<CoalProps> = ({ ownerColor, position }) => {
  return (
    <g 
      transform={`translate(${position.x - 30}, ${position.y - 45})`}
      className="coal-plant-interactive"
    >
      <defs>
        {/* Material Gradients */}
        <linearGradient id="boiler-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        <linearGradient id="stack-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="30%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        <linearGradient id="coal-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#030712" />
        </linearGradient>

        {/* Smoke & Glow Effects */}
        <radialGradient id="dark-smoke" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(31, 41, 55, 0.85)" />
          <stop offset="50%" stopColor="rgba(55, 65, 81, 0.6)" />
          <stop offset="100%" stopColor="rgba(75, 85, 99, 0)" />
        </radialGradient>
        
        <radialGradient id="furnace-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(249, 115, 22, 1)" />
          <stop offset="50%" stopColor="rgba(239, 68, 68, 0.7)" />
          <stop offset="100%" stopColor="rgba(220, 38, 38, 0)" />
        </radialGradient>
      </defs>

      <style>
        {`
          .coal-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 4px 5px rgba(0, 0, 0, 0.4));
          }
          
          /* Hover State */
          .coal-plant-interactive:hover {
            filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.5)) brightness(1.1);
          }
          .coal-plant-interactive:hover .toxic-smoke {
            animation-duration: 1.5s;
          }
          .coal-plant-interactive:hover .furnace-fire {
            animation-duration: 0.4s;
          }
          .coal-plant-interactive:hover .warning-light {
            animation: light-flash 1s infinite alternate;
          }

          /* Thick Smoke Animation */
          @keyframes heavy-billow {
            0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
            25% { opacity: 0; }
            35% { opacity: 1; }
            100% { transform: translate(0px, -20px) scale(2.2); opacity: 0; }
          }
          .toxic-smoke {
            animation: heavy-billow 3s infinite linear;
            transform-origin: center;
          }

          /* Furnace Flicker */
          @keyframes fire-flicker {
            0%, 100% { transform: scale(0.9); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          .furnace-fire {
            animation: fire-flicker 0.8s infinite ease-in-out;
            transform-origin: center;
          }

          /* Aviation Warning Light */
          @keyframes light-flash {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; filter: drop-shadow(0 0 2px red); }
          }
        `}
      </style>

      {/* 1. Base Platform (Owner Color) */}
      <path d="M-4 44 L 56 44 L 50 50 L 2 50 Z" fill={ownerColor} opacity="0.9" />
      <path d="M-4 44 L 56 44 L 56 45 L -4 45 Z" fill="#ffffff" opacity="0.2" />

      {/* 2. Smokestack (Tall & Cylindrical with Warning Stripes) */}
      <rect x="36" y="2" width="10" height="42" fill="url(#stack-grad)" />
      {/* Red Aviation Stripes */}
      <rect x="36" y="6" width="10" height="4" fill="#b91c1c" opacity="0.8" />
      <rect x="36" y="16" width="10" height="4" fill="#b91c1c" opacity="0.8" />
      {/* Top opening */}
      <ellipse cx="41" cy="2" rx="5" ry="1.5" fill="#1f2937" />
      
      {/* Aviation Warning Light */}
      <circle cx="41" cy="2" r="1" fill="#ef4444" className="warning-light" opacity="0.5" />

      {/* Smokestack Billows */}
      <g transform="translate(41, -2)">
        <circle cx="-4" cy="0" r="6" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '0s' }} />
        <circle cx="-5" cy="-4" r="7" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '0.3s' }} />
        <circle cx="-6" cy="-2" r="8" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '0.5s' }} />
        <circle cx="-6" cy="-2" r="10" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '0.6s' }} />
        <circle cx="-4" cy="-2" r="5" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '0.8s' }} />
        <circle cx="-5" cy="-2" r="5" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '1s' }} />
        <circle cx="-4" cy="-2" r="6" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '1.2s' }} />
        <circle cx="-4" cy="-2" r="10" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '1.3s' }} />
        <circle cx="-5" cy="-2" r="5" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '1.4s' }} />
        <circle cx="-6" cy="-2" r="8" fill="url(#dark-smoke)" className="toxic-smoke" style={{ animationDelay: '1.6s' }} />
      </g>

      {/* 3. Coal Pile & Feed Conveyor */}
      {/* Coal Mound */}
      <path d="M 2 44 L 6 36 L 10 38 L 14 34 L 19 44 Z" fill="url(#coal-grad)" />
      {/* Slanted Conveyor Belt */}
      <path d="M 12 40 L 24 22 L 27 24 L 15 42 Z" fill="#334155" stroke="#1e293b" strokeWidth="0.5" />
      <line x1="14" y1="39" x2="25" y2="23" stroke="#0f172a" strokeWidth="0.5" />

      {/* 4. Main Boiler Building */}
      {/* Back Tier */}
      <rect x="26" y="20" width="12" height="24" fill="url(#boiler-grad)" />
      <path d="M 26 20 L 32 15 L 38 20 Z" fill="#475569" />
      {/* Front Tier */}
      <rect x="18" y="26" width="16" height="18" fill="url(#boiler-grad)" stroke="#1e293b" strokeWidth="0.5" />
      <path d="M 18 26 L 26 20 L 34 26 Z" fill="#64748b" stroke="#1e293b" strokeWidth="0.5" />
      
      {/* Structural Framing Lines */}
      <line x1="22" y1="26" x2="22" y2="44" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />
      <line x1="26" y1="26" x2="26" y2="44" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />
      <line x1="30" y1="26" x2="30" y2="44" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />

      {/* 5. Player Ownership Accent Stripe */}
      <rect x="18" y="34" width="16" height="3" fill={ownerColor} />
      <rect x="18" y="34" width="16" height="1" fill="#ffffff" opacity="0.3" />

      {/* 6. Glowing Furnace Vent */}
      <rect x="23" y="40" width="6" height="4" rx="1" fill="#111827" />
      <circle cx="26" cy="42" r="3" fill="url(#furnace-glow)" className="furnace-fire" />
      <rect x="24" y="41" width="4" height="2" fill="#fed7aa" opacity="0.8" />
    </g>
  );
};

export default Coal;