"use client";

import { useEffect, useRef, useState } from "react";

// Type definitions
export interface LobbyWebSocketMessage {
  message_type: string;
  game_id?: number;
  player_id?: number;
  data?: any;
}

interface LobbyWebSocketCallbacks {
  onMessage?: (data: LobbyWebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onGameStarted?: (gameId: number) => void;
  onLobbyUpdate?: () => void;
}

/**
 * WebSocket client for lobby real-time communication
 */
export class LobbyWebSocketClient {
  private gameId: number;
  private playerId: number;
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  // Callbacks
  private onMessage: (data: LobbyWebSocketMessage) => void;
  private onError: (error: Event) => void;
  private onClose: (event: CloseEvent) => void;
  private onGameStartedCallback: ((gameId: number) => void) | null = null;
  private onLobbyUpdateCallback: (() => void) | null = null;

  constructor(
    gameId: number,
    playerId: number,
    onMessage?: (data: LobbyWebSocketMessage) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void,
    onGameStarted?: (gameId: number) => void,
    onLobbyUpdate?: () => void,
  ) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.onGameStartedCallback = onGameStarted || null;
    this.onLobbyUpdateCallback = onLobbyUpdate || null;

    this.onMessage = onMessage || this.defaultOnMessage;
    this.onError = onError || this.defaultOnError;
    this.onClose = onClose || this.defaultOnClose;

    // Only connect if we have valid IDs
    if (gameId !== -1 && playerId !== -1) {
      this.connect();
    } else {
      console.log("[LobbyWS] Skipping connection - invalid gameId or playerId");
    }
  }

  private connect(): void {
    // Replace with your dev machine's local IP (e.g., "192.168.68.116")
    const backendHost =
      typeof window !== "undefined" ? "192.168.68.116" : "localhost";
    // Use the existing game WebSocket endpoint for lobby
    const wsUrl = `ws://${backendHost}:8000/ws/lobby/${this.gameId}/${this.playerId}`;
    console.log(`[LobbyWS] Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = (event: Event) => {
        console.log("[LobbyWS] WebSocket connected successfully!");
        console.log(
          "[LobbyWS] Game ID:",
          this.gameId,
          "Player ID:",
          this.playerId,
        );
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data: LobbyWebSocketMessage = JSON.parse(event.data);
          console.log("[LobbyWS] Received message:", data);
          this.onMessage(data);

          // Handle specific message types
          if (
            data.message_type === "game_started" &&
            data.game_id &&
            this.onGameStartedCallback
          ) {
            console.log(
              "[LobbyWS] Game started event received, game_id:",
              data.game_id,
            );
            this.onGameStartedCallback(data.game_id);
          }

          if (
            data.message_type === "lobby_update" &&
            this.onLobbyUpdateCallback
          ) {
            console.log("[LobbyWS] Lobby update event received, refreshing...");
            this.onLobbyUpdateCallback();
          }
        } catch (error) {
          console.error("[LobbyWS] Error parsing WebSocket message:", error);
          console.error("[LobbyWS] Raw message:", event.data);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log("[LobbyWS] WebSocket connection closed", event);
        this.onClose(event);

        // Attempt to reconnect if it wasn't a clean close
        if (
          !event.wasClean &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error("[LobbyWS] WebSocket error:", error);
        this.onError(error);
      };
    } catch (error) {
      console.error("[LobbyWS] Failed to create WebSocket connection:", error);
      this.onError(error as Event);
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(
      `[LobbyWS] Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  // Connection status
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): string {
    if (!this.ws) return "DISCONNECTED";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "CONNECTED";
      case WebSocket.CLOSED:
        return "DISCONNECTED";
      default:
        return "UNKNOWN";
    }
  }

  // Default callback implementations
  private defaultOnMessage(msg: LobbyWebSocketMessage): void {
    console.log("[LobbyWS] Received message:", msg);
  }

  private defaultOnError(error: Event): void {
    console.error("[LobbyWS] WebSocket error:", error);
  }

  private defaultOnClose(event: CloseEvent): void {
    console.log("[LobbyWS] WebSocket closed:", event);
  }
}

// React hook for lobby WebSocket
export function useLobbyWebSocket(
  gameId: number,
  playerId: number,
  callbacks: LobbyWebSocketCallbacks = {},
) {
  const [client, setClient] = useState<LobbyWebSocketClient | null>(null);
  const [connectionState, setConnectionState] =
    useState<string>("DISCONNECTED");

  // Use a ref to store the latest callbacks without causing re-renders
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    // Skip if invalid IDs
    if (gameId === -1 || playerId === -1) {
      console.log(
        "[LobbyWS Hook] Skipping connection - invalid gameId or playerId",
      );
      return;
    }

    console.log(
      "[LobbyWS Hook] Connecting to gameId:",
      gameId,
      "playerId:",
      playerId,
    );

    const wsClient = new LobbyWebSocketClient(
      gameId,
      playerId,
      callbacksRef.current.onMessage,
      callbacksRef.current.onError,
      callbacksRef.current.onClose,
      callbacksRef.current.onGameStarted,
      callbacksRef.current.onLobbyUpdate,
    );

    setClient(wsClient);

    // Monitor connection status
    const statusInterval = setInterval(() => {
      if (wsClient) {
        setConnectionState(wsClient.getConnectionState());
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
      clearInterval(statusInterval);
    };
  }, [gameId, playerId]);

  return {
    client,
    connectionState,
    isConnected: client?.isConnected() || false,
  };
}

export default LobbyWebSocketClient;
