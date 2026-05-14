"use client";

import { Player } from "@/types/game";
import React from "react";

interface PlayerTriProps {
  player: Player;
  big?: boolean;
}

const PlayerTri: React.FC<PlayerTriProps> = ({ player, big = false }) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-full border border-gray-300 flex-shrink-0 mt-[2px] ${
          big ? "w-8 h-8" : "w-5 h-5"
        }`}
        style={{ backgroundColor: player.color }}
        title={player.name}
      />
      <span
        className={`font-medium text-gray-900 leading-none ${
          big ? "text-lg" : "text-sm"
        }`}
      >
        {player.trigram}
      </span>
    </div>
  );
};

export default PlayerTri;
