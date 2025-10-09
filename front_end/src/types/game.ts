export interface Bus {
    id: string
    x: number
    y: number
    player_id: string
    max_lines: number
    max_assets: number
    color: string
}

export interface TransmissionLine {
    id: string
    bus1: string
    bus2: string
    owner_player: string
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
    id: string
    asset_type: 'GENERATOR' | 'LOAD'
    bus: string
    owner_player: string
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
    id: string
    name: string
    money: number
    color: string
    assets: string[]
}

// Phase management - centralized from backend game_state.py
export type GamePhase = 'CONSTRUCTION' | 'SNEAKY_TRICKS' | 'BIDDING' | 'DA_AUCTION'

export interface PhaseInfo {
    id: GamePhase
    displayName: string
    color: string
    description: string
}

export const GAME_PHASES: Record<GamePhase, PhaseInfo> = {
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
    return GAME_PHASES[phase]
}

export interface GameState {
    phase: GamePhase
    round: number
    buses: Bus[]
    transmissionLines: TransmissionLine[]
    assets: Asset[]
    players: Player[]
}

export interface HoverableElement {
    type: 'bus' | 'line' | 'asset'
    id: string
    title: string
    data: { [key: string]: string }
}

export interface HoverInfo {
    type: 'bus' | 'line' | 'asset'
    data: Bus | TransmissionLine | Asset
    position: { x: number; y: number }
}