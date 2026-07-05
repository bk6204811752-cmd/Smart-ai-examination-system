/**
 * Performance Monitoring Service
 * Track and report performance metrics
 */

import { logger } from '../lib/logger'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  type: 'api' | 'render' | 'navigation' | 'resource'
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 100
  
  /**
   * Measure function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    type: PerformanceMetric['type'] = 'api'
  ): Promise<T> {
    const start = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - start
      
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        type
      })
      
      // Log slow operations
      if (duration > 1000) {
        logger.warn(`Slow operation: ${name}`, {
          duration: `${duration.toFixed(2)}ms`,
          type
        })
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      logger.error(`Failed operation: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
        type,
        error
      })
      throw error
    }
  }
  
  /**
   * Mark performance point
   */
  mark(name: string) {
    performance.mark(name)
  }
  
  /**
   * Measure between marks
   */
  measureBetween(name: string, startMark: string, endMark: string) {
    try {
      performance.measure(name, startMark, endMark)
      const measures = performance.getEntriesByName(name, 'measure')
      
      if (measures.length > 0) {
        const duration = measures[0].duration
        this.recordMetric({
          name,
          duration,
          timestamp: Date.now(),
          type: 'render'
        })
      }
    } catch (error) {
      logger.error('Performance measurement failed', { name, error })
    }
  }
  
  /**
   * Record metric
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }
  
  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }
  
  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type)
  }
  
  /**
   * Get average duration for operation
   */
  getAverageDuration(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name)
    if (filtered.length === 0) return 0
    
    const total = filtered.reduce((sum, m) => sum + m.duration, 0)
    return total / filtered.length
  }
  
  /**
   * Get slow operations (> 1 second)
   */
  getSlowOperations(): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > 1000)
  }
  
  /**
   * Clear metrics
   */
  clear() {
    this.metrics = []
  }
  
  /**
   * Get performance report
   */
  getReport() {
    const byType = {
      api: this.getMetricsByType('api'),
      render: this.getMetricsByType('render'),
      navigation: this.getMetricsByType('navigation'),
      resource: this.getMetricsByType('resource')
    }
    
    return {
      total: this.metrics.length,
      byType: {
        api: byType.api.length,
        render: byType.render.length,
        navigation: byType.navigation.length,
        resource: byType.resource.length
      },
      averages: {
        api: this.calculateAverage(byType.api),
        render: this.calculateAverage(byType.render),
        navigation: this.calculateAverage(byType.navigation),
        resource: this.calculateAverage(byType.resource)
      },
      slowOperations: this.getSlowOperations().length
    }
  }
  
  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0
    const total = metrics.reduce((sum, m) => sum + m.duration, 0)
    return Math.round(total / metrics.length)
  }
}

export const performanceMonitor = new PerformanceMonitor()
export default performanceMonitor
