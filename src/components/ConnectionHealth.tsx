import { useEffect, useState } from 'react'
import { Activity, Wifi, WifiOff, AlertCircle } from 'lucide-react'

interface ConnectionHealthProps {
  videoStreams: Record<string, string>
  lastFrameTime: Record<string, number>
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'
}

export function ConnectionHealth({ videoStreams, lastFrameTime, wsStatus }: ConnectionHealthProps) {
  const [health, setHealth] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline')
  const [activeStreams, setActiveStreams] = useState(0)
  const [avgLatency, setAvgLatency] = useState(0)

  useEffect(() => {
    const now = Date.now()
    const recentThreshold = 5000 // 5 seconds
    
    // Count active streams (frames received in last 5 seconds)
    const active = Object.entries(lastFrameTime).filter(
      ([_, timestamp]) => now - timestamp < recentThreshold
    ).length
    
    setActiveStreams(active)
    
    // Calculate average latency
    const latencies = Object.values(lastFrameTime).map(timestamp => now - timestamp)
    const avg = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0
    setAvgLatency(Math.round(avg))
    
    // Determine health status
    if (wsStatus !== 'connected') {
      setHealth('offline')
    } else if (active === 0) {
      setHealth('poor')
    } else if (avg < 3000) {
      setHealth('excellent')
    } else if (avg < 6000) {
      setHealth('good')
    } else {
      setHealth('poor')
    }
  }, [videoStreams, lastFrameTime, wsStatus])

  const getHealthColor = () => {
    switch (health) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300'
      case 'good': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'offline': return 'bg-red-100 text-red-800 border-red-300'
    }
  }

  const getHealthIcon = () => {
    switch (health) {
      case 'excellent': return <Wifi className="w-5 h-5 text-green-600" />
      case 'good': return <Wifi className="w-5 h-5 text-yellow-600" />
      case 'poor': return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'offline': return <WifiOff className="w-5 h-5 text-red-600" />
    }
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${getHealthColor()} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getHealthIcon()}
          <h3 className="font-semibold">Connection Health</h3>
        </div>
        <div className="flex items-center space-x-1">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">{health.toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600 mb-1">Active Streams</p>
          <p className="text-2xl font-bold">{activeStreams}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-1">Avg Latency</p>
          <p className="text-2xl font-bold">{avgLatency}ms</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-current border-opacity-20">
        <div className="flex items-center justify-between text-xs">
          <span>Total Feeds:</span>
          <span className="font-semibold">{Object.keys(videoStreams).length}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span>WebSocket:</span>
          <span className={`font-semibold ${
            wsStatus === 'connected' ? 'text-green-700' : 'text-red-700'
          }`}>
            {wsStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {health === 'poor' && (
        <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs">
          ⚠️ Some streams may be experiencing delays. Check student connections.
        </div>
      )}

      {health === 'offline' && (
        <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs">
          🔴 No connection to monitoring server. Attempting to reconnect...
        </div>
      )}
    </div>
  )
}
