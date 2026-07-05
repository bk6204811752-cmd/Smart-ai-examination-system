/**
 * Enhanced API Service
 * Production-ready with caching, performance tracking, and error handling
 */

import { logger } from '../lib/logger'
import { cache } from './cache'
import config from '../config/production'

interface RequestConfig {
  method?: string
  headers?: HeadersInit
  body?: string
  timeout?: number
  retries?: number
  useCache?: boolean
  cacheTTL?: number
}

class APIService {
  private baseURL: string
  private defaultTimeout: number
  private retryAttempts: number
  private retryDelay: number

  constructor() {
    this.baseURL = config.api.baseURL
    this.defaultTimeout = config.api.timeout
    this.retryAttempts = config.api.retryAttempts
    this.retryDelay = config.api.retryDelay
  }

  /**
   * Make API request with automatic tracking, caching, and retries
   */
  private async request<T>(
    url: string,
    options: RequestConfig = {}
  ): Promise<T> {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`
    const method = options.method || 'GET'
    const shouldCache = options.useCache !== false && method === 'GET'
    const cacheTTL = options.cacheTTL || config.cache.ttl.exam
    const maxRetries = options.retries !== undefined ? options.retries : this.retryAttempts

    // Check cache first
    if (shouldCache) {
      const cacheKey = `api:${method}:${url}`
      const cached = cache.get<T>(cacheKey)
      
      if (cached) {
        logger.debug(`Cache hit: ${method} ${url}`)
        return cached
      }
    }

    // Track performance
    const startTime = performance.now()

    try {
      // Attempt request with retries
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController()
          const timeout = options.timeout || this.defaultTimeout

          const timeoutId = setTimeout(() => controller.abort(), timeout)

          const fetchOptions: RequestInit = {
            method,
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...this.getAuthHeaders(),
              ...options.headers
            }
          }

          if (options.body) {
            fetchOptions.body = options.body
          }

          const response = await fetch(fullURL, fetchOptions)

          clearTimeout(timeoutId)

          const duration = performance.now() - startTime

          // Track API call
          logger.trackAPI(method, url, duration, response.status)

          if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }))
            throw new Error(error.message || `HTTP ${response.status}`)
          }

          const data = await response.json()

          // Cache successful GET requests
          if (shouldCache) {
            const cacheKey = `api:${method}:${url}`
            cache.set(cacheKey, data, cacheTTL)
          }

          return data
        } catch (error) {
          lastError = error as Error

          // Don't retry on client errors (4xx)
          if (error instanceof Error && error.message.includes('HTTP 4')) {
            throw error
          }

          // Retry with exponential backoff
          if (attempt < maxRetries) {
            const delay = this.retryDelay * Math.pow(2, attempt)
            logger.warn(`Request failed, retrying in ${delay}ms`, {
              url,
              attempt: attempt + 1,
              maxRetries
            })
            await this.sleep(delay)
          }
        }
      }

      throw lastError || new Error('Request failed')
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error(`API request failed: ${method} ${url}`, {
        duration: `${duration}ms`,
        error
      })
      throw error
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, options?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      useCache: false
    })
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, options?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
      useCache: false
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, options?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
      useCache: false
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
      useCache: false
    })
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clear API cache
   */
  clearCache() {
    cache.clear()
    logger.info('API cache cleared')
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateCache(url: string, method: string = 'GET') {
    const cacheKey = `api:${method}:${url}`
    cache.delete(cacheKey)
    logger.debug(`Cache invalidated: ${method} ${url}`)
  }
}

export const api = new APIService()
export default api

