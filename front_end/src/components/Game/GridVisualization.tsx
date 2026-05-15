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
  TransmissionLine,
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
import MigrationArrow from "./MigrationArrow";
import TransmissionLineComponent from "./TransmissionLine";
import TransmissionResultsTable from "./TransmissionResultsTable";
import {
  createActivationWrapper,
  createDeactivationWrapper,
  getDataArray,
  getPlayerById,
  isAssetPurchasable,
  isLinePurchasable,
} from "./gameUtils";
import { parseDataFrameToDict } from "./utils";

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
    createActivationWrapper(
      onActivateAsset,
      setHoveredElement,
      hoveredElement,
      "asset",
      "ACTIVE",
      "INACTIVE",
    ),
    [onActivateAsset, setHoveredElement, hoveredElement],
  );

  const handleDeactivateAssetWrapper = useCallback(
    createDeactivationWrapper(
      onDeactivateAsset,
      setHoveredElement,
      hoveredElement,
      "asset",
      "ACTIVE",
      "INACTIVE",
    ),
    [onDeactivateAsset, setHoveredElement, hoveredElement],
  );

  const handleActivateLineWrapper = useCallback(
    createActivationWrapper(
      onActivateLine,
      setHoveredElement,
      hoveredElement,
      "line",
      "CLOSED",
      "OPEN",
    ),
    [onActivateLine, setHoveredElement, hoveredElement],
  );

  const handleDeactivateLineWrapper = useCallback(
    createDeactivationWrapper(
      onDeactivateLine,
      setHoveredElement,
      hoveredElement,
      "line",
      "CLOSED",
      "OPEN",
    ),
    [onDeactivateLine, setHoveredElement, hoveredElement],
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
    () => getDataArray(gameState.buses),
    [gameState.buses],
  );
  const getAssetsArray = useCallback(
    () => getDataArray(gameState.assets),
    [gameState.assets],
  );
  const getTransmissionArray = useCallback(
    () => getDataArray(gameState.transmission),
    [gameState.transmission],
  );
  const getPlayersArray = useCallback(
    () => getDataArray(gameState.players),
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

  // Find bus by ID (with display coordinates) - memoized
  const getBusById = useCallback(
    (id: number) => busesWithDisplayCoords.find((bus) => bus.id === id),
    [busesWithDisplayCoords],
  );

  // Get assets for a specific bus and calculate their positions (memoized)
  const getAssetsForBus = useCallback(
    (busId: number) => {
      const bus = getBusById(busId);
      if (!bus) return [];

      const assets: Asset[] = getAssetsArray()
        .filter((asset: Asset) => asset.bus === busId)
        .sort(
          (a: Asset, b: Asset) =>
            a.birthday * 100 + a.id - (b.birthday * 100 + b.id),
        );
      return assets.map((asset, index) => {
        // Position assets around the bus using display coordinates
        const offsetRadius = 25;
        const angleStep = (2 * Math.PI) / 5;
        const angle = index * angleStep * 2;

        const x = bus.display_position.x + offsetRadius * Math.cos(angle);
        const y = bus.display_position.y + offsetRadius * Math.sin(angle);

        return { asset, position: { x, y } };
      });
    },
    [getBusById, getAssetsArray],
  );

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
    )[0]?.position;
    return myAssetPosition ?? null;
  }, [getAssetsForBus, loserPlayerFreezer]);

  // Get player by ID (memoized version)
  const getPlayerByIdMemoized = useCallback(
    (playerId: number) => getPlayerById(getPlayersArray(), playerId),
    [getPlayersArray],
  );

  // Check if asset is purchasable (memoized version)
  const checkAssetPurchasable = useCallback(
    (asset: Asset) =>
      isAssetPurchasable(asset, gameState.phase, controlsEnabled),
    [gameState.phase, controlsEnabled],
  );

  // Check if transmission line is purchasable (memoized version)
  const checkLinePurchasable = useCallback(
    (line: TransmissionLine) =>
      isLinePurchasable(line, gameState.phase, controlsEnabled),
    [gameState.phase, controlsEnabled],
  );

  // Handle purchase confirmation for assets
  const handleAssetPurchaseRequest = (assetId: number) => {
    const asset = getAssetsArray().find((a) => a.id === assetId);
    if (asset) {
      setConfirmationDialog({
        isOpen: true,
        type: "asset",
        id: assetId,
        title: `${asset.asset_type === 0 ? "Gen" : "Load"}${asset.id}`,
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
          <div className="flex-shrink-0 min-w-[300px]">
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
              const owner = getPlayerByIdMemoized(line.owner_player);
              if (!owner) return null;
              const isPurchasable = checkLinePurchasable(line);

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
                const owner = getPlayerByIdMemoized(asset.owner_player);
                if (!owner) return null;
                const isPurchasable = checkAssetPurchasable(asset);

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
