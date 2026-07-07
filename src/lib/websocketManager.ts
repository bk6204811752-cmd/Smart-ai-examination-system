/**
 * WebSocket Manager for Real-Time Features
 * Handles real-time notifications, live monitoring, and instant updates
 */

import { logger } from './logger'
import { toast } from 'sonner'

type MessageHandler = (data: any) => void

interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
}

class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private url: string
  private isIntentionallyClosed = false

  constructor(url: string = 'ws://localhost:8000/ws') {
    this.url = url
  }

  /**
   * Connect to WebSocket server
   */
  connect(token?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.debug('WebSocket already connected')
      return
    }

    this.isIntentionallyClosed = false
    
    try {
      const wsUrl = token ? `${this.url}?token=${token}` : this.url
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)

      logger.info('WebSocket connecting...', { url: this.url })
    } catch (error) {
      logger.error('WebSocket connection failed', error)
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.isIntentionallyClosed = true
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    logger.info('WebSocket disconnected')
  }

  /**
   * Send message to server
   */
  send(type: string, payload: any) {
    if (!this.isConnected()) {
      logger.warn('Cannot send message - WebSocket not connected')
      return false
    }

    try {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: Date.now()
      }

      this.ws!.send(JSON.stringify(message))
      logger.debug('WebSocket message sent', { type, payload })
      return true
    } catch (error) {
      logger.error('Failed to send WebSocket message', error)
      return false
    }
  }

  /**
   * Subscribe to message type
   */
  subscribe(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    
    this.messageHandlers.get(type)!.add(handler)
    
    logger.debug('Subscribed to WebSocket messages', { type })
    
    // Return unsubscribe function
    return () => this.unsubscribe(type, handler)
  }

  /**
   * Unsubscribe from message type
   */
  unsubscribe(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.delete(handler)
      
      if (handlers.size === 0) {
        this.messageHandlers.delete(type)
      }
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Handle connection open
   */
  private handleOpen() {
    logger.info('WebSocket connected')
    this.reconnectAttempts = 0
    this.startHeartbeat()
    
    toast.success('Real-time connection established')
    
    // Notify subscribers
    this.notifyHandlers('connection', { status: 'connected' })
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      
      logger.debug('WebSocket message received', { type: message.type })
      
      // Notify subscribed handlers
      this.notifyHandlers(message.type, message.payload)
      
      // Handle specific message types
      this.handleSpecialMessages(message)
    } catch (error) {
      logger.error('Failed to parse WebSocket message', error)
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event) {
    logger.error('WebSocket error', event)
  }

  /**
   * Handle connection close
   */
  private handleClose(event: CloseEvent) {
    logger.warn('WebSocket closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    })
    
    this.stopHeartbeat()
    
    if (!this.isIntentionallyClosed) {
      toast.error('Connection lost. Reconnecting...')
      this.scheduleReconnect()
    }
    
    // Notify subscribers
    this.notifyHandlers('connection', { status: 'disconnected' })
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached')
      toast.error('Unable to establish connection. Please refresh the page.')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() })
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Notify all handlers for a message type
   */
  private notifyHandlers(type: string, payload: any) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          logger.error('Message handler error', { type, error })
        }
      })
    }
  }

  /**
   * Handle special system messages
   */
  private handleSpecialMessages(message: WebSocketMessage) {
    switch (message.type) {
      case 'notification':
        toast.info(message.payload.message, {
          description: message.payload.description
        })
        break
        
      case 'violation_alert':
        toast.warning('Proctoring Alert', {
          description: message.payload.message
        })
        break
        
      case 'exam_ended':
        toast.error('Exam Ended', {
          description: message.payload.reason
        })
        break
        
      case 'pong':
        logger.debug('Heartbeat response received')
        break
    }
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager()

// Expose in development
if (import.meta.env.DEV) {
  (window as any).wsManager = wsManager
}

/**
 * React hook for WebSocket subscriptions
 */
import { useEffect } from 'react'

export function useWebSocket(type: string, handler: MessageHandler, deps: any[] = []) {
  useEffect(() => {
    const unsubscribe = wsManager.subscribe(type, handler)
    return unsubscribe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ...deps])
}

export default wsManager
