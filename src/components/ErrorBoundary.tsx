import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { logger } from '../lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', {
      error,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
    
    this.setState({
      error,
      errorInfo
    })

    // Log to error reporting service
    this.logErrorToService(error, errorInfo)
  }

  logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send error to backend
      await logger.sendErrorLogsToServer()
      
      // Additional error tracking (e.g., Sentry, LogRocket)
      if ((window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            }
          }
        })
      }
    } catch (err) {
      // Silently fail - don't create infinite error loop
      logger.debug('Failed to send error logs', err)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-3">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 text-center mb-6">
              We're sorry for the inconvenience. An unexpected error occurred while processing your request.
            </p>

            {/* Error Details (Development Mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-6 overflow-x-auto">
                <p className="font-mono text-sm mb-2">
                  <strong className="text-red-400">Error:</strong> {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="font-mono text-xs text-gray-400 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
                {this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-yellow-400 hover:text-yellow-300">
                      Component Stack
                    </summary>
                    <pre className="font-mono text-xs text-gray-400 mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                <Home className="w-5 h-5" />
                <span>Go to Homepage</span>
              </button>
            </div>

            {/* Support Information */}
            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-sm text-gray-600">
                If the problem persists, please contact{' '}
                <a href="mailto:support@pcmt.edu.in" className="text-blue-600 hover:underline">
                  support@pcmt.edu.in
                </a>
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
