"use client";

import {
  BusWithDisplayCoords,
  HoverableElement,
  Player,
  TransmissionLine,
} from "@/types/game";
import React from "react";

interface TransmissionLineProps {
  line: TransmissionLine;
  buses: BusWithDisplayCoords[];
  owner: Player;
  onHover: (element: HoverableElement, event: React.MouseEvent) => void;
  onLeave: () => void;
  isPurchasable?: boolean;
  onPurchase?: (lineId: number) => void;
  playerMoney?: number;
  viewMode?: "normal" | "market";
  onClick?: (lineId: number, event: React.MouseEvent) => void;
  maxFlow?: number;
  actualFlow?: number;
  showFlowAnimation?: boolean;
  currentPlayer?: number;
  isOwnedByCurrentPlayer?: boolean;
  isSneakyTricks?: boolean;
  isActive?: boolean;
  onActivate?: (lineId: number) => void;
  onDeactivate?: (lineId: number) => void;
}

const TransmissionLineComponent: React.FC<TransmissionLineProps> = ({
  line,
  buses,
  owner,
  onHover,
  onLeave,
  isPurchasable = false,
  onPurchase,
  playerMoney = 0,
  viewMode = "normal",
  onClick,
  maxFlow = 1,
  actualFlow = 0,
  showFlowAnimation = false,
  currentPlayer,
  isOwnedByCurrentPlayer = false,
  isSneakyTricks = false,
  isActive,
  onActivate,
  onDeactivate,
}) => {
  const fromBus = buses.find((b) => b.id === line.bus1);
  const toBus = buses.find((b) => b.id === line.bus2);

  if (!fromBus || !toBus) return null;

  // Use provided isActive prop if available, otherwise fall back to line.is_open
  const displayActive = isActive !== undefined ? isActive : line.is_open;

  const getLineData = () => {
    const data: { [key: string]: string } = {
      Owner: owner.trigram,
      Health: line.health.toString(),
    };

    if (isPurchasable) {
      data["Purchase Price"] =
        `$${line.minimum_acquisition_price.toLocaleString()}`;
    }

    data["Status"] = displayActive ? "OPEN" : "CLOSED";

    return data;
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    onHover(
      {
        type: "line",
        id: line.id,
        title: `Line${line.id}`,
        data: getLineData(),
      },
      event,
    );
  };

  const handlePurchaseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onPurchase) {
      onPurchase(line.id);
    }
  };

  const handleActivateClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onActivate) {
      onActivate(line.id);
    }
  };

  const handleDeactivateClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDeactivate) {
      onDeactivate(line.id);
    }
  };

  const handleActivationHover = (event: React.MouseEvent) => {
    event.stopPropagation();
    onHover(
      {
        type: "line",
        id: line.id,
        title: `Line${line.id}`,
        data: {
          ...getLineData(),
          Action: displayActive
            ? "Click to close (deactivate) this line"
            : "Click to open (activate) this line",
        },
      },
      event,
    );
  };

  const getLineColor = () => {
    if (displayActive) {
      // Deactivate color similar to the Python implementation
      return adjustColor(owner.color, 0.5);
    }
    return owner.color;
  };

  // Helper function to create arrow path for flow direction along the curved line
  const getArrowPath = (
    midX: number,
    midY: number,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    flowForward: boolean,
  ) => {
    // Calculate the control point for the quadratic Bézier curve (same as the line's curve)
    const vector = { x: toX - fromX, y: toY - fromY };
    const trueMidX = (fromX + toX) / 2;
    const trueMidY = (fromY + toY) / 2;

    const arrowX = (trueMidX + midX) / 2;
    const arrowY = (trueMidY + midY) / 2;

    const angle = Math.atan2(vector.y, vector.x) + (flowForward ? 0 : Math.PI); // +180 degrees to face flow direction

    const arrowSize = 22;

    // Create arrow path
    const arrowPath = `M ${arrowX} ${arrowY}`;

    const af = 0.86;
    const inset = 0.6;
    // Make arrow more elongated by using a narrower angle spread
    const point1X = arrowX + Math.cos(angle + Math.PI * af) * arrowSize;
    const point1Y = arrowY + Math.sin(angle + Math.PI * af) * arrowSize;
    const point2X = arrowX + Math.cos(angle + Math.PI) * arrowSize * inset;
    const point2Y = arrowY + Math.sin(angle + Math.PI) * arrowSize * inset;
    const point3X = arrowX + Math.cos(angle - Math.PI * af) * arrowSize;
    const point3Y = arrowY + Math.sin(angle - Math.PI * af) * arrowSize;

    return `${arrowPath} L ${point1X} ${point1Y} L ${point2X} ${point2Y} L ${point3X} ${point3Y} Z`;
  };

  const adjustColor = (color: string, factor: number) => {
    // Simple color darkening for open lines
    const hex = color.replace("#", "");
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };

  // Create curved line with multiple points similar to the Python implementation
  // Use display coordinates if available, fallback to original coordinates
  const fromX = fromBus.display_position.x || fromBus.x;
  const fromY = fromBus.display_position.y || fromBus.y;
  const toX = toBus.display_position.x || toBus.x;
  const toY = toBus.display_position.y || toBus.y;

  const vector = { x: toX - fromX, y: toY - fromY };
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  // Add slight curve by offsetting the middle point
  const curveOffset = 0.1;
  const offsetX = vector.y * curveOffset;
  const offsetY = -vector.x * curveOffset;

  const mid_point = { x: midX + offsetX, y: midY + offsetY };

  const pathData = `M ${fromX} ${fromY} Q ${mid_point.x} ${
    mid_point.y
  } ${toX} ${toY}`;

  // Check if player can afford this line
  const canAfford =
    !isPurchasable ||
    (onPurchase && line.minimum_acquisition_price <= playerMoney);

  const handlePurchaseButtonHover = (event: React.MouseEvent) => {
    event.stopPropagation();
    onHover(
      {
        type: "line",
        id: line.id,
        title: `Purchase Line${line.id}`,
        data: {
          Cost: `$${line.minimum_acquisition_price.toLocaleString()}`,
          Action: "Click to purchase this transmission line",
        },
      },
      event,
    );
  };

  // Calculate flow animation properties using actual power from market summary
  const flowValue = actualFlow ?? 0;
  const flowRatio =
    maxFlow > 0 ? Math.abs(Number(flowValue) || 0) / maxFlow : 0;
  const flowForward = flowValue >= 0;

  return (
    <g>
      {/* Glow effect for purchasable lines (hidden in market view) */}
      {isPurchasable && viewMode === "normal" && (
        <path
          d={pathData}
          stroke="#ffd700"
          strokeWidth={10}
          fill="none"
          opacity="0.6"
          className="animate-pulse"
        />
      )}

      {/* Invisible wider hover area */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        onClick={(event) => onClick?.(line.id, event)}
        style={{ cursor: "pointer" }}
      />

      {/* Main transmission line */}
      <path
        d={pathData}
        stroke={
          viewMode === "normal"
            ? isPurchasable
              ? "#ffd700"
              : getLineColor()
            : getLineColor()
        }
        strokeWidth={viewMode === "normal" ? (isPurchasable ? 6 : 5) : 5}
        fill="none"
        opacity={0.9}
        pointerEvents="none"
      />

      {/* Flow direction indicator (arrow) - only show in market view with significant flow */}
      {viewMode === "market" && showFlowAnimation && flowRatio > 0.1 && (
        <path
          d={getArrowPath(
            mid_point.x,
            mid_point.y,
            fromX,
            fromY,
            toX,
            toY,
            flowForward,
          )}
          stroke="#000000" // Dark gray color
          strokeWidth={1}
          fill="#7a7a7a" // Dark gray color
          opacity={0.9}
        />
      )}

      {/* Purchase button for purchasable lines (hidden in market view) */}
      {isPurchasable && viewMode === "normal" && (
        <g className="purchase-button" opacity="0.9">
          <circle
            cx={midX}
            cy={midY}
            r="10"
            fill={canAfford ? "#22c55e" : "#9ca3af"}
            stroke="white"
            strokeWidth="2"
            style={{ cursor: canAfford ? "pointer" : "not-allowed" }}
            onClick={canAfford ? handlePurchaseClick : undefined}
            onMouseEnter={handlePurchaseButtonHover}
            onMouseLeave={onLeave}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            pointerEvents="none"
            fontWeight="bold"
          >
            $
          </text>
        </g>
      )}

      {/* Activation control for owned lines in sneaky tricks phase */}
      {isOwnedByCurrentPlayer && isSneakyTricks && viewMode === "normal" && (
        <g className="activation-button" opacity="0.9">
          <circle
            cx={midX}
            cy={midY}
            r="12"
            fill={owner.color}
            stroke="white"
            strokeWidth="2"
            style={{ cursor: "pointer" }}
            onClick={
              displayActive ? handleDeactivateClick : handleActivateClick
            }
            onMouseEnter={handleActivationHover}
            onMouseLeave={onLeave}
          />
          {/* Open circuit indicator - diagonal line when INACTIVE (closed) */}
          {!displayActive && (
            <path
              d={`M ${midX - 8} ${midY - 8} L ${midX + 8} ${midY + 8}`}
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              pointerEvents="none"
            />
          )}
        </g>
      )}
    </g>
  );
};

export default TransmissionLineComponent;
