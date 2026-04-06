'use client';
import React from 'react';

interface IndustrialProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Industrial: React.FC<IndustrialProps> = ({ ownerColor, position }) => {
  return (
    <g 
      transform={`translate(${position.x - 25}, ${position.y - 50})`}
      className="industrial-plant-interactive"
    >
      <defs>
        {/* Material Gradients */}
        <linearGradient id="factory-front-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="factory-roof-2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        <linearGradient id="stack-grad-2d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="30%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        <radialGradient id="factory-smoke-2d" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(203, 213, 225, 0.8)" />
          <stop offset="50%" stopColor="rgba(226, 232, 240, 0.5)" />
          <stop offset="100%" stopColor="rgba(248, 250, 252, 0)" />
        </radialGradient>

        <filter id="shadow-2d" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      <style>
        {`
          .industrial-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3));
          }
          
          .industrial-plant-interactive:hover {
            filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.5)) brightness(1.1);
          }
          .industrial-plant-interactive:hover .factory-smoke {
            animation-duration: 2.5s;
          }
          .industrial-plant-interactive:hover .activity-light {
            animation: fast-blink 0.5s infinite alternate;
          }

          @keyframes smoke-rise {
            0% { transform: translateY(0) scale(0.8); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translateY(-20px) scale(2.5); opacity: 0; }
          }
          .factory-smoke {
            animation: smoke-rise 5s infinite linear;
            transform-origin: center;
          }

          @keyframes blink {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; filter: drop-shadow(0 0 3px #eab308); }
          }
          @keyframes fast-blink {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 1; filter: drop-shadow(0 0 4px #eab308); }
          }
          .activity-light {
            animation: blink 2s infinite alternate;
          }
        `}
      </style>

      <g filter="url(#shadow-2d)">
        {/* 1. Smokestack (Back Layer) */}
        <rect x="36" y="8" width="8" height="30" fill="url(#stack-grad-2d)" stroke="#475569" strokeWidth="0.5" />
        <ellipse cx="40" cy="8" rx="4" ry="1.5" fill="#334155" />

        {/* Smoke Plumes */}
        <g transform="translate(40, 6)">
          <circle cx="0" cy="0" r="5" fill="url(#factory-smoke-2d)" className="factory-smoke" style={{ animationDelay: '0s' }} />
          <circle cx="-2" cy="-3" r="6" fill="url(#factory-smoke-2d)" className="factory-smoke" style={{ animationDelay: '1.6s' }} />
          <circle cx="2" cy="-1" r="4" fill="url(#factory-smoke-2d)" className="factory-smoke" style={{ animationDelay: '3.2s' }} />
        </g>

        {/* 2. Sawtooth Roof Building (Middle Layer) */}
        {/* 3 Peaks facing left */}
        <path d="M 6 26 L 6 12 L 16 22 L 16 12 L 26 22 L 26 12 L 36 22 L 36 26 Z" fill="url(#factory-roof-2d)" stroke="#475569" strokeWidth="0.5" />
        
        {/* Skylights on the vertical drop of the sawtooth */}
        <line x1="7" y1="13" x2="7" y2="21" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
        <line x1="17" y1="13" x2="17" y2="21" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
        <line x1="27" y1="13" x2="27" y2="21" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />

        {/* 3. Main Factory Floor Building (Front Layer) */}
        <rect x="4" y="24" width="42" height="22" fill="url(#factory-front-2d)" stroke="#475569" strokeWidth="0.5" />
        <rect x="4" y="24" width="42" height="2" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />

        {/* 1. Base Platform (Owner Color) */}
        <path d="M-4 46 L 56 46 L 50 52 L 2 52 Z" fill={ownerColor} opacity="0.9" />
        <path d="M-4 46 L 56 46 L 56 47 L -4 47 Z" fill="#ffffff" opacity="0.2" />

        {/* 5. Player Ownership Accent Stripe */}
        <rect x="4" y="28" width="42" height="3" fill={ownerColor} />
        <rect x="4" y="28" width="42" height="1" fill="#ffffff" opacity="0.4" />

        {/* 6. Industrial Details */}
        {/* Roll-up Loading Door */}
        <rect x="8" y="34" width="12" height="12" fill="#475569" stroke="#334155" strokeWidth="0.5" />
        <line x1="8" y1="36" x2="20" y2="36" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="8" y1="38" x2="20" y2="38" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="8" y1="40" x2="20" y2="40" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="8" y1="42" x2="20" y2="42" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="8" y1="44" x2="20" y2="44" stroke="#1e293b" strokeWidth="0.5" />

        {/* Activity Warning Light (above door) */}
        <circle cx="14" cy="32" r="1.5" fill="#eab308" className="activity-light" />

        {/* Factory Windows */}
        <rect x="24" y="36" width="8" height="6" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
        <rect x="24" y="36" width="8" height="6" fill="#38bdf8" opacity="0.3" />
        <line x1="28" y1="36" x2="28" y2="42" stroke="#475569" strokeWidth="0.5" />
        
        <rect x="34" y="36" width="8" height="6" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
        <rect x="34" y="36" width="8" height="6" fill="#38bdf8" opacity="0.3" />
        <line x1="38" y1="36" x2="38" y2="42" stroke="#475569" strokeWidth="0.5" />
      </g>
    </g>
  );
};

export default Industrial;