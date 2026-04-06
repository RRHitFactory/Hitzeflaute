'use client';
import React from 'react';

interface SolarProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Solar: React.FC<SolarProps> = ({ ownerColor, position }) => {
  return (
    <g 
      transform={`translate(${position.x - 30}, ${position.y - 40}) scale(1.2)`}
      className="solar-plant-interactive"
    >
      <defs>
        {/* Material Gradients */}
        <linearGradient id="metal-grad-solar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        
        <linearGradient id="concrete-grad-solar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="20%" stopColor="#d1d5db" />
          <stop offset="80%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>

        {/* Deep, clear blue for panels */}
        <linearGradient id="panel-grad-solar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>

        {/* Traveling Glint sequence gradient */}
        <radialGradient id="glint-pulse-solar" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <style>
        {`
          .solar-plant-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.3));
          }
          
          /* Hover State: Brighten and speed up activity */
          .solar-plant-interactive:hover {
            filter: drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.4)) brightness(1.1);
          }
          .solar-plant-interactive:hover .traveling-glint {
            animation-duration: 0.7s;
          }

          /* traveling sequentially across tiered rows */
          @keyframes glint-across-rows {
            0% { transform: translate(-3px, -15px) scale(0.2); opacity: 0; }
            10% { opacity: 0.9; }
            40% { transform: translate(0px, 0px) scale(1); opacity: 1; }
            70% { opacity: 0.3; }
            100% { transform: translate(10px, -10px) scale(0.2); opacity: 0; }
          }
          .traveling-glint {
            animation: glint-across-rows 5.2s infinite linear;
            transform-origin: center;
          }
        `}
      </style>

      {/* 1. Base Platform (Tiered Concrete and Gravel) */}
      {/* Concrete Platform - clearly tiered */}
      <path d="M-6 38 L 54 38 L 48 44 L 0 44 Z" fill={ownerColor} />
      
      {/* Substrate/Gravel - integrated for depth */}
      <path d="M 0 40 L 48 40 L 44 43 L 4 43 Z" fill="#4b5563" opacity="0.1" />

      {/* 3. Clearly Reworked Solar Field: Multiple Tiered Distinct Rows */}
      {/* supports and structure */}
      <rect x="23" y="10" width="4" height="30" fill="url(#metal-grad-solar)" rx="1" />
      <path d="M 12 40 L 23 10 Q 25 8 27 10 L 38 40" fill="none" stroke="#64748b" strokeWidth="1" />
      <rect x="12" y="10" width="30" height="2" fill={ownerColor} rx="0.5" /> {/* Main axis accent */}

      {/* Group for entire array, tiered for 2.5D depth */}
      <g transform="translate(6, 6)">
        {/* Tier 1 (Rear) - distinct rows, not internal divisions */}
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          <rect x="11" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          <rect x="22" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          <rect x="33" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          {/* Internal Cells (more defined) */}
          <line x1="5" y1="0" x2="5" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="0" y1="6" x2="10" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="16" y1="0" x2="16" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="11" y1="6" x2="21" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="27" y1="0" x2="27" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="22" y1="6" x2="32" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="38" y1="0" x2="38" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="33" y1="6" x2="43" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
        </g>
        
        {/* Tier 2 (Front) */}
        <g transform="translate(-1, 14)">
          <rect x="0" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          <rect x="11" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          <rect x="22" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          <rect x="33" y="0" width="10" height="12" fill="url(#panel-grad-solar)" rx="0.5" stroke={ownerColor} strokeWidth="0.75" />
          {/* Internal Cells */}
          <line x1="5" y1="0" x2="5" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="0" y1="6" x2="10" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="16" y1="0" x2="16" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="11" y1="6" x2="21" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="27" y1="0" x2="27" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="22" y1="6" x2="32" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="38" y1="0" x2="38" y2="12" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
          <line x1="33" y1="6" x2="43" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.15" />
        </g>
      </g>

      {/* 4. Sequential Traveling Glint Animation (Across the Tiered Rows) */}
      <g transform="translate(0, 0)">
        <path d="M-4 -2 L0 -8 L4 -2 L0 0 Z" fill="url(#glint-pulse-solar)" className="traveling-glint" style={{ animationDelay: '0.s' }} />
        <path d="M10 2 L-14 -2 L18 2 L14 6 Z" fill="url(#glint-pulse-solar)" className="traveling-glint" style={{ animationDelay: '0.3s' }} />
      </g>

      {/* 5. Substation/Inverter box (Clearly Defined) */}
      {/* Box */}
      <rect x="42" y="32" width="12" height="10" rx="1" fill="#334155" stroke="#1e293b" strokeWidth="0.5" />
      {/* Visibility: Horizontal owner color trim */}
      <rect x="42" y="36" width="12" height="3" fill={ownerColor} />
      <rect x="42" y="36" width="12" height="1" fill="#ffffff" opacity="0.4" />
      
      {/* Vents/Details */}
      <rect x="44" y="31" width="2" height="2" fill="#94a3b8" />
      <rect x="50" y="31" width="2" height="2" fill="#94a3b8" />
      
      {/* Electrical Output status light (Distinct) */}
      <g transform="translate(52, 30)">
        <circle cx="0" cy="0" r="1.5" fill="#fcd34d" />
        <circle cx="0" cy="0" r="1" fill="#fffbeb" opacity="0.8" />
      </g>
    </g>
  );
};

export default Solar;