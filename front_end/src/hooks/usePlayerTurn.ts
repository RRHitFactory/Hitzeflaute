import { GameState, getPhaseInfo, PhaseInfo, Player } from "@/types/game";
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

  const phase: PhaseInfo | undefined = useMemo(() => {
    if (!pageReady) {
      return;
    }
    if (!gameState) {
      return;
    }
    return getPhaseInfo(gameState.phase);
  }, [pageReady, gameState]);

  const isHotSeatMode: boolean = useMemo(() => {
    if (!pageReady) return true; // Default to hotseat if we don't know
    if (!gameState?.game_settings) return true;
    return gameState.game_settings.turn_type == "hotseat";
  }, [gameState?.game_settings, pageReady]);

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
    console.log(playersArray);
    const aps = playersArray.filter((p: Player) => p.is_having_turn);
    console.log(aps);
    return aps;
  }, [pageReady, gameState]);

  const activePlayerIds: number[] = useMemo(() => {
    if (activePlayers.length === 0) {
      return [];
    }
    return activePlayers.map((p) => p.id);
  }, [activePlayers]);

  const firstActivePlayerId: number | null = useMemo(() => {
    if (activePlayerIds.length === 0) {
      return null;
    }
    return activePlayerIds[0];
  }, [activePlayerIds]);

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
  const currentPlayer: Player | undefined = useMemo(() => {
    if (!gameState || currentPlayerId === null) return;

    const playersArray = Array.isArray(gameState.players)
      ? gameState.players
      : gameState.players?.data || [];

    return (
      playersArray.find((p: Player) => p.id === currentPlayerId) || undefined
    );
  }, [gameState, currentPlayerId]);

  const isCurrentPlayersTurn: boolean = useMemo(() => {
    if (!currentPlayerId) {
      return false;
    }
    if (isHotSeatMode) {
      return true;
    }
    // Otherwise it is online multiplayer
    if (phase?.one_by_one) {
      return currentPlayerId == firstActivePlayerId;
    } else {
      return activePlayerIds.includes(currentPlayerId);
    }
  }, [
    currentPlayerId,
    isHotSeatMode,
    firstActivePlayerId,
    activePlayerIds,
    phase,
  ]);

  const waitingForPlayers: Player[] = useMemo(() => {
    if (isCurrentPlayersTurn) {
      return [];
    }
    return activePlayers.filter((p: Player) => p.id != currentPlayerId);
  }, [isCurrentPlayersTurn, activePlayers, currentPlayerId]);

  // Enable controls when it's the current player's turn
  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }
    setControlsEnabled(isCurrentPlayersTurn);
  }, [currentPlayerId, isCurrentPlayersTurn, phase]);

  return {
    cookiePlayerId: cookiePlayerId,
    currentPlayer: currentPlayer,
    waitingForPlayers: waitingForPlayers,
    isHotseatMode: isHotSeatMode,
    controlsEnabled: controlsEnabled,
    setControlsEnabled: setControlsEnabled,
  };
}
