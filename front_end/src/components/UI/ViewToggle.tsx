"use client";

import React from "react";

interface ViewToggleProps {
  viewMode: "normal" | "market";
  onToggle: (mode: "normal" | "market") => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onToggle }) => {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border p-1 w-full">
      <button
        className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${
          viewMode === "normal"
            ? "bg-blue-100 text-blue-800 border border-blue-200"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
        onClick={() => onToggle("normal")}
      >
        Normal View
      </button>
      <button
        className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${
          viewMode === "market"
            ? "bg-green-100 text-green-800 border border-green-200"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
        onClick={() => onToggle("market")}
      >
        Market View
      </button>
    </div>
  );
};

export default ViewToggle;
