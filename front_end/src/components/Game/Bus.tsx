"use client";

import { Bus, HoverableElement, Player } from "@/types/game";
import React from "react";

interface BusProps {
  bus: Bus;
  owner: Player;
  onHover: (element: HoverableElement, event: React.MouseEvent) => void;
  onLeave: () => void;
}

const BusComponent: React.FC<BusProps> = ({ bus, owner, onHover, onLeave }) => {
  const handleMouseEnter = (event: React.MouseEvent) => {
    onHover(
      {
        type: "bus",
        id: bus.id,
        title: `Bus${bus.id}`,
        data: {
          Owner: owner.name,
        },
      },
      event,
    );
  };

  const position = bus.display_point!;

  return (
    <g>
      {/* Invisible larger hover area */}
      <rect
        x={position.x - 20}
        y={position.y - 8}
        width={40}
        height={16}
        fill="transparent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        style={{ cursor: "pointer" }}
      />
      {/* Visible bus */}
      <rect
        x={position.x - 18}
        y={position.y - 6}
        width={36}
        height={12}
        fill={owner.color}
        stroke="#374151"
        strokeWidth="1"
        rx="2"
        pointerEvents="none"
      />
    </g>
  );
};

export default BusComponent;
