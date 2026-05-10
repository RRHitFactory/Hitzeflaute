# API Configuration

This directory contains centralized configuration for the backend API endpoints.

## Configuration

The main configuration file is `apiConfig.ts` which contains:

- `BACKEND_HOST`: The IP address or hostname of your backend server
- `API_BASE_URL`: The full base URL for API endpoints

## Changing the Backend IP Address

To change the backend IP address for development:

1. **For local development** (frontend and backend on same machine):
   ```typescript
   export const BACKEND_HOST = "localhost";
   ```

2. **For network testing** (testing from mobile devices or other computers):
   ```typescript
   export const BACKEND_HOST = "192.168.1.100"; // Replace with your local IP
   ```

3. **For production**:
   ```typescript
   export const BACKEND_HOST = "your-domain.com"; // Or your server IP
   ```

## Usage

All API-related files now import from this centralized configuration:

- `src/lib/gameAPI.ts` - REST API client
- `src/lib/lobbyWebSocket.ts` - Lobby WebSocket client  
- `src/lib/gameWebSocket.ts` - Game WebSocket client

This ensures consistent configuration across all API communications.