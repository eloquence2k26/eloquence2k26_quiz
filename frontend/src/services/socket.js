import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/constants';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to Eloquence Server:', socket.id);
      socket.emit('join_participants');
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WebSocket] Connection notice:', err.message);
    });
  }

  return socket;
};

export const joinUserRoom = (userId) => {
  const s = getSocket();
  if (s && userId) {
    s.emit('join_user_room', userId);
  }
};
