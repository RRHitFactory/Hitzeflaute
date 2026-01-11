"use client";

import { HoverableElement, Position } from "@/types/game";
import React from "react";

interface InfoPanelProps {
  element: HoverableElement;
  position: Position;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ element, position }) => {
  // Calculate better positioning to avoid going off-screen
  const panelWidth = 250;
  const panelHeight = 120;
  const offset = 15;

  let left = position.x + offset;
  let top = position.y - panelHeight / 2;

  // Adjust horizontal position if it would go off-screen
  if (left + panelWidth > 500) {
    // SVG viewBox width
    left = position.x - panelWidth - offset;
  }

  // Adjust vertical position if it would go off-screen
  if (top < 0) {
    top = 10;
  } else if (top + panelHeight > 400) {
    // SVG viewBox height
    top = 400 - panelHeight - 10;
  }

  return (
    <div
      className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-xl p-3 info-panel pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${panelWidth}px`,
        fontSize: "12px",
      }}
    >
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 text-sm border-b border-gray-200 pb-1">
          {element.title}
        </h4>
        <div className="space-y-1">
          {Object.entries(element.data).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-gray-600 font-medium">{key}:</span>
              <span className="text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
