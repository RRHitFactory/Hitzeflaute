"use client";

import { useCreateGame, useGamesList } from "@/lib/gameAPI";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number>(-1);

  // Setup states
  const [action, setAction] = useState<"create" | "load">("create");
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>([
    "Player 1",
    "Player 2",
  ]);

  const { createGame, loading: creatingGame } = useCreateGame();
  const { games, loading: gamesLoading, error: gamesError } = useGamesList();

  const startGame = async () => {
    try {
      setLoading(true);
      setError(null);

      let idToUse = -1;
      if (action === "create") {
        const result = await createGame(playerNames);
        idToUse = parseInt(result.game_id);
      } else if (action === "load" && selectedGameId !== -1) {
        idToUse = selectedGameId;
      }

      if (idToUse !== -1) {
        router.push(`/game?gameId=${idToUse}`);
      }
    } catch (err) {
      console.error("Failed to start game:", err);
      setError(err instanceof Error ? err.message : "Failed to start game");
    }
  };

  // Update playerNames when numPlayers changes
  React.useEffect(() => {
    if (action === "create") {
      const newNames = Array.from(
        { length: numPlayers },
        (_, i) => `Player ${i + 1}`,
      );
      setPlayerNames(newNames);
    }
  }, [numPlayers, action]);

  // Show loading screen while initializing
  if (loading || creatingGame) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Creating Game...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-gray-200 rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Local Multiplayer Setup
        </h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action
          </label>
          <div className="space-y-2">
            <label className="flex items-center text-black">
              <input
                type="radio"
                value="create"
                checked={action === "create"}
                onChange={(e) => setAction(e.target.value as "create" | "load")}
                className="mr-2"
              />
              Create New Game
            </label>
            <label className="flex items-center text-black">
              <input
                type="radio"
                value="load"
                checked={action === "load"}
                onChange={(e) => setAction(e.target.value as "create" | "load")}
                className="mr-2"
              />
              Load Existing Game
            </label>
          </div>
        </div>

        {action === "load" ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Game
            </label>
            {gamesLoading ? (
              <p>Loading games...</p>
            ) : gamesError ? (
              <p className="text-red-600">
                Error loading games:{" "}
                {(gamesError as Error)?.message || "Unknown error"}
              </p>
            ) : games.length === 0 ? (
              <p>No saved games found.</p>
            ) : (
              <select
                value={selectedGameId !== -1 ? selectedGameId : -1}
                onChange={(e) =>
                  setSelectedGameId(
                    e.target.value ? parseInt(e.target.value) : -1,
                  )
                }
                className="w-full p-2 border border-gray-400 rounded-md text-black"
              >
                <option value="">Select a game...</option>
                {(games as Array<{ game_id: string; players: string[] }>).map(
                  (game) => (
                    <option key={game.game_id} value={game.game_id}>
                      Game {game.game_id} - Players: {game.players.join(", ")}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Players
            </label>
            <div className="flex gap-2 mb-4">
              {[2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumPlayers(num)}
                  className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors ${
                    numPlayers === num
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player Names
            </label>
            {playerNames.map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => {
                  const newNames = [...playerNames];
                  newNames[index] = e.target.value;
                  setPlayerNames(newNames);
                }}
                placeholder={`Player ${index + 1}`}
                className="w-full p-2 mb-2 border border-gray-400 rounded-md text-black"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <button
          onClick={startGame}
          disabled={
            (action === "load" && selectedGameId === -1) ||
            (action === "create" && playerNames.some((name) => !name.trim()))
          }
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
