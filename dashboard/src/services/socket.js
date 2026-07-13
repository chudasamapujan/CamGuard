import { io } from 'socket.io-client';

// In production through Nginx reverse proxy, connect to current origin ('/') or VITE_SOCKET_URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

export const socket = io(SOCKET_URL, {
    path: '/socket.io',
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
});

export default socket;
