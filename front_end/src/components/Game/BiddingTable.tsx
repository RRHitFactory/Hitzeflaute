"use client";

import { Asset } from "@/types/game";
import React from "react";

interface BiddingTableProps {
  assets: Asset[];
  currentPlayer: number;
  playerMoney?: number;
  pendingBids?: Record<number, number>;
  onBidChange?: (assetId: number, newBidPrice: number) => void;
  onInsufficientFundsChange?: (insufficient: boolean) => void;
}

const BiddingTable: React.FC<BiddingTableProps> = ({
  assets,
  currentPlayer,
  playerMoney = 0,
  pendingBids = {},
  onBidChange,
  onInsufficientFundsChange,
}) => {
  // Format helper functions (defined first to avoid hoisting issues)
  const formatNumber = (value: number) => {
    return `${value.toFixed()}`;
  };

  // Filter assets owned by current player
  const playerAssets = assets.filter(
    (asset) => asset.owner_player === currentPlayer,
  );

  // Calculate expected cashflow for an asset
  const calculate_cost = (asset: Asset): number => {
    const bidPrice =
      pendingBids[asset.id] !== undefined
        ? pendingBids[asset.id]
        : asset.bid_price;

    if (asset.asset_type === "LOAD") {
      // For loads: power_expected * (marginal_cost - bid_price)
      const cashflow = asset.power_expected * (asset.marginal_cost - bidPrice);
      return Math.max(0, cashflow); // Clip negative values to zero
    } else {
      // For generators: power_expected * (bid_price - marginal_cost)
      const cashflow = asset.power_expected * (bidPrice - asset.marginal_cost);
      return Math.max(0, cashflow); // Clip negative values to zero
    }
  };

  // Calculate total expected cashflow
  const totalCost = playerAssets.reduce((sum, asset) => {
    return sum + calculate_cost(asset);
  }, 0);

  const insufficientFunds = totalCost > playerMoney

  // Notify parent component about insufficient funds status
  React.useEffect(() => {
    if (onInsufficientFundsChange) {
      onInsufficientFundsChange(insufficientFunds);
    }
  }, [insufficientFunds, onInsufficientFundsChange]);

  const handleBidChange = (
    assetId: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (onBidChange) {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        onBidChange(assetId, newValue);
      }
    }
  };

  if (playerAssets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-bold mb-2 text-black">Bidding Table</h3>
        <p className="text-gray-600">No assets owned by this player.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-lg font-bold mb-4 text-black">Bidding Table</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2">
                Asset
              </th>
              <th scope="col" className="px-3 py-2">
                Power<br></br>MW
              </th>
              <th scope="col" className="px-3 py-2">
                Marginal Cost<br></br>€/MWh
              </th>
              <th scope="col" className="px-3 py-2">
                Bid<br></br>€/MWh
              </th>
              <th scope="col" className="px-3 py-2">
                Cost<br></br>€
              </th>
            </tr>
          </thead>
          <tbody>
            {playerAssets.map((asset) => {
              const currentBidPrice =
                pendingBids[asset.id] !== undefined
                  ? pendingBids[asset.id]
                  : asset.bid_price;
              const cashflow = calculate_cost(asset);

              return (
                <tr
                  key={asset.id}
                  className="bg-white border-b hover:bg-gray-50"
                >
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {asset.asset_type === "GENERATOR" ? "Gen" : "Load"}
                    {asset.id}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(asset.power_expected)}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(asset.marginal_cost)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentBidPrice}
                      onChange={(e) => handleBidChange(asset.id, e)}
                      className="w-24 px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {formatNumber(cashflow)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Money comparison display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Total Bid Cost / Available Money:
            </p>
            <p
              className={`text-lg font-bold ${insufficientFunds ? "text-red-600" : "text-green-600"}`}
            >
              {formatNumber(totalCost)} / {formatNumber(playerMoney)}
            </p>
          </div>
        </div>
        {insufficientFunds && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            ⚠️ Warning: Total bid cost exceeds available money!
          </p>
        )}
      </div>
    </div>
  );
};

export default BiddingTable;
