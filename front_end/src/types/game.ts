export interface Bus {
  id: number;
  x: number;
  y: number;
  player_id: number;
  max_lines: number;
  max_assets: number;
  color: string;
  display_point?: Point;
  hover_point?: Point;
}

export interface TransmissionLine {
  id: number;
  bus1: number;
  bus2: number;
  owner_player: number;
  reactance: number;
  capacity: number;
  health: number;
  fixed_operating_cost: number;
  is_for_sale: boolean;
  minimum_acquisition_price: number;
  is_active: boolean;
  is_open: boolean;
  birthday: number;
  color: string;
}

export interface Asset {
  id: number;
  asset_type: "GENERATOR" | "LOAD";
  bus: number;
  owner_player: number;
  power_expected: number;
  power_std: number;
  marginal_cost: number;
  is_for_sale: boolean;
  minimum_acquisition_price: number;
  fixed_operating_cost: number;
  bid_price: number;
  is_freezer: boolean;
  health: number;
  is_active: boolean;
  birthday: number;
  color: string;
  display_point?: Point;
  hover_point?: Point;
}

export interface Player {
  id: number;
  name: string;
  money: number;
  color: string;
  assets: number[];
  is_having_turn?: boolean; // Indicates if this player is currently having their turn
  still_alive?: boolean; // Indicates if the player is still in the game
}

export const NPC_PLAYER_ID = -1;

// Phase management - matches backend game_state.py Phase enum
// Backend sends integer values: CONSTRUCTION=0, SNEAKY_TRICKS=1, BIDDING=2, DA_AUCTION=3

// Game Phase Enum-like object with both integer and string representations
export const GamePhase = {
  // Integer values (what backend sends)
  CONSTRUCTION: 0,
  SNEAKY_TRICKS: 1,
  BIDDING: 2,
  DA_AUCTION: 3,
} as const;

// Type for phase values (can be integer from backend)
export type GamePhaseValue = (typeof GamePhase)[keyof typeof GamePhase];

// String names for phases
export const GamePhaseName = {
  [GamePhase.CONSTRUCTION]: "CONSTRUCTION",
  [GamePhase.SNEAKY_TRICKS]: "SNEAKY_TRICKS",
  [GamePhase.BIDDING]: "BIDDING",
  [GamePhase.DA_AUCTION]: "DA_AUCTION",
} as const;

export type GamePhaseNameValue = (typeof GamePhaseName)[GamePhaseValue];

// Phase info interface
export interface PhaseInfo {
  id: GamePhaseValue;
  name: GamePhaseNameValue;
  displayName: string;
  color: string;
  description: string;
}

// Phase configurations with full info
export const GAME_PHASE_INFO: Record<GamePhaseValue, PhaseInfo> = {
  [GamePhase.CONSTRUCTION]: {
    id: GamePhase.CONSTRUCTION,
    name: "CONSTRUCTION",
    displayName: "Construction",
    color: "bg-blue-200 text-black border border-blue-400",
    description: "Build and purchase assets and transmission lines",
  },
  [GamePhase.SNEAKY_TRICKS]: {
    id: GamePhase.SNEAKY_TRICKS,
    name: "SNEAKY_TRICKS",
    displayName: "Sneaky Tricks",
    color: "bg-purple-200 text-black border border-purple-400",
    description: "Execute special actions and strategic moves",
  },
  [GamePhase.BIDDING]: {
    id: GamePhase.BIDDING,
    name: "BIDDING",
    displayName: "Bidding",
    color: "bg-yellow-200 text-black border border-yellow-400",
    description: "Submit bids for the electricity market",
  },
  [GamePhase.DA_AUCTION]: {
    id: GamePhase.DA_AUCTION,
    name: "DA_AUCTION",
    displayName: "Day-Ahead Auction",
    color: "bg-green-200 text-black border border-green-400",
    description: "Market clearing and results",
  },
};

// Phase order for cycling
export const PHASE_ORDER: GamePhaseValue[] = [
  GamePhase.CONSTRUCTION,
  GamePhase.SNEAKY_TRICKS,
  GamePhase.BIDDING,
  GamePhase.DA_AUCTION,
];

// Utility functions
export function getPhaseInfo(phase: GamePhaseValue): PhaseInfo {
  return GAME_PHASE_INFO[phase] || GAME_PHASE_INFO[GamePhase.CONSTRUCTION];
}

export function getPhaseName(phase: GamePhaseValue): GamePhaseNameValue {
  return GamePhaseName[phase] || GamePhaseName[GamePhase.CONSTRUCTION];
}

export function getNextPhase(currentPhase: GamePhaseValue): GamePhaseValue {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  return PHASE_ORDER[(currentIndex + 1) % PHASE_ORDER.length];
}

export function isValidPhase(phase: number): phase is GamePhaseValue {
  return Object.values(GamePhase).includes(phase as GamePhaseValue);
}

// Coordinate mapping utilities
export interface DisplayBounds {
  width: number;
  height: number;
  padding: number;
}

export function getMapAreaBounds(mapArea: Shape): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (mapArea.points.length < 2) {
    // Fallback bounds if map area is not properly defined
    return { minX: -30, minY: -15, maxX: 30, maxY: 15 };
  }

  const xs = mapArea.points.map((p) => p.x);
  const ys = mapArea.points.map((p) => p.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function mapBackendToDisplay(
  backendX: number,
  backendY: number,
  mapArea: Shape,
  displayBounds: DisplayBounds,
): Point {
  const bounds = getMapAreaBounds(mapArea);
  const mapWidth = bounds.maxX - bounds.minX;
  const mapHeight = bounds.maxY - bounds.minY;

  // Available display area (accounting for padding)
  const availableWidth = displayBounds.width - 2 * displayBounds.padding;
  const availableHeight = displayBounds.height - 2 * displayBounds.padding;

  // Convert backend coordinates to display coordinates
  const displayX =
    displayBounds.padding +
    ((backendX - bounds.minX) / mapWidth) * availableWidth;
  const displayY =
    displayBounds.padding +
    ((backendY - bounds.minY) / mapHeight) * availableHeight;

  console.log("🗺️ Coordinate mapping:", {
    backend: { x: backendX, y: backendY },
    bounds,
    mapDimensions: { width: mapWidth, height: mapHeight },
    displayBounds,
    availableDimensions: { width: availableWidth, height: availableHeight },
    result: { x: displayX, y: displayY },
  });

  return { x: displayX, y: displayY };
}

export function mapDisplayToBackend(
  displayX: number,
  displayY: number,
  mapArea: Shape,
  displayBounds: DisplayBounds,
): Point {
  const bounds = getMapAreaBounds(mapArea);
  const mapWidth = bounds.maxX - bounds.minX;
  const mapHeight = bounds.maxY - bounds.minY;

  // Available display area (accounting for padding)
  const availableWidth = displayBounds.width - 2 * displayBounds.padding;
  const availableHeight = displayBounds.height - 2 * displayBounds.padding;

  // Convert display coordinates to backend coordinates
  const backendX =
    bounds.minX +
    ((displayX - displayBounds.padding) / availableWidth) * mapWidth;
  const backendY =
    bounds.minY +
    ((displayY - displayBounds.padding) / availableHeight) * mapHeight;

  return { x: backendX, y: backendY };
}
export interface GameState {
  game_id: number;
  game_settings: GameSettings;
  phase: GamePhaseValue; // Integer values (0,1,2,3) from backend
  game_round: number;
  buses: { class: string; data: Bus[] }; // Can be array or repo structure
  transmission: { class: string; data: TransmissionLine[] }; // Backend uses "transmission", not "transmissionLines"
  assets: { class: string; data: Asset[] }; // Can be array or repo structure
  players: { class: string; data: Player[] }; // Can be array or repo structure from backend
  market_coupling_result: MarketCouplingResult | null;
}

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  points: Point[];
  shape_type: string;
}

export interface GameSettings {
  id?: number;
  n_buses: number;
  max_rounds: number;
  n_init_ice_cream: number;
  n_init_assets: number;
  n_init_non_freezer_loads: number;
  min_bid_price: number;
  max_bid_price: number;
  initial_funds: number;
  max_connections_per_bus: number;
  map_area: Shape;
  [key: string]: any; // Allow for additional settings
}

export interface MarketCouplingResult {
  id: number;
  game_round: number;
  cleared: boolean;
  clearing_price: number | null;
  total_generation: number;
  total_demand: number;
  [key: string]: any; // Allow for additional result fields
}

export interface HoverableElement {
  type: "bus" | "line" | "asset";
  id: number;
  title: string;
  data: { [key: string]: string };
}

export interface HoverInfo {
  type: "bus" | "line" | "asset";
  data: Bus | TransmissionLine | Asset;
  position: { x: number; y: number };
}
