"use client";
import { MarketCouplingSummary, Player } from "@/types/game";
import React from "react";
import { formatNumber, parseDataFrame } from "./utils";

interface BusResultsTableProps {
  busId: number;
  marketSummary: MarketCouplingSummary;
  players: Player[];
  position: { x: number; y: number };
  onClose: () => void;
}

const BusResultsTable: React.FC<BusResultsTableProps> = ({
  busId,
  marketSummary,
  players,
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

  // Helper function to format net position for display
  const getNetPositionDisplay = (position: any) => {
    if (typeof position !== "number") {
      throw new Error("Invlaid type for net position");
    }
    if (position > 0) {
      return `Exporting ${formatNumber(position, 1)} MW`;
    } else if (position < 0) {
      return `Importing ${formatNumber(Math.abs(position), 1)} MW`;
    } else {
      return "Balanced";
    }
  };

  // Helper function to check if a price matches the marginal price
  const isMarginalPriceMatch = (priceValue: any) => {
    if (typeof priceValue !== "number" || typeof price !== "number") {
      return false;
    }
    // Check if the price matches the marginal price (with some tolerance for floating point)
    return Math.abs(priceValue - price) < 0.01;
  };

  // Helper function to determine asset status based on price
  const getAssetStatus = (priceValue: any, isGenerator: boolean = true) => {
    if (typeof priceValue !== "number" || typeof price !== "number") {
      return "unknown";
    }

    if (isMarginalPriceMatch(priceValue)) {
      return "at-money"; // Price equals marginal price
    } else if (isGenerator) {
      // For generators: in-the-money if price < marginal price (can sell profitably)
      return priceValue < price ? "in-money" : "out-of-money";
    } else {
      // For loads: in-the-money if price > marginal price (can buy profitably)
      return priceValue > price ? "in-money" : "out-of-money";
    }
  };

  // Helper function to get status color class
  const getStatusColorClass = (status: string) => {
    if (status == "out-of-money") return "text-gray-300";
    return "text-black";
  };

  // Helper function to format cell value
  const formatCellValue = (
    colName: string,
    cellValue: any,
    rowIdx: number,
    isGenerator: boolean = true,
  ) => {
    if (colName === "owner_player") {
      const ownerId = parseInt(cellValue);
      if (ownerId === -1) {
        return "NPC";
      }
      // Find player by ID and return trigram
      const player = players?.find((p) => p.id === ownerId);
      return player ? player.trigram : ownerId.toString();
    } else {
      const formattedValue = formatNumber(cellValue, 1);
      // Add asterisk for at-money assets in price columns
      if (colName.toLowerCase() == "bid_price") {
        const statuses = isGenerator ? generationStatuses : loadStatuses;
        const status = statuses[rowIdx] || "unknown";
        if (status === "at-money") {
          return `${formattedValue}*`;
        }
      }
      return formattedValue;
    }
  };

  // Determine asset statuses for generation and load data
  const getAssetStatuses = (
    data: any,
    isGenerator: boolean = true,
  ): string[] => {
    if (!data || !data.columns || !data.data) {
      return [];
    }

    const priceColIndex = data.columns.findIndex((col: any) =>
      col.toLowerCase().includes("price"),
    );

    if (priceColIndex === -1) {
      return Array(data.data.length).fill("unknown");
    }

    return data.data.map((row: any) =>
      getAssetStatus(row[priceColIndex], isGenerator),
    );
  };

  const generationStatuses =
    generationData.columns.length > 0
      ? getAssetStatuses(generationData, true)
      : [];
  const loadStatuses =
    loadData.columns.length > 0 ? getAssetStatuses(loadData, false) : [];

  // Check if at least one asset is at the money
  const hasAtMoneyAssets =
    generationStatuses.some((status: string) => status === "at-money") ||
    loadStatuses.some((status: string) => status === "at-money");

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
              {getNetPositionDisplay(net_position)}
            </span>
          </div>
        )}

        {generationData.columns.length > 0 && (
          <div className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-600">
                    <th className="pb-1 pr-2 text-left">Generator</th>
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
                          const status =
                            generationStatuses[rowIdx] || "unknown";
                          const statusClass = getStatusColorClass(status);
                          return (
                            <th
                              key={rowIdx}
                              className={`pb-1 pr-2 text-center ${statusClass} font-bold`}
                            >
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
                          <td className="py-1 pr-2 text-gray-600 font-medium text-left">
                            {rowTitle}
                          </td>
                          {generationData.data.map(
                            (row: any, rowIdx: number) => {
                              const cellValue = row[colIdx];
                              const formattedValue = formatCellValue(
                                colName,
                                cellValue,
                                rowIdx,
                                true,
                              );
                              const status =
                                generationStatuses[rowIdx] || "unknown";
                              const statusClass = getStatusColorClass(status);

                              return (
                                <td
                                  key={rowIdx}
                                  className={`py-1 pr-2 ${statusClass} text-center`}
                                >
                                  {formattedValue}
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
                  <tr className="text-gray-600">
                    <th className="pb-1 pr-2 text-left">Load</th>
                    {(() => {
                      const loadIdColIndex = loadData.columns.findIndex(
                        (col) => col === "asset_id",
                      );
                      return loadData.data.map((row: any, rowIdx: number) => {
                        const loadId =
                          loadIdColIndex >= 0 ? row[loadIdColIndex] : rowIdx;
                        const status = loadStatuses[rowIdx] || "unknown";
                        const statusClass = getStatusColorClass(status);
                        return (
                          <th
                            key={rowIdx}
                            className={`pb-1 pr-2 text-center ${statusClass} font-bold`}
                          >
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
                        <td className="py-1 pr-2 text-gray-600 font-medium text-left">
                          {rowTitle}
                        </td>
                        {loadData.data.map((row: any, rowIdx: number) => {
                          const cellValue = row[colIdx];
                          const formattedValue = formatCellValue(
                            colName,
                            cellValue,
                            rowIdx,
                            false,
                          );
                          const status = loadStatuses[rowIdx] || "unknown";
                          const statusClass = getStatusColorClass(status);

                          return (
                            <td
                              key={rowIdx}
                              className={`py-1 pr-2 ${statusClass} text-center`}
                            >
                              {formattedValue}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasAtMoneyAssets && (
              <div className="mt-2 text-xs text-gray-500 italic">
                * Price-setting bid
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusResultsTable;
