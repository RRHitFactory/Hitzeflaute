"use client";

import { Player } from "@/types/game";
import React from "react";

const PlayerTri: React.FC<Player> = (player) => {
  return (
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
  );
};

export default PlayerTri;
