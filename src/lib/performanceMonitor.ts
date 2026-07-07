/**
 * Performance Monitoring and Analytics
 * Tracks Core Web Vitals and user experience metrics
 */

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

interface UserInteraction {
  type: 'click' | 'scroll' | 'navigation' | 'input'
  target?: string
  timestamp: number
  duration?: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private interactions: UserInteraction[] = []
  private observer: PerformanceObserver | null = null
  private fpsHistory: number[] = []
  private lastFrameTime = 0
  private maxMetrics = 100 // Limit stored metrics to prevent memory leaks

  /**
   * Initialize performance monitoring
   */
  init() {
    // Monitor Core Web Vitals
    this.observeCoreWebVitals()

    // Monitor user interactions
    this.trackInteractions()

    // Monitor resource loading
    this.observeResourceTiming()

    // Monitor FPS
    this.trackFPS()

    // Disabled: Verbose initialization log
    // console.log('✅ Performance monitoring initialized')
  }

  /**
   * Track FPS for smooth experience monitoring
   */
  private trackFPS() {
    const measureFPS = (timestamp: number) => {
      if (this.lastFrameTime) {
        const fps = 1000 / (timestamp - this.lastFrameTime)
        this.fpsHistory.push(fps)

        // Keep only last 60 frames
        if (this.fpsHistory.length > 60) {
          this.fpsHistory.shift()
        }

        // Disabled: FPS logging (too verbose)
        // if (fps < 10 && fps > 0) {
        //   console.warn('⚠️ Critical FPS drop:', fps.toFixed(1))
        // }
      }
      this.lastFrameTime = timestamp
      requestAnimationFrame(measureFPS)
    }

    requestAnimationFrame(measureFPS)
  }

  /**
   * Get average FPS
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
  }

  /**
   * Observe Core Web Vitals (LCP, FID, CLS)
   */
  private observeCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry: any) => {
      const value = entry.renderTime || entry.loadTime
      this.recordMetric('LCP', value, this.getLCPRating(value))
    })

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry: any) => {
      const value = entry.processingStart - entry.startTime
      this.recordMetric('FID', value, this.getFIDRating(value))
    })

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        const value = entry.value
        this.recordMetric('CLS', value, this.getCLSRating(value))
      }
    })

    // Time to First Byte (TTFB)
    if (window.performance && window.performance.timing) {
      const ttfb = window.performance.timing.responseStart - window.performance.timing.requestStart
      this.recordMetric('TTFB', ttfb, this.getTTFBRating(ttfb))
    }
  }

  /**
   * Observe specific performance entry type
   */
  private observeMetric(type: string, callback: (entry: any) => void) {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          callback(entry)
        }
      })
      observer.observe({ type, buffered: true })
    } catch (error) {
      console.warn(`Could not observe ${type}:`, error)
    }
  }

  /**
   * Track user interactions
   */
  private trackInteractions() {
    // Track clicks
    document.addEventListener('click', e => {
      const target = e.target as HTMLElement
      this.interactions.push({
        type: 'click',
        target: target.tagName + (target.id ? `#${target.id}` : ''),
        timestamp: Date.now(),
      })
    })

    // Track scrolling
    let scrollTimeout: number
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = window.setTimeout(() => {
        this.interactions.push({
          type: 'scroll',
          timestamp: Date.now(),
        })
      }, 100)
    })
  }

  /**
   * Observe resource loading times
   */
  private observeResourceTiming() {
    this.observeMetric('resource', () => {
      // Disabled: Slow resource warnings (too verbose for development)
      // Only enable if debugging performance issues
      // if (duration > 10000) {
      //   console.warn(`Extremely slow resource: ${entry.name} (${duration.toFixed(0)}ms)`)
      // }
    })
  }

  /**
   * Record a metric
   */
  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
    }

    this.metrics.push(metric)

    // Disabled: Metric logging (too verbose)
    // Uncomment only when debugging performance issues
    // if (rating === 'poor' && value > 0.5) {
    //   console.warn(`❌ Critical ${name}: ${value.toFixed(2)}`)
    // }
  }

  /**
   * Rating functions based on Web Vitals thresholds
   */
  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good'
    if (value <= 300) return 'needs-improvement'
    return 'poor'
  }

  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good'
    if (value <= 0.25) return 'needs-improvement'
    return 'poor'
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good'
    if (value <= 1800) return 'needs-improvement'
    return 'poor'
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const summary: Record<string, any> = {}

    this.metrics.forEach(metric => {
      if (!summary[metric.name] || summary[metric.name].timestamp < metric.timestamp) {
        summary[metric.name] = metric
      }
    })

    return summary
  }

  /**
   * Get interaction analytics
   */
  getInteractionAnalytics() {
    const clickCount = this.interactions.filter(i => i.type === 'click').length
    const scrollCount = this.interactions.filter(i => i.type === 'scroll').length

    return {
      totalInteractions: this.interactions.length,
      clicks: clickCount,
      scrolls: scrollCount,
      engagementScore: Math.min(100, (clickCount + scrollCount) * 2),
    }
  }

  /**
   * Measure specific operation
   */
  async measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now()
    const result = await operation()
    const duration = performance.now() - start

    if (duration > 100) {
      this.recordMetric(name, duration, duration > 500 ? 'poor' : 'needs-improvement')
    }

    return result
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        percentUsed: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2),
      }
    }
    return null
  }

  /**
   * Export metrics for analytics
   */
  exportMetrics() {
    return {
      vitals: this.getSummary(),
      interactions: this.getInteractionAnalytics(),
      memory: this.getMemoryUsage(),
      timestamp: Date.now(),
    }
  }

  /**
   * Clear old metrics (keep last 100)
   */
  cleanup() {
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
    if (this.interactions.length > 100) {
      this.interactions = this.interactions.slice(-100)
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()
