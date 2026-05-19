"use client";

import { BACKEND_HOST } from "@/config/apiConfig";
import { GameState, GameUpdate } from "@/types/game";
import { useEffect, useRef, useState } from "react";

/**
 * WebSocket client for PowerFlowGame
 * Handles real-time communication between React frontend and Python backend
 */

// Type definitions
export interface WebSocketMessage {
  message_type: string;
  data: any;
  game_id: number;
  player_id: number;
}

interface GameWebSocketCallbacks {
  onMessage?: (data: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export class GameWebSocketClient {
  private gameId: number;
  private socketPlayerId: number; // may be -1 if shared socket
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second delay
  private messageQueue: Array<WebSocketMessage> = [];

  // Callbacks
  private onMessage: (data: WebSocketMessage) => void;
  private onError: (error: Event) => void;
  private onClose: (event: CloseEvent) => void;

  constructor(
    gameId: number,
    playerId: number,
    onMessage?: (data: WebSocketMessage) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void,
  ) {
    this.gameId = gameId;
    this.socketPlayerId = playerId;

    // Callbacks
    this.onMessage = onMessage || this.defaultOnMessage;
    this.onError = onError || this.defaultOnError;
    this.onClose = onClose || this.defaultOnClose;

    this.connect();
  }

  private connect(): void {
    const wsUrl = `ws://${BACKEND_HOST}:8000/ws/games/${this.gameId}/${this.socketPlayerId}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = (event: Event) => {
        console.log("🟢 WebSocket connected successfully!");
        console.log("Game ID:", this.gameId, "Player ID:", this.socketPlayerId);
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Request initial game state
        console.log("📋 Requesting initial game state after connection...");
        this.requestGameState(-1);

        // Send any queued messages
        console.log("📤 Processing queued messages:", this.messageQueue.length);
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message) {
            console.log("📤 Sending queued message:", message.message_type);
            this.send(message.message_type, message.data, message.player_id);
          }
        }
        console.log("✅ WebSocket initialization complete");
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
          console.error("Raw message that failed to parse:", event.data);
          console.error(
            "Error details:",
            error instanceof Error ? error.message : error,
          );
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log("WebSocket connection closed", event);
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
        console.error("WebSocket error:", error);
        this.onError(error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.onError(error as Event);
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  public send(type: string, data: any, playerId: number): void {
    const message: WebSocketMessage = {
      message_type: type,
      data: data,
      game_id: this.gameId,
      player_id: playerId,
    };

    console.log("=== Sending WebSocket Message ===");
    console.log("Message type:", type);
    console.log("Player ID:", message.player_id);
    console.log("WebSocket ready state:", this.ws?.readyState);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("✅ Sending message immediately");
      this.ws.send(JSON.stringify(message));
    } else {
      console.log("⚠️ WebSocket not ready, queuing message");
      console.log("Current state:", this.getConnectionState());
      this.messageQueue.push(message);

      // Try to reconnect if connection is closed
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        console.log("🔄 Attempting to reconnect...");
        this.connect();
      }
    }
    console.log("=== End Send Message ===");
  }

  // Specific game action methods
  public buyAsset(assetId: string, playerId: number): void {
    this.send(
      "buy_request",
      {
        purchase_id: assetId,
        purchase_type: "asset",
      },
      playerId,
    );
  }

  public buyTransmissionLine(lineId: string, playerId: number): void {
    this.send(
      "buy_request",
      {
        purchase_id: lineId,
        purchase_type: "transmission",
      },
      playerId,
    );
  }

  public updateBid(assetId: string, bidPrice: number, playerId: number): void {
    this.send(
      "update_bid_request",
      {
        asset_id: assetId,
        bid_price: bidPrice,
      },
      playerId,
    );
  }

  public submitBatchBids(bids: Record<number, number>, playerId: number): void {
    console.log("Submitting batch bids:", bids);
    this.send(
      "update_batch_bids_request",
      {
        bids: bids,
      },
      playerId,
    );
  }

  public activationUpdate(
    activationUpdates: {
      line_activation?: Record<number, boolean>;
      asset_activation?: Record<number, boolean>;
    },
    playerId: number,
  ): void {
    this.send("activation_update_request", activationUpdates, playerId);
  }

  public endTurn(playerId: number): void {
    this.send("end_turn", {}, playerId);
  }

  public freezerMigrationRequest(
    assetId: number | null,
    busId: number,
    playerId: number,
  ): void {
    this.send(
      "freezer_migration_request",
      {
        asset_id: assetId,
        bus: busId,
      },
      playerId,
    );
  }

  public requestGameState(playerId: number): void {
    console.log("🎯 Requesting initial game state...");
    this.send("get_game_state", {}, playerId);
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  // Default callback implementations
  private defaultOnMessage(msg: WebSocketMessage): void {
    console.log("Received message:", msg);

    switch (msg.message_type) {
      case "game_message":
        console.log("Game message:", msg.message_type, msg.data);
        break;
      case "error":
        console.error("Server error:", msg.data);
        break;
      default:
        console.log("Unknown message type:", msg.message_type);
    }
  }

  private defaultOnError(error: Event): void {
    console.error("WebSocket error:", error);
  }

  private defaultOnClose(event: CloseEvent): void {
    console.log("WebSocket closed:", event);
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
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "DISCONNECTED";
      default:
        return "UNKNOWN";
    }
  }
}

// React hook for easier integration
export function useGameWebSocket(
  gameId: number,
  playerId: number, // this may be -1 if it is a shared socket
  callbacks: GameWebSocketCallbacks = {},
) {
  const [client, setClient] = useState<GameWebSocketClient | null>(null);
  const [connectionState, setConnectionState] =
    useState<string>("DISCONNECTED");
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Use a ref to store the latest callbacks without causing re-renders
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (gameId === -1 || !playerId) {
      console.log(
        "⏸️  WebSocket hook waiting for valid gameId:",
        gameId,
        "playerId:",
        playerId,
      );
      return;
    }

    console.log(
      "🔌 WebSocket hook connecting to gameId:",
      gameId,
      "playerId:",
      playerId,
    );

    const wsClient = new GameWebSocketClient(
      gameId,
      playerId,
      (msg: WebSocketMessage) => {
        if (msg.message_type === "GameUpdate") {
          console.log("=== GAME UPDATE ===");
          // Validate the structure
          const gameUpdate: GameUpdate = msg.data
          const gameStateData: GameState = gameUpdate.game_state
          console.log("Current phase: " + gameStateData.phase);
          setGameState(gameStateData);
        } else {
          console.log("Message type:", msg.message_type);
          console.log("Raw message data:", JSON.stringify(msg, null, 2));
        }
        // Call custom callback if provided
        if (callbacksRef.current.onMessage) {
          callbacksRef.current.onMessage(msg);
        }

        // Update connection state
        setConnectionState(wsClient.getConnectionState());
      },
      callbacksRef.current.onError,
      callbacksRef.current.onClose,
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
  }, [gameId, playerId]); // Remove callbacks from dependencies to prevent recreation

  return {
    client,
    connectionState,
    gameState,
    isConnected: client?.isConnected() || false,
  };
}
export default GameWebSocketClient;
