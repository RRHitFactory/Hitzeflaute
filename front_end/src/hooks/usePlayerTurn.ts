import { GameState, getPhaseInfo, Player } from "@/types/game";
import { useEffect, useMemo, useState } from "react";

export function usePlayerTurn(
  gameState: GameState | null,
  gameId: number | null,
) {
  // State to track if controls are enabled
  const [controlsEnabled, setControlsEnabled] = useState(false);

  const pageReady = useMemo(() => {
    return typeof window !== "undefined" && gameId;
  }, [gameId]);

  const isHotSeatMode: boolean = useMemo(() => {
    if (!pageReady) return true; // Default to hotseat if we don't know
    if (!gameState?.game_settings) return true;
    return gameState.game_settings.turn_type == "hotseat";
  }, [gameState?.game_settings, pageReady]);

  const phaseIsOneByOne = useMemo(() => {
    if (pageReady && gameState?.phase) {
      if (isHotSeatMode) {
        return true;
      } else {
        return getPhaseInfo(gameState.phase).one_by_one;
      }
    }
    return true;
  }, [pageReady, gameState?.phase, isHotSeatMode]);

  // Get the local player ID from localStorage (only for online mode)
  const cookiePlayerId: number | null = useMemo(() => {
    if (pageReady) {
      const storedPlayerId = localStorage.getItem(`lobby_playerId_${gameId}`);
      if (storedPlayerId) {
        return parseInt(storedPlayerId);
      }
    }
    return null;
  }, [gameId, pageReady]);

  const activePlayers: Player[] = useMemo(() => {
    if (!(pageReady && gameState)) {
      return [];
    }
    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    // Find the player with is_having_turn flag
    return playersArray.filter((p: Player) => p.is_having_turn);
  }, [pageReady, gameState]);

  const firstActivePlayerId: number | null = useMemo(() => {
    // For hotseat, take the first active player from the list
    if (activePlayers.length === 0) {
      return null;
    }
    return activePlayers[0].id;
  }, [activePlayers]);

  /**
   * Get the player who is currently in control of the browser
   */
  const currentPlayerId: number | null = useMemo(() => {
    // For online multiplayer, the player stored in the cookie is always in control
    const isOnline = !isHotSeatMode;
    if (isOnline) {
      return cookiePlayerId;
    }
    return firstActivePlayerId;
  }, [isHotSeatMode, cookiePlayerId, firstActivePlayerId]);

  /**
   * Get the current player object from game state
   */
  const currentPlayerObj: Player | undefined = useMemo(() => {
    if (!gameState || currentPlayerId === null) return;

    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    return playersArray.find((p: any) => p.id === currentPlayerId) || undefined;
  }, [gameState, currentPlayerId]);

  const isCurrentPlayersTurn: boolean = useMemo(() => {
    if (!currentPlayerId) {
      return false;
    }
    if (isHotSeatMode) {
      return true;
    }
    if (currentPlayerId == firstActivePlayerId) {
      return true;
    }
    return false;
  }, [currentPlayerId, isHotSeatMode, firstActivePlayerId]);

  // Enable controls when it's the current player's turn
  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }
    setControlsEnabled(isCurrentPlayersTurn);
  }, [currentPlayerId, isCurrentPlayersTurn]);

  return {
    cookiePlayerId: cookiePlayerId,
    currentPlayerId: currentPlayerId,
    currentPlayerObj: currentPlayerObj,
    isHotseatMode: isHotSeatMode,
    controlsEnabled: controlsEnabled,
    setControlsEnabled: setControlsEnabled,
  };
}
