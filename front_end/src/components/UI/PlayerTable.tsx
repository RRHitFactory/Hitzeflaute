"use client";

import { GameState, NPC_PLAYER_ID, Player } from "@/types/game";
import React from "react";

interface PlayerTableProps {
  players: Player[];
  gameState?: GameState;
}

const PlayerTable: React.FC<PlayerTableProps> = ({ players, gameState }) => {
  const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;

  const humanPlayers = players.filter((player) => player.id !== NPC_PLAYER_ID);

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
              style={{ width: "20%" }}
            >
              Player
            </th>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "30%" }}
            >
              Name
            </th>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "35%" }}
            >
              Money
            </th>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "15%" }}
            >
              Ice Creams
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {humanPlayers.map((player) => (
            <tr key={player.id} className="hover:bg-gray-50">
              <td
                className="px-2 py-2 whitespace-nowrap"
                style={{ width: "20%" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0 mt-[2px]"
                    style={{ backgroundColor: player.color }}
                    title={`${player.name}'s color: ${player.color}`}
                  />
                  <span className="text-sm font-medium text-gray-900 leading-none">
                    {player.trigram}
                  </span>
                </div>
              </td>
              <td
                className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900"
                style={{ width: "30%" }}
              >
                {player.name}
              </td>
              <td
                className="px-2 py-2 whitespace-nowrap text-sm text-gray-900"
                style={{ width: "35%" }}
              >
                {formatMoney(player.money)}
              </td>
              <td
                className="px-2 py-2 whitespace-nowrap text-sm text-gray-900"
                style={{ width: "15%" }}
              >
                {getIceCreams(player.id)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerTable;
