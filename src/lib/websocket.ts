/**
 * Enhanced WebSocket Client
 * Real-time communication with automatic reconnection
 */

import { useAuthStore } from '../store/authStore'

type MessageHandler = (data: any) => void
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

interface WebSocketOptions {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private heartbeatInterval: number
  private reconnectAttempts = 0
  private heartbeatTimer: number | null = null
  private reconnectTimer: number | null = null
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map()
  private connectionStatusHandlers: Set<(status: ConnectionStatus) => void> = new Set()
  private status: ConnectionStatus = 'disconnected'
  private userInfo: { userId: string; role: string; examId?: string } | null = null

  constructor(options: WebSocketOptions = {}) {
    const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000'
    this.url = options.url || WS_URL
    this.reconnectInterval = options.reconnectInterval || 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10
    this.heartbeatInterval = options.heartbeatInterval || 30000
  }

  /**
   * Connect to WebSocket server
   */
  connect(userInfo: { userId: string; role: string; examId?: string }) {
    this.userInfo = userInfo
    this.setStatus('connecting')

    const token = useAuthStore.getState().token
    if (!token) {
      console.error('❌ No auth token available for WebSocket connection')
      this.setStatus('error')
      return
    }

    // Build WebSocket URL with path parameters to match backend: /ws/{exam_id}/{user_id}/{role}
    const examId = userInfo.examId || 'default'
    const userId = userInfo.userId
    const role = userInfo.role
    
    const wsUrl = `${this.url}/ws/${examId}/${userId}/${role}`
    console.log('🌐 Connecting to WebSocket:', wsUrl)

    try {
      this.ws = new WebSocket(wsUrl)
      this.setupEventHandlers()
    } catch (error) {
      console.error('❌ WebSocket connection error:', error)
      this.setStatus('error')
      this.attemptReconnect()
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers() {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected')
      this.setStatus('connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()
    }

    this.ws.onclose = (event) => {
      console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`)
      this.setStatus('disconnected')
      this.stopHeartbeat()
      
      if (!event.wasClean) {
        this.attemptReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      this.setStatus('error')
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error)
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: any) {
    const messageType = data.type

    // Handle pong responses
    if (messageType === 'pong') {
      return
    }

    console.log(`📨 WebSocket message received: ${messageType}`, data)

    // Call registered handlers for this message type
    const handlers = this.messageHandlers.get(messageType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in message handler for ${messageType}:`, error)
        }
      })
    }

    // Call wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*')
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('Error in wildcard message handler:', error)
        }
      })
    }
  }

  /**
   * Send message to server
   */
  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data)
      this.ws.send(message)
      console.log(`📤 WebSocket message sent:`, data)
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent. ReadyState:', this.ws?.readyState, 'Data:', data)
    }
  }

  /**
   * Register message handler
   */
  on(messageType: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set())
    }
    this.messageHandlers.get(messageType)!.add(handler)
  }

  /**
   * Unregister message handler
   */
  off(messageType: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(messageType)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.messageHandlers.delete(messageType)
      }
    }
  }

  /**
   * Register connection status handler
   */
  onStatusChange(handler: (status: ConnectionStatus) => void) {
    this.connectionStatusHandlers.add(handler)
  }

  /**
   * Unregister connection status handler
   */
  offStatusChange(handler: (status: ConnectionStatus) => void) {
    this.connectionStatusHandlers.delete(handler)
  }

  /**
   * Set connection status
   */
  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.connectionStatusHandlers.forEach(handler => {
      try {
        handler(status)
      } catch (error) {
        console.error('Error in status change handler:', error)
      }
    })
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      this.send('ping')
    }, this.heartbeatInterval)
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      this.setStatus('error')
      return
    }

    if (this.reconnectTimer !== null) {
      return // Already attempting to reconnect
    }

    this.reconnectAttempts++
    this.setStatus('reconnecting')

    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (this.userInfo) {
        this.connect(this.userInfo)
      }
    }, delay)
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.stopHeartbeat()
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }

    this.setStatus('disconnected')
    this.userInfo = null
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Global WebSocket client instance
let wsClient: WebSocketClient | null = null

/**
 * Get or create WebSocket client
 */
export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient()
  }
  return wsClient
}

/**
 * React hook for WebSocket
 */
export function useWebSocket(userInfo?: { userId: string; role: string; examId?: string }) {
  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected')
  const client = React.useRef<WebSocketClient | null>(null)

  React.useEffect(() => {
    if (!userInfo) return

    client.current = getWebSocketClient()
    
    // Setup status change handler
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus)
    }
    
    client.current.onStatusChange(handleStatusChange)
    
    // Connect
    if (!client.current.isConnected()) {
      client.current.connect(userInfo)
    }

    // Cleanup
    return () => {
      if (client.current) {
        client.current.offStatusChange(handleStatusChange)
      }
    }
  }, [userInfo?.userId, userInfo?.role, userInfo?.examId])

  return {
    client: client.current,
    status,
    isConnected: status === 'connected',
    send: (data: any) => client.current?.send(data),
    on: (type: string, handler: MessageHandler) => client.current?.on(type, handler),
    off: (type: string, handler: MessageHandler) => client.current?.off(type, handler),
  }
}

// For non-React usage
import React from 'react'
export default getWebSocketClient
