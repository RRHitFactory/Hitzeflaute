"use client";

import {
  Asset,
  BusWithDisplayCoords,
  GamePhase,
  GameState,
  HoverableElement,
  mapBackendToDisplay,
  NPC_PLAYER_ID,
  Player,
  Point,
} from "@/types/game";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ConfirmationDialog from "../UI/ConfirmationDialog";
import ViewToggle from "../UI/ViewToggle";
import AssetComponent from "./Asset";
import BusComponent from "./Bus";
import BusResultsTable from "./BusResultsTable";
import InfoPanel from "./InfoPanel";
import TransmissionLineComponent from "./TransmissionLine";
import TransmissionResultsTable from "./TransmissionResultsTable";
import { parseDataFrameToDict } from "./utils";

interface MigrationArrowProps {
  freezerPosition: Point;
  toBusId: number;
  buses: BusWithDisplayCoords[];
}

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
  );
};

interface GridVisualizationProps {
  gameState: GameState;
  onPurchaseAsset?: (assetId: number) => void;
  onPurchaseTransmissionLine?: (lineId: number) => void;
  onActivateLine?: (lineId: number) => void;
  onDeactivateLine?: (lineId: number) => void;
  onActivateAsset?: (assetId: number) => void;
  onDeactivateAsset?: (assetId: number) => void;
  onBusClickForMigration?: (busId: number) => void;
  currentPlayer?: Player;
  pendingActivations?: {
    lines?: Record<number, boolean>;
    assets?: Record<number, boolean>;
  };
  controlsEnabled: boolean;
}

const GridVisualization: React.FC<GridVisualizationProps> = ({
  gameState,
  onPurchaseAsset,
  onPurchaseTransmissionLine,
  onActivateLine,
  onDeactivateLine,
  onActivateAsset,
  onDeactivateAsset,
  onBusClickForMigration,
  currentPlayer,
  pendingActivations = {},
  controlsEnabled,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Center the scroll position on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft =
        (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop =
        (container.scrollHeight - container.clientHeight) / 2;
    }
  }, []);
  const [hoveredElement, setHoveredElement] = useState<HoverableElement | null>(
    null,
  );
  const [selectedBusForMarket, setSelectedBusForMarket] = useState<
    number | null
  >(null);
  const [selectedLineForMarket, setSelectedLineForMarket] = useState<
    number | null
  >(null);
  const [hoveredMigrateBus, setHoveredMigrateBus] = useState<number | null>(
    null,
  );
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    type: "asset" | "line";
    id: number;
    title: string;
    price: number;
  }>({ isOpen: false, type: "asset", id: -1, title: "", price: 0 });
  const [viewMode, setViewMode] = useState<"normal" | "market">("normal");

  // Wrapper functions for activation that update hover state
  const handleActivateAssetWrapper = useCallback(
    (assetId: number) => {
      if (onActivateAsset) {
        onActivateAsset(assetId);
        // Activation state will be handled by pendingActivations prop
        // If this asset is currently hovered, update the hover data
        if (hoveredElement?.type === "asset" && hoveredElement.id === assetId) {
          setHoveredElement((prev) =>
            prev
              ? {
                  ...prev,
                  data: { ...prev.data, Status: "ACTIVE" },
                }
              : null,
          );
        }
      }
    },
    [onActivateAsset, hoveredElement],
  );

  const handleDeactivateAssetWrapper = useCallback(
    (assetId: number) => {
      if (onDeactivateAsset) {
        onDeactivateAsset(assetId);
        // Activation state will be handled by pendingActivations prop
        // If this asset is currently hovered, update the hover data
        if (hoveredElement?.type === "asset" && hoveredElement.id === assetId) {
          setHoveredElement((prev) =>
            prev
              ? {
                  ...prev,
                  data: { ...prev.data, Status: "INACTIVE" },
                }
              : null,
          );
        }
      }
    },
    [onDeactivateAsset, hoveredElement],
  );

  const handleActivateLineWrapper = useCallback(
    (lineId: number) => {
      if (onActivateLine) {
        onActivateLine(lineId);
        // Activation state will be handled by pendingActivations prop
        // If this line is currently hovered, update the hover data
        if (hoveredElement?.type === "line" && hoveredElement.id === lineId) {
          setHoveredElement((prev) =>
            prev
              ? {
                  ...prev,
                  data: { ...prev.data, Status: "CLOSED" },
                }
              : null,
          );
        }
      }
    },
    [onActivateLine, hoveredElement],
  );

  const handleDeactivateLineWrapper = useCallback(
    (lineId: number) => {
      if (onDeactivateLine) {
        onDeactivateLine(lineId);
        // Activation state will be handled by pendingActivations prop
        // If this line is currently hovered, update the hover data
        if (hoveredElement?.type === "line" && hoveredElement.id === lineId) {
          setHoveredElement((prev) =>
            prev
              ? {
                  ...prev,
                  data: { ...prev.data, Status: "OPEN" },
                }
              : null,
          );
        }
      }
    },
    [onDeactivateLine, hoveredElement],
  );

  const handleElementHover = (
    element: HoverableElement,
    event: React.MouseEvent,
  ) => {
    setHoveredElement(element);
  };

  const handleMouseLeave = () => {
    setHoveredElement(null);
  };

  const handleBusClickForMarket = (busId: number, event: React.MouseEvent) => {
    const svgRect = event.currentTarget.closest("svg")?.getBoundingClientRect();
    const rect = event.currentTarget.getBoundingClientRect();

    if (svgRect) {
      // Position relative to the SVG container
      const elementX = rect.left + rect.width / 2 - svgRect.left;
      const elementY = rect.top + rect.height / 2 - svgRect.top;

      // Toggle market panel for this bus
      if (selectedBusForMarket === busId) {
        setSelectedBusForMarket(null);
      } else {
        setSelectedBusForMarket(busId);
        setSelectedLineForMarket(null); // Clear line selection
      }
    }
  };

  const handleLineClickForMarket = (
    lineId: number,
    event: React.MouseEvent,
  ) => {
    const svgRect = event.currentTarget.closest("svg")?.getBoundingClientRect();

    if (svgRect) {
      // Position relative to the SVG container - use midpoint of line
      const line = getTransmissionArray().find((l) => l.id === lineId);
      if (line) {
        const fromBus = busesWithDisplayCoords.find((b) => b.id === line.bus1);
        const toBus = busesWithDisplayCoords.find((b) => b.id === line.bus2);

        if (fromBus && toBus) {
          // Toggle market panel for this line
          if (selectedLineForMarket === lineId) {
            setSelectedLineForMarket(null);
          } else {
            setSelectedLineForMarket(lineId);
            setSelectedBusForMarket(null); // Clear bus selection
          }
        }
      }
    }
  };

  // Helper to get array from either array or repo structure
  const getBusesArray = useCallback(
    () =>
      Array.isArray(gameState.buses)
        ? gameState.buses
        : gameState.buses?.data || [],
    [gameState.buses],
  );
  const getAssetsArray = useCallback(
    () =>
      Array.isArray(gameState.assets)
        ? gameState.assets
        : gameState.assets?.data || [],
    [gameState.assets],
  );
  const getTransmissionArray = useCallback(
    () =>
      Array.isArray(gameState.transmission)
        ? gameState.transmission
        : gameState.transmission?.data || [],
    [gameState.transmission],
  );
  const getPlayersArray = useCallback(
    () =>
      Array.isArray(gameState.players)
        ? gameState.players
        : gameState.players?.data || [],
    [gameState.players],
  );

  // Display bounds for coordinate mapping
  const displayBounds = useMemo(
    () => ({
      width: 400, // SVG viewBox width
      height: 300, // SVG viewBox height
      padding: 20, // Padding from edges
    }),
    [],
  );

  // Map backend coordinates to display coordinates
  const busesWithDisplayCoords = useMemo(() => {
    return getBusesArray().map((bus) => {
      const displayCoords = mapBackendToDisplay(
        bus.x,
        bus.y,
        gameState.game_settings.map_area,
        displayBounds,
      );
      return {
        ...bus,
        display_position: displayCoords,
      } as BusWithDisplayCoords;
    });
  }, [
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

    const assets: Asset[] = getAssetsArray()
      .filter((asset: Asset) => asset.bus === busId)
      .sort((a: Asset) => a.birthday * 100 + a.id);
    return assets.map((asset, index) => {
      // Position assets around the bus using display coordinates
      const offsetRadius = 25;
      const angleStep = (2 * Math.PI) / 5;
      const angle = index * angleStep * 2;

      const x = bus.display_position.x + offsetRadius * Math.cos(angle);
      const y = bus.display_position.y + offsetRadius * Math.sin(angle);

      return { asset, position: { x, y } };
    });
  };

  const loserPlayerFreezer: Asset | null = useMemo(() => {
    if (!gameState) {
      return null;
    }
    const loser_freezers = gameState.assets.data.filter(
      (a: Asset) => a.is_freezer && a.owner_player == gameState.losing_player,
    );
    if (loser_freezers.length == 0) {
      return null;
    }
    return loser_freezers[0];
  }, [gameState]);

  const loserPlayerFreezerLocation: Point | null = useMemo(() => {
    if (!loserPlayerFreezer) {
      return null;
    }
    const assetPositions = getAssetsForBus(loserPlayerFreezer.bus);
    const myAssetPosition: Point = assetPositions.filter(
      (a: { asset: Asset; position: any }) =>
        a.asset.id == loserPlayerFreezer.id,
    )[0].position;
    return myAssetPosition;
  }, [gameState]);

  // Get player by ID
  const getPlayerById = (playerId: number) =>
    getPlayersArray().find((player) => player.id === playerId);

  // Check if asset is purchasable
  const isAssetPurchasable = (asset: any) => {
    if (!controlsEnabled) {
      return false;
    }
    return (
      gameState.phase === GamePhase.CONSTRUCTION &&
      asset.owner_player === NPC_PLAYER_ID &&
      asset.minimum_acquisition_price > 0 &&
      (asset.is_for_sale === true || asset.is_for_sale === undefined)
    );
  };

  // Check if transmission line is purchasable
  const isLinePurchasable = (line: any) => {
    if (!controlsEnabled) {
      return false;
    }
    return (
      gameState.phase === GamePhase.CONSTRUCTION &&
      line.owner_player === NPC_PLAYER_ID &&
      line.minimum_acquisition_price > 0 &&
      (line.is_for_sale === true || line.is_for_sale === undefined)
    );
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

  // Check if market summary data is available
  const hasMarketData = !!gameState.market_summary;

  {
    /* Calculate max flow for animation scaling from market summary */
  }
  const maxFlow = gameState.market_summary
    ? Object.entries(gameState.market_summary.line_results || {}).reduce(
        (max, [lineId, lineResult]) => {
          try {
            const parsedDict = parseDataFrameToDict(lineResult);
            const power = parsedDict?.flow ?? 0; // Get power from parsed dict
            return Math.max(max, Math.abs(Number(power) || 0));
          } catch (error) {
            console.warn(`Error parsing line ${lineId} data:`, error);
          }
          return max;
        },
        0,
      )
    : 0;

  return (
    <div className="relative w-full h-[700px] bg-gray-50 rounded-lg border">
      {/* Overlay controls container - fixed position at top */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-2">
        {hasMarketData && (
          <div className="flex-shrink-0 min-w-[250px]">
            <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          {hoveredElement && viewMode === "normal" && (
            <InfoPanel element={hoveredElement} />
          )}
          {selectedBusForMarket &&
            viewMode === "market" &&
            gameState.market_summary && (
              <BusResultsTable
                busId={selectedBusForMarket}
                marketSummary={gameState.market_summary}
                players={getPlayersArray()}
                onClose={() => setSelectedBusForMarket(null)}
              />
            )}
          {selectedLineForMarket &&
            viewMode === "market" &&
            gameState.market_summary && (
              <TransmissionResultsTable
                lineId={selectedLineForMarket}
                marketSummary={gameState.market_summary}
                onClose={() => setSelectedLineForMarket(null)}
              />
            )}
        </div>
      </div>

      {/* Scrollable content container */}
      <div className="w-full h-full overflow-auto" ref={scrollContainerRef}>
        <div className="min-w-[1500px] min-h-[1200px] relative">
          <svg
            width="1500"
            height="1200"
            viewBox="-50 -50 500 350"
            className="grid-container"
            onMouseLeave={handleMouseLeave}
          >
            {/* Transmission Lines */}
            {getTransmissionArray().map((line) => {
              const owner = getPlayerById(line.owner_player);
              if (!owner) return null;
              const isPurchasable = isLinePurchasable(line);

              // Get actual power flow from market summary using parseDataFrame
              const lineResult =
                gameState.market_summary?.line_results?.[line.id];
              let linePower = 0;
              if (lineResult) {
                try {
                  const parsedDict = parseDataFrameToDict(lineResult);
                  linePower = parsedDict?.raw_flow ?? 0;
                } catch (error) {
                  console.warn(`Error parsing line ${line.id} data:`, error);
                }
              }

              // Check if player owns this line and we're in sneaky tricks phase
              const isOwnedByCurrentPlayer =
                currentPlayer !== undefined &&
                line.owner_player === currentPlayer.id;
              const isSneakyTricks =
                gameState.phase === GamePhase.SNEAKY_TRICKS;

              // Get pending activation state if available, otherwise use game state
              const pendingLineActive = pendingActivations.lines?.[line.id];
              const isLineActive =
                pendingLineActive !== undefined
                  ? pendingLineActive
                  : line.is_open;

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
                  viewMode={viewMode}
                  onClick={
                    viewMode === "market" ? handleLineClickForMarket : undefined
                  }
                  maxFlow={maxFlow}
                  actualFlow={linePower}
                  showFlowAnimation={true}
                  currentPlayer={currentPlayer}
                  isOwnedByCurrentPlayer={isOwnedByCurrentPlayer}
                  isSneakyTricks={isSneakyTricks}
                  isActive={isLineActive}
                  onActivate={handleActivateLineWrapper}
                  onDeactivate={handleDeactivateLineWrapper}
                  controlsEnabled={controlsEnabled}
                />
              );
            })}

            {/* Buses */}
            {busesWithDisplayCoords.map((bus) => {
              const isMigrationPhase = gameState.phase === GamePhase.MIGRATION;
              const nAssetsAtBus = gameState.assets.data.filter(
                (a: Asset) => a.bus == bus.id,
              ).length;
              const hasSpace = nAssetsAtBus < bus.max_assets;
              const canMigrate =
                isMigrationPhase &&
                bus.id != loserPlayerFreezer?.bus &&
                hasSpace;

              const handleBusMouseEnter = (
                element: HoverableElement,
                event: React.MouseEvent,
              ) => {
                // Track hovered bus for migration arrow
                if (canMigrate && controlsEnabled && isMigrationPhase) {
                  setHoveredMigrateBus(bus.id);
                }

                // Call the original hover handler
                handleElementHover(element, event);
              };

              const handleBusMouseLeave = () => {
                handleMouseLeave();
                // Clear hovered bus for migration arrow
                if (hoveredMigrateBus === bus.id) {
                  setHoveredMigrateBus(null);
                }
              };

              return (
                <BusComponent
                  key={bus.id}
                  bus={bus}
                  onHover={handleBusMouseEnter}
                  onLeave={handleBusMouseLeave}
                  onClickProp={
                    viewMode === "market"
                      ? handleBusClickForMarket
                      : controlsEnabled && canMigrate && onBusClickForMigration
                        ? (busId, event) => onBusClickForMigration(busId)
                        : undefined
                  }
                  viewMode={viewMode}
                  controlsEnabled={controlsEnabled}
                  canMigrate={canMigrate}
                />
              );
            })}

            {/* Assets */}
            {busesWithDisplayCoords.map((bus) =>
              getAssetsForBus(bus.id).map(({ asset, position }) => {
                const owner = getPlayerById(asset.owner_player);
                if (!owner) return null;
                const isPurchasable = isAssetPurchasable(asset);

                // Check if player owns this asset and we're in sneaky tricks phase
                const isSneakyTricks =
                  gameState.phase === GamePhase.SNEAKY_TRICKS;

                // Get pending activation state if available, otherwise use game state
                const pendingAssetActive =
                  pendingActivations.assets?.[asset.id];
                const isAssetActive =
                  pendingAssetActive !== undefined
                    ? pendingAssetActive
                    : asset.is_active;
                {
                  owner.color;
                }

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
                    currentPlayer={currentPlayer}
                    viewMode={viewMode}
                    isSneakyTricks={isSneakyTricks}
                    isActive={isAssetActive}
                    onActivate={handleActivateAssetWrapper}
                    onDeactivate={handleDeactivateAssetWrapper}
                    controlsEnabled={controlsEnabled}
                  />
                );
              }),
            )}

            {/* Arrow head definition (always present but only used when needed) */}
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

            {/* Migration Arrow - shows when hovering over migrateable bus during migration phase */}
            {hoveredMigrateBus &&
              loserPlayerFreezerLocation &&
              controlsEnabled &&
              gameState.phase === GamePhase.MIGRATION && (
                <MigrationArrow
                  freezerPosition={loserPlayerFreezerLocation}
                  toBusId={hoveredMigrateBus}
                  buses={busesWithDisplayCoords}
                />
              )}
          </svg>
        </div>
      </div>

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
