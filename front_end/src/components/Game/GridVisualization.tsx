"use client";

import {
  BusWithDisplayCoords,
  DisplayBounds,
  GamePhase,
  GameState,
  HoverableElement,
  mapBackendToDisplay,
  NPC_PLAYER_ID,
} from "@/types/game";
import React, { useMemo, useState } from "react";
import ConfirmationDialog from "../UI/ConfirmationDialog";
import AssetComponent from "./Asset";
import BusComponent from "./Bus";
import InfoPanel from "./InfoPanel";
import TransmissionLineComponent from "./TransmissionLine";

interface GridVisualizationProps {
  gameState: GameState;
  onPurchaseAsset?: (assetId: number) => void;
  onPurchaseTransmissionLine?: (lineId: number) => void;
  onBidAsset?: (assetId: number, newBidPrice: number) => void;
  currentPlayer?: number;
}

const GridVisualization: React.FC<GridVisualizationProps> = ({
  gameState,
  onPurchaseAsset,
  onPurchaseTransmissionLine,
  onBidAsset,
  currentPlayer,
}) => {
  const [hoveredElement, setHoveredElement] = useState<HoverableElement | null>(
    null,
  );
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    type: "asset" | "line";
    id: number;
    title: string;
    price: number;
  }>({ isOpen: false, type: "asset", id: -1, title: "", price: 0 });

  const handleElementHover = (
    element: HoverableElement,
    event: React.MouseEvent,
  ) => {
    const svgRect = event.currentTarget.closest("svg")?.getBoundingClientRect();
    const rect = event.currentTarget.getBoundingClientRect();

    if (svgRect) {
      // Position relative to the SVG container
      const elementX = rect.left + rect.width / 2 - svgRect.left;
      const elementY = rect.top + rect.height / 2 - svgRect.top;

      setHoveredElement(element);
      setHoverPosition({
        x: elementX,
        y: elementY,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredElement(null);
  };

  // Helper to get array from either array or repo structure
  const getBusesArray = () =>
    Array.isArray(gameState.buses)
      ? gameState.buses
      : gameState.buses?.data || [];
  const getAssetsArray = () =>
    Array.isArray(gameState.assets)
      ? gameState.assets
      : gameState.assets?.data || [];
  const getTransmissionArray = () =>
    Array.isArray(gameState.transmission)
      ? gameState.transmission
      : gameState.transmission?.data || [];
  const getPlayersArray = () =>
    Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

  // Display bounds for coordinate mapping
  const displayBounds: DisplayBounds = {
    width: 400, // SVG viewBox width
    height: 300, // SVG viewBox height
    padding: 20, // Padding from edges
  };

  // Map backend coordinates to display coordinates
  const busesWithDisplayCoords = useMemo(() => {
    return getBusesArray().map((bus) => {
      const displayCoords = mapBackendToDisplay(
        bus.x,
        bus.y,
        gameState.game_settings.map_area,
        displayBounds,
      );
      return { ...bus, displayX: displayCoords.x, displayY: displayCoords.y };
    });
  }, [
    gameState.buses,
    gameState.game_settings.map_area,
    displayBounds,
    getBusesArray,
  ]) as BusWithDisplayCoords[];

  // Find bus by ID (with display coordinates)
  const getBusById = (id: number) =>
    busesWithDisplayCoords.find((bus) => bus.id === id);

  // Get assets for a specific bus and calculate their positions
  const getAssetsForBus = (busId: number) => {
    const bus = getBusById(busId);
    if (!bus) return [];

    const assets = getAssetsArray().filter((asset) => asset.bus === busId);
    return assets.map((asset, index) => {
      // Position assets around the bus using display coordinates
      const offsetRadius = 15;
      const angleStep = (2 * Math.PI) / Math.max(assets.length, 4);
      const angle = index * angleStep;

      const x = bus.displayX + offsetRadius * Math.cos(angle);
      const y = bus.displayY + offsetRadius * Math.sin(angle);

      return { asset, position: { x, y } };
    });
  };

  // Get player by ID
  const getPlayerById = (playerId: number) =>
    getPlayersArray().find((player) => player.id === playerId);

  // Check if asset is purchasable
  const isAssetPurchasable = (asset: any) => {
    console.log("Checking asset purchasability:", {
      assetId: asset.id,
      phase: gameState.phase,
      isConstruction: gameState.phase === GamePhase.CONSTRUCTION,
      ownerPlayer: asset.owner_player,
      isNPC: asset.owner_player === NPC_PLAYER_ID,
      minPrice: asset.minimum_acquisition_price,
      hasPrice: asset.minimum_acquisition_price > 0,
      isForSale: asset.is_for_sale,
    });

    return (
      gameState.phase === GamePhase.CONSTRUCTION &&
      asset.owner_player === NPC_PLAYER_ID &&
      asset.minimum_acquisition_price > 0 &&
      (asset.is_for_sale === true || asset.is_for_sale === undefined)
    );
  };

  // Check if asset is biddable (owned by current player in bidding phase)
  const isAssetBiddable = (asset: any) => {
    return (
      gameState.phase === GamePhase.BIDDING &&
      asset.owner_player === currentPlayer
    );
  }; // Check if transmission line is purchasable
  const isLinePurchasable = (line: any) => {
    console.log("Checking line purchasability:", {
      lineId: line.id,
      phase: gameState.phase,
      isConstruction: gameState.phase === GamePhase.CONSTRUCTION,
      ownerPlayer: line.owner_player,
      isNPC: line.owner_player === NPC_PLAYER_ID,
      minPrice: line.minimum_acquisition_price,
      hasPrice: line.minimum_acquisition_price > 0,
      isForSale: line.is_for_sale,
    });

    return (
      gameState.phase === GamePhase.CONSTRUCTION &&
      line.owner_player === NPC_PLAYER_ID &&
      line.minimum_acquisition_price > 0 &&
      (line.is_for_sale === true || line.is_for_sale === undefined)
    );
  };

  // Get current player money
  const getCurrentPlayerMoney = () => {
    if (currentPlayer === undefined) {
      return 0;
    }
    const player = getPlayerById(currentPlayer);
    return player?.money || 0;
  };

  // Handle purchase confirmation for assets
  const handleAssetPurchaseRequest = (assetId: number) => {
    const asset = getAssetsArray().find((a) => a.id === assetId);
    if (asset) {
      setConfirmationDialog({
        isOpen: true,
        type: "asset",
        id: assetId,
        title: `${asset.asset_type === "GENERATOR" ? "Gen" : "Load"}${
          asset.id
        }`,
        price: asset.minimum_acquisition_price,
      });
    }
  };

  // Handle purchase confirmation for transmission lines
  const handleLinePurchaseRequest = (lineId: number) => {
    const line = getTransmissionArray().find((l) => l.id === lineId);
    if (line) {
      setConfirmationDialog({
        isOpen: true,
        type: "line",
        id: lineId,
        title: `Line${line.id}`,
        price: line.minimum_acquisition_price,
      });
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmPurchase = () => {
    if (confirmationDialog.type === "asset" && onPurchaseAsset) {
      onPurchaseAsset(confirmationDialog.id);
    } else if (
      confirmationDialog.type === "line" &&
      onPurchaseTransmissionLine
    ) {
      onPurchaseTransmissionLine(confirmationDialog.id);
    }
    setConfirmationDialog({
      isOpen: false,
      type: "asset",
      id: -1,
      title: "",
      price: 0,
    });
  };

  const handleCancelPurchase = () => {
    setConfirmationDialog({
      isOpen: false,
      type: "asset",
      id: -1,
      title: "",
      price: 0,
    });
  };

  return (
    <div className="relative w-full h-[500px] bg-gray-50 rounded-lg border overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 300"
        className="grid-container"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={handleMouseLeave}
      >
        {/* Transmission Lines */}
        {getTransmissionArray().map((line) => {
          const owner = getPlayerById(line.owner_player);
          if (!owner) return null;
          const isPurchasable = isLinePurchasable(line);
          return (
            <TransmissionLineComponent
              key={line.id}
              line={line}
              buses={busesWithDisplayCoords}
              owner={owner}
              onHover={handleElementHover}
              onLeave={handleMouseLeave}
              isPurchasable={isPurchasable}
              onPurchase={handleLinePurchaseRequest}
              playerMoney={getCurrentPlayerMoney()}
            />
          );
        })}

        {/* Buses */}
        {busesWithDisplayCoords.map((bus) => {
          const owner = getPlayerById(bus.player_id);
          if (!owner) return null;
          return (
            <BusComponent
              key={bus.id}
              bus={bus}
              owner={owner}
              onHover={handleElementHover}
              onLeave={handleMouseLeave}
            />
          );
        })}

        {/* Assets */}
        {busesWithDisplayCoords.map((bus) =>
          getAssetsForBus(bus.id).map(({ asset, position }) => {
            const owner = getPlayerById(asset.owner_player);
            if (!owner) return null;
            const isPurchasable = isAssetPurchasable(asset);
            return (
              <AssetComponent
                key={asset.id}
                asset={asset}
                bus={bus}
                owner={owner}
                position={position}
                onHover={handleElementHover}
                onLeave={handleMouseLeave}
                isPurchasable={isPurchasable}
                onPurchase={handleAssetPurchaseRequest}
                playerMoney={getCurrentPlayerMoney()}
                isBiddable={isAssetBiddable(asset)}
                onBid={onBidAsset}
                currentPlayer={currentPlayer}
              />
            );
          }),
        )}
      </svg>

      {/* Info Panel */}
      {hoveredElement && (
        <InfoPanel element={hoveredElement} position={hoverPosition} />
      )}

      {/* Purchase Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={`Purchase ${confirmationDialog.title}`}
        message={`Are you sure you want to purchase ${
          confirmationDialog.title
        } for $${confirmationDialog.price.toLocaleString()}?`}
        confirmText="Purchase"
        cancelText="Cancel"
        onConfirm={handleConfirmPurchase}
        onCancel={handleCancelPurchase}
      />
    </div>
  );
};

export default GridVisualization;
