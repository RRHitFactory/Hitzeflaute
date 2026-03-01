"use client";

import { BusWithDisplayCoords, HoverableElement, Player } from "@/types/game";
import React from "react";

interface BusProps {
  bus: BusWithDisplayCoords;
  owner: Player;
  onHover: (element: HoverableElement, event: React.MouseEvent) => void;
  onLeave: () => void;
  onClickProp?: (busId: number, event: React.MouseEvent) => void;
  viewMode?: "normal" | "market";
}

const BusComponent: React.FC<BusProps> = ({ bus, owner, onHover, onLeave, onClickProp, viewMode = "normal" }) => {
  const handleMouseEnter = (event: React.MouseEvent) => {
    if (viewMode === "normal") {
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
    } else {
      // In market view, still send hover event but with minimal data
      onHover(
        {
          type: "bus",
          id: bus.id,
          title: `Bus${bus.id}`,
          data: {},
        },
        event,
      );
    }
  };

  return (
    <g>
      {/* Invisible larger hover area */}
      <rect
        x={bus.display_position.x ? bus.display_position.x - 20 : bus.x - 20}
        y={bus.display_position.y ? bus.display_position.y - 8 : bus.y - 8}
        width={40}
        height={16}
        fill="transparent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        onClick={(event) => onClickProp?.(bus.id, event)}
        style={{ cursor: "pointer" }}
      />
      {/* Visible bus */}
      <rect
        x={bus.display_position.x ? bus.display_position.x - 18 : bus.x - 18}
        y={bus.display_position.y ? bus.display_position.y - 6 : bus.y - 6}
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
