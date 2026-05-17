"use client";

import { HoverableElement, Point } from "@/types/game";
import React from "react";

interface InfoPanelProps {
  element: HoverableElement;
  position?: Point;
  scrollContainer?: HTMLDivElement | null;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ element }) => {
  const panelWidth = 250;

  return (
    <div
      className="bg-white bg-opacity-90 border border-gray-200 rounded-lg shadow-xl p-3 info-panel pointer-events-none"
      style={{
        width: `${panelWidth}px`,
        fontSize: "12px",
      }}
    >
      <div className="space-y-2">
        <h4
          className={`font-semibold text-gray-900 text-sm ${element.data ? "border-b border-gray-200 pb-1" : ""}`}
        >
          {element.title}
        </h4>
        {element.data && (
          <div className="space-y-1">
            {Object.entries(element.data).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">{key}:</span>
                <span className="text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPanel;
