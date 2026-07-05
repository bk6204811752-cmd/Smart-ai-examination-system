/**
 * Real-Time Collaboration Engine
 * WebSocket-based real-time features for collaborative learning and live monitoring
 */

// @ts-ignore - socket.io-client will be installed
import { io, Socket } from 'socket.io-client'

export interface CollaborationUser {
  userId: string
  userName: string
  role: 'student' | 'teacher' | 'admin'
  avatar?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  currentActivity?: string
}

export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  type: 'text' | 'file' | 'code' | 'poll' | 'system'
  metadata?: Record<string, any>
  reactions?: Reaction[]
}

export interface Reaction {
  emoji: string
  userIds: string[]
  count: number
}

export interface StudyRoom {
  id: string
  name: string
  subject: string
  topic?: string
  participants: CollaborationUser[]
  maxParticipants: number
  isPrivate: boolean
  createdBy: string
  createdAt: Date
  settings: RoomSettings
}

export interface RoomSettings {
  allowChat: boolean
  allowScreenShare: boolean
  allowWhiteboard: boolean
  moderationRequired: boolean
  maxMessageLength: number
}

export interface LiveExamSession {
  examId: string
  examTitle: string
  students: LiveStudent[]
  teacher: CollaborationUser
  startTime: Date
  endTime: Date
  status: 'waiting' | 'active' | 'completed'
}

export interface LiveStudent {
  userId: string
  userName: string
  progress: number // 0-100
  currentQuestion: number
  violations: number
  status: 'active' | 'idle' | 'suspicious' | 'disconnected'
  lastActivity: Date
  cameraStatus: 'on' | 'off'
  micStatus: 'on' | 'off'
}

export interface WhiteboardAction {
  id: string
  userId: string
  type: 'draw' | 'erase' | 'text' | 'shape' | 'clear'
  data: any
  timestamp: Date
}

export interface CodeCollaboration {
  roomId: string
  language: string
  code: string
  cursor: { userId: string; line: number; column: number }[]
  version: number
}

export interface Poll {
  id: string
  roomId: string
  question: string
  options: PollOption[]
  createdBy: string
  createdAt: Date
  endsAt?: Date
  allowMultiple: boolean
  anonymous: boolean
}

export interface PollOption {
  id: string
  text: string
  votes: string[] // userIds
  count: number
}

class RealtimeCollaborationEngine {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private eventHandlers = new Map<string, Set<Function>>()
  
  /**
   * Connect to WebSocket server
   */
  connect(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts
      })
      
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected')
        this.reconnectAttempts = 0
        this.emit('connection_status', { connected: true })
        resolve()
      })
      
      this.socket.on('disconnect', (reason: string) => {
        console.log('❌ WebSocket disconnected:', reason)
        this.emit('connection_status', { connected: false, reason })
      })
      
      this.socket.on('connect_error', (error: Error) => {
        console.error('Connection error:', error)
        this.reconnectAttempts++
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect after multiple attempts'))
        }
      })
      
      this.socket.on('error', (error: Error) => {
        console.error('Socket error:', error)
        this.emit('error', error)
      })
      
      this.setupEventListeners()
    })
  }
  
  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
  
  /**
   * Setup internal event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return
    
    // Chat events
    this.socket.on('chat:message', (message: ChatMessage) => {
      this.emit('chat:message', message)
    })
    
    this.socket.on('chat:typing', (data: { roomId: string; userId: string; userName: string }) => {
      this.emit('chat:typing', data)
    })
    
    // Room events
    this.socket.on('room:user_joined', (data: { room: StudyRoom; user: CollaborationUser }) => {
      this.emit('room:user_joined', data)
    })
    
    this.socket.on('room:user_left', (data: { roomId: string; userId: string }) => {
      this.emit('room:user_left', data)
    })
    
    this.socket.on('room:updated', (room: StudyRoom) => {
      this.emit('room:updated', room)
    })
    
    // Exam monitoring events
    this.socket.on('exam:student_update', (student: LiveStudent) => {
      this.emit('exam:student_update', student)
    })
    
    this.socket.on('exam:violation', (data: { examId: string; studentId: string; violation: any }) => {
      this.emit('exam:violation', data)
    })
    
    this.socket.on('exam:alert', (alert: { type: string; message: string; severity: string }) => {
      this.emit('exam:alert', alert)
    })
    
    // Whiteboard events
    this.socket.on('whiteboard:action', (action: WhiteboardAction) => {
      this.emit('whiteboard:action', action)
    })
    
    // Code collaboration events
    this.socket.on('code:update', (data: CodeCollaboration) => {
      this.emit('code:update', data)
    })
    
    // Poll events
    this.socket.on('poll:created', (poll: Poll) => {
      this.emit('poll:created', poll)
    })
    
    this.socket.on('poll:voted', (data: { pollId: string; optionId: string; userId: string }) => {
      this.emit('poll:voted', data)
    })
    
    this.socket.on('poll:ended', (pollId: string) => {
      this.emit('poll:ended', pollId)
    })
    
    // Presence events
    this.socket.on('presence:update', (users: CollaborationUser[]) => {
      this.emit('presence:update', users)
    })
  }
  
  // ============================================================================
  // CHAT METHODS
  // ============================================================================
  
  /**
   * Join a chat room
   */
  joinRoom(roomId: string) {
    this.socket?.emit('room:join', { roomId })
  }
  
  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string) {
    this.socket?.emit('room:leave', { roomId })
  }
  
  /**
   * Send a chat message
   */
  sendMessage(roomId: string, message: string, type: string = 'text', metadata?: any) {
    this.socket?.emit('chat:send', {
      roomId,
      message,
      type,
      metadata
    })
  }
  
  /**
   * Send typing indicator
   */
  sendTyping(roomId: string, isTyping: boolean) {
    this.socket?.emit('chat:typing', { roomId, isTyping })
  }
  
  /**
   * Add reaction to message
   */
  addReaction(messageId: string, emoji: string) {
    this.socket?.emit('chat:react', { messageId, emoji })
  }
  
  /**
   * Delete message
   */
  deleteMessage(messageId: string) {
    this.socket?.emit('chat:delete', { messageId })
  }
  
  /**
   * Edit message
   */
  editMessage(messageId: string, newMessage: string) {
    this.socket?.emit('chat:edit', { messageId, newMessage })
  }
  
  // ============================================================================
  // STUDY ROOM METHODS
  // ============================================================================
  
  /**
   * Create a study room
   */
  createStudyRoom(room: Omit<StudyRoom, 'id' | 'participants' | 'createdAt'>) {
    this.socket?.emit('room:create', room)
  }
  
  /**
   * Get active study rooms
   */
  getStudyRooms(subject?: string) {
    this.socket?.emit('room:list', { subject })
  }
  
  /**
   * Update room settings
   */
  updateRoomSettings(roomId: string, settings: Partial<RoomSettings>) {
    this.socket?.emit('room:update_settings', { roomId, settings })
  }
  
  /**
   * Kick user from room
   */
  kickUser(roomId: string, userId: string) {
    this.socket?.emit('room:kick', { roomId, userId })
  }
  
  /**
   * Make user moderator
   */
  promoteToModerator(roomId: string, userId: string) {
    this.socket?.emit('room:promote', { roomId, userId })
  }
  
  // ============================================================================
  // EXAM MONITORING METHODS
  // ============================================================================
  
  /**
   * Start monitoring exam session
   */
  startExamMonitoring(examId: string) {
    this.socket?.emit('exam:monitor_start', { examId })
  }
  
  /**
   * Stop monitoring exam session
   */
  stopExamMonitoring(examId: string) {
    this.socket?.emit('exam:monitor_stop', { examId })
  }
  
  /**
   * Send student progress update
   */
  updateStudentProgress(examId: string, progress: Partial<LiveStudent>) {
    this.socket?.emit('exam:progress_update', { examId, progress })
  }
  
  /**
   * Report violation
   */
  reportViolation(examId: string, violation: any) {
    this.socket?.emit('exam:violation_report', { examId, violation })
  }
  
  /**
   * Send message to specific student
   */
  messageStudent(examId: string, studentId: string, message: string) {
    this.socket?.emit('exam:message_student', { examId, studentId, message })
  }
  
  /**
   * Pause student's exam
   */
  pauseStudentExam(examId: string, studentId: string, reason: string) {
    this.socket?.emit('exam:pause_student', { examId, studentId, reason })
  }
  
  /**
   * Resume student's exam
   */
  resumeStudentExam(examId: string, studentId: string) {
    this.socket?.emit('exam:resume_student', { examId, studentId })
  }
  
  // ============================================================================
  // WHITEBOARD METHODS
  // ============================================================================
  
  /**
   * Send whiteboard action
   */
  sendWhiteboardAction(roomId: string, action: Omit<WhiteboardAction, 'id' | 'timestamp'>) {
    this.socket?.emit('whiteboard:action', { roomId, action })
  }
  
  /**
   * Clear whiteboard
   */
  clearWhiteboard(roomId: string) {
    this.socket?.emit('whiteboard:clear', { roomId })
  }
  
  /**
   * Save whiteboard as image
   */
  saveWhiteboard(roomId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('whiteboard:save', { roomId }, (response: { success: boolean; url?: string; error?: string }) => {
        if (response.success && response.url) {
          resolve(response.url)
        } else {
          reject(new Error(response.error || 'Failed to save whiteboard'))
        }
      })
    })
  }
  
  // ============================================================================
  // CODE COLLABORATION METHODS
  // ============================================================================
  
  /**
   * Update code in collaborative editor
   */
  updateCode(roomId: string, code: string, cursorPosition: { line: number; column: number }) {
    this.socket?.emit('code:update', {
      roomId,
      code,
      cursor: cursorPosition
    })
  }
  
  /**
   * Run code remotely
   */
  runCode(roomId: string, language: string, code: string): Promise<{ output: string; error?: string }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('code:run', { roomId, language, code }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }
  
  // ============================================================================
  // POLL METHODS
  // ============================================================================
  
  /**
   * Create a poll
   */
  createPoll(poll: Omit<Poll, 'id' | 'createdAt'>) {
    this.socket?.emit('poll:create', poll)
  }
  
  /**
   * Vote on poll
   */
  votePoll(pollId: string, optionIds: string[]) {
    this.socket?.emit('poll:vote', { pollId, optionIds })
  }
  
  /**
   * End poll
   */
  endPoll(pollId: string) {
    this.socket?.emit('poll:end', { pollId })
  }
  
  /**
   * Get poll results
   */
  getPollResults(pollId: string): Promise<Poll> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('poll:results', { pollId }, (response: { success: boolean; poll?: Poll; error?: string }) => {
        if (response.success && response.poll) {
          resolve(response.poll)
        } else {
          reject(new Error(response.error || 'Failed to get poll results'))
        }
      })
    })
  }
  
  // ============================================================================
  // SCREEN SHARING METHODS
  // ============================================================================
  
  /**
   * Start screen sharing
   */
  async startScreenShare(roomId: string): Promise<MediaStream> {
    try {
      // @ts-ignore
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      })
      
      this.socket?.emit('screen:share_start', { roomId })
      
      // Stop sharing when user stops it
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare(roomId)
      })
      
      return stream
    } catch (error) {
      throw new Error('Failed to start screen sharing')
    }
  }
  
  /**
   * Stop screen sharing
   */
  stopScreenShare(roomId: string) {
    this.socket?.emit('screen:share_stop', { roomId })
  }
  
  // ============================================================================
  // PRESENCE METHODS
  // ============================================================================
  
  /**
   * Update user status
   */
  updateStatus(status: 'online' | 'away' | 'busy' | 'offline', activity?: string) {
    this.socket?.emit('presence:update', { status, activity })
  }
  
  /**
   * Get online users
   */
  getOnlineUsers(roomId?: string): Promise<CollaborationUser[]> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('presence:list', { roomId }, (response: { success: boolean; users?: CollaborationUser[]; error?: string }) => {
        if (response.success && response.users) {
          resolve(response.users)
        } else {
          reject(new Error(response.error || 'Failed to get online users'))
        }
      })
    })
  }
  
  // ============================================================================
  // EVENT HANDLING
  // ============================================================================
  
  /**
   * Register event handler
   */
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }
  
  /**
   * Unregister event handler
   */
  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }
  
  /**
   * Emit event to handlers
   */
  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }
  
  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }
  
  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id
  }
}

// Export singleton instance
export const collaborationEngine = new RealtimeCollaborationEngine()

// ============================================================================
// REACT HOOKS FOR EASY INTEGRATION
// ============================================================================

import { useEffect, useState, useCallback } from 'react'

/**
 * Hook for chat functionality
 */
export function useChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    collaborationEngine.joinRoom(roomId)
    
    const handleMessage = (message: ChatMessage) => {
      if (message.roomId === roomId) {
        setMessages(prev => [...prev, message])
      }
    }
    
    const handleTyping = (data: { roomId: string; userId: string; userName: string }) => {
      if (data.roomId === roomId) {
        setTypingUsers(prev => new Set(prev).add(data.userName))
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev)
            next.delete(data.userName)
            return next
          })
        }, 3000)
      }
    }
    
    collaborationEngine.on('chat:message', handleMessage)
    collaborationEngine.on('chat:typing', handleTyping)
    
    return () => {
      collaborationEngine.off('chat:message', handleMessage)
      collaborationEngine.off('chat:typing', handleTyping)
      collaborationEngine.leaveRoom(roomId)
    }
  }, [roomId])
  
  const sendMessage = useCallback((message: string) => {
    collaborationEngine.sendMessage(roomId, message)
  }, [roomId])
  
  const sendTyping = useCallback((isTyping: boolean) => {
    collaborationEngine.sendTyping(roomId, isTyping)
  }, [roomId])
  
  return { messages, typingUsers, sendMessage, sendTyping }
}

/**
 * Hook for exam monitoring
 */
export function useExamMonitoring(examId: string) {
  const [students, setStudents] = useState<LiveStudent[]>([])
  const [violations, setViolations] = useState<any[]>([])
  
  useEffect(() => {
    collaborationEngine.startExamMonitoring(examId)
    
    const handleStudentUpdate = (student: LiveStudent) => {
      setStudents(prev => {
        const index = prev.findIndex(s => s.userId === student.userId)
        if (index >= 0) {
          const next = [...prev]
          next[index] = student
          return next
        }
        return [...prev, student]
      })
    }
    
    const handleViolation = (data: any) => {
      if (data.examId === examId) {
        setViolations(prev => [...prev, data.violation])
      }
    }
    
    collaborationEngine.on('exam:student_update', handleStudentUpdate)
    collaborationEngine.on('exam:violation', handleViolation)
    
    return () => {
      collaborationEngine.off('exam:student_update', handleStudentUpdate)
      collaborationEngine.off('exam:violation', handleViolation)
      collaborationEngine.stopExamMonitoring(examId)
    }
  }, [examId])
  
  return { students, violations }
}

/**
 * Hook for online presence
 */
export function usePresence(roomId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<CollaborationUser[]>([])
  
  useEffect(() => {
    const handlePresenceUpdate = (users: CollaborationUser[]) => {
      setOnlineUsers(users)
    }
    
    collaborationEngine.on('presence:update', handlePresenceUpdate)
    collaborationEngine.getOnlineUsers(roomId).then(setOnlineUsers)
    
    return () => {
      collaborationEngine.off('presence:update', handlePresenceUpdate)
    }
  }, [roomId])
  
  const updateStatus = useCallback((status: 'online' | 'away' | 'busy' | 'offline', activity?: string) => {
    collaborationEngine.updateStatus(status, activity)
  }, [])
  
  return { onlineUsers, updateStatus }
}
