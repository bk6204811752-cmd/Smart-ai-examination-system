// 🚀 Advanced API Extensions for Ultra-Advanced AI Exam System
// Add these to src/lib/api.ts

import { api } from './api'

// Advanced Proctoring API (v2) - ML-Based AI Proctoring
export const advancedProctoringAPI = {
  startSession: async (data: {
    session_id: string
    exam_id: string
    student_id: string
    proctoring_level: 'BASIC' | 'MODERATE' | 'STRICT'
  }) => {
    const response = await api.post('/api/proctoring/v2/start', data)
    return response.data
  },
  
  analyzeFrame: async (data: {
    session_id: string
    frame_data: string // base64 encoded image
    audio_features?: {
      voice_probability?: number
      whisper_probability?: number
      keyboard_probability?: number
      ambient_noise?: number
    }
    timestamp: number
  }) => {
    const response = await api.post('/api/proctoring/v2/analyze-frame', data)
    return response.data
  },
  
  getSessionSummary: async (sessionId: string) => {
    const response = await api.get(`/api/proctoring/v2/session/${sessionId}/summary`)
    return response.data
  },
  
  stopSession: async (sessionId: string) => {
    const response = await api.post(`/api/proctoring/v2/stop`, { session_id: sessionId })
    return response.data
  },
}

// Smart Exam Management API - AI-Powered Exam Generation
export const smartExamAPI = {
  generateAIExam: async (config: {
    title: string
    subject: string
    topics: string[]
    num_questions: number
    duration: number
    difficulty_level: 'easy' | 'medium' | 'hard'
    bloom_focus?: string[]
    target_pass_rate?: number
  }) => {
    const response = await api.post('/api/exams/generate-ai', config)
    return response.data
  },
  
  analyzePerformance: async (examId: string, submissions: any[]) => {
    const response = await api.post(`/api/exams/${examId}/analyze-performance`, { submissions })
    return response.data
  },
}

// Collaborative Monitoring API - Multi-Teacher Real-Time Monitoring
export const collaborativeMonitoringAPI = {
  registerExamMonitoring: async (data: {
    exam_id: string
    teacher_id: string
    settings: {
      auto_intervention: boolean
      alert_threshold: number
    }
  }) => {
    const response = await api.post('/api/monitoring/register-exam', data)
    return response.data
  },
  
  teacherJoin: async (data: {
    exam_id: string
    teacher_id: string
    teacher_name: string
  }) => {
    const response = await api.post('/api/monitoring/teacher/join', data)
    return response.data
  },
  
  studentStart: async (data: {
    exam_id: string
    student_id: string
    student_name: string
  }) => {
    const response = await api.post('/api/monitoring/student/start', data)
    return response.data
  },
  
  teacherIntervene: async (data: {
    exam_id: string
    student_id: string
    teacher_id: string
    action: 'WARNING' | 'PAUSE_EXAM' | 'MESSAGE' | 'TERMINATE' | 'REVIEW_LATER' | 'CLEAR_VIOLATION'
    message?: string
  }) => {
    const response = await api.post('/api/monitoring/intervene', data)
    return response.data
  },
  
  getExamState: async (examId: string) => {
    const response = await api.get(`/api/monitoring/exam/${examId}/state`)
    return response.data
  },
}

// System Features API
export const systemAPI = {
  getFeatures: async () => {
    const response = await api.get('/api/system/features')
    return response.data
  },
  
  getHealth: async () => {
    const response = await api.get('/health')
    return response.data
  },
}
