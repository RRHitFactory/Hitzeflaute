import { Asset } from "@/types/game";

/**
 * Calculate total bid cost for a player's assets
 * @param assets All assets in the game
 * @param currentPlayerId The current player's ID
 * @param pendingBids Pending bids that override current bid prices
 * @returns Total bid cost (sum of bid_price * power_expected for all player assets)
 */
export function calculateTotalBidCost(
  assets: Asset[],
  currentPlayerId: number,
  pendingBids: Record<number, number> = {},
): number {
  return assets
    .filter((asset) => asset.owner_player === currentPlayerId)
    .reduce((sum, asset) => {
      const bidPrice =
        pendingBids[asset.id] !== undefined
          ? pendingBids[asset.id]
          : asset.bid_price;
      return sum + bidPrice * asset.power_expected;
    }, 0);
}

/**
 * Check if player has insufficient funds for their bids
 * @param assets All assets in the game
 * @param currentPlayerId The current player's ID
 * @param playerMoney The player's available money
 * @param pendingBids Pending bids that override current bid prices
 * @returns True if total bid cost exceeds available money, false otherwise
 */
export function hasInsufficientFunds(
  assets: Asset[],
  currentPlayerId: number,
  playerMoney: number,
  pendingBids: Record<number, number> = {},
): boolean {
  const totalBidCost = calculateTotalBidCost(
    assets,
    currentPlayerId,
    pendingBids,
  );
  return totalBidCost > playerMoney;
}
