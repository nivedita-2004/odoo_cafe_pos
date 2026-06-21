import { io } from 'socket.io-client'

const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

let socketInstance = null
const joinedRooms = new Set()

const attachConnectionLogs = (socket) => {
  socket.on('connect', () => {
    console.info(`[SOCKET] connected: ${socket.id}`)
    joinedRooms.forEach((roomName) => {
      socket.emit('join', roomName)
      console.info(`[SOCKET] room joined: ${roomName}`)
    })
  })

  socket.io.on('reconnect_attempt', (attempt) => {
    console.info(`[SOCKET] reconnect attempt: ${attempt}`)
  })

  socket.on('disconnect', (reason) => {
    console.info(`[SOCKET] disconnected: ${reason}`)
  })
}

export const getSocketClient = () => {
  if (!socketInstance) {
    socketInstance = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })
    attachConnectionLogs(socketInstance)
  }

  return socketInstance
}

export const joinSocketRoom = (roomName) => {
  const socket = getSocketClient()
  const wasJoined = joinedRooms.has(roomName)
  joinedRooms.add(roomName)

  if (!socket.connected && !socket.active) {
    socket.connect()
    return socket
  }

  if (socket.connected && !wasJoined) {
    socket.emit('join', roomName)
    console.info(`[SOCKET] room joined: ${roomName}`)
  }

  return socket
}

export const createSocketClient = () => getSocketClient()

export const socket = getSocketClient()

export const socketOptions = {
    transports: ['websocket', 'polling'],
    withCredentials: true,
}
