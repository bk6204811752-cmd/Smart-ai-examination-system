import { useEffect, useState, useRef } from 'react'
import { advancedProctoringAPI } from '../lib/advancedAPIs'
import { Camera, AlertTriangle, Eye, Brain, Activity } from 'lucide-react'

interface ProctoringAnalysis {
  violations: Array<{
    type: string
    severity: string
    message: string
    timestamp: number
    confidence: number
  }>
  metrics: {
    face_confidence: number
    gaze_horizontal: number
    gaze_vertical: number
    attention_score: number
    emotion: string
    emotion_confidence: number
    eye_aspect_ratio: number
    head_pose: {
      pitch: number
      yaw: number
      roll: number
    }
    brightness: number
  }
  state: {
    risk_score: number
    violation_count: number
    attention_level: string
    recommendation: string
  }
}

interface AdvancedProctoringMonitorProps {
  sessionId: string
  examId: string
  studentId: string
  onTerminate?: () => void
}

export default function AdvancedProctoringMonitor({
  sessionId,
  examId,
  studentId,
  onTerminate
}: AdvancedProctoringMonitorProps) {
  const [isActive, setIsActive] = useState(false)
  const [analysis, setAnalysis] = useState<ProctoringAnalysis | null>(null)
  const [calibrating, setCalibrating] = useState(false)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    startProctoring()
    return () => {
      stopProctoring()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startProctoring = async () => {
    try {
      // Start proctoring session
      const result = await advancedProctoringAPI.startSession({
        session_id: sessionId,
        exam_id: examId,
        student_id: studentId,
        proctoring_level: 'STRICT'
      })

      if (result.calibration_required_frames) {
        setCalibrating(true)
        setCalibrationProgress(0)
      }

      // Get video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsActive(true)

      // Start frame analysis every 1 second
      frameIntervalRef.current = window.setInterval(() => {
        captureAndAnalyze()
      }, 1000)

    } catch (error) {
      console.error('Failed to start proctoring:', error)
    }
  }

  const stopProctoring = async () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    if (isActive) {
      await advancedProctoringAPI.stopSession(sessionId)
    }

    setIsActive(false)
  }

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Capture frame
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // Convert to base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    // Analyze frame
    try {
      const result = await advancedProctoringAPI.analyzeFrame({
        session_id: sessionId,
        frame_data: frameData,
        timestamp: Date.now()
      })

      setAnalysis(result)

      // Update calibration progress
      if (calibrating && result.calibration_progress !== undefined) {
        setCalibrationProgress(result.calibration_progress)
        if (result.calibration_progress >= 100) {
          setCalibrating(false)
        }
      }

      // Check for critical violations
      if (result.state.risk_score >= 85 && result.state.recommendation === 'TERMINATE_EXAM') {
        onTerminate?.()
      }

    } catch (error) {
      console.error('Frame analysis failed:', error)
    }
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500'
    if (score < 50) return 'text-yellow-500'
    if (score < 70) return 'text-orange-500'
    return 'text-red-500'
  }

  const getEmotionEmoji = (emotion: string) => {
    const emotions: Record<string, string> = {
      neutral: '😐',
      focused: '🎯',
      confused: '😕',
      stressed: '😰',
      suspicious: '🤨',
      happy: '😊'
    }
    return emotions[emotion] || '😐'
  }

  return (
    <div className="space-y-4">
      {/* Calibration Banner */}
      {calibrating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Calibrating AI Baseline</h3>
              <p className="text-xs text-blue-700">Establishing your normal behavior pattern...</p>
              <div className="mt-2 bg-blue-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${calibrationProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 mt-1">{calibrationProgress}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Video Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">Live Monitoring</span>
                {isActive && (
                  <span className="flex items-center gap-1 text-xs text-white/90">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
            </div>
            <div className="relative bg-gray-900 aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Risk Score Overlay */}
              {analysis && (
                <div className="absolute top-4 right-4 bg-black/80 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getRiskColor(analysis.state.risk_score)}`}>
                      {analysis.state.risk_score}
                    </div>
                    <div className="text-xs text-white/70">Risk Score</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real-Time Metrics */}
        <div className="space-y-4">
          {/* Attention Score */}
          {analysis && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-gray-900">Attention</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {Math.round(analysis.metrics.attention_score)}%
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      analysis.metrics.attention_score > 80 ? 'bg-green-100 text-green-700' :
                      analysis.metrics.attention_score > 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {analysis.state.attention_level}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${analysis.metrics.attention_score}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Emotion Detection */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-medium text-gray-900">Emotion</h3>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {getEmotionEmoji(analysis.metrics.emotion)}
                  </div>
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {analysis.metrics.emotion}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(analysis.metrics.emotion_confidence * 100)}% confidence
                  </div>
                </div>
              </div>

              {/* Head Pose */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-medium text-gray-900">Head Pose</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pitch</span>
                    <span className="font-medium">{analysis.metrics.head_pose.pitch.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yaw</span>
                    <span className="font-medium">{analysis.metrics.head_pose.yaw.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Roll</span>
                    <span className="font-medium">{analysis.metrics.head_pose.roll.toFixed(1)}°</span>
                  </div>
                </div>
              </div>

              {/* Gaze Direction */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-medium text-gray-900">Gaze Direction</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horizontal</span>
                    <span className="font-medium">{analysis.metrics.gaze_horizontal.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vertical</span>
                    <span className="font-medium">{analysis.metrics.gaze_vertical.toFixed(1)}°</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Violations */}
      {analysis && analysis.violations.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-medium text-red-900">
              Recent Violations ({analysis.violations.length})
            </h3>
          </div>
          <div className="space-y-2">
            {analysis.violations.slice(0, 3).map((violation, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm bg-white rounded p-2"
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                  violation.severity === 'critical' ? 'bg-red-500' :
                  violation.severity === 'high' ? 'bg-orange-500' :
                  violation.severity === 'medium' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{violation.type}</div>
                  <div className="text-xs text-gray-600">{violation.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(violation.confidence * 100)}% confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendation */}
      {analysis && analysis.state.recommendation && (
        <div className={`rounded-lg p-4 ${
          analysis.state.recommendation === 'TERMINATE_EXAM' ? 'bg-red-50 border border-red-200' :
          analysis.state.recommendation === 'TEACHER_ALERT' ? 'bg-orange-50 border border-orange-200' :
          analysis.state.recommendation === 'WARNING' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <Brain className={`w-4 h-4 ${
              analysis.state.recommendation === 'TERMINATE_EXAM' ? 'text-red-600' :
              analysis.state.recommendation === 'TEACHER_ALERT' ? 'text-orange-600' :
              analysis.state.recommendation === 'WARNING' ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
            <div>
              <div className="text-sm font-medium">AI Recommendation</div>
              <div className="text-xs mt-1">{analysis.state.recommendation.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
