import { useState, useEffect, useRef } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  AlertTriangle,
  Eye,
  Brain,
  AlertCircle,
} from 'lucide-react'
import { sessionAPI } from '../../lib/api'

interface SessionFrame {
  timestamp: number
  frame_data: string // base64 image
  metrics: {
    risk_score: number
    attention_score: number
    emotion: string
    gaze_horizontal: number
    gaze_vertical: number
    violations: string[]
  }
  events: Array<{
    type: 'question_change' | 'violation' | 'intervention' | 'pause'
    description: string
  }>
}

interface ExamSession {
  session_id: string
  student_id: string
  student_name: string
  exam_id: string
  exam_title: string
  start_time: number
  end_time: number
  duration: number
  total_violations: number
  final_risk_score: number
  frames: SessionFrame[]
}

export default function ExamSessionReplay({ sessionId = '' }: { sessionId?: string }) {
  const [session, setSession] = useState<ExamSession | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const videoRef = useRef<HTMLImageElement>(null)
  const playIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    fetchSessionData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= (session?.frames.length || 0) - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000 / playbackSpeed)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, playbackSpeed, session])

  const fetchSessionData = async () => {
    if (!sessionId) {
      return
    }
    try {
      const data = await sessionAPI.getSessionReplay(sessionId)
      setSession(data)
    } catch (error) {
      console.error('Failed to fetch session replay:', error)
    }
  }

  const handleSeek = (frameIndex: number) => {
    setCurrentFrame(Math.max(0, Math.min(frameIndex, (session?.frames.length || 1) - 1)))
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const skipForward = () => {
    handleSeek(currentFrame + 10)
  }

  const skipBackward = () => {
    handleSeek(currentFrame - 10)
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No session selected for replay</p>
          <p className="text-sm text-gray-400 mt-2">
            Select a session from Live Monitoring to view replay
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const frame = session.frames[currentFrame]
  const progress = (currentFrame / (session.frames.length - 1)) * 100

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session.exam_title}</h1>
              <p className="text-gray-600 mt-1">
                {session.student_name} • Session ID: {session.session_id}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{session.total_violations}</div>
                <div className="text-xs text-gray-600">Violations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{session.final_risk_score}</div>
                <div className="text-xs text-gray-600">Final Risk</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.floor(session.duration / 60)}m
                </div>
                <div className="text-xs text-gray-600">Duration</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Video Display */}
              <div className="relative bg-gray-900 aspect-video">
                <img
                  ref={videoRef}
                  src={frame.frame_data}
                  alt={`Frame ${currentFrame}`}
                  className="w-full h-full object-contain"
                />

                {/* Overlay Metrics */}
                <div className="absolute top-4 right-4 space-y-2">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2">
                    <div className="text-white text-center">
                      <div
                        className={`text-2xl font-bold ${
                          frame.metrics.risk_score >= 70
                            ? 'text-red-400'
                            : frame.metrics.risk_score >= 50
                              ? 'text-yellow-400'
                              : 'text-green-400'
                        }`}
                      >
                        {Math.round(frame.metrics.risk_score)}
                      </div>
                      <div className="text-xs text-white/70">Risk Score</div>
                    </div>
                  </div>
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2">
                    <div className="text-white text-center">
                      <div className="text-lg font-bold">
                        {Math.round(frame.metrics.attention_score)}%
                      </div>
                      <div className="text-xs text-white/70">Attention</div>
                    </div>
                  </div>
                </div>

                {/* Violation Alert */}
                {frame.metrics.violations.length > 0 && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {frame.metrics.violations.join(', ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Playback Speed */}
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-medium">{playbackSpeed}x</span>
                </div>
              </div>

              {/* Controls */}
              <div className="bg-gray-800 p-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={session.frames.length - 1}
                    value={currentFrame}
                    onChange={e => handleSeek(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${progress}%, #374151 ${progress}%, #374151 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{new Date(frame.timestamp).toLocaleTimeString()}</span>
                    <span>
                      Frame {currentFrame + 1} / {session.frames.length}
                    </span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={skipBackward}
                    className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full transition"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <button
                    onClick={skipForward}
                    className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <select
                    value={playbackSpeed}
                    onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Events Timeline */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">Session Events</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {session.frames
                  .flatMap((f, i) =>
                    f.events.map(event => ({
                      ...event,
                      frameIndex: i,
                      timestamp: f.timestamp,
                    }))
                  )
                  .map((event, index) => (
                    <button
                      key={index}
                      onClick={() => handleSeek(event.frameIndex)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        event.frameIndex === currentFrame
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {event.type === 'violation' ? (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        ) : event.type === 'intervention' ? (
                          <Eye className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Brain className="w-4 h-4 text-blue-600" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{event.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()} • Frame{' '}
                            {event.frameIndex + 1}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Metrics Panel */}
          <div className="space-y-4">
            {/* Current Metrics */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">Current Frame Metrics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Attention</span>
                    <span className="font-bold text-gray-900">
                      {Math.round(frame.metrics.attention_score)}%
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${frame.metrics.attention_score}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Emotion</div>
                  <div className="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-center font-medium capitalize">
                    {frame.metrics.emotion}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Gaze Direction</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <div className="text-xs text-gray-600">Horizontal</div>
                      <div className="text-sm font-bold">
                        {frame.metrics.gaze_horizontal.toFixed(1)}°
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2">
                      <div className="text-xs text-gray-600">Vertical</div>
                      <div className="text-sm font-bold">
                        {frame.metrics.gaze_vertical.toFixed(1)}°
                      </div>
                    </div>
                  </div>
                </div>

                {frame.metrics.violations.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Active Violations</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {frame.metrics.violations.map((v, i) => (
                        <div key={i} className="text-xs text-red-600">
                          {v}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">Session Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Time</span>
                  <span className="font-medium">
                    {new Date(session.start_time).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">End Time</span>
                  <span className="font-medium">
                    {new Date(session.end_time).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Frames</span>
                  <span className="font-medium">{session.frames.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Risk Score</span>
                  <span className="font-medium text-orange-600">
                    {Math.round(
                      session.frames.reduce((sum, f) => sum + f.metrics.risk_score, 0) /
                        session.frames.length
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
