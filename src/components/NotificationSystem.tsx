import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react'

/* eslint-disable react-refresh/only-export-components */
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'violation'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationContextValue {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null)

export const useNotifications = () => {
  const context = React.useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      duration: notification.duration || 5000,
    }

    setNotifications(prev => [newNotification, ...prev])

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, newNotification.duration)
    }

    // Play sound for violations
    if (notification.type === 'violation') {
      playNotificationSound('violation')
    } else if (notification.type === 'error') {
      playNotificationSound('error')
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const playNotificationSound = (type: 'violation' | 'error' | 'success') => {
    try {
      const audio = new Audio()
      if (type === 'violation') {
        audio.src =
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZTR' // Truncated for brevity
      }
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore errors if autoplay blocked
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification, clearAll }}
    >
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  )
}

function NotificationContainer({
  notifications,
  onRemove,
}: {
  notifications: Notification[]
  onRemove: (id: string) => void
}) {
  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map(notification => (
        <NotificationCard key={notification.id} notification={notification} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  )
}

function NotificationCard({
  notification,
  onRemove,
}: {
  notification: Notification
  onRemove: (id: string) => void
}) {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(notification.id), 300)
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'violation':
        return <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'violation':
        return 'bg-red-100 border-red-300 shadow-lg shadow-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div
      className={`${getBgColor()} border rounded-lg p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
          <p className="text-xs text-gray-700 mt-1">{notification.message}</p>
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button onClick={handleRemove} className="text-gray-400 hover:text-gray-600 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Violation notification hook with auto-subscribe to WebSocket
export function useViolationNotifications(examId?: string) {
  const { addNotification } = useNotifications()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!examId) return

    // Connect to WebSocket for real-time violation updates
    const wsUrl = `ws://localhost:8000/ws/violations/${examId}`
    const ws = new WebSocket(wsUrl)

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'violation') {
          addNotification({
            type: 'violation',
            title: `Violation Detected - ${data.student_name}`,
            message: data.violation_message,
            duration: 10000, // 10 seconds for violations
            action: {
              label: 'View Details',
              onClick: () => {
                // Navigate to student details or open modal
                console.log('View violation details:', data)
              },
            },
          })
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = error => {
      console.error('WebSocket error:', error)
    }

    wsRef.current = ws

    return () => {
      ws.close()
    }
  }, [examId, addNotification])
}

// Export React for the context
import React from 'react'
