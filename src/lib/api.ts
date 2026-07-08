import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '../store/globalStore'
import { logger } from './logger'
import { toast } from 'sonner'

// Backend URL resolution:
//   1. VITE_API_URL env var (set in Vercel Dashboard → points to Render)
//   2. Development → http://localhost:8000 (local FastAPI server)
//   3. Production fallback → hardcoded Render URL (never empty string!)
const RENDER_BACKEND = 'https://pcmt-ai-exam-backend.onrender.com'
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  ((import.meta as any).env?.DEV ? 'http://localhost:8000' : RENDER_BACKEND)

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
  async (config: InternalAxiosRequestConfig) => {
    // Use backend JWT from localStorage (set on login)
    // Also check Zustand store as fallback
    const token = localStorage.getItem('token') || useAuthStore.getState().token
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: AxiosError) => {
    logger.error('Request interceptor error', error)
    return Promise.reject(error)
  }
)

// Response interceptor with comprehensive error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
      _retryCount?: number
    }

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

      // ── 401 Unauthorized: Session is invalid or expired ─────────────────────────
      if (status === 401) {
        // Only skip logout for public auth endpoints (login, register, forgot-password etc)
        const publicAuthEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/forgot-password', '/api/auth/reset-password']
        const isPublicAuthEndpoint = publicAuthEndpoints.some(ep => originalRequest?.url?.includes(ep))

        if (isPublicAuthEndpoint) {
          return Promise.reject(error)
        }

        logger.warn('Token invalid or expired — logging out')
        localStorage.removeItem('token')
        useAuthStore.getState().logout()
        toast.error('Session expired. Please login again.')
        setTimeout(() => {
          window.location.href = '/login'
        }, 1500)
        return Promise.reject(error)
      }

      // ── Other errors ──────────────────────────────────────────────────────
      switch (status) {
        case 403:
          if (originalRequest?.url?.includes('/api/auth/')) {
            logger.warn('Auth request forbidden', { url: originalRequest?.url })
            break
          }
          logger.error('Access forbidden', { url: originalRequest?.url })
          toast.error('You do not have permission to access this resource')
          break

        case 404:
          // Not found - only log, don't show toast (too noisy for dashboard API calls)
          logger.error('Resource not found', { url: originalRequest?.url })
          break

        case 429: {
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
        }

        case 500:
        case 502:
        case 503:
        case 504: {
          // Server errors - retry once with short delay (max 1 retry, 2s cap)
          const maxRetries = 1
          originalRequest._retryCount = originalRequest._retryCount || 0

          if (originalRequest._retryCount < maxRetries) {
            originalRequest._retryCount++
            const delay = Math.min(1000 * originalRequest._retryCount, 2000)

            logger.warn(
              `Server error ${status} - retrying (${originalRequest._retryCount}/${maxRetries})`,
              {
                url: originalRequest?.url,
                delay,
              }
            )

            await new Promise(resolve => setTimeout(resolve, delay))
            return api.request(originalRequest)
          } else {
            logger.error('Server error - max retries exceeded', {
              status,
              url: originalRequest?.url,
            })
            // Don't show toast for analytics/dashboard calls to avoid notification spam
            if (
              !originalRequest?.url?.includes('/analytics/') &&
              !originalRequest?.url?.includes('/security/')
            ) {
              toast.error('Server is experiencing issues. Please try again later.')
            }
          }
          break
        }

        default:
          // Generic error
          logger.error(`API Error ${status}`, {
            url: originalRequest?.url,
            message: errorData?.message || error.message,
          })
          toast.error(errorData?.message || 'An unexpected error occurred')
      }
    } else if (error.request) {
      // Request made but no response (network error / server down)
      const isDev = import.meta.env.DEV
      if (isDev) {
        toast.error('Cannot connect to server. Please ensure the backend is running.')
      } else {
        toast.error('Server is starting up — please wait 30 seconds and try again.', {
          duration: 6000,
        })
      }
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
  sendOTP: async (email: string) => {
    const response = await api.post('/api/auth/send-otp', { email })
    return response.data
  },
  verifyOTP: async (email: string, otp: string) => {
    const response = await api.post('/api/auth/verify-otp', { email, otp })
    return response.data
  },
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me')
    return response.data
  },
  forgotPassword: async (email: string) => {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  },
  resetPassword: async (email: string, otp: string, new_password: string) => {
    const response = await api.post('/api/auth/reset-password', { email, otp, new_password })
    return response.data
  },
  changePassword: async (current_password: string, new_password: string) => {
    const response = await api.post('/api/auth/change-password', { current_password, new_password })
    return response.data
  },
}

// Exam API
export const examAPI = {
  getExams: async (
    program?: string,
    page: number = 1,
    pageSize: number = 20,
    sortBy?: string,
    sortOrder?: number
  ) => {
    const response = await api.get('/api/exams', {
      params: { program, page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder },
    })
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
  updateExam: async (examId: string, data: any) => {
    const response = await api.patch(`/api/exams/${examId}`, data)
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
  getExamResults: async (examId: string) => {
    const response = await api.get(`/api/results/export/${examId}`)
    return response.data
  },
  getDetailedResult: async (submissionId: string) => {
    const response = await api.get(`/api/results/${submissionId}/detailed`)
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
      ...data,
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
  getSessionReplay: async (sessionId: string) => {
    const response = await api.get(`/api/sessions/replay/${sessionId}`)
    return response.data
  },
}

// Notifications API
export const notificationsAPI = {
  getNotifications: async (unreadOnly: boolean = false, limit: number = 50) => {
    const response = await api.get('/api/notifications', {
      params: { unread_only: unreadOnly, limit },
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
      params: { days },
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
  generateReport: async (data: { start_date: string; end_date: string; type?: string }) => {
    const response = await api.post('/api/analytics/report', data)
    return response.data
  },
  getAnalyticsTrend: async (period: string = '7d') => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const response = await api.get('/api/analytics/trends', { params: { days } })
    return response.data
  },
  getSecurityAlerts: async () => {
    const response = await api.get('/api/security/events', {
      params: { per_page: 10, resolved: false },
    })
    const events = response.data.events || []
    return events.map((ev: any) => ({
      type: ev.severity === 'critical' || ev.severity === 'high' ? 'warning' : 'info',
      message: ev.description,
      severity: ev.severity,
      time: ev.timestamp || 'recently',
    }))
  },
  getCalibrationData: async (examId: string) => {
    const response = await api.get(`/api/analytics/calibrate/${examId}`)
    return response.data
  },
  getRecentActivity: async () => {
    const response = await api.get('/api/analytics/recent-activity')
    return response.data
  },
  getTeacherAnalytics: async () => {
    const response = await api.get('/api/analytics/teacher')
    return response.data
  },
  getAdvancedAnalytics: async () => {
    const response = await api.get('/api/analytics/advanced')
    return response.data
  },
}

export const plagiarismAPI = {
  checkText: async (data: {
    text: string
    content_type?: string
    language?: string
    student_name?: string
    student_id?: string
  }) => {
    const response = await api.post('/api/plagiarism/check', data)
    return response.data
  },
  submitForComparison: async (data: {
    text: string
    content_type?: string
    language?: string
    student_name?: string
    student_id?: string
  }) => {
    const response = await api.post('/api/plagiarism/submit', data)
    return response.data
  },
  getResults: async (params?: { status?: string; limit?: number }) => {
    const response = await api.get('/api/plagiarism/results', { params })
    return response.data
  },
  getResult: async (resultId: string) => {
    const response = await api.get(`/api/plagiarism/results/${resultId}`)
    return response.data
  },
  getStats: async () => {
    const response = await api.get('/api/plagiarism/stats')
    return response.data
  },
  deleteResult: async (resultId: string) => {
    const response = await api.delete(`/api/plagiarism/results/${resultId}`)
    return response.data
  },
}

export const templateAPI = {
  getTemplates: async () => {
    const response = await api.get('/api/templates')
    return response.data
  },
  getTemplate: async (templateId: string) => {
    const response = await api.get(`/api/templates/${templateId}`)
    return response.data
  },
  createTemplate: async (data: any) => {
    const response = await api.post('/api/templates', data)
    return response.data
  },
  updateTemplate: async (templateId: string, data: any) => {
    const response = await api.put(`/api/templates/${templateId}`, data)
    return response.data
  },
  deleteTemplate: async (templateId: string) => {
    const response = await api.delete(`/api/templates/${templateId}`)
    return response.data
  },
  duplicateTemplate: async (templateId: string) => {
    const response = await api.post(`/api/templates/${templateId}/duplicate`)
    return response.data
  },
}

export const questionBankAPI = {
  getQuestions: async (params?: {
    subject?: string
    difficulty?: string
    type?: string
    search?: string
    tag?: string
    sort_by?: string
  }) => {
    const response = await api.get('/api/questions', { params })
    return response.data
  },
  getStats: async () => {
    const response = await api.get('/api/questions/stats')
    return response.data
  },
  getSubjects: async () => {
    const response = await api.get('/api/questions/subjects')
    return response.data
  },
  getTags: async () => {
    const response = await api.get('/api/questions/tags')
    return response.data
  },
  getQuestion: async (questionId: string) => {
    const response = await api.get(`/api/questions/${questionId}`)
    return response.data
  },
  createQuestion: async (data: any) => {
    const response = await api.post('/api/questions', data)
    return response.data
  },
  updateQuestion: async (questionId: string, data: any) => {
    const response = await api.put(`/api/questions/${questionId}`, data)
    return response.data
  },
  deleteQuestion: async (questionId: string) => {
    const response = await api.delete(`/api/questions/${questionId}`)
    return response.data
  },
  duplicateQuestion: async (questionId: string) => {
    const response = await api.post(`/api/questions/${questionId}/duplicate`)
    return response.data
  },
}

export const securityAPI = {
  getOverview: async () => {
    const response = await api.get('/api/security/overview')
    return response.data
  },
  getLogs: async (params: {
    page?: number
    per_page?: number
    status?: string
    search?: string
    time_range?: string
  }) => {
    const response = await api.get('/api/security/logs', { params })
    return response.data
  },
  getEvents: async (params: {
    page?: number
    per_page?: number
    severity?: string
    resolved?: boolean
  }) => {
    const response = await api.get('/api/security/events', { params })
    return response.data
  },
  getBlockedIPs: async () => {
    const response = await api.get('/api/security/blocked-ips')
    return response.data
  },
  blockIP: async (data: { ip: string; reason: string }) => {
    const response = await api.post('/api/security/block-ip', data)
    return response.data
  },
  unblockIP: async (data: { ip: string }) => {
    const response = await api.post('/api/security/unblock-ip', data)
    return response.data
  },
  logEvent: async (data: {
    type: string
    severity?: string
    description: string
    user_id?: string
    user_name?: string
    ip_address?: string
    metadata?: Record<string, any>
  }) => {
    const response = await api.post('/api/security/log-event', data)
    return response.data
  },
}
