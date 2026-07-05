/**
 * Enhanced API client with advanced features
 * - Automatic retries
 * - Request/response interceptors
 * - Better error handling
 * - Request cancellation
 * - Offline support
 */

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios'
import { useAuthStore } from '../store/globalStore'

// Use relative URL in production (same domain on Vercel), fallback to localhost in dev
const API_URL = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.DEV ? 'http://localhost:8000' : ''

// Create axios instance with enhanced configuration
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request queue for offline support
const requestQueue: Array<() => Promise<any>> = []
let isOnline = navigator.onLine

// Track pending requests for cancellation
const pendingRequests = new Map<string, CancelTokenSource>()

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token
    const token = useAuthStore.getState().token
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add request ID for tracking
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    config.headers['X-Request-ID'] = requestId

    // Add CSRF token if available
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='))
      ?.split('=')[1]
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken
    }

    // Handle cancellation
    const cancelSource = axios.CancelToken.source()
    config.cancelToken = cancelSource.token
    pendingRequests.set(requestId, cancelSource)

    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      requestId,
      params: config.params,
    })

    return config
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor with retry logic
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Remove from pending requests
    const requestId = response.config.headers?.['X-Request-ID'] as string
    if (requestId) {
      pendingRequests.delete(requestId)
    }

    console.log(`📥 API Response: ${response.status}`, {
      requestId,
      processTime: response.headers['x-process-time'],
    })

    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number }

    // Remove from pending requests
    const requestId = originalRequest?.headers?.['X-Request-ID'] as string
    if (requestId) {
      pendingRequests.delete(requestId)
    }

    // Handle 401 Unauthorized — defer to api.ts interceptor (same axios instance)
    // api_enhanced.ts uses the same `api` instance, so api.ts interceptor handles refresh
    if (error.response?.status === 401) {
      // Don't double-handle — api.ts interceptor manages token refresh and logout
      return Promise.reject(error)
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60
      console.warn(`⚠️ Rate limited. Retry after ${retryAfter}s`)
      
      // Show user-friendly message
      showErrorToast(`Too many requests. Please wait ${retryAfter} seconds.`)
      
      return Promise.reject(error)
    }

    // Retry logic for network errors and 5xx errors
    if (
      (!error.response || (error.response.status >= 500 && error.response.status < 600)) &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

      if (originalRequest._retryCount <= 3) {
        originalRequest._retry = true
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, originalRequest._retryCount - 1), 10000)
        console.log(`🔄 Retrying request (attempt ${originalRequest._retryCount}) after ${delay}ms`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return api(originalRequest)
      }
    }

    // Handle offline mode
    if (!navigator.onLine) {
      console.warn('📡 Offline - Request queued')
      queueRequest(() => api(originalRequest))
      showErrorToast('You are offline. Request will be sent when connection is restored.')
    }

    console.error('❌ API Error:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    })

    return Promise.reject(error)
  }
)

// Offline/online handlers
window.addEventListener('online', () => {
  console.log('📡 Back online - Processing queued requests')
  isOnline = true
  processQueue()
})

window.addEventListener('offline', () => {
  console.log('📡 Offline mode activated')
  isOnline = false
})

function queueRequest(request: () => Promise<any>) {
  requestQueue.push(request)
}

async function processQueue() {
  while (requestQueue.length > 0 && isOnline) {
    const request = requestQueue.shift()
    if (request) {
      try {
        await request()
      } catch (error) {
        console.error('Error processing queued request:', error)
      }
    }
  }
}

// Cancel all pending requests
export function cancelAllRequests() {
  pendingRequests.forEach((source, requestId) => {
    source.cancel(`Request ${requestId} cancelled`)
  })
  pendingRequests.clear()
}

// Helper function for error toasts
function showErrorToast(message: string) {
  // This will be implemented in your toast system
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, 'error')
  }
}

// Enhanced API Methods with TypeScript types
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
  
  updateProfile: async (data: any) => {
    const response = await api.patch('/api/auth/me', data)
    return response.data
  },
  
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post('/api/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
    return response.data
  },
}

export const examAPI = {
  getExams: async (filters?: { program?: string; type?: string; status?: string }) => {
    const response = await api.get('/api/exams', { params: filters })
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
  
  updateExam: async (examId: string, data: any) => {
    const response = await api.patch(`/api/exams/${examId}`, data)
    return response.data
  },
  
  deleteExam: async (examId: string) => {
    const response = await api.delete(`/api/exams/${examId}`)
    return response.data
  },
  
  submitExam: async (examId: string, data: any) => {
    const response = await api.post(`/api/exams/${examId}/submit`, data)
    return response.data
  },
  
  getExamAttempts: async (examId: string) => {
    const response = await api.get(`/api/exams/${examId}/attempts`)
    return response.data
  },
}

export const resultsAPI = {
  getResults: async (filters?: { examId?: string; studentId?: string }) => {
    const response = await api.get('/api/results', { params: filters })
    return response.data
  },
  
  getResult: async (submissionId: string) => {
    const response = await api.get(`/api/results/${submissionId}`)
    return response.data
  },
  
  getDetailedResult: async (submissionId: string) => {
    const response = await api.get(`/api/results/${submissionId}/detailed`)
    return response.data
  },
  
  exportResults: async (examId: string, format: 'pdf' | 'excel') => {
    const response = await api.get(`/api/results/export/${examId}`, {
      params: { format },
      responseType: 'blob',
    })
    return response.data
  },
}

export const proctoringAPI = {
  createFlag: async (data: any) => {
    const response = await api.post('/api/proctoring/flag', data)
    return response.data
  },
  
  getFlags: async (examId: string) => {
    const response = await api.get(`/api/proctoring/flags/${examId}`)
    return response.data
  },
  
  updateFlag: async (flagId: string, data: any) => {
    const response = await api.patch(`/api/proctoring/flags/${flagId}`, data)
    return response.data
  },
  
  getStudentFlags: async (studentId: string, examId: string) => {
    const response = await api.get(`/api/proctoring/flags`, {
      params: { student_id: studentId, exam_id: examId },
    })
    return response.data
  },
}

export const userAPI = {
  getUsers: async (filters?: { role?: string; program?: string }) => {
    const response = await api.get('/api/users', { params: filters })
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
  
  toggleUserStatus: async (userId: string, isActive: boolean) => {
    const response = await api.patch(`/api/users/${userId}/status`, { is_active: isActive })
    return response.data
  },
}

export const analyticsAPI = {
  getDashboard: async () => {
    const response = await api.get('/api/analytics/dashboard')
    return response.data
  },
  
  getExamAnalytics: async (examId: string) => {
    const response = await api.get(`/api/analytics/exams/${examId}`)
    return response.data
  },
  
  getStudentAnalytics: async (studentId: string) => {
    const response = await api.get(`/api/analytics/students/${studentId}`)
    return response.data
  },
  
  getPerformanceTrends: async (filters?: any) => {
    const response = await api.get('/api/analytics/trends', { params: filters })
    return response.data
  },
  
  getSystemStats: async () => {
    const response = await api.get('/api/system/stats')
    return response.data
  },
}

export const notificationAPI = {
  getNotifications: async (filters?: { unread?: boolean; limit?: number }) => {
    const response = await api.get('/api/notifications', { params: filters })
    return response.data
  },
  
  markAsRead: async (notificationId: string) => {
    const response = await api.patch(`/api/notifications/${notificationId}/read`)
    return response.data
  },
  
  markAllAsRead: async () => {
    const response = await api.post('/api/notifications/read-all')
    return response.data
  },
  
  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/api/notifications/${notificationId}`)
    return response.data
  },
}

export default api
