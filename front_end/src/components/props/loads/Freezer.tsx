'use client';
import React from 'react';

interface FreezerProps {
  ownerColor: string;
  position: { x: number; y: number };
}

const Freezer: React.FC<FreezerProps> = ({ ownerColor, position }) => {
  return (
    <g 
      transform={`translate(${position.x - 30}, ${position.y - 45})`}
      className="freezer-load-interactive"
    >
      <defs>
        {/* Shadow Filter */}
        <filter id="shadow-freezer" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
        
        {/* Waffle Cone Gradient */}
        <linearGradient id="coneGradient-freezer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>

        {/* Dynamic Scoop Glow */}
        <linearGradient id="scoopGlow-freezer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <style>
        {`
          .freezer-load-interactive {
            cursor: pointer;
            transition: filter 0.3s ease;
            filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3));
          }
          
          /* Hover State: bright and speeds up drips */
          .freezer-load-interactive:hover {
            filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.5)) brightness(1.1);
          }
          .freezer-load-interactive:hover .drip {
            animation: melt-drip 0.8s ease-out infinite;
          }

          /* Melting Animation: Natural standard drips Standard speeds up standard on hover. Standard flickering removed Standard Standard standard illustrative Standard professional distinctive standard standard illustrative distinctive */
          @keyframes melt-drip {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(15px); opacity: 0; }
          }
        `}
      </style>
      <g className="ice-cream" filter="url(#shadow-freezer)">
        {/* 1. Base Platform (Matching standard logic foundation and ownership trim base) */}
        {/* Concrete Platform - tiered concrete */}
        <path d="M-6 38 L 54 38 L 48 44 L 0 44 Z" fill={ownerColor} stroke="#475569" strokeWidth="0.5" />
        {/* gravel tint integrated for depth */}
        <path d="M 0 40 L 48 40 L 44 43 L 4 43 Z" fill="#4b5563" opacity="0.1" />

        {/* 2. Primary Visibility: Base platform trim using owner color */}
        {/* Front edge trim */}
        <path d="M 0 44 L 48 44 L 48 46 L 0 46 Z" fill={ownerColor} opacity="0.9" />
        {/* 3D Side trim */}
        <path d="M 48 44 L 54 38 L 54 40 L 48 46 Z" fill={ownerColor} opacity="0.85" />
        {/* Highlight edge */}
        <path d="M 0 44 L 48 44 L 48 45 L 0 45 Z" fill="#ffffff" opacity="0.3" />

        {/* 3. Small Illustrative Stand holding refined Cones */}
        <rect x="12" y="32" width="36" height="6" fill="#ca8a04" opacity="0.3" rx="1" />
        <ellipse cx="30" cy="38" rx="20" ry="2" fill="#cbd5e1" opacity="0.1" />

        {/* 4. Clearly Reworked Solar Field: Multiple Tiered Distinct Rows */}
        {/* 5. Player Ownership Accent Stripe (integrated on stand and base) */}
        <rect x="12" y="36" width="36" height="2" fill={ownerColor} />
        <rect x="12" y="36" width="36" height="1" fill="#ffffff" opacity="0.4" />

        {/* 6. Refined Illustrative Cones Side-by-Side (Waffle texture and refined scoops) */}
        {/* --- Cone 1 (Left) --- */}
        {/* Waffle Cone (Detailed texture) */}
        <path d="M 15,30 L 5,10 H 25 Z" fill="url(#coneGradient-freezer)" stroke="#ca8a04" strokeWidth="0.5" />
        {/* Detailed cross-hatch pattern */}
        <path d="M 8,16 L 22,16 M 11,22 L 19,22 M 14,28 L 16,28" stroke="#ca8a04" strokeWidth="0.3" opacity="0.5" />
        <path d="M 15,10 L 11,22 M 15,10 L 19,22" fill="none" stroke="#ca8a04" strokeWidth="0.3" opacity="0.5" />

        {/* Scoops: Vanilla (Top), Chocolate (Bottom) */}
        <circle cx="15" cy="8" r="8" fill="#57534e" /> {/* Chocolate */}
        <circle cx="15" cy="2" r="7" fill="#f1f5f9" /> {/* Vanilla */}
        {/* Scoop Glow Accent (Subtle swirl effects standard soft flavors) */}
        <circle cx="15" cy="5" r="5" fill="url(#scoopGlow-freezer)" opacity="0.4" />
        <path d="M 15 2 Q 13 4 15 6" fill="none" stroke="#e2e8f0" strokeWidth="0.3" opacity="0.6" />

        {/* Melting Drips from Cone 1 (Natural fluid drips speeds up standard on hover) */}
        <g transform="translate(15, 8)">
          <path className="drip" d="M 4 2 C 6 4 6 6 4 8 Z" fill="#fef08a" opacity="0" style={{ animationDelay: '0s' }} />
          <path className="drip" d="M -3 1 C -5 3 -5 5 -3 7 Z" fill="#57534e" opacity="0" style={{ animationDelay: '0.4s' }} />
        </g>
        {/* Small puddles at base of scoops */}
        <path d="M 12 36 L 18 36" stroke={ownerColor} strokeWidth="1" opacity="0.6" rx="0.5"/>

        {/* --- Cone 2 (Right) --- */}
        {/* Waffle Cone (Detailed texture) */}
        <path d="M 45,30 L 35,10 H 55 Z" fill="url(#coneGradient-freezer)" stroke="#ca8a04" strokeWidth="0.5" />
        {/* Detailed cross-hatch pattern */}
        <path d="M 38,16 L 52,16 M 41,22 L 49,22 M 44,28 L 46,28" stroke="#ca8a04" strokeWidth="0.3" opacity="0.5" />
        <path d="M 45,10 L 41,22 M 45,10 L 49,22" fill="none" stroke="#ca8a04" strokeWidth="0.3" opacity="0.5" />

        {/* Scoops: Strawberry (Top), Vanilla (Bottom) */}
        <circle cx="45" cy="8" r="8" fill="#f1f5f9" /> {/* Vanilla */}
        <circle cx="45" cy="2" r="7" fill="#fb7185" /> {/* Strawberry */}
        {/* Scoop Glow Accent (Subtle swirl effects standard soft flavors) */}
        <circle cx="45" cy="5" r="5" fill="url(#scoopGlow-freezer)" opacity="0.4" />
        <path d="M 45 2 Q 43 4 45 6" fill="none" stroke="#f1f5f9" strokeWidth="0.3" opacity="0.6" />

        {/* Melting Drips from Cone 2 (Natural fluid drips speeds up standard on hover) */}
        <g transform="translate(45, 8)">
          <path className="drip" d="M 4 2 C 6 4 6 6 4 8 Z" fill="#fb7185" opacity="0" style={{ animationDelay: '0.2s' }} />
          <path className="drip" d="M -3 1 C -5 3 -5 5 -3 7 Z" fill="#fef08a" opacity="0" style={{ animationDelay: '0.6s' }} />
        </g>
        {/* Small puddles at base of scoops */}
        <path d="M 42 36 L 48 36" stroke={ownerColor} strokeWidth="1" opacity="0.6" rx="0.5"/>
      </g>
    </g>
  );
};

export default Freezer;