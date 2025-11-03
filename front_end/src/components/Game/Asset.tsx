"use client";

import React from "react";
import { Asset, Bus, HoverableElement, Player } from "@/types/game";

interface AssetProps {
  asset: Asset;
  bus: Bus;
  owner: Player;
  position: { x: number; y: number };
  onHover: (element: HoverableElement, event: React.MouseEvent) => void;
  onLeave: () => void;
  isPurchasable?: boolean;
  onPurchase?: (assetId: number) => void;
  playerMoney?: number;
  isBiddable?: boolean;
  onBid?: (assetId: number, newBidPrice: number) => void;
  currentPlayer?: number;
}

const AssetComponent: React.FC<AssetProps> = ({
  asset,
  bus,
  owner,
  position,
  onHover,
  onLeave,
  isPurchasable = false,
  onPurchase,
  playerMoney = 0,
  isBiddable = false,
  onBid,
  currentPlayer,
}) => {
  const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;
  const formatPrice = (price: number) => `$${price.toFixed(2)}/MWh`;

  const getAssetTitle = () => {
    const type = asset.asset_type === "GENERATOR" ? "Gen" : "Load";
    const title = `${type}${asset.id}`;
    return asset.is_freezer ? `${title} (Freezer)` : title;
  };

  const getAssetData = () => {
    const data: { [key: string]: string } = {
      Owner: owner.name,
      "Expected Power": `${asset.power_expected.toFixed(0)} MW`,
      "Marginal Cost": formatPrice(asset.marginal_cost),
    };

    // Show current bid price if asset is owned by current player
    if (currentPlayer && asset.owner_player === currentPlayer) {
      data["Current Bid"] = formatPrice(asset.bid_price);
    }

    if (isPurchasable) {
      data["Purchase Price"] = formatMoney(asset.minimum_acquisition_price);
    } else if (asset.is_for_sale) {
      data["Price"] = formatMoney(asset.minimum_acquisition_price);
    }

    if (asset.is_freezer) {
      data["Ice Creams"] = asset.health.toString();
    } else {
      data["Health"] = asset.health.toString();
    }

    return data;
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    onHover(
      {
        type: "asset",
        id: asset.id,
        title: getAssetTitle(),
        data: getAssetData(),
      },
      event,
    );
  };

  const handlePurchaseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onPurchase) {
      onPurchase(asset.id);
    }
  };

  const getAssetText = () => {
    if (asset.asset_type === "GENERATOR") return "G";
    if (asset.asset_type === "LOAD") {
      return asset.is_freezer ? "F" : "L";
    }
    return "";
  };

  const getAssetColor = () => {
    return asset.is_active ? owner.color : adjustColor(owner.color, 0.5);
  };

  const adjustColor = (color: string, factor: number) => {
    // Simple color darkening for inactive assets
    const hex = color.replace("#", "");
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };

  const getContrastColor = (bgColor: string) => {
    // Simple contrast calculation
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#FFFFFF";
  };

  const radius = 5; // Increased from 12
  const fillColor = getAssetColor();
  const textColor = getContrastColor(fillColor);

  // Check if player can afford this asset
  const canAfford =
    !isPurchasable ||
    (onPurchase && asset.minimum_acquisition_price <= playerMoney);

  const handlePurchaseButtonHover = (event: React.MouseEvent) => {
    event.stopPropagation();
    onHover(
      {
        type: "asset",
        id: asset.id,
        title: `Purchase ${getAssetTitle()}`,
        data: {
          Cost: formatMoney(asset.minimum_acquisition_price),
          Action: "Click to purchase this asset",
        },
      },
      event,
    );
  };

  const handleBidClick = () => {
    if (!onBid) return;
    const newBidPrice = prompt(
      `Enter new bid price for ${getAssetTitle()}:`,
      asset.bid_price.toString(),
    );
    if (newBidPrice && !isNaN(Number(newBidPrice))) {
      onBid(asset.id, Number(newBidPrice));
    }
  };

  return (
    <g>
      {/* Glow effect for purchasable assets */}
      {isPurchasable && (
        <circle
          cx={position.x}
          cy={position.y}
          r={radius}
          fill="none"
          stroke="#ffd700"
          strokeWidth="3"
          opacity="0.8"
          className="animate-pulse"
        />
      )}
      {/* Glow effect for biddable assets */}
      {isBiddable && (
        <circle
          cx={position.x}
          cy={position.y}
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          opacity="0.8"
          className="animate-pulse"
        />
      )}
      {/* Invisible larger hover area */}
      <circle
        cx={position.x}
        cy={position.y}
        r={radius}
        fill="transparent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        onClick={isBiddable ? handleBidClick : undefined}
        style={{ cursor: isBiddable ? "pointer" : "default" }}
      />
      {/* Main asset circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={radius}
        fill={fillColor}
        stroke={isPurchasable ? "#ffd700" : isBiddable ? "#3b82f6" : "#374151"}
        strokeWidth={isPurchasable || isBiddable ? "2" : "1"}
        pointerEvents="none"
      />{" "}
      {/* Asset type text */}
      <text
        x={position.x}
        y={position.y + 5}
        textAnchor="middle"
        fontSize="14"
        fill={textColor}
        pointerEvents="none"
        fontWeight="bold"
      >
        {getAssetText()}
      </text>
      {/* Purchase button for purchasable assets */}
      {isPurchasable && (
        <g className="purchase-button" opacity="0.9">
          <circle
            cx={position.x + 25}
            cy={position.y - 20}
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
            x={position.x + 25}
            y={position.y - 16}
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
    </g>
  );
};

export default AssetComponent;
