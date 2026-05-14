"use client";

import PlayerTri from "@/components/UI/PlayerTri";
import { GameState, NPC_PLAYER_ID, Player } from "@/types/game";
import React from "react";

interface PlayerTableProps {
  players: Player[];
  gameState?: GameState;
  cookiePlayerId?: number | null;
}

const PlayerTable: React.FC<PlayerTableProps> = ({ players, gameState, cookiePlayerId}) => {
  const isOnlineMode = cookiePlayerId !== null
  const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;

  const humanPlayers = players.filter((player) => player.id !== NPC_PLAYER_ID);

  // Move current player to the top if in online mode
  const sortedPlayers = isOnlineMode && cookiePlayerId !== null
    ? [
        ...humanPlayers.filter((player) => player.id === cookiePlayerId),
        ...humanPlayers.filter((player) => player.id !== cookiePlayerId)
      ]
    : humanPlayers;

  const getIceCreams = (playerId: number) => {
    if (!gameState) {
      console.log("No gameState provided to PlayerTable");
      return 0;
    }

    const playerAssets = gameState.assets.data.filter(
      (asset) => asset.owner_player === playerId,
    );
    const freezerAssets = playerAssets.filter((asset) => asset.is_freezer);
    const totalIceCreams = freezerAssets.reduce(
      (total, asset) => total + asset.health,
      0,
    );
    return totalIceCreams;
  };

  return (
    <div className="w-full">
      <table className="w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "30%" }}
            >
              Player
            </th>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "40%" }}
            >
              Money
            </th>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "30%" }}
            >
              Ice Creams
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPlayers.map((player) => {
            const isCurrentPlayer = isOnlineMode && cookiePlayerId === player.id;
            
            return (
              <tr 
                key={player.id} 
                className={`${isCurrentPlayer ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
              >
                <td
                  className="px-2 py-2 whitespace-nowrap"
                  style={{ width: "30%" }}
                >
                  <div className="flex items-center gap-2">
                    <PlayerTri player={player} big={false} />
                  </div>
                </td>
                <td
                  className="px-2 py-2 whitespace-nowrap text-sm text-gray-900"
                  style={{ width: "40%" }}
                >
                  {formatMoney(player.money)}
                </td>
                <td
                  className="px-2 py-2 whitespace-nowrap text-sm text-gray-900"
                  style={{ width: "30%" }}
                >
                  {getIceCreams(player.id)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerTable;
