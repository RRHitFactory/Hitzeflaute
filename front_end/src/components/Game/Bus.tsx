"use client";

import React from "react";
import { Bus, HoverableElement, Player } from "@/types/game";

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

  return (
    <g>
      {/* Invisible larger hover area */}
      <rect
        x={(bus as any).displayX ? (bus as any).displayX - 20 : bus.x - 20}
        y={(bus as any).displayY ? (bus as any).displayY - 8 : bus.y - 8}
        width={40}
        height={16}
        fill="transparent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        style={{ cursor: "pointer" }}
      />
      {/* Visible bus */}
      <rect
        x={(bus as any).displayX ? (bus as any).displayX - 18 : bus.x - 18}
        y={(bus as any).displayY ? (bus as any).displayY - 6 : bus.y - 6}
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
