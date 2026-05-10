"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateLobby } from "@/lib/gameAPI";

export default function HomePage() {
  const router = useRouter();
  const { createLobby, loading, error } = useCreateLobby();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateLobby = async () => {
    setIsCreating(true);
    try {
      const result = await createLobby();
      router.push(`/lobby?gameId=${result.game_id}`);
    } catch (err) {
      console.error("Failed to create lobby:", err);
      alert("Failed to create lobby. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-300 flex items-center justify-center">
      <div className="bg-gray-400 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-black mb-8">
          Power Flow Game
        </h1>

        <div className="space-y-4">
          <button
            onClick={handleCreateLobby}
            disabled={isCreating || loading}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isCreating || loading ? "Creating Lobby..." : "Create Lobby"}
          </button>

          <Link
            href="/setup"
            className="block w-full bg-green-600 text-white py-4 px-6 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors"
          >
            Local Multiplayer
          </Link>
        </div>
      </div>
    </div>
  );
}
