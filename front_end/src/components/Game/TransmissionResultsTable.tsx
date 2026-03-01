"use client";

import { MarketCouplingSummary } from "@/types/game";
import React from "react";
import { parseDataFrame, formatNumber } from "./utils";

interface TransmissionResultsTableProps {
  lineId: number;
  marketSummary: MarketCouplingSummary;
  position: { x: number; y: number };
  onClose: () => void;
}

const TransmissionResultsTable: React.FC<TransmissionResultsTableProps> = ({
  lineId,
  marketSummary,
  position,
  onClose
}) => {
  // Calculate positioning to avoid going off-screen
  const panelWidth = 300;
  const panelHeight = 200; // Tall enough to fit transmission line content
  const offset = 15;

  let left = position.x + offset;
  let top = position.y - panelHeight / 2; // Center on click position

  // Adjust horizontal position if it would go off-screen
  if (left + panelWidth > 500) {
    // SVG viewBox width
    left = position.x - panelWidth - offset;
  }

  // Adjust vertical position if it would go off-screen
  if (top < 0) {
    top = 10;
  } else if (top + panelHeight > 400) {
    // SVG viewBox height - position higher to ensure full visibility
    top = 400 - panelHeight - 20;
  }

  // Get line results from market summary
  const lineResults = marketSummary.line_results[lineId.toString()];
  
  if (!lineResults) {
    return null;
  }

  // Parse the line results using parseDataFrame
  const parsedLineResults = parseDataFrame(lineResults);

  return (
    <div
      className="absolute z-20 bg-white border border-gray-200 rounded-lg shadow-xl p-3 market-results-panel pointer-events-auto"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${panelWidth}px`,
        fontSize: "12px",
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">
          Line {lineId} Market Results
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg font-bold"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2 pr-2">
        <table className="w-full text-xs">
          <tbody>
            {parsedLineResults.index.map((label, index) => {
              const rowData = parsedLineResults.data[index];
              if (!rowData || rowData.length === 0) return null;
              
              // Skip the line_id row as it's redundant
              if (label === 'line_id') return null;
              
              const value = rowData[0];
              let displayValue = String(value);
              
              // Special formatting based on column name
              if (typeof label === 'string') {
                if (label.toLowerCase().includes('health')) {
                  // Format health as integer
                  const healthValue = parseInt(value);
                  displayValue = isNaN(healthValue) ? String(value) : healthValue.toString();
                } else if (label.toLowerCase().includes('capacity') || label.toLowerCase().includes('flow')) {
                  // Add MW suffix to capacity and flow
                  const numericValue = typeof value === 'number' ? value : parseFloat(value);
                  displayValue = isNaN(numericValue) ? String(value) : `${formatNumber(numericValue, 1)} MW`;
                } else if (label.toLowerCase().includes('power')) {
                  // Add MW suffix to power values
                  const numericValue = typeof value === 'number' ? value : parseFloat(value);
                  displayValue = isNaN(numericValue) ? String(value) : `${formatNumber(numericValue, 1)} MW`;
                } else if (label.toLowerCase().includes('price')) {
                  // Add €/MWh suffix to price values
                  const numericValue = typeof value === 'number' ? value : parseFloat(value);
                  displayValue = isNaN(numericValue) ? String(value) : `${formatNumber(numericValue, 2)} €/MWh`;
                } else {
                  // Default formatting for other values
                  displayValue = typeof value === 'number' ? formatNumber(value, 2) : String(value);
                }
              }
              
              return (
                <tr key={index} className="border-t border-gray-100">
                  <td className="py-1 pr-2 text-gray-600 font-medium">{label}</td>
                  <td className="py-1 pr-2 text-gray-900 font-bold">{displayValue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransmissionResultsTable;