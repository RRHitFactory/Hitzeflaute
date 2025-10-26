export interface Bus {
    id: number
    x: number
    y: number
    player_id: number
    max_lines: number
    max_assets: number
    color: string
}

export interface TransmissionLine {
    id: number
    bus1: number
    bus2: number
    owner_player: number
    reactance: number
    capacity: number
    health: number
    fixed_operating_cost: number
    is_for_sale: boolean
    minimum_acquisition_price: number
    is_active: boolean
    is_open: boolean
    birthday: number
    color: string
}

export interface Asset {
    id: number
    asset_type: 'GENERATOR' | 'LOAD'
    bus: number
    owner_player: number
    power_expected: number
    power_std: number
    marginal_cost: number
    is_for_sale: boolean
    minimum_acquisition_price: number
    fixed_operating_cost: number
    bid_price: number
    is_freezer: boolean
    health: number
    is_active: boolean
    birthday: number
    color: string
}

export interface Player {
    id: number
    name: string
    money: number
    color: string
    assets: number[]
}

// Phase management - matches backend game_state.py Phase enum
// Backend sends integer values: CONSTRUCTION=0, SNEAKY_TRICKS=1, BIDDING=2, DA_AUCTION=3
export type GamePhase = 0 | 1 | 2 | 3 | 'CONSTRUCTION' | 'SNEAKY_TRICKS' | 'BIDDING' | 'DA_AUCTION'

export interface PhaseInfo {
    id: GamePhase
    displayName: string
    color: string
    description: string
}

// Phase mapping for integer values from backend
const PHASE_INT_TO_STRING: Record<number, string> = {
    0: 'CONSTRUCTION',
    1: 'SNEAKY_TRICKS',
    2: 'BIDDING',
    3: 'DA_AUCTION'
}

export const GAME_PHASES: Record<string, PhaseInfo> = {
    CONSTRUCTION: {
        id: 'CONSTRUCTION',
        displayName: 'Construction',
        color: 'bg-blue-200 text-black border border-blue-400',
        description: 'Build and purchase assets and transmission lines'
    },
    SNEAKY_TRICKS: {
        id: 'SNEAKY_TRICKS',
        displayName: 'Sneaky Tricks',
        color: 'bg-purple-200 text-black border border-purple-400',
        description: 'Execute special actions and strategic moves'
    },
    BIDDING: {
        id: 'BIDDING',
        displayName: 'Bidding',
        color: 'bg-yellow-200 text-black border border-yellow-400',
        description: 'Submit bids for the electricity market'
    },
    DA_AUCTION: {
        id: 'DA_AUCTION',
        displayName: 'Day-Ahead Auction',
        color: 'bg-green-200 text-black border border-green-400',
        description: 'Market clearing and results'
    }
}

export const PHASE_ORDER: GamePhase[] = ['CONSTRUCTION', 'SNEAKY_TRICKS', 'BIDDING', 'DA_AUCTION']

export function getNextPhase(currentPhase: GamePhase): GamePhase {
    const currentIndex = PHASE_ORDER.indexOf(currentPhase)
    return PHASE_ORDER[(currentIndex + 1) % PHASE_ORDER.length]
}

export function getPhaseInfo(phase: GamePhase): PhaseInfo {
    // Handle integer phase values from backend
    let phaseKey: string
    if (typeof phase === 'number') {
        phaseKey = PHASE_INT_TO_STRING[phase] || 'CONSTRUCTION'
    } else {
        phaseKey = phase
    }

    // Return phase info with fallback to CONSTRUCTION if phase not found
    return GAME_PHASES[phaseKey] || GAME_PHASES['CONSTRUCTION']
}

// Coordinate mapping utilities
export interface DisplayBounds {
    width: number
    height: number
    padding: number
}

export function getMapAreaBounds(mapArea: Shape): { minX: number, minY: number, maxX: number, maxY: number } {
    if (mapArea.points.length < 2) {
        // Fallback bounds if map area is not properly defined
        return { minX: -30, minY: -15, maxX: 30, maxY: 15 }
    }

    const xs = mapArea.points.map(p => p.x)
    const ys = mapArea.points.map(p => p.y)

    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys)
    }
}

export function mapBackendToDisplay(
    backendX: number,
    backendY: number,
    mapArea: Shape,
    displayBounds: DisplayBounds
): Point {
    const bounds = getMapAreaBounds(mapArea)
    const mapWidth = bounds.maxX - bounds.minX
    const mapHeight = bounds.maxY - bounds.minY

    // Available display area (accounting for padding)
    const availableWidth = displayBounds.width - (2 * displayBounds.padding)
    const availableHeight = displayBounds.height - (2 * displayBounds.padding)

    // Convert backend coordinates to display coordinates
    const displayX = displayBounds.padding + ((backendX - bounds.minX) / mapWidth) * availableWidth
    const displayY = displayBounds.padding + ((backendY - bounds.minY) / mapHeight) * availableHeight

    return { x: displayX, y: displayY }
}

export function mapDisplayToBackend(
    displayX: number,
    displayY: number,
    mapArea: Shape,
    displayBounds: DisplayBounds
): Point {
    const bounds = getMapAreaBounds(mapArea)
    const mapWidth = bounds.maxX - bounds.minX
    const mapHeight = bounds.maxY - bounds.minY

    // Available display area (accounting for padding)
    const availableWidth = displayBounds.width - (2 * displayBounds.padding)
    const availableHeight = displayBounds.height - (2 * displayBounds.padding)

    // Convert display coordinates to backend coordinates
    const backendX = bounds.minX + ((displayX - displayBounds.padding) / availableWidth) * mapWidth
    const backendY = bounds.minY + ((displayY - displayBounds.padding) / availableHeight) * mapHeight

    return { x: backendX, y: backendY }
} export interface GameState {
    game_id: number
    game_settings: GameSettings
    phase: GamePhase  // Can be integer (0,1,2,3) from backend or string
    round: number
    buses: { class: string; data: Bus[] }  // Can be array or repo structure
    transmission: { class: string; data: TransmissionLine[] }  // Backend uses "transmission", not "transmissionLines"
    assets: { class: string; data: Asset[] }  // Can be array or repo structure
    players: { class: string; data: Player[] }  // Can be array or repo structure from backend
    market_coupling_result: MarketCouplingResult | null
}

export interface Point {
    x: number
    y: number
}

export interface Shape {
    points: Point[]
    shape_type: string
}

export interface GameSettings {
    id?: number
    n_buses: number
    max_rounds: number
    n_init_ice_cream: number
    n_init_assets: number
    n_init_non_freezer_loads: number
    min_bid_price: number
    max_bid_price: number
    initial_funds: number
    max_connections_per_bus: number
    map_area: Shape
    [key: string]: any  // Allow for additional settings
}

export interface MarketCouplingResult {
    id: number
    round: number
    cleared: boolean
    clearing_price: number | null
    total_generation: number
    total_demand: number
    [key: string]: any  // Allow for additional result fields
}

export interface HoverableElement {
    type: 'bus' | 'line' | 'asset'
    id: number
    title: string
    data: { [key: string]: string }
}

export interface HoverInfo {
    type: 'bus' | 'line' | 'asset'
    data: Bus | TransmissionLine | Asset
    position: { x: number; y: number }
}