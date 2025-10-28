'use client'

/**
 * WebSocket client for PowerFlowGame
 * Handles real-time communication between React frontend and Python backend
 */

// Type definitions
interface WebSocketMessage {
    type: string;
    data?: any;
    game_id?: number;
    player_id?: number;
    message_class?: string;
    message?: string;
}

interface GameWebSocketCallbacks {
    onMessage?: (data: WebSocketMessage) => void;
    onError?: (error: Event) => void;
    onClose?: (event: CloseEvent) => void;
}

export class GameWebSocketClient {
    private gameId: number;
    private playerId: number;
    private ws: WebSocket | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000; // Start with 1 second delay
    private messageQueue: Array<{ type: string; data: any }> = [];

    // Callbacks
    private onMessage: (data: WebSocketMessage) => void;
    private onError: (error: Event) => void;
    private onClose: (event: CloseEvent) => void;

    constructor(
        gameId: number,
        playerId: number,
        onMessage?: (data: WebSocketMessage) => void,
        onError?: (error: Event) => void,
        onClose?: (event: CloseEvent) => void
    ) {
        this.gameId = gameId;
        this.playerId = playerId;

        // Callbacks
        this.onMessage = onMessage || this.defaultOnMessage;
        this.onError = onError || this.defaultOnError;
        this.onClose = onClose || this.defaultOnClose;

        this.connect();
    }

    private connect(): void {
        const wsUrl = `ws://localhost:8000/ws/${this.gameId}/${this.playerId}`;
        console.log(`Connecting to WebSocket: ${wsUrl}`);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = (event: Event) => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;

                // Send any queued messages
                while (this.messageQueue.length > 0) {
                    const message = this.messageQueue.shift();
                    if (message) {
                        this.send(message.type, message.data);
                    }
                }
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    this.onMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    console.error('Raw message:', event.data);
                }
            };

            this.ws.onclose = (event: CloseEvent) => {
                console.log('WebSocket connection closed', event);
                this.onClose(event);

                // Attempt to reconnect if it wasn't a clean close
                if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error: Event) => {
                console.error('WebSocket error:', error);
                this.onError(error);
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.onError(error as Event);
        }
    }

    private attemptReconnect(): void {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
    }

    public send(type: string, data: any): void {
        const message = {
            type: type,
            data: data,
            game_id: this.gameId,
            player_id: this.playerId
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.log('WebSocket not ready, queuing message:', message);
            this.messageQueue.push(message);

            // Try to reconnect if connection is closed
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                this.connect();
            }
        }
    }

    // Specific game action methods
    public buyAsset(assetId: string): void {
        this.send('buy_request', {
            purchase_id: assetId
        });
    }

    public buyTransmissionLine(lineId: string): void {
        this.send('buy_request', {
            purchase_id: lineId
        });
    }

    public updateBid(assetId: string, bidPrice: number): void {
        this.send('update_bid_request', {
            asset_id: assetId,
            bid_price: bidPrice
        });
    }

    public operateLine(transmissionId: string, action: 'open' | 'close'): void {
        this.send('operate_line_request', {
            transmission_id: transmissionId,
            action: action
        });
    }

    public endTurn(): void {
        this.send('end_turn', {});
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
        }
    }

    // Default callback implementations
    private defaultOnMessage(data: WebSocketMessage): void {
        console.log('Received message:', data);

        switch (data.type) {
            case 'game_state':
                console.log('Game state updated:', data.data);
                break;
            case 'game_message':
                console.log('Game message:', data.message_class, data.data);
                break;
            case 'error':
                console.error('Server error:', data.message);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    private defaultOnError(error: Event): void {
        console.error('WebSocket error:', error);
    }

    private defaultOnClose(event: CloseEvent): void {
        console.log('WebSocket closed:', event);
    }

    // Connection status
    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    public getConnectionState(): string {
        if (!this.ws) return 'DISCONNECTED';

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'CONNECTING';
            case WebSocket.OPEN: return 'CONNECTED';
            case WebSocket.CLOSING: return 'CLOSING';
            case WebSocket.CLOSED: return 'DISCONNECTED';
            default: return 'UNKNOWN';
        }
    }
}

// React hook for easier integration (temporarily commented out for debugging)
/*
export function useGameWebSocket(
    gameId: string, 
    playerId: string, 
    callbacks: GameWebSocketCallbacks = {}
) {
    const [client, setClient] = React.useState<GameWebSocketClient | null>(null);
    const [connectionState, setConnectionState] = React.useState<string>('DISCONNECTED');
    const [gameState, setGameState] = React.useState<any>(null);
    const [messages, setMessages] = React.useState<WebSocketMessage[]>([]);

    React.useEffect(() => {
        if (!gameId || !playerId) return;

        const wsClient = new GameWebSocketClient(
            gameId,
            playerId,
            (data: WebSocketMessage) => {
                // Handle incoming messages
                if (data.type === 'game_state') {
                    setGameState(data.data);
                } else if (data.type === 'game_message') {
                    setMessages(prev => [...prev, data]);
                }

                // Call custom callback if provided
                if (callbacks.onMessage) {
                    callbacks.onMessage(data);
                }

                // Update connection state
                setConnectionState(wsClient.getConnectionState());
            },
            callbacks.onError,
            callbacks.onClose
        );

        setClient(wsClient);

        // Cleanup on unmount
        return () => {
            wsClient.disconnect();
        };
    }, [gameId, playerId]);

    return {
        client,
        connectionState,
        gameState,
        messages,
        isConnected: client?.isConnected() || false
    };
}
*/export default GameWebSocketClient;