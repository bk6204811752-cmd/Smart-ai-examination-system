/**
 * Optimized Exam State Management Hook
 * Replaces 20+ useState hooks with a single useReducer for better performance
 */

import { useReducer, Dispatch } from 'react'
import { DifficultyLevel } from '../utils/adaptiveExamEngine'
import { ProctoringStatus, ProctoringViolation } from '../utils/proctoringEngine'

export interface ExamState {
  // Exam Core
  currentQuestion: number
  answers: { [key: number]: any }
  flaggedQuestions: Set<number>
  timeRemaining: number
  examStarted: boolean
  examEnded: boolean
  isSubmitting: boolean
  
  // Proctoring
  proctoringStatus: ProctoringStatus | null
  activeViolations: ProctoringViolation[]
  cameraEnabled: boolean
  micEnabled: boolean
  screenSharing: boolean
  violations: string[]
  tabSwitches: number
  brightness: number
  isInitializingCamera: boolean
  isFullscreen: boolean
  
  // Adaptive Learning
  currentDifficulty: DifficultyLevel
  difficultyHistory: DifficultyLevel[]
  
  // UI State
  showMobileMenu: boolean
}

export type ExamAction =
  | { type: 'SET_CURRENT_QUESTION'; payload: number }
  | { type: 'SET_ANSWER'; payload: { questionId: number; answer: any } }
  | { type: 'TOGGLE_FLAG'; payload: number }
  | { type: 'DECREMENT_TIME' }
  | { type: 'START_EXAM' }
  | { type: 'END_EXAM' }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_PROCTORING_STATUS'; payload: ProctoringStatus | null }
  | { type: 'SET_ACTIVE_VIOLATIONS'; payload: ProctoringViolation[] }
  | { type: 'ADD_ACTIVE_VIOLATION'; payload: ProctoringViolation }
  | { type: 'REMOVE_ACTIVE_VIOLATION'; payload: ProctoringViolation }
  | { type: 'ENABLE_CAMERA'; payload: boolean }
  | { type: 'ENABLE_MIC'; payload: boolean }
  | { type: 'SET_SCREEN_SHARING'; payload: boolean }
  | { type: 'ADD_VIOLATION'; payload: string }
  | { type: 'INCREMENT_TAB_SWITCHES' }
  | { type: 'SET_TAB_SWITCHES'; payload: number }
  | { type: 'SET_BRIGHTNESS'; payload: number }
  | { type: 'SET_INITIALIZING_CAMERA'; payload: boolean }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'SET_FULLSCREEN'; payload: boolean }
  | { type: 'SET_DIFFICULTY'; payload: DifficultyLevel }
  | { type: 'ADD_DIFFICULTY_HISTORY'; payload: DifficultyLevel }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'RESET_EXAM' }

const initialState: ExamState = {
  currentQuestion: 0,
  answers: {},
  flaggedQuestions: new Set(),
  timeRemaining: 3600,
  examStarted: false,
  examEnded: false,
  isSubmitting: false,
  
  proctoringStatus: null,
  activeViolations: [],
  cameraEnabled: false,
  micEnabled: false,
  screenSharing: false,
  violations: [],
  tabSwitches: 0,
  brightness: 100,
  isInitializingCamera: false,
  isFullscreen: false,
  
  currentDifficulty: 'Medium',
  difficultyHistory: ['Medium'],
  
  showMobileMenu: false,
}

function examReducer(state: ExamState, action: ExamAction): ExamState {
  switch (action.type) {
    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestion: action.payload, showMobileMenu: false }
      
    case 'SET_ANSWER':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.questionId]: action.payload.answer
        }
      }
      
    case 'TOGGLE_FLAG': {
      const newFlagged = new Set(state.flaggedQuestions)
      if (newFlagged.has(action.payload)) {
        newFlagged.delete(action.payload)
      } else {
        newFlagged.add(action.payload)
      }
      return { ...state, flaggedQuestions: newFlagged }
    }
      
    case 'DECREMENT_TIME':
      return { ...state, timeRemaining: Math.max(0, state.timeRemaining - 1) }
      
    case 'START_EXAM':
      return { ...state, examStarted: true }
      
    case 'END_EXAM':
      return { ...state, examEnded: true, isSubmitting: false }
      
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload }
      
    case 'SET_PROCTORING_STATUS':
      return { ...state, proctoringStatus: action.payload }
      
    case 'SET_ACTIVE_VIOLATIONS':
      return { ...state, activeViolations: action.payload }
      
    case 'ADD_ACTIVE_VIOLATION':
      return { ...state, activeViolations: [action.payload, ...state.activeViolations].slice(0, 5) }
      
    case 'REMOVE_ACTIVE_VIOLATION':
      return { ...state, activeViolations: state.activeViolations.filter(v => v !== action.payload) }
      
    case 'ENABLE_CAMERA':
      return { ...state, cameraEnabled: action.payload }
      
    case 'ENABLE_MIC':
      return { ...state, micEnabled: action.payload }
      
    case 'SET_SCREEN_SHARING':
      return { ...state, screenSharing: action.payload }
      
    case 'ADD_VIOLATION':
      return { ...state, violations: [...state.violations, action.payload] }
      
    case 'INCREMENT_TAB_SWITCHES':
      return { ...state, tabSwitches: state.tabSwitches + 1 }
      
    case 'SET_TAB_SWITCHES':
      return { ...state, tabSwitches: action.payload }
      
    case 'SET_BRIGHTNESS':
      return { ...state, brightness: action.payload }
      
    case 'SET_INITIALIZING_CAMERA':
      return { ...state, isInitializingCamera: action.payload }
      
    case 'TOGGLE_FULLSCREEN':
      return { ...state, isFullscreen: !state.isFullscreen }
      
    case 'SET_FULLSCREEN':
      return { ...state, isFullscreen: action.payload }
      
    case 'SET_DIFFICULTY':
      return { ...state, currentDifficulty: action.payload }
      
    case 'ADD_DIFFICULTY_HISTORY':
      return {
        ...state,
        difficultyHistory: [...state.difficultyHistory, action.payload]
      }
      
    case 'TOGGLE_MOBILE_MENU':
      return { ...state, showMobileMenu: !state.showMobileMenu }
      
    case 'RESET_EXAM':
      return initialState
      
    default:
      return state
  }
}

export function useExamState(durationMinutes: number = 60): [ExamState, Dispatch<ExamAction>] {
  const [state, dispatch] = useReducer(examReducer, {
    ...initialState,
    timeRemaining: durationMinutes * 60
  })
  
  return [state, dispatch]
}
