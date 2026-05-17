import {
  Asset,
  GamePhase,
  NPC_PLAYER_ID,
  Player,
  TransmissionLine,
} from "@/types/game";

/**
 * Checks if an asset is purchasable during the construction phase
 */
export const isAssetPurchasable = (
  asset: Asset,
  gamePhase: number,
  controlsEnabled: boolean,
): boolean => {
  if (!controlsEnabled) {
    return false;
  }
  return (
    gamePhase === GamePhase.CONSTRUCTION &&
    asset.owner_player === NPC_PLAYER_ID &&
    asset.minimum_acquisition_price > 0 &&
    (asset.is_for_sale === true || asset.is_for_sale === undefined)
  );
};

/**
 * Checks if a transmission line is purchasable during the construction phase
 */
export const isLinePurchasable = (
  line: TransmissionLine,
  gamePhase: number,
  controlsEnabled: boolean,
): boolean => {
  if (!controlsEnabled) {
    return false;
  }
  return (
    gamePhase === GamePhase.CONSTRUCTION &&
    line.owner_player === NPC_PLAYER_ID &&
    line.minimum_acquisition_price > 0 &&
    (line.is_for_sale === true || line.is_for_sale === undefined)
  );
};

/**
 * Gets a player by ID from the players array
 */
export const getPlayerById = (
  players: Player[],
  playerId: number,
): Player | undefined => {
  return players.find((player) => player.id === playerId);
};

/**
 * Generic function to get array data from either array or repo structure
 */
export const getDataArray = <T>(data: T[] | { data: T[] } | undefined): T[] => {
  if (Array.isArray(data)) {
    return data;
  }
  return data?.data || [];
};

/**
 * Creates an activation wrapper function that handles both the activation
 * and hover state updates
 */
export const createActivationWrapper = (
  onActivate: ((id: number) => void) | undefined,
  setHoveredElement: React.Dispatch<React.SetStateAction<any>>,
  hoveredElement: any,
  elementType: "asset" | "line",
  activeStatus: string,
  inactiveStatus: string,
) => {
  return (id: number) => {
    if (onActivate) {
      onActivate(id);

      // Update hover state if this element is currently hovered
      if (hoveredElement?.type === elementType && hoveredElement.id === id) {
        setHoveredElement((prev: any) =>
          prev
            ? {
                ...prev,
                data: { ...prev.data, Status: activeStatus },
              }
            : null,
        );
      }
    }
  };
};

/**
 * Creates a deactivation wrapper function that handles both the deactivation
 * and hover state updates
 */
export const createDeactivationWrapper = (
  onDeactivate: ((id: number) => void) | undefined,
  setHoveredElement: React.Dispatch<React.SetStateAction<any>>,
  hoveredElement: any,
  elementType: "asset" | "line",
  activeStatus: string,
  inactiveStatus: string,
) => {
  return (id: number) => {
    if (onDeactivate) {
      onDeactivate(id);

      // Update hover state if this element is currently hovered
      if (hoveredElement?.type === elementType && hoveredElement.id === id) {
        setHoveredElement((prev: any) =>
          prev
            ? {
                ...prev,
                data: { ...prev.data, Status: inactiveStatus },
              }
            : null,
        );
      }
    }
  };
};
