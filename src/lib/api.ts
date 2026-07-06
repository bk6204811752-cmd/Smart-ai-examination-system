import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '../store/globalStore'
import { logger } from './logger'
import { toast } from 'sonner'

// Use relative URL in production (same domain on Vercel), fallback to localhost in dev
const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.DEV ? 'http://localhost:8000' : '')

// Offline request queue
interface QueuedRequest {
  config: InternalAxiosRequestConfig
  resolve: (value: any) => void
  reject: (error: any) => void
}

const requestQueue: QueuedRequest[] = []
let isOnline = navigator.onLine

// Monitor online/offline status
window.addEventListener('online', () => {
  isOnline = true
  logger.info('Network connection restored')
  processQueue()
})

window.addEventListener('offline', () => {
  isOnline = false
  logger.warn('Network connection lost')
})

const processQueue = async () => {
  while (requestQueue.length > 0 && isOnline) {
    const { config, resolve, reject } = requestQueue.shift()!
    try {
      const response = await axios.request(config)
      resolve(response)
    } catch (error) {
      reject(error)
    }
  }
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
})

// Request interceptor with auth token and logging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Disabled: API request logging (too verbose)
    // Uncomment only when debugging API issues
    // if (import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true') {
    //   logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    //     params: config.params,
    //     data: config.data
    //   })
    // }
    
    return config
  },
  (error: AxiosError) => {
    logger.error('Request interceptor error', error)
    return Promise.reject(error)
  }
)

// ── Token Refresh State ──────────────────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

const processFailedQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

// Response interceptor with comprehensive error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number }

    // Network error - queue request if offline
    if (!error.response && !isOnline) {
      logger.warn('Request queued due to offline status', { url: originalRequest?.url })
      return new Promise((resolve, reject) => {
        if (originalRequest) {
          requestQueue.push({ config: originalRequest, resolve, reject })
        }
      })
    }

    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data as any

      // ── 401 Unauthorized: Try token refresh first ─────────────────────────
      if (status === 401) {
        const currentToken = useAuthStore.getState().token
        const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/')

        // Skip refresh for auth endpoints (wrong password etc) or if no token
        if (!currentToken || isAuthEndpoint || originalRequest._retry) {
          return Promise.reject(error)
        }

        // If already refreshing, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`
                resolve(api(originalRequest))
              },
              reject
            })
          })
        }

        // Mark as refreshing
        originalRequest._retry = true
        isRefreshing = true

        try {
          // Attempt token refresh
          const refreshRes = await axios.post(
            `${API_URL}/api/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${currentToken}` }, timeout: 10000 }
          )
          const newToken: string = refreshRes.data.access_token

          // Update token in store (keep existing user data)
          useAuthStore.getState().setToken(newToken)

          // Update default header + retry queued requests
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`
          processFailedQueue(null, newToken)

          logger.info('Token refreshed successfully')
          return api(originalRequest)

        } catch (refreshError) {
          // Refresh failed → logout
          processFailedQueue(refreshError, null)
          logger.warn('Token refresh failed — logging out')
          useAuthStore.getState().logout()
          toast.error('Session expired. Please login again.')
          setTimeout(() => { window.location.href = '/login' }, 1500)
          return Promise.reject(refreshError)

        } finally {
          isRefreshing = false
        }
      }

      // ── Other errors ──────────────────────────────────────────────────────
      switch (status) {
        case 403:
          logger.error('Access forbidden', { url: originalRequest?.url })
          toast.error('You do not have permission to access this resource')
          break
          
        case 404:
          // Not found
          logger.error('Resource not found', { url: originalRequest?.url })
          toast.error('Requested resource not found')
          break
          
        case 429:
          // Rate limited - retry after delay
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10)
          logger.warn(`Rate limited - retry after ${retryAfter}s`)
          toast.warning(`Too many requests. Please wait ${retryAfter} seconds.`)
          
          if (originalRequest && !originalRequest._retry) {
            originalRequest._retry = true
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
            return api.request(originalRequest)
          }
          break
          
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors - retry with exponential backoff
          const maxRetries = 3
          originalRequest._retryCount = originalRequest._retryCount || 0
          
          if (originalRequest._retryCount < maxRetries) {
            originalRequest._retryCount++
            const delay = Math.min(1000 * Math.pow(2, originalRequest._retryCount), 10000)
            
            logger.warn(`Server error ${status} - retrying (${originalRequest._retryCount}/${maxRetries})`, {
              url: originalRequest?.url,
              delay
            })
            
            await new Promise(resolve => setTimeout(resolve, delay))
            return api.request(originalRequest)
          } else {
            logger.error('Server error - max retries exceeded', { status, url: originalRequest?.url })
            toast.error('Server is experiencing issues. Please try again later.')
          }
          break
          
        default:
          // Generic error
          logger.error(`API Error ${status}`, {
            url: originalRequest?.url,
            message: errorData?.message || error.message
          })
          toast.error(errorData?.message || 'An unexpected error occurred')
      }
    } else if (error.request) {
      // Request made but no response
      logger.error('No response from server', { url: originalRequest?.url })
      toast.error('Unable to connect to server. Please check your internet connection.')
    } else {
      // Error setting up request
      logger.error('Request setup error', error)
      toast.error('An error occurred while making the request')
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  },
  register: async (data: any) => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me')
    return response.data
  },
}

// Exam API
export const examAPI = {
  getExams: async (program?: string) => {
    const response = await api.get('/api/exams', { params: { program } })
    return response.data
  },
  getExam: async (examId: string) => {
    const response = await api.get(`/api/exams/${examId}`)
    return response.data
  },
  createExam: async (data: any) => {
    const response = await api.post('/api/exams', data)
    return response.data
  },
  submitExam: async (examId: string, data: any) => {
    const response = await api.post(`/api/exams/${examId}/submit`, data)
    return response.data
  },
}

// Results API
export const resultsAPI = {
  getResults: async () => {
    const response = await api.get('/api/results')
    return response.data
  },
  getResult: async (submissionId: string) => {
    const response = await api.get(`/api/results/${submissionId}`)
    return response.data
  },
}

// User API
export const userAPI = {
  getUsers: async (role?: string) => {
    const response = await api.get('/api/users', { params: { role } })
    return response.data
  },
  getPendingUsers: async () => {
    const response = await api.get('/api/users/pending')
    return response.data
  },
  approveUser: async (userId: string) => {
    const response = await api.post(`/api/users/${userId}/approve`)
    return response.data
  },
  rejectUser: async (userId: string, reason?: string) => {
    const response = await api.post(`/api/users/${userId}/reject`, null, { params: { reason } })
    return response.data
  },
  createUser: async (data: any) => {
    const response = await api.post('/api/users', data)
    return response.data
  },
  updateUser: async (userId: string, data: any) => {
    const response = await api.patch(`/api/users/${userId}`, data)
    return response.data
  },
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/api/users/${userId}`)
    return response.data
  },
  suspendUser: async (userId: string) => {
    const response = await api.post(`/api/users/${userId}/suspend`)
    return response.data
  },
  activateUser: async (userId: string) => {
    const response = await api.post(`/api/users/${userId}/activate`)
    return response.data
  },
  getLiveUsers: async () => {
    // Simulated live users - in production, this would be WebSocket or polling
    const users = await api.get('/api/users')
    return users.data.map((user: any) => ({
      ...user,
      status: user.is_active ? 'active' : 'inactive',
      lastActive: user.last_login || 'Never',
    }))
  },
}

// Communication API
export const communicationAPI = {
  sendEmailBroadcast: async (data: { subject: string; message: string; recipients: string[] }) => {
    const response = await api.post('/api/communication/email-broadcast', data)
    return response.data
  },
  sendPushNotification: async (data: { title: string; message: string; recipients: string[] }) => {
    const response = await api.post('/api/communication/push-notification', data)
    return response.data
  },
  sendSystemAlert: async (data: { message: string; severity: string; recipients: string[] }) => {
    const response = await api.post('/api/communication/system-alert', data)
    return response.data
  },
}

// Proctoring API
export const proctoringAPI = {
  createFlag: async (data: any) => {
    const response = await api.post('/api/proctoring/flag', data)
    return response.data
  },
  getFlags: async (examId: string) => {
    const response = await api.get(`/api/proctoring/flags/${examId}`)
    return response.data
  },
}

// Session API
export const sessionAPI = {
  startSession: async (examId: string, data: any) => {
    const response = await api.post('/api/sessions/start', {
      exam_id: examId,
      ...data
    })
    return response.data
  },
  getSessions: async (examId: string) => {
    const response = await api.get(`/api/sessions/${examId}`)
    return response.data
  },
  updateSession: async (examId: string, data: any) => {
    const response = await api.patch(`/api/sessions/${examId}/update`, data)
    return response.data
  },
}

// Notifications API
export const notificationsAPI = {
  getNotifications: async (unreadOnly: boolean = false, limit: number = 50) => {
    const response = await api.get('/api/notifications', { 
      params: { unread_only: unreadOnly, limit } 
    })
    return response.data
  },
  sendNotification: async (data: {
    user_ids: string[]
    title: string
    message: string
    type?: string
    action_url?: string
    priority?: string
    channels?: string[]
  }) => {
    const response = await api.post('/api/notifications/send', data)
    return response.data
  },
  markAsRead: async (notificationIds: string[]) => {
    const response = await api.patch('/api/notifications/read', notificationIds)
    return response.data
  },
  markAllAsRead: async () => {
    const response = await api.patch('/api/notifications/read-all')
    return response.data
  },
  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/api/notifications/${notificationId}`)
    return response.data
  },
  getStats: async () => {
    const response = await api.get('/api/notifications/stats')
    return response.data
  },
}

// Webhooks API
export const webhooksAPI = {
  getWebhooks: async (activeOnly: boolean = false) => {
    const response = await api.get('/api/webhooks', { params: { active_only: activeOnly } })
    return response.data
  },
  registerWebhook: async (data: {
    name: string
    url: string
    events: string[]
    secret: string
    active?: boolean
  }) => {
    const response = await api.post('/api/webhooks', data)
    return response.data
  },
  updateWebhook: async (webhookId: string, updates: any) => {
    const response = await api.patch(`/api/webhooks/${webhookId}`, updates)
    return response.data
  },
  deleteWebhook: async (webhookId: string) => {
    const response = await api.delete(`/api/webhooks/${webhookId}`)
    return response.data
  },
  getWebhookLogs: async (webhookId: string, limit: number = 50) => {
    const response = await api.get(`/api/webhooks/${webhookId}/logs`, { params: { limit } })
    return response.data
  },
  testWebhook: async (webhookId: string) => {
    const response = await api.post(`/api/webhooks/${webhookId}/test`)
    return response.data
  },
}

// Enhanced Analytics API
export const analyticsAPI = {
  getDashboardAnalytics: async () => {
    const response = await api.get('/api/analytics/dashboard')
    return response.data
  },
  getExamAnalytics: async (examId: string) => {
    const response = await api.get(`/api/analytics/exam/${examId}`)
    return response.data
  },
  getStudentHistory: async (studentId: string, days: number = 90) => {
    const response = await api.get(`/api/analytics/student/${studentId}/history`, {
      params: { days }
    })
    return response.data
  },
  getComparativeAnalytics: async (studentId: string) => {
    const response = await api.get(`/api/analytics/student/${studentId}/comparative`)
    return response.data
  },
  getSystemHealth: async () => {
    const response = await api.get('/api/analytics/system/health')
    return response.data
  },
  generateReport: async (data: {
    start_date: string
    end_date: string
    type?: string
  }) => {
    const response = await api.post('/api/analytics/report', data)
    return response.data
  },
  getAnalyticsTrend: async (period: string = '7d') => {
    // Simulated analytics trend data
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const data = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: Math.floor(Math.random() * 50) + 100,
        exams: Math.floor(Math.random() * 20) + 10,
        violations: Math.floor(Math.random() * 5) + 1
      })
    }
    return data
  },
  getSecurityAlerts: async () => {
    // Simulated security alerts - in production, from security monitoring system
    return [
      { type: 'warning', message: '3 failed login attempts from IP 192.168.1.45', severity: 'medium', time: '10 min ago' },
      { type: 'info', message: 'SSL certificate expires in 30 days', severity: 'low', time: '1 hour ago' },
      { type: 'warning', message: 'Unusual traffic detected from unknown region', severity: 'high', time: '25 min ago' }
    ]
  },
  getRecentActivity: async () => {
    // Simulated recent activity
    return [
      { action: 'New user registered', user: 'john.doe@pcmt.edu', time: '2 min ago', type: 'user' },
      { action: 'Exam completed', user: 'AI-101 Final', time: '5 min ago', type: 'exam' },
      { action: 'Violation detected', user: 'jane.smith@pcmt.edu', time: '12 min ago', type: 'alert' },
      { action: 'New exam created', user: 'Prof. Kumar', time: '18 min ago', type: 'exam' },
      { action: 'System backup completed', user: 'System', time: '30 min ago', type: 'system' }
    ]
  },
}
