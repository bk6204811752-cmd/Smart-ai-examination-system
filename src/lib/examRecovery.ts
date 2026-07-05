/**
 * Auto-Save and Exam Recovery System
 * Automatically saves exam progress and recovers from crashes
 */

import { logger } from './logger'

interface ExamProgress {
  examId: string
  answers: { [key: number]: any }
  currentQuestion: number
  flaggedQuestions: number[]
  timeRemaining: number
  timestamp: number
  violations: string[]
  tabSwitches: number
}

class ExamRecoveryService {
  private readonly STORAGE_KEY = 'exam_recovery_'
  private autoSaveInterval: NodeJS.Timeout | null = null
  private readonly AUTO_SAVE_INTERVAL = 10000 // Save every 10 seconds

  /**
   * Start auto-save for an exam
   */
  startAutoSave(examId: string, getProgressFn: () => Omit<ExamProgress, 'examId' | 'timestamp'>) {
    logger.info('Starting auto-save for exam', { examId })
    
    // Clear any existing interval
    this.stopAutoSave()
    
    // Save immediately
    this.saveProgress(examId, getProgressFn())
    
    // Set up periodic save
    this.autoSaveInterval = setInterval(() => {
      try {
        this.saveProgress(examId, getProgressFn())
        logger.debug('Auto-saved exam progress', { examId })
      } catch (error) {
        logger.error('Auto-save failed', error)
      }
    }, this.AUTO_SAVE_INTERVAL)
  }

  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
      logger.debug('Auto-save stopped')
    }
  }

  /**
   * Save exam progress to localStorage
   */
  saveProgress(examId: string, progress: Omit<ExamProgress, 'examId' | 'timestamp'>) {
    try {
      const data: ExamProgress = {
        examId,
        ...progress,
        timestamp: Date.now()
      }
      
      localStorage.setItem(this.STORAGE_KEY + examId, JSON.stringify(data))
      
      // Also save to IndexedDB for larger storage
      this.saveToIndexedDB(examId, data)
    } catch (error) {
      logger.error('Failed to save exam progress', error)
    }
  }

  /**
   * Check if there's recoverable progress for an exam
   */
  hasRecoverableProgress(examId: string): boolean {
    const data = this.getProgress(examId)
    if (!data) return false
    
    // Check if progress is less than 24 hours old
    const ageInHours = (Date.now() - data.timestamp) / (1000 * 60 * 60)
    return ageInHours < 24
  }

  /**
   * Get saved exam progress
   */
  getProgress(examId: string): ExamProgress | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY + examId)
      if (!stored) return null
      
      return JSON.parse(stored)
    } catch (error) {
      logger.error('Failed to load exam progress', error)
      return null
    }
  }

  /**
   * Clear saved progress (after successful submission)
   */
  clearProgress(examId: string) {
    try {
      localStorage.removeItem(this.STORAGE_KEY + examId)
      this.deleteFromIndexedDB(examId)
      logger.info('Exam progress cleared', { examId })
    } catch (error) {
      logger.error('Failed to clear exam progress', error)
    }
  }

  /**
   * Get all recoverable exams
   */
  getAllRecoverableExams(): ExamProgress[] {
    const exams: ExamProgress[] = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.STORAGE_KEY)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored) as ExamProgress
            
            // Only include recent exams (< 24 hours)
            const ageInHours = (Date.now() - data.timestamp) / (1000 * 60 * 60)
            if (ageInHours < 24) {
              exams.push(data)
            } else {
              // Clean up old data
              localStorage.removeItem(key)
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get recoverable exams', error)
    }
    
    return exams.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Save to IndexedDB for larger storage and offline support
   */
  private async saveToIndexedDB(examId: string, data: ExamProgress) {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(['exams'], 'readwrite')
      const store = transaction.objectStore('exams')
      
      await store.put(data, examId)
      
      logger.debug('Saved to IndexedDB', { examId })
    } catch (error) {
      logger.warn('IndexedDB save failed', error)
    }
  }

  /**
   * Delete from IndexedDB
   */
  private async deleteFromIndexedDB(examId: string) {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(['exams'], 'readwrite')
      const store = transaction.objectStore('exams')
      
      await store.delete(examId)
    } catch (error) {
      logger.warn('IndexedDB delete failed', error)
    }
  }

  /**
   * Open IndexedDB connection
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ExamRecoveryDB', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams')
        }
      }
    })
  }

  /**
   * Calculate exam completion percentage
   */
  getCompletionPercentage(progress: ExamProgress, totalQuestions: number): number {
    const answeredQuestions = Object.keys(progress.answers).length
    return Math.round((answeredQuestions / totalQuestions) * 100)
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }
}

export const examRecoveryService = new ExamRecoveryService()

// Expose in development
if (import.meta.env.DEV) {
  ;(window as any).examRecoveryService = examRecoveryService
}
