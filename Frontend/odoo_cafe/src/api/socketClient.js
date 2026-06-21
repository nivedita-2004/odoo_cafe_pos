import { io } from 'socket.io-client'

const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

export const createSocketClient = () =>
  io(socketUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
  })
