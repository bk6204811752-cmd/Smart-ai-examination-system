/**
 * Enhanced WebSocket Client with Reliability Features
 * Auto-reconnection, heartbeat, message queueing
 */

import { logger } from './logger'

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

interface QueuedMessage {
  message: WebSocketMessage
  timestamp: number
  attempts: number
}

export class ReliableWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 10
  private reconnectDelay: number = 1000
  private heartbeatInterval: number = 30000
  private heartbeatTimer: number | null = null
  private messageQueue: QueuedMessage[] = []
  private messageHandlers = new Map<string, Function[]>()
  private onConnectCallback: (() => void) | null = null
  private onDisconnectCallback: (() => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null
  
  constructor(url: string) {
    this.url = url
  }
  
  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = () => {
          logger.info('WebSocket connected', { url: this.url })
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.processQueue()
          
          if (this.onConnectCallback) {
            this.onConnectCallback()
          }
          
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            logger.error('Failed to parse WebSocket message', { error, data: event.data })
          }
        }
        
        this.ws.onclose = (event) => {
          logger.warn('WebSocket closed', { code: event.code, reason: event.reason })
          this.stopHeartbeat()
          
          if (this.onDisconnectCallback) {
            this.onDisconnectCallback()
          }
          
          // Auto-reconnect if not a normal closure
          if (event.code !== 1000) {
            this.reconnect()
          }
        }
        
        this.ws.onerror = (error) => {
          logger.error('WebSocket error', { error })
          
          if (this.onErrorCallback) {
            this.onErrorCallback(error)
          }
          
          reject(error)
        }
        
      } catch (error) {
        logger.error('Failed to create WebSocket', { error })
        reject(error)
      }
    })
  }
  
  /**
   * Send message with queuing for reliability
   */
  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
        logger.debug('WebSocket message sent', { type: message.type })
      } catch (error) {
        logger.error('Failed to send WebSocket message', { error, message })
        this.queueMessage(message)
      }
    } else {
      logger.warn('WebSocket not connected, queueing message', { type: message.type })
      this.queueMessage(message)
    }
  }
  
  /**
   * Queue message for later delivery
   */
  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push({
      message,
      timestamp: Date.now(),
      attempts: 0
    })
    
    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift()
      logger.warn('Message queue full, dropping oldest message')
    }
  }
  
  /**
   * Process queued messages
   */
  private processQueue(): void {
    const toSend = [...this.messageQueue]
    this.messageQueue = []
    
    toSend.forEach(({ message, attempts }) => {
      if (attempts < 3) {
        this.send(message)
      } else {
        logger.error('Message dropped after 3 attempts', { message })
      }
    })
  }
  
  /**
   * Register message handler
   */
  on(messageType: string, handler: Function): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, [])
    }
    this.messageHandlers.get(messageType)!.push(handler)
  }
  
  /**
   * Unregister message handler
   */
  off(messageType: string, handler: Function): void {
    const handlers = this.messageHandlers.get(messageType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }
  
  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Handle heartbeat response
    if (message.type === 'pong') {
      logger.debug('Heartbeat acknowledged')
      return
    }
    
    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          logger.error('Message handler error', { error, messageType: message.type })
        }
      })
    } else {
      logger.debug('No handler for message type', { type: message.type })
    }
  }
  
  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() })
      }
    }, this.heartbeatInterval)
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  /**
   * Reconnect with exponential backoff
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached')
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )
    
    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    
    try {
      await this.connect()
    } catch (error) {
      logger.error('Reconnection failed', { error })
      this.reconnect()
    }
  }
  
  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    logger.info('WebSocket disconnected')
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
  
  /**
   * Set callbacks
   */
  onConnect(callback: () => void): void {
    this.onConnectCallback = callback
  }
  
  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback
  }
  
  onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback
  }
}

export default ReliableWebSocket
