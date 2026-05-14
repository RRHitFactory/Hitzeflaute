"use client";

import GameStatus from "@/components/UI/GameStatus";
import { GameState } from "@/types/game";

interface HeaderProps {
  connectionState: string;
  gameState: GameState;
  error: string | null;
  setError: (error: string | null) => void;
}

const Header: React.FC<HeaderProps> = ({
  connectionState,
  gameState,
  error,
  setError,
}) => {
  return (
    <header className="bg-gray-200 shadow-sm border-b">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:flex-row flex-col md:items-center items-start gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0 text-center w-full md:w-auto">
            Power Flow Game
          </h1>
          <div className="flex items-center gap-4 md:flex-row flex-col items-start md:items-center w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  connectionState === "CONNECTED"
                    ? "bg-green-500"
                    : connectionState === "CONNECTING"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                {connectionState === "CONNECTED"
                  ? "Connected"
                  : connectionState === "CONNECTING"
                    ? "Connecting..."
                    : "Disconnected"}
              </span>
            </div>

            <div className="flex-shrink-0">
              <GameStatus
                phase={gameState.phase}
                round={gameState.game_round}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
