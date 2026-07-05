/**
 * Offline Storage Manager with IndexedDB
 * Provides persistent offline storage with automatic sync
 */

interface StoredExam {
  id: string
  data: any
  timestamp: number
  synced: boolean
}

interface StoredAnswer {
  examId: string
  questionId: string
  answer: any
  timestamp: number
  synced: boolean
}

class OfflineStorageManager {
  private dbName = 'pcmt_exam_offline'
  private version = 1
  private db: IDBDatabase | null = null

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        // Disabled: Verbose initialization log
        // console.log('✅ Offline storage initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('answers')) {
          const answersStore = db.createObjectStore('answers', { autoIncrement: true })
          answersStore.createIndex('examId', 'examId', { unique: false })
          answersStore.createIndex('synced', 'synced', { unique: false })
        }

        if (!db.objectStoreNames.contains('results')) {
          db.createObjectStore('results', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('proctoring')) {
          const proctoringStore = db.createObjectStore('proctoring', { autoIncrement: true })
          proctoringStore.createIndex('examId', 'examId', { unique: false })
          proctoringStore.createIndex('synced', 'synced', { unique: false })
        }
      }
    })
  }

  /**
   * Store exam data for offline access
   */
  async storeExam(examId: string, examData: any): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['exams'], 'readwrite')
      const store = transaction.objectStore('exams')
      
      const data: StoredExam = {
        id: examId,
        data: examData,
        timestamp: Date.now(),
        synced: true
      }

      const request = store.put(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get exam from offline storage
   */
  async getExam(examId: string): Promise<any | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['exams'], 'readonly')
      const store = transaction.objectStore('exams')
      const request = store.get(examId)

      request.onsuccess = () => {
        const result = request.result as StoredExam | undefined
        resolve(result ? result.data : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Store answer offline (to sync later)
   */
  async storeAnswer(examId: string, questionId: string, answer: any): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['answers'], 'readwrite')
      const store = transaction.objectStore('answers')
      
      const data: StoredAnswer = {
        examId,
        questionId,
        answer,
        timestamp: Date.now(),
        synced: false
      }

      const request = store.add(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all unsynced answers for an exam
   */
  async getUnsyncedAnswers(examId: string): Promise<StoredAnswer[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['answers'], 'readonly')
      const store = transaction.objectStore('answers')
      const index = store.index('examId')
      const request = index.getAll(examId)

      request.onsuccess = () => {
        const answers = request.result.filter((a: StoredAnswer) => !a.synced)
        resolve(answers)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Mark answers as synced
   */
  async markAnswersSynced(examId: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['answers'], 'readwrite')
      const store = transaction.objectStore('answers')
      const index = store.index('examId')
      const request = index.openCursor(IDBKeyRange.only(examId))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const answer = cursor.value as StoredAnswer
          answer.synced = true
          cursor.update(answer)
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Store proctoring violation offline
   */
  async storeProctoringViolation(examId: string, violation: any): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['proctoring'], 'readwrite')
      const store = transaction.objectStore('proctoring')
      
      const data = {
        examId,
        violation,
        timestamp: Date.now(),
        synced: false
      }

      const request = store.add(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      }
    }
    return { used: 0, quota: 0 }
  }

  /**
   * Clear old data (older than 30 days)
   */
  async clearOldData(): Promise<void> {
    if (!this.db) await this.init()

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['exams', 'answers', 'results'], 'readwrite')
      
      const stores = ['exams', 'answers', 'results']
      let completed = 0

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.openCursor()

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            const item = cursor.value
            if (item.timestamp < thirtyDaysAgo) {
              cursor.delete()
            }
            cursor.continue()
          } else {
            completed++
            if (completed === stores.length) {
              resolve()
            }
          }
        }
      })

      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine
  }

  /**
   * Setup online/offline event listeners
   */
  setupNetworkListeners(
    onOnline: () => void,
    onOffline: () => void
  ): () => void {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }
}

export const offlineStorage = new OfflineStorageManager()
