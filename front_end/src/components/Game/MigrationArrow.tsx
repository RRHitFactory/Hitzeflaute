"use client";

import { BusWithDisplayCoords, Point } from "@/types/game";
import React from "react";

interface MigrationArrowProps {
  freezerPosition: Point;
  toBusId: number;
  buses: BusWithDisplayCoords[];
}

const ArrowHeadDefinition: React.FC = () => (
  <defs>
    <marker
      id="migration-arrowhead"
      markerWidth="6"
      markerHeight="4"
      refX="5"
      refY="2"
      orient="auto"
    >
      <polygon
        points="0 0, 6 2, 0 4"
        fill="#FFFF00"
        opacity="0.8"
      />
    </marker>
  </defs>
);

const MigrationArrow: React.FC<MigrationArrowProps> = ({
  freezerPosition,
  toBusId,
  buses,
}) => {
  const toBus = buses.find((b) => b.id === toBusId);

  if (!toBus) {
    return null;
  }

  // Calculate control points for a gentle curve
  const fromX = freezerPosition.x;
  const fromY = freezerPosition.y;
  const toX = toBus.display_position.x;
  const toY = toBus.display_position.y;

  // Offset from bus centers to avoid touching the buses directly
  const offsetFrom = 10;
  const offsetTo = 20;

  // Calculate direction vector
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Calculate offset positions (don't touch the bus centers)
  const startX = fromX + Math.cos(angle) * offsetFrom;
  const startY = fromY + Math.sin(angle) * offsetFrom;
  const endX = toX - Math.cos(angle) * offsetTo;
  const endY = toY - Math.sin(angle) * offsetTo;

  // Control point for gentle curve (midway, slightly offset perpendicular to direction)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const curveOffset = distance * 0.1; // 10% of distance for gentle curve
  const perpendicularX = -Math.sin(angle) * curveOffset;
  const perpendicularY = Math.cos(angle) * curveOffset;
  const controlX = midX + perpendicularX;
  const controlY = midY + perpendicularY;

  return (
    <>
      <ArrowHeadDefinition />
      <g pointerEvents="none">
        {/* Gentle curved path */}
        <path
          d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
          fill="none"
          stroke="#FFFF00"
          strokeWidth="3"
          strokeOpacity="0.5"
          markerEnd="url(#migration-arrowhead)"
        />
      </g>
    </>
  );
};

export default MigrationArrow;