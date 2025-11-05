"use client";

import {
  Asset,
  Bus,
  DisplayBounds,
  GamePhase,
  GameState,
  HoverableElement,
  mapBackendToDisplay,
  NPC_PLAYER_ID,
  Point
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

  // Set display coordinates on buses
  const buses: Bus[] = useMemo(() => {
    const busArray = getBusesArray();
    console.log("🚌 DEBUG: Processing buses:", {
      totalBuses: busArray.length,
      mapArea: gameState.game_settings.map_area,
      displayBounds,
    });
    
    return busArray.map((bus) => {
      const displayCoords = mapBackendToDisplay(
        bus.x,
        bus.y,
        gameState.game_settings.map_area,
        displayBounds,
      );
      
      console.log(`🚌 Bus ${bus.id}:`, {
        backendCoords: { x: bus.x, y: bus.y },
        displayCoords,
        playerId: bus.player_id,
      });
      
      return { ...bus, display_point: displayCoords };
    });
  }, [
    gameState.buses,
    gameState.game_settings.map_area,
    displayBounds,
    getBusesArray,
  ]);

  // Set display coordinates on assets
  const assets: Asset[] = useMemo(() => {
    const allAssets: Asset[] = getAssetsArray();
    console.log("⚡ DEBUG: Processing assets:", {
      totalAssets: allAssets.length,
      totalBuses: buses.length,
    });
    
    return allAssets.map((asset) => {
      const bus = buses.find((b) => b.id === asset.bus);
      console.log(`⚡ Asset ${asset.id} (${asset.asset_type}):`, {
        busId: asset.bus,
        foundBus: !!bus,
        busDisplayPoint: bus?.display_point,
        ownerPlayer: asset.owner_player,
      });
      
      if (!bus || !bus.display_point) {
        console.warn(`⚠️ Asset ${asset.id}: No bus found or no display_point for bus ${asset.bus}`);
        return { ...asset, display_point: { x: 0, y: 0 } };
      }

      // Calculate asset position around the bus
      const assetsAtBus = allAssets.filter((a) => a.bus === asset.bus);
      const assetIndex = assetsAtBus.findIndex((a) => a.id === asset.id);
      
      const offsetRadius = 15;
      const angleStep = (2 * Math.PI) / Math.max(assetsAtBus.length, 4);
      const angle = assetIndex * angleStep;

      const x = bus.display_point.x + offsetRadius * Math.cos(angle);
      const y = bus.display_point.y + offsetRadius * Math.sin(angle);
      const display_point: Point = { x, y };

      const hover_distance = 15;
      const hover_x = x + hover_distance * Math.cos(angle);
      const hover_y = y + hover_distance * Math.sin(angle);
      const hover_point: Point = { x: hover_x, y: hover_y };

      return { ...asset, display_point: display_point, hover_point: hover_point};
    });
  }, [buses, gameState.assets, getAssetsArray]);

  // Find bus by ID (with display coordinates)
  const getBusById = (id: number) => buses.find((bus) => bus.id === id);

  // Get player by ID
  const getPlayerById = (playerId: number) =>
    getPlayersArray().find((player) => player.id === playerId);

  // Check if asset is purchasable
  const isAssetPurchasable = (asset: any) => {
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
              buses={buses}
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
        {buses.map((bus) => {
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

        {/* Debug: Show bus centers as red dots */}
        {buses.map((bus) => (
          bus.display_point && (
            <circle
              key={`debug-bus-${bus.id}`}
              cx={bus.display_point.x}
              cy={bus.display_point.y}
              r="3"
              fill="red"
              opacity="0.7"
            />
          )
        ))}

        {/* Assets */}
        {assets.map((asset) => {
          const owner = getPlayerById(asset.owner_player);
          const bus = getBusById(asset.bus);
          if (!owner || !bus) {
            console.warn(`⚠️ Skipping asset ${asset.id}: owner=${!!owner}, bus=${!!bus}`);
            return null;
          }
          const isPurchasable = isAssetPurchasable(asset);
          return (
            <AssetComponent
              key={asset.id}
              asset={asset}
              bus={bus}
              owner={owner}
              position={asset.display_point!}
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
        })}
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
