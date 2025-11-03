/**
 * REST API client for PowerFlowGame
 * Handles HTTP requests to the FastAPI server
 */
import React from "react";
const API_BASE_URL = "http://localhost:8000/api";

class GameAPIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = "GameAPIError";
    this.status = status;
    this.response = response;
  }
}

export class GameAPIClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === "object") {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GameAPIError(
          errorData.detail || `HTTP ${response.status}`,
          response.status,
          errorData,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof GameAPIError) {
        throw error;
      }
      throw new GameAPIError(`Network error: ${error.message}`, 0, null);
    }
  }

  // Game management endpoints
  async createGame(playerNames) {
    return this.request("/games", {
      method: "POST",
      body: { player_names: playerNames },
    });
  }

  async listGames() {
    return this.request("/games");
  }

  async getGameState(gameId) {
    return this.request(`/games/${gameId}`);
  }

  async deleteGame(gameId) {
    return this.request(`/games/${gameId}`, {
      method: "DELETE",
    });
  }

  // Health check
  async healthCheck() {
    const url = `${this.baseUrl.replace("/api", "")}/health`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new GameAPIError(
        `Health check failed: HTTP ${response.status}`,
        response.status,
      );
    }

    return await response.json();
  }
}

// React hooks for API integration
export function useGameAPI() {
  const [client] = React.useState(() => new GameAPIClient());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const execute = React.useCallback(
    async (apiCall) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall(client);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return { client, loading, error, execute };
}

// Specific hooks for common operations
export function useCreateGame() {
  const { execute, loading, error } = useGameAPI();

  const createGame = React.useCallback(
    async (playerNames) => {
      return execute((client) => client.createGame(playerNames));
    },
    [execute],
  );

  return { createGame, loading, error };
}

export function useGamesList() {
  const { client } = useGameAPI();
  const [games, setGames] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchGames = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.listGames();
      setGames(result.games || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [client]);

  React.useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return { games, loading, error, refresh: fetchGames };
}

export function useGameState(gameId) {
  const { client } = useGameAPI();
  const [gameState, setGameState] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchGameState = React.useCallback(async () => {
    if (!gameId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await client.getGameState(gameId);
      if (result.success) {
        setGameState(result.game_state);
      } else {
        throw new Error(result.message || "Failed to fetch game state");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [client, gameId]);

  React.useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  return { gameState, loading, error, refresh: fetchGameState };
}

export default GameAPIClient;
