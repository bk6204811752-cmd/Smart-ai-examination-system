/**
 * Frontend Caching Service
 * In-memory caching with TTL support
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL: number = 300000 // 5 minutes
  
  /**
   * Set item in cache with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    
    this.cache.set(key, entry)
    
    // Auto cleanup after TTL
    setTimeout(() => {
      this.delete(key)
    }, entry.ttl)
  }
  
  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if expired
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key)
      return false
    }
    
    return true
  }
  
  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
  
  /**
   * Cached function wrapper
   */
  cached<T>(
    fn: (...args: any[]) => Promise<T>,
    keyGenerator: (...args: any[]) => string,
    ttl?: number
  ) {
    return async (...args: any[]): Promise<T> => {
      const key = keyGenerator(...args)
      
      // Check cache
      const cached = this.get<T>(key)
      if (cached !== null) {
        return cached
      }
      
      // Execute function
      const result = await fn(...args)
      
      // Store in cache
      this.set(key, result, ttl)
      
      return result
    }
  }
}

export const cache = new CacheService()
export default cache
