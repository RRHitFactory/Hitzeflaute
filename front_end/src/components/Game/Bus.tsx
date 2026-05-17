"use client";

import { BusWithDisplayCoords, HoverableElement } from "@/types/game";
import React from "react";

interface BusProps {
  bus: BusWithDisplayCoords;
  onHover: (element: HoverableElement, event: React.MouseEvent) => void;
  onLeave: () => void;
  onClickProp?: (busId: number, event: React.MouseEvent) => void;
  viewMode?: "normal" | "market";
  controlsEnabled?: boolean;
  canMigrate: boolean;
}

const BusComponent: React.FC<BusProps> = ({
  bus,
  onHover,
  onLeave,
  onClickProp,
  viewMode = "normal",
  controlsEnabled = false,
  canMigrate,
}) => {
  const handleMouseEnter = (event: React.MouseEvent) => {
    if (viewMode === "normal") {
      const title = canMigrate ? `Migrate to Bus${bus.id}` : ` Bus${bus.id}`;
      onHover(
        {
          type: "bus",
          id: bus.id,
          title: title,
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
        },
        event,
      );
    }
  };

  return (
    <g>
      {/* Invisible larger hover area */}
      <rect
        x={bus.display_position.x ? bus.display_position.x - 14 : bus.x - 14}
        y={bus.display_position.y ? bus.display_position.y - 8 : bus.y - 8}
        width={28}
        height={16}
        fill="transparent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        onClick={(event) => onClickProp?.(bus.id, event)}
        style={{ cursor: "pointer" }}
      />
      {/* Visible bus */}
      <rect
        x={bus.display_position.x ? bus.display_position.x - 12 : bus.x - 12}
        y={bus.display_position.y ? bus.display_position.y - 6 : bus.y - 6}
        width={24}
        height={12}
        fill="#000000"
        stroke="#374151"
        strokeWidth="1"
        rx="2"
        pointerEvents="none"
      />
      {/* Yellow glow for migration phase */}
      {canMigrate && controlsEnabled && (
        <rect
          x={bus.display_position.x ? bus.display_position.x - 16 : bus.x - 16}
          y={bus.display_position.y ? bus.display_position.y - 10 : bus.y - 10}
          width={32}
          height={20}
          fill="#FFFF00"
          opacity="0.3"
          rx="4"
          pointerEvents="none"
        />
      )}
    </g>
  );
};

export default BusComponent;
