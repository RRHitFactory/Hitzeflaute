"use client";

import React from "react";

interface ViewToggleProps {
  viewMode: "normal" | "market";
  onToggle: (mode: "normal" | "market") => void;
  hasMarketData: boolean;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onToggle,
  hasMarketData,
}) => {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border p-1">
      <button
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          viewMode === "normal"
            ? "bg-blue-100 text-blue-800 border border-blue-200"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
        onClick={() => onToggle("normal")}
        disabled={!hasMarketData && viewMode === "market"}
      >
        Normal View
      </button>
      <button
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          viewMode === "market"
            ? "bg-green-100 text-green-800 border border-green-200"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        } ${!hasMarketData ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => hasMarketData && onToggle("market")}
        disabled={!hasMarketData}
        title={
          !hasMarketData ? "No market data available" : "Market Clearing View"
        }
      >
        Market View
      </button>
    </div>
  );
};

export default ViewToggle;
