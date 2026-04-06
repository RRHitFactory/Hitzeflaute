"use client";

import { DataFrame, MarketCouplingSummary } from "@/types/game";
import React from "react";
import { parseDataFrame, formatNumber } from "./utils";

interface BusResultsTableProps {
  busId: number;
  marketSummary: MarketCouplingSummary;
  position: { x: number; y: number };
  onClose: () => void;
}

const BusResultsTable: React.FC<BusResultsTableProps> = ({
  busId,
  marketSummary,
  position,
  onClose,
}) => {
  // Calculate positioning to avoid going off-screen
  const panelWidth = 300;
  const panelHeight = 250; // Taller panel to fit all content
  const offset = 15;

  let left = position.x + offset;
  let top = position.y - panelHeight / 2; // Center on click position

  // Adjust vertical position if it would go off-screen
  if (top < 0) {
    top = 10;
  } else if (top + panelHeight > 400) {
    // SVG viewBox height - position higher to ensure full visibility
    top = 400 - panelHeight - 20;
  }

  // Get bus results from market summary
  const busResults = marketSummary.bus_results[busId.toString()];

  if (!busResults) {
    return null;
  }

  const [price, generationDf, loadDf, net_position] = busResults;

  const generationData = parseDataFrame(generationDf);
  const loadData = parseDataFrame(loadDf);

  // Helper function to get unit suffix based on column name
  const getUnitSuffix = (columnName: string): string => {
    if (typeof columnName === "string") {
      if (columnName.toLowerCase().includes("power")) {
        return "MW";
      } else if (columnName.toLowerCase().includes("price")) {
        return "€/MWh";
      }
    }
    return "";
  };

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
          Bus {busId} Market Results
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
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium">Market Price:</span>
          <span className="text-gray-900 font-bold">
            {formatNumber(price, 2)} €/MWh
          </span>
        </div>
        {/* Net Position Display */}
        {typeof net_position !== "undefined" && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 font-medium">Net Position:</span>
            <span className="text-gray-900 font-bold">
              {typeof net_position === "number"
                ? net_position > 0
                  ? `Exporting ${formatNumber(net_position, 1)} MW`
                  : net_position < 0
                    ? `Importing ${formatNumber(Math.abs(net_position), 1)} MW`
                    : "Balanced"
                : String(net_position)}
            </span>
          </div>
        )}

        {generationData.columns.length > 0 && (
          <div className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="pb-1 pr-2">Generator</th>
                    {(() => {
                      const assetIdColIndex = generationData.columns.findIndex(
                        (col) => col === "asset_id",
                      );
                      return generationData.data.map(
                        (row: any, rowIdx: number) => {
                          const assetId =
                            assetIdColIndex >= 0
                              ? row[assetIdColIndex]
                              : rowIdx;
                          return (
                            <th key={rowIdx} className="pb-1 pr-2">
                              {assetId}
                            </th>
                          );
                        },
                      );
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {generationData.columns.map(
                    (colName: any, colIdx: number) => {
                      // Skip the asset_id column in the body
                      if (colName === "asset_id") return null;

                      const suffix = getUnitSuffix(colName);
                      const rowTitle = suffix
                        ? `${colName} (${suffix})`
                        : colName;
                      return (
                        <tr key={colIdx} className="border-t border-gray-100">
                          <td className="py-1 pr-2 text-gray-600 font-medium">
                            {rowTitle}
                          </td>
                          {generationData.data.map(
                            (row: any, rowIdx: number) => {
                              let cellValue = row[colIdx];

                              // Special handling for owner_player column
                              if (colName === "owner_player") {
                                const ownerId = parseInt(cellValue);
                                cellValue =
                                  ownerId === -1 ? "NPC" : ownerId.toString();
                              } else {
                                cellValue = formatNumber(cellValue, 1);
                              }

                              return (
                                <td
                                  key={rowIdx}
                                  className="py-1 pr-2 text-gray-900"
                                >
                                  {cellValue}
                                </td>
                              );
                            },
                          )}
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loadData.columns.length > 0 && (
          <div className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="pb-1 pr-2">Load</th>
                    {(() => {
                      const loadIdColIndex = loadData.columns.findIndex(
                        (col) => col === "asset_id",
                      );
                      return loadData.data.map((row: any, rowIdx: number) => {
                        const loadId =
                          loadIdColIndex >= 0 ? row[loadIdColIndex] : rowIdx;
                        return (
                          <th key={rowIdx} className="pb-1 pr-2">
                            {loadId}
                          </th>
                        );
                      });
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {loadData.columns.map((colName: any, colIdx: number) => {
                    // Skip the asset_id column in the body
                    if (colName === "asset_id") return null;

                    const suffix = getUnitSuffix(colName);
                    const rowTitle = suffix
                      ? `${colName} (${suffix})`
                      : colName;
                    return (
                      <tr key={colIdx} className="border-t border-gray-100">
                        <td className="py-1 pr-2 text-gray-600 font-medium">
                          {rowTitle}
                        </td>
                        {loadData.data.map((row: any, rowIdx: number) => {
                          let cellValue = row[colIdx];

                          // Special handling for owner_player column
                          if (colName === "owner_player") {
                            const ownerId = parseInt(cellValue);
                            cellValue =
                              ownerId === -1 ? "NPC" : ownerId.toString();
                          } else {
                            cellValue = formatNumber(cellValue, 1);
                          }

                          return (
                            <td
                              key={rowIdx}
                              className="py-1 pr-2 text-gray-900"
                            >
                              {cellValue}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusResultsTable;
