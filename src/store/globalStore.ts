/**
 * Advanced Global State Management
 * Centralized store with persistence, undo/redo, and real-time sync
 */

import { create } from 'zustand'
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  _id: string
  email: string
  full_name: string
  role: 'student' | 'teacher' | 'admin'
  program?: string
  semester?: number
  department?: string
  cgpa?: number
  avatar?: string
  preferences?: UserPreferences
  statistics?: UserStatistics
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  language: 'en' | 'hi' | 'es' | 'fr'
  notifications: NotificationPreferences
  accessibility: AccessibilityPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  examReminders: boolean
  resultNotifications: boolean
  systemUpdates: boolean
}

export interface AccessibilityPreferences {
  highContrast: boolean
  largeText: boolean
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  screenReader: boolean
  keyboardOnly: boolean
}

export interface UserStatistics {
  totalExamsTaken: number
  averageScore: number
  studyHours: number
  rank: number
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: Date
  progress: number // 0-100
}

export interface Exam {
  _id: string
  title: string
  subject: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  duration: number
  total_questions: number
  exam_type: string
  scheduled_time?: Date
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_by: string
  proctoring_level: string
}

export interface ExamResult {
  _id: string
  exam_id: string
  exam_title: string
  student_id: string
  score: number
  total_questions: number
  percentage: number
  date: Date
  time_taken: number
  proctoring_violations: number
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

export interface AppSettings {
  apiUrl: string
  wsUrl: string
  maxFileSize: number
  allowedFileTypes: string[]
  sessionTimeout: number // minutes
  autoSaveInterval: number // seconds
}

export interface UIState {
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  modalStack: string[]
  loadingStates: Record<string, boolean>
  toasts: Toast[]
  activeExamId?: string
}

export interface Toast {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  duration: number
}

// ============================================================================
// AUTH STORE
// ============================================================================

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  setUser: (user: User) => void // compatibility alias
  setToken: (token: string) => void // compatibility alias
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  refreshSession: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // State
        user: null,
        token: null,
        isAuthenticated: false,

        // Actions
        login: (user, token) =>
          set({
            user,
            token,
            isAuthenticated: true,
          }),

        logout: () =>
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          }),

        updateUser: updates =>
          set(state => ({
            user: state.user ? { ...state.user, ...updates } : null,
          })),

        updatePreferences: preferences =>
          set(state => ({
            user: state.user
              ? {
                  ...state.user,
                  preferences: { ...state.user.preferences, ...preferences } as UserPreferences,
                }
              : null,
          })),

        // Session refresh: calls refresh endpoint to extend JWT expiry
        refreshSession: async () => {
          try {
            const { default: axios } = await import('axios')
            const token = get().token
            if (!token) return
            const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
            const res = await axios.post(
              `${API_URL}/api/auth/refresh`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            )
            if (res.data?.access_token) {
              set({ token: res.data.access_token })
            }
          } catch (e) {
            // Silent fail - token refresh handled by api.ts interceptor
          }
        },

        // Compatibility aliases for legacy code
        setUser: (user: User) =>
          set(() => ({
            user,
            isAuthenticated: true,
          })),
        setToken: (token: string) => set({ token }),
      })),
      {
        name: 'auth-storage',
        partialize: state => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
)

// ============================================================================
// EXAM STORE
// ============================================================================

interface ExamState {
  exams: Exam[]
  currentExam: Exam | null
  results: ExamResult[]
  loading: boolean
  error: string | null
}

interface ExamActions {
  setExams: (exams: Exam[]) => void
  setCurrentExam: (exam: Exam | null) => void
  addExam: (exam: Exam) => void
  updateExam: (id: string, updates: Partial<Exam>) => void
  deleteExam: (id: string) => void
  setResults: (results: ExamResult[]) => void
  addResult: (result: ExamResult) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useExamStore = create<ExamState & ExamActions>()(
  devtools(
    immer(set => ({
      // State
      exams: [],
      currentExam: null,
      results: [],
      loading: false,
      error: null,

      // Actions
      setExams: exams => set({ exams }),

      setCurrentExam: exam => set({ currentExam: exam }),

      addExam: exam =>
        set(state => {
          state.exams.push(exam)
        }),

      updateExam: (id, updates) =>
        set(state => {
          // @ts-expect-error - Zustand state mutation
          const index = state.exams.findIndex((e: any) => e._id === id)
          if (index !== -1) {
            state.exams[index] = { ...state.exams[index], ...updates }
          }
          if (state.currentExam?._id === id) {
            state.currentExam = { ...state.currentExam, ...updates }
          }
        }),

      deleteExam: id =>
        set(state => {
          // @ts-expect-error - Zustand state mutation
          state.exams = state.exams.filter((e: any) => e._id !== id)
          if (state.currentExam?._id === id) {
            state.currentExam = null
          }
        }),

      setResults: results => set({ results }),

      addResult: result =>
        set(state => {
          state.results.push(result)
        }),

      setLoading: loading => set({ loading }),

      setError: error => set({ error }),

      clearError: () => set({ error: null }),
    })),
    { name: 'ExamStore' }
  )
)

// ============================================================================
// NOTIFICATION STORE
// ============================================================================

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
}

interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  devtools(
    persist(
      set => ({
        // State
        notifications: [],
        unreadCount: 0,

        // Actions
        addNotification: notification =>
          set(state => {
            const newNotification: Notification = {
              ...notification,
              id: `notif-${Date.now()}-${Math.random()}`,
              timestamp: new Date(),
              read: false,
            }
            return {
              notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
              unreadCount: state.unreadCount + 1,
            }
          }),

        markAsRead: id =>
          set(state => ({
            notifications: state.notifications.map(n => (n.id === id ? { ...n, read: true } : n)),
            unreadCount: Math.max(0, state.unreadCount - 1),
          })),

        markAllAsRead: () =>
          set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0,
          })),

        removeNotification: id =>
          set(state => {
            const notif = state.notifications.find(n => n.id === id)
            return {
              notifications: state.notifications.filter(n => n.id !== id),
              unreadCount: notif && !notif.read ? state.unreadCount - 1 : state.unreadCount,
            }
          }),

        clearAll: () => set({ notifications: [], unreadCount: 0 }),
      }),
      {
        name: 'notification-storage',
        partialize: state => ({
          notifications: state.notifications.slice(0, 50), // Persist only 50 latest
        }),
      }
    ),
    { name: 'NotificationStore' }
  )
)

// ============================================================================
// UI STORE
// ============================================================================

interface UIStoreState extends UIState {
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
  pushModal: (modalId: string) => void
  popModal: () => void
  closeAllModals: () => void
  setLoading: (key: string, loading: boolean) => void
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setActiveExam: (examId: string | undefined) => void
}

export const useUIStore = create<UIStoreState>()(
  devtools(
    set => ({
      // State
      sidebarOpen: true,
      mobileMenuOpen: false,
      modalStack: [],
      loadingStates: {},
      toasts: [],
      activeExamId: undefined,

      // Actions
      setSidebarOpen: open => set({ sidebarOpen: open }),

      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      setMobileMenuOpen: open => set({ mobileMenuOpen: open }),

      toggleMobileMenu: () => set(state => ({ mobileMenuOpen: !state.mobileMenuOpen })),

      pushModal: modalId =>
        set(state => ({
          modalStack: [...state.modalStack, modalId],
        })),

      popModal: () =>
        set(state => ({
          modalStack: state.modalStack.slice(0, -1),
        })),

      closeAllModals: () => set({ modalStack: [] }),

      setLoading: (key, loading) =>
        set(state => ({
          loadingStates: { ...state.loadingStates, [key]: loading },
        })),

      showToast: toast =>
        set(state => {
          const newToast: Toast = {
            ...toast,
            id: `toast-${Date.now()}-${Math.random()}`,
          }
          return {
            toasts: [...state.toasts, newToast],
          }
        }),

      removeToast: id =>
        set(state => ({
          toasts: state.toasts.filter(t => t.id !== id),
        })),

      setActiveExam: examId => set({ activeExamId: examId }),
    }),
    { name: 'UIStore' }
  )
)

// ============================================================================
// SETTINGS STORE
// ============================================================================

interface SettingsState {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

const defaultSettings: AppSettings = {
  apiUrl: import.meta.env.DEV ? 'http://localhost:8000' : '',
  wsUrl: import.meta.env.DEV
    ? 'ws://localhost:8000'
    : `wss://${typeof window !== 'undefined' ? window.location.host : ''}`,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  sessionTimeout: 30,
  autoSaveInterval: 60,
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      set => ({
        settings: defaultSettings,

        updateSettings: updates =>
          set(state => ({
            settings: { ...state.settings, ...updates },
          })),

        resetSettings: () => set({ settings: defaultSettings }),
      }),
      {
        name: 'settings-storage',
      }
    ),
    { name: 'SettingsStore' }
  )
)

// ============================================================================
// UNDO/REDO FUNCTIONALITY
// ============================================================================

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

interface HistoryActions<T> {
  undo: () => void
  redo: () => void
  set: (newPresent: T) => void
  clear: () => void
  canUndo: boolean
  canRedo: boolean
}

export function createHistoryStore<T>(initialState: T) {
  return create<HistoryState<T> & HistoryActions<T>>()(set => ({
    past: [],
    present: initialState,
    future: [],
    canUndo: false,
    canRedo: false,

    undo: () =>
      set(state => {
        if (state.past.length === 0) return state

        const previous = state.past[state.past.length - 1]
        const newPast = state.past.slice(0, -1)

        return {
          past: newPast,
          present: previous,
          future: [state.present, ...state.future],
          canUndo: newPast.length > 0,
          canRedo: true,
        }
      }),

    redo: () =>
      set(state => {
        if (state.future.length === 0) return state

        const next = state.future[0]
        const newFuture = state.future.slice(1)

        return {
          past: [...state.past, state.present],
          present: next,
          future: newFuture,
          canUndo: true,
          canRedo: newFuture.length > 0,
        }
      }),

    set: newPresent =>
      set(state => ({
        past: [...state.past, state.present].slice(-50), // Keep last 50 states
        present: newPresent,
        future: [],
        canUndo: true,
        canRedo: false,
      })),

    clear: () =>
      set({
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
      }),
  }))
}

// ============================================================================
// SELECTORS (for optimized component re-renders)
// ============================================================================

export const selectUser = (state: AuthState & AuthActions) => state.user
export const selectIsAuthenticated = (state: AuthState & AuthActions) => state.isAuthenticated
export const selectUserRole = (state: AuthState & AuthActions) => state.user?.role
export const selectUserPreferences = (state: AuthState & AuthActions) => state.user?.preferences

export const selectExams = (state: ExamState & ExamActions) => state.exams
export const selectCurrentExam = (state: ExamState & ExamActions) => state.currentExam
export const selectExamsBySubject = (subject: string) => (state: ExamState & ExamActions) =>
  state.exams.filter(e => e.subject === subject)
export const selectExamsByStatus = (status: string) => (state: ExamState & ExamActions) =>
  state.exams.filter(e => e.status === status)

export const selectUnreadNotifications = (state: NotificationState & NotificationActions) =>
  state.notifications.filter(n => !n.read)
export const selectNotificationsByType =
  (type: string) => (state: NotificationState & NotificationActions) =>
    state.notifications.filter(n => n.type === type)

export const selectIsLoading = (key: string) => (state: UIStoreState) =>
  state.loadingStates[key] || false
export const selectHasActiveModal = (state: UIStoreState) => state.modalStack.length > 0

// ============================================================================
// PERSIST MIDDLEWARE HELPERS
// ============================================================================

export const clearAllPersistedData = () => {
  localStorage.removeItem('auth-storage')
  localStorage.removeItem('notification-storage')
  localStorage.removeItem('settings-storage')
}

export const exportStoreData = () => {
  return {
    auth: localStorage.getItem('auth-storage'),
    notifications: localStorage.getItem('notification-storage'),
    settings: localStorage.getItem('settings-storage'),
  }
}

export const importStoreData = (data: Record<string, string | null>) => {
  if (data.auth) localStorage.setItem('auth-storage', data.auth)
  if (data.notifications) localStorage.setItem('notification-storage', data.notifications)
  if (data.settings) localStorage.setItem('settings-storage', data.settings)
}

// ============================================================================
// SUBSCRIPTION EXAMPLES
// ============================================================================

// NOTE: Session expiry is fully handled by the backend JWT (24hrs) and
// api.ts token refresh interceptor. No frontend timer needed — it caused
// false logouts due to clock skew and localStorage Date serialization issues.
// If you need to add a logout warning banner (e.g. "5 min left"), add it here.

// Auto-remove toasts after duration (disabled due to API compatibility)
// TODO: Implement with proper subscribe API
/*
let previousToasts: any[] = []
useUIStore.subscribe(
  (state) => {
    const toasts = state.toasts
    const newToasts = toasts.filter((t: any) => !previousToasts.find((p: any) => p.id === t.id))
    newToasts.forEach((toast: any) => {
      setTimeout(() => {
        useUIStore.getState().removeToast(toast.id)
      }, toast.duration)
    })
    previousToasts = toasts
  }
)
*/
