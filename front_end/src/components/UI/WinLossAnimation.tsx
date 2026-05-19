"use client";

import React, { useEffect, useState } from "react";

// Simple melted ice cream animation styles
const meltedIceCreamStyle = `
  @keyframes melt {
    0% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(5deg); }
    100% { transform: scale(0.9) rotate(-5deg); }
  }
  
  .melted-ice-cream {
    animation: melt 2s infinite ease-in-out;
    display: inline-block;
  }
`;

interface WinLossAnimationProps {
  isOpen: boolean;
  type: "win" | "loss";
  playerName?: string;
  onClose: () => void;
}

const WinLossAnimation: React.FC<WinLossAnimationProps> = ({
  isOpen,
  type,
  playerName,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Add the animation styles to the document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = meltedIceCreamStyle;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  if (!isVisible || !isOpen) return null;

  const isWin = type === "win";
  const message = isWin 
    ? playerName 
      ? `${playerName} wins!` 
      : "You win!" 
    : playerName 
      ? `${playerName} lost!`
      : "You lost!";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>

        <div className="mb-6">
          {isWin ? (
            <div className="text-6xl mb-4">🎉</div>
          ) : (
            <div className="text-6xl mb-4 melted-ice-cream">🍦</div>
          )}
        </div>

        <h2 className={`text-3xl font-bold mb-4 ${isWin ? "text-green-600" : "text-red-600"}`}>
          {message}
        </h2>

        {!isWin && (
          <div className="mb-6">
            <div className="text-4xl">😢</div>
            <div className="text-lg text-gray-600 mt-2">Your ice cream melted!</div>
          </div>
        )}

        <button
          onClick={onClose}
          className={`mt-6 px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity ${isWin ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default WinLossAnimation;