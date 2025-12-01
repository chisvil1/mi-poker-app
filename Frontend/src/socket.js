import { io } from 'socket.io-client';

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:4000';
  }
  return 'https://mi-poker-app.onrender.com'; 
};

export const socket = io(getBackendUrl(), {
    transports: ['websocket', 'polling'],
    reconnection: true,
});