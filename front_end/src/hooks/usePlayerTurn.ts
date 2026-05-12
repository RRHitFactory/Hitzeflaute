import { GameState, getPhaseInfo, Player } from "@/types/game";
import { useMemo, useState, useEffect } from "react";

export function usePlayerTurn(
  gameState: GameState | null, 
  gameId: number | null
) {
  const defaultPlayerId = 1
  // State to track if controls are enabled
  const [controlsEnabled, setControlsEnabled] = useState(false);

  const pageReady = useMemo(() => {
    return typeof window !== "undefined" && gameId
  }, [gameId]);

  const isHotSeatMode: boolean = useMemo(() => {
    if (!pageReady) return true; // Default to hotseat if we don't know
    if (!gameState?.game_settings) return true;
    return gameState.game_settings.turn_type == "hotseat"
  }, [gameState?.game_settings, pageReady]);

  const phaseIsOneByOne = useMemo(() => {
    if (pageReady && gameState?.phase) {
      if (isHotSeatMode) {
        return true
      } else {
        return getPhaseInfo(gameState.phase).one_by_one
      }
    }
    return true
  }, [pageReady, gameState?.phase, isHotSeatMode]);

  // Get the local player ID from localStorage (only for online mode)
  const cookiePlayerId: number | null = useMemo(() => {
    if (pageReady) {
      const storedPlayerId = localStorage.getItem(`lobby_playerId_${gameId}`);
      if (storedPlayerId) {
        return parseInt(storedPlayerId);
      }
    }
    return null
  }, [gameId, pageReady]);

  /**
   * Get the player who is currently in control of the browser
   */
  const currentPlayerId : number | null = useMemo(() => {
    if (!(pageReady && gameState)) {return defaultPlayerId}

    // For online multiplayer, the player stored in the cookie is always in control
    if (!phaseIsOneByOne) {return cookiePlayerId}

    // For hotseat we take the first player with is_having_turn = true
    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    // Find the player with is_having_turn flag
    const activePlayer = playersArray.find((p: any) => p.is_having_turn);
    return activePlayer ? activePlayer.id : null;
  }, [gameState, pageReady, phaseIsOneByOne, cookiePlayerId]);

  /**
   * Get the current player object from game state
   */
  const currentPlayerObj: Player | undefined = useMemo(() => {
    if (!gameState || currentPlayerId === null) return

    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    return playersArray.find((p: any) => p.id === currentPlayerId) || undefined;
  }, [gameState, currentPlayerId]);



  // Enable controls when it's the current player's turn
  useEffect(() => {
    if (currentPlayerObj && currentPlayerObj.is_having_turn) {
      setControlsEnabled(true);
    } else {
      setControlsEnabled(false);
    }
  }, [currentPlayerObj, gameState?.phase]);

  return {
    currentPlayerId: currentPlayerId,
    currentPlayerObj: currentPlayerObj,
    isHotseatMode: isHotSeatMode,
    controlsEnabled: controlsEnabled,
    setControlsEnabled: setControlsEnabled
  };
}