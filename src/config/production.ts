/**
 * Frontend Production Configuration
 * Environment-aware settings and optimizations
 */

export const config = {
  // Environment
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
  
  // API Configuration
  api: {
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // WebSocket Configuration
  websocket: {
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000
  },
  
  // Caching Configuration
  cache: {
    enabled: true,
    ttl: {
      exam: 300000, // 5 minutes
      user: 600000, // 10 minutes
      results: 180000 // 3 minutes
    },
    maxSize: 100 // Maximum cached items
  },
  
  // Performance Configuration
  performance: {
    enableMetrics: true,
    slowThreshold: 1000, // 1 second
    criticalThreshold: 3000 // 3 seconds
  },
  
  // Proctoring Configuration
  proctoring: {
    videoFPS: 0.5,
    videoQuality: 0.6,
    faceDetectionInterval: 3000,
    audioThreshold: 30,
    violationThresholds: {
      low: 3,
      medium: 2,
      high: 1
    }
  },
  
  // UI Configuration
  ui: {
    toastDuration: 3000,
    animationDuration: 300,
    debounceDelay: 300
  },
  
  // Feature Flags
  features: {
    enableOfflineMode: true,
    enableAnalytics: import.meta.env.PROD,
    enableErrorReporting: import.meta.env.PROD,
    enablePerformanceMonitoring: true
  },
  
  // Security Configuration
  security: {
    enableCSRF: true,
    sessionTimeout: 3600000, // 1 hour
    maxLoginAttempts: 5
  }
}

export default config
