/**
 * REST API client for PowerFlowGame
 * Handles HTTP requests to the FastAPI server
 */

import React from "react";

// Replace with your dev machine's local IP (e.g., "192.168.68.116")
const BACKEND_HOST = typeof window !== "undefined" ? "192.168.68.116" : "localhost";
const API_BASE_URL = `http://${BACKEND_HOST}:8000/api`;

// Error types
export class GameAPIError extends Error {
  status: number;
  response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "GameAPIError";
    this.status = status;
    this.response = response;
  }
}

// API Response Types
export interface CreateGameResponse {
  game_id: string;
  message: string;
}

export interface CreateLobbyResponse {
  game_id: string;
  message: string;
}

export interface JoinLobbyResponse {
  game_id: string;
  player_id: string;
  message: string;
}

export interface LobbyInfoResponse {
  game_id: string;
  host_player_id: string;
  players: Array<{
    player_id: string;
    name: string;
    is_host: boolean;
    joined_at: string;
  }>;
  created_at: string;
  max_players: number;
  is_started: boolean;
  player_count: number;
}

export interface GameInfo {
  game_id: string;
  players: string[];
}

export interface ListGamesResponse {
  games: GameInfo[];
  count: number;
}

export interface GameStateResponse {
  game_state: unknown;
  success: boolean;
  message: string;
}

export interface HealthCheckResponse {
  status: string;
}

// Client class
export class GameAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T = unknown>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    };

    if (config.body && typeof config.body === "object" && !(config.body instanceof Blob) && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GameAPIError(
          (errorData as { detail?: string }).detail || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof GameAPIError) {
        throw error;
      }
      throw new GameAPIError(
        `Network error: ${(error as Error).message}`,
        0,
        null
      );
    }
  }

  // Lobby endpoints
  async createLobby(): Promise<CreateLobbyResponse> {
    return this.request<CreateLobbyResponse>("/lobby/create", {
      method: "POST"
    });
  }

  async joinLobby(gameId: string | number, playerName: string): Promise<JoinLobbyResponse> {
    return this.request<JoinLobbyResponse>(`/lobby/join/${gameId}`, {
      method: "POST",
      body: JSON.stringify({ player_name: playerName }),
    });
  }

  async getLobbyInfo(gameId: string | number): Promise<LobbyInfoResponse> {
    return this.request<LobbyInfoResponse>(`/lobby/info/${gameId}`);
  }
  async startLobby(gameId: string | number): Promise<{ message: string; game_id?: string }> {
    return this.request<{ message: string; game_id?: string }>(`/lobby/start/${gameId}`, {
      method: "POST"
    });
  }

  // Game management endpoints
  async createGame(playerNames: string[]): Promise<CreateGameResponse> {
    return this.request<CreateGameResponse>("/games", {
      method: "POST",
      body: JSON.stringify({ player_names: playerNames }),
    });
  }

  async listGames(): Promise<ListGamesResponse> {
    return this.request<ListGamesResponse>("/games");
  }

  async getGameState(gameId: string | number): Promise<GameStateResponse> {
    return this.request<GameStateResponse>(`/games/${gameId}`);
  }

  async deleteGame(gameId: string | number): Promise<void> {
    return this.request<void>(`/games/${gameId}`, {
      method: "DELETE",
    });
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const url = `${this.baseUrl.replace("/api", "")}/health`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new GameAPIError(
        `Health check failed: HTTP ${response.status}`,
        response.status,
        response
      );
    }

    return (await response.json()) as HealthCheckResponse;
  }
}

// React hooks types
export interface UseGameAPIResult {
  client: GameAPIClient;
  loading: boolean;
  error: Error | null;
  execute: <T>(apiCall: (client: GameAPIClient) => Promise<T>) => Promise<T>;
}

export interface UseCreateGameResult {
  createGame: (playerNames: string[]) => Promise<CreateGameResponse>;
  loading: boolean;
  error: Error | null;
}

export interface UseGamesListResult {
  games: GameInfo[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseGameStateResult {
  gameState: unknown;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseCreateLobbyResult {
  createLobby: () => Promise<CreateLobbyResponse>;
  loading: boolean;
  error: Error | null;
}

export interface UseJoinLobbyResult {
  joinLobby: (gameId: string | number, playerName: string) => Promise<JoinLobbyResponse>;
  loading: boolean;
  error: Error | null;
}

export interface UseLobbyInfoResult {
  lobbyInfo: LobbyInfoResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseStartLobbyResult {
  startLobby: (gameId: string | number) => Promise<{ message: string; game_id?: string }>;
  loading: boolean;
  error: Error | null;
}

// React hooks for API integration
export function useGameAPI(): UseGameAPIResult {
  const [client] = React.useState(() => new GameAPIClient());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = React.useCallback(
    async <T>(apiCall: (client: GameAPIClient) => Promise<T>): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall(client);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  return { client, loading, error, execute };
}

// Specific hooks for common operations
export function useCreateGame(): UseCreateGameResult {
  const { execute, loading, error } = useGameAPI();

  const createGame = React.useCallback(
    async (playerNames: string[]): Promise<CreateGameResponse> => {
      return execute((client) => client.createGame(playerNames));
    },
    [execute]
  );

  return { createGame, loading, error };
}

export function useGamesList(): UseGamesListResult {
  const { client } = useGameAPI();
  const [games, setGames] = React.useState<GameInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchGames = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.listGames();
      setGames(result.games || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client]);

  React.useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return { games, loading, error, refresh: fetchGames };
}

export function useGameState(gameId: number): UseGameStateResult {
  const { client } = useGameAPI();
  const [gameState, setGameState] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchGameState = React.useCallback(async (): Promise<void> => {
    if (gameId === -1) return;

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
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, gameId]);

  React.useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  return { gameState, loading, error, refresh: fetchGameState };
}

export function useCreateLobby(): UseCreateLobbyResult {
  const { execute, loading, error } = useGameAPI();

  const createLobby = React.useCallback(
    async (): Promise<CreateLobbyResponse> => {
      return execute((client: GameAPIClient) => client.createLobby());
    },
    [execute]
  );

  return { createLobby, loading, error };
}

export function useJoinLobby(): UseJoinLobbyResult {
  const { execute, loading, error } = useGameAPI();

  const joinLobby = React.useCallback(
    async (gameId: string | number, playerName: string): Promise<JoinLobbyResponse> => {
      return execute((client: GameAPIClient) => client.joinLobby(gameId, playerName));
    },
    [execute]
  );

  return { joinLobby, loading, error };
}

export function useLobbyInfo(gameId: string | number): UseLobbyInfoResult {
  const { client } = useGameAPI();
  const [lobbyInfo, setLobbyInfo] = React.useState<LobbyInfoResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchLobbyInfo = React.useCallback(async (): Promise<void> => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await client.getLobbyInfo(gameId);
      setLobbyInfo(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, gameId]);

  React.useEffect(() => {
    fetchLobbyInfo();
  }, [fetchLobbyInfo]);

  return { lobbyInfo, loading, error, refresh: fetchLobbyInfo };
}

export function useStartLobby(): UseStartLobbyResult {
  const { execute, loading, error } = useGameAPI();

  const startLobby = React.useCallback(
    async (gameId: string | number): Promise<{ message: string; game_id?: string }> => {
      return execute((client: GameAPIClient) => client.startLobby(gameId));
    },
    [execute]
  );

  return { startLobby, loading, error };
}

export default GameAPIClient;
