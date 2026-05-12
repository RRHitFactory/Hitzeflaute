/**
 * API Configuration
 * Centralized configuration for backend API endpoints
 */

export const BACKEND_HOST = process.env.NEXT_PUBLIC_BACKEND_HOST || "localhost";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || `http://${BACKEND_HOST}:8000/api`;
