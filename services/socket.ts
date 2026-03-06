import { io, Socket } from 'socket.io-client'

const SOCKET_URL = 'https://stride-8mcq.onrender.com'

class SocketService {
  private socket: Socket | null = null

  connect() {
    if (this.socket?.connected) return this.socket

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data)
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback)
  }
}

export const socketService = new SocketService()
