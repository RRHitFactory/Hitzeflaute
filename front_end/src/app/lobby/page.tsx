"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useJoinLobby, useLobbyInfo, useStartLobby } from "@/lib/gameAPI";
import { useLobbyWebSocket } from "@/lib/lobbyWebSocket";

function LobbyContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId") || "";
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [gameStartedRedirect, setGameStartedRedirect] = useState<number | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const { joinLobby, loading, error } = useJoinLobby();
  const { startLobby, loading: startLoading, error: startError } = useStartLobby();
  const promptedRef = useRef<Record<string, boolean>>({});

  // Get lobby info with player list
  const { lobbyInfo, loading: infoLoading, error: infoError, refresh: refreshLobbyInfo } = useLobbyInfo(gameId);

  // WebSocket connection for real-time updates - only connect when player is ready
  const wsPlayerId = playerId ? parseInt(playerId) : -1;
  const { client: wsClient, connectionState, isConnected } = useLobbyWebSocket(
    isPlayerReady && gameId ? parseInt(gameId) : -1,
    isPlayerReady ? wsPlayerId : -1,
    {
      onGameStarted: (newGameId: number) => {
        console.log("Game started! Redirecting to game page with gameId:", newGameId);
        setGameStartedRedirect(newGameId);
      },
      onLobbyUpdate: () => {
        console.log("Lobby update received via WebSocket, refreshing lobby info...");
        refreshLobbyInfo();
      },
    }
  );

  // Poll for lobby updates every 5 seconds as fallback
  useEffect(() => {
    if (gameId && isPlayerReady) {
      const interval = setInterval(() => {
        refreshLobbyInfo();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [gameId, refreshLobbyInfo, isPlayerReady]);

  // Redirect when game starts via WebSocket
  useEffect(() => {
    if (gameStartedRedirect) {
      window.location.href = `/game?gameId=${gameStartedRedirect}`;
    }
  }, [gameStartedRedirect]);

  // Get public URL (replace localhost with actual IP for sharing)
  const getPublicUrl = () => {
    if (typeof window === "undefined") return "";
    let url = `${window.location.origin}/lobby?gameId=${gameId}`;
    return url;
  };

  const lobbyUrl = getPublicUrl();

  // Auto-join when page loads
  useEffect(() => {
    if (gameId && !promptedRef.current[gameId]) {
      promptedRef.current[gameId] = true;
      // Check localStorage for existing player info for this game
      const storedGameId = typeof window !== "undefined" ? localStorage.getItem(`lobby_gameId_${gameId}`) : null;
      const storedPlayerId = typeof window !== "undefined" ? localStorage.getItem(`lobby_playerId_${gameId}`) : null;
      const storedPlayerName = typeof window !== "undefined" ? localStorage.getItem(`lobby_playerName_${gameId}`) : null;

      const newPlayer = !storedPlayerId || !storedPlayerName || storedGameId !== gameId;

      if (newPlayer) {
        const name = prompt("Enter your player name:", `Player ${Math.floor(Math.random() * 1000) + 1}`);
        if (name) {
          setPlayerName(name);
          joinLobby(gameId, name)
            .then((result) => {
              setPlayerId(result.player_id);
              // Store in localStorage for future visits
              if (typeof window !== "undefined") {
                localStorage.setItem(`lobby_gameId_${gameId}`, gameId);
                localStorage.setItem(`lobby_playerId_${gameId}`, result.player_id);
                localStorage.setItem(`lobby_playerName_${gameId}`, name);
              }
              // Mark player as ready to show content and connect WebSocket
              setIsPlayerReady(true);
              // Wait a brief moment for server to process, then refresh
              setTimeout(() => refreshLobbyInfo(), 500);
            })
            .catch((err) => {
              console.error("Failed to join lobby:", err);
            });
        } else {
          // User cancelled the prompt - don't show content
          setIsPlayerReady(false);
        }
      } else if (storedPlayerName) {
        setPlayerName(storedPlayerName);
        setPlayerId(storedPlayerId || null);
        // Mark player as ready for existing player
        setIsPlayerReady(true);
        // Refresh lobby info for existing player
        refreshLobbyInfo();
      }
    }
  }, [gameId, joinLobby, refreshLobbyInfo]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(lobbyUrl);
      setCopySuccess("Link copied to clipboard!");
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      prompt("Copy this link:", lobbyUrl);
    }
  };

  const handleStartGame = async () => {
    try {
      const result = await startLobby(gameId);
      const redirectId = result.game_id || gameId;
      // Don't redirect immediately - wait for WebSocket broadcast
      // The WebSocket will trigger the redirect for all players simultaneously
      console.log("Game started, waiting for WebSocket broadcast to all players...");
    } catch (err) {
      console.error("Failed to start game:", err);
      alert("Failed to start game. Need at least 2 players.");
    }
  };

  // Get players from lobby info
  const players = lobbyInfo?.players || [];
  const isHost = lobbyInfo?.host_player_id === playerId;
  const canStart = isHost && (lobbyInfo?.player_count || 0) >= 2;

  // Show redirecting message when game is starting
  const [showStartingMessage, setShowStartingMessage] = useState(false);

  const handleStartWithMessage = async () => {
    setShowStartingMessage(true);
    await handleStartGame();
    // The WebSocket will handle the redirect for all players
  };

  // Don't show main lobby content until player is ready
  if (!gameId) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="bg-gray-300 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-black mb-4">
            No Lobby Created
          </h1>
          <p className="text-black">
            Please create a lobby first from the home page.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while player is being set up
  if (!isPlayerReady) {
    return (
      <div className="min-h-screen bg-gray-300">
        <header className="bg-gray-300 shadow-sm border-b">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-black">
                Power Flow Game - Lobby
              </h1>
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                Home
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-300 rounded-lg shadow-lg p-8 max-w-2xl w-full mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-black">Waiting for player setup...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-300">
      <header className="bg-gray-300 shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-black">
              Power Flow Game - Lobby
            </h1>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-300 rounded-lg shadow-lg p-8 max-w-2xl w-full mx-auto">
          <h2 className="text-2xl font-bold text-black mb-6 text-center">
            Lobby {gameId}
          </h2>

          {showStartingMessage && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Starting game... All players will be redirected automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {playerName && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">
                Your Player Name
              </label>
              <code className="bg-gray-400 px-4 py-2 rounded-md text-lg text-black block text-center">
                {playerName}
              </code>
              {isHost && (
                <p className="text-sm text-gray-700 text-center mt-2">You are the host</p>
              )}
            </div>
          )}

          {/* WebSocket Connection Status */}
          {wsPlayerId !== -1 && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected
                    ? "bg-green-500"
                    : connectionState === "CONNECTING"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                {isConnected
                  ? "Real-time updates: Connected"
                  : connectionState === "CONNECTING"
                    ? "Real-time updates: Connecting..."
                    : "Real-time updates: Disconnected (using polling fallback)"}
              </span>
            </div>
          )}

          {/* Player Table */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-black mb-3">Players in Lobby ({players.length}/{lobbyInfo?.max_players || 5})</h3>
            {players.length === 0 ? (
              <p className="text-black text-center py-4">No players yet. Share the link below to invite others.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-400 rounded-md">
                  <thead className="bg-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-black">Player Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-black">Player ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-300">
                    {players.map((player) => (
                      <tr key={player.player_id} className="border-t border-gray-500">
                        <td className="px-4 py-2 text-black">{player.name}</td>
                        <td className="px-4 py-2 text-black">{player.player_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Start Game Button - only shown to host with 2+ players */}
          {isHost && (
            <div className="mb-6">
              <button
                onClick={handleStartWithMessage}
                disabled={!canStart || startLoading || showStartingMessage}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {startLoading ? "Starting Game..." : showStartingMessage ? "Game Starting..." : "Start Game"}
              </button>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Share this link with others to join:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={lobbyUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-400 rounded-md bg-gray-400 text-sm text-black"
              />
              <button
                onClick={copyLink}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>

          {copySuccess && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 text-center">
              {copySuccess}
            </div>
          )}

          <div className="text-sm text-black text-center">
            <p>Players who open this link will join your lobby.</p>
            {isHost ? (
              <p className="mt-2">You are the host. Start the game when ready.</p>
            ) : (
              <p className="mt-2">Waiting for the host to start the game.</p>
            )}
            {!canStart && isHost && (
              <p className="mt-2 text-red-600">Need at least 2 players to start.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


export default function LobbyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LobbyContent />
    </Suspense>
  );
}
