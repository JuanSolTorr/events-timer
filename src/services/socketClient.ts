import { io, type Socket } from 'socket.io-client'
import { config } from '../config/env'
import type { SocketServerEvents, SocketClientEvents } from '../types'

type AppSocket = Socket<SocketServerEvents, SocketClientEvents>

let instance: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!instance) {
    instance = io(config.socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    })
  }
  return instance
}

export function disconnectSocket(): void {
  if (instance) {
    instance.disconnect()
    instance = null
  }
}
