import { logger } from '../lib/logger'

// Session recovery and persistence utilities
export class SessionRecovery {
  private static readonly STORAGE_KEY = 'exam_session_backup'
  
  /**
   * Save current exam state to localStorage
   */
  static saveState(examId: string, state: {
    answers: Record<string, any>
    currentQuestionIndex: number
    timeRemaining: number
    flags: any[]
    tabSwitches: number
  }) {
    try {
      const backup = {
        examId,
        ...state,
        timestamp: Date.now(),
        version: '1.0'
      }
      localStorage.setItem(`${this.STORAGE_KEY}_${examId}`, JSON.stringify(backup))
      logger.debug('Session state saved to localStorage', { examId })
    } catch (error) {
      logger.error('Failed to save session state', { examId, error })
    }
  }

  /**
   * Recover exam state from localStorage
   */
  static recoverState(examId: string): {
    answers: Record<string, any>
    currentQuestionIndex: number
    timeRemaining: number
    flags: any[]
    tabSwitches: number
  } | null {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${examId}`)
      if (!stored) return null

      const backup = JSON.parse(stored)
      
      // Check if backup is recent (within last hour)
      const age = Date.now() - backup.timestamp
      if (age > 3600000) { // 1 hour
        console.log('⏰ Session backup too old, ignoring')
        this.clearState(examId)
        return null
      }

      console.log('✅ Recovered session state from localStorage')
      return {
        answers: backup.answers || {},
        currentQuestionIndex: backup.currentQuestionIndex || 0,
        timeRemaining: backup.timeRemaining || 0,
        flags: backup.flags || [],
        tabSwitches: backup.tabSwitches || 0
      }
    } catch (error) {
      console.error('❌ Failed to recover session state:', error)
      return null
    }
  }

  /**
   * Clear stored state
   */
  static clearState(examId: string) {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${examId}`)
      logger.debug('Cleared session backup', { examId })
    } catch (error) {
      logger.error('Failed to clear session state', { examId, error })
    }
  }

  /**
   * Check if recovery is available
   */
  static hasRecoveryData(examId: string): boolean {
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${examId}`)
    if (!stored) return false

    try {
      const backup = JSON.parse(stored)
      const age = Date.now() - backup.timestamp
      return age < 3600000 // Within last hour
    } catch {
      return false
    }
  }
}
