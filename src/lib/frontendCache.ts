/**
 * Frontend Cache Manager
 * Client-side caching for API responses and app data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class FrontendCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  
  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    
    // Clean up expired entries periodically
    this.cleanupExpired()
  }
  
  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if expired
    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }
  
  /**
   * Delete specific key
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
   * Clear cache by pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }
  
  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
export const frontendCache = new FrontendCache()

// Cache decorator for functions
export function cached<T>(
  keyPrefix: string,
  ttl: number = 5 * 60 * 1000
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]): Promise<T> {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`
      
      // Try to get from cache
      const cached = frontendCache.get<T>(cacheKey)
      if (cached !== null) {
        return cached
      }
      
      // Call original method
      const result = await originalMethod.apply(this, args)
      
      // Store in cache
      frontendCache.set(cacheKey, result, ttl)
      
      return result
    }
    
    return descriptor
  }
}

export default frontendCache
