import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, AlertTriangle, Eye, CheckCircle, XCircle, Clock,
  Camera, TrendingUp, RefreshCw, Mic, Shield, Activity,
  MessageSquare, Pause, Search, Filter, Bell, BarChart3,
  Zap, MonitorOff, Radio, ChevronDown, Volume2, VolumeX
} from 'lucide-react'
import { examAPI, proctoringAPI, sessionAPI } from '../../lib/api'
import { WebSocketClient } from '../../lib/websocket'
import { useAuthStore } from '../../store/globalStore'
import { toast } from 'sonner'
import StudentDetailModal from '../../components/StudentDetailModal'
import AudioWaveform from '../../components/AudioWaveform'

interface StudentSession {
  student_id: string
  student_name: string
  email: string
  start_time: string
  current_question: number
  answered_questions: number
  flags: number
  flags_count?: number
  trust_score: number
  status: 'active' | 'submitted' | 'flagged'
  last_activity: string
  audio_level?: number
  face_detected?: boolean
  looking_at_screen?: boolean
  attention_level?: number
  integrity_score?: number
}

interface ViolationFlag {
  student_id?: string
  flag_type?: string
  type?: string
  severity: string
  timestamp: string
  evidence?: string
  message?: string
}

export default function LiveMonitoringPage() {
  const { examId: examIdParam } = useParams<{ examId: string }>()
  const [searchParams] = useSearchParams()
  // Support both /teacher/monitoring/:examId and /teacher/live-monitoring?exam=ID
  const examId = examIdParam || searchParams.get('exam') || undefined
  const [exam, setExam] = useState<any>(null)
  const [sessions, setSessions] = useState<StudentSession[]>([])
  const [flags, setFlags] = useState<ViolationFlag[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [videoStreams, setVideoStreams] = useState<Record<string, string>>({})
  const [lastFrameTime, setLastFrameTime] = useState<Record<string, number>>({})
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'>('disconnected')
  const [frameUpdateTrigger, setFrameUpdateTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'flagged' | 'submitted'>('all')
  const [showAlerts, setShowAlerts] = useState(true)
  const [newViolations, setNewViolations] = useState<ViolationFlag[]>([])
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'students' | 'violations' | 'analytics'>('students')
  const [showStudentModal, setShowStudentModal] = useState(false)
  const wsClientRef = useRef<WebSocketClient | null>(null)
  const staleFrameCheckInterval = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const user = useAuthStore(state => state.user)

  const streamRefreshIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (examId) {
      loadExamData()
      loadFlags()
      const streamInterval = initializeWebSocket()
      if (streamInterval) streamRefreshIntervalRef.current = streamInterval as unknown as number

      staleFrameCheckInterval.current = window.setInterval(() => {
        const now = Date.now()
        const staleThreshold = 30000 // 30 seconds before marking as stale
        setLastFrameTime(prev => {
          const updated = { ...prev }
          let removed = 0
          Object.entries(prev).forEach(([sid, ts]) => {
            if (now - ts > staleThreshold) {
              delete updated[sid]
              removed++
            }
          })
          if (removed > 0) {
            setVideoStreams(current => {
              const cleaned = { ...current }
              Object.keys(current).forEach(sid => {
                if (!updated[sid]) delete cleaned[sid]
              })
              return cleaned
            })
          }
          return updated
        })
      }, 5000)
    }

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect()
        wsClientRef.current = null
      }
      if (staleFrameCheckInterval.current) {
        clearInterval(staleFrameCheckInterval.current)
      }
      if (streamRefreshIntervalRef.current) {
        clearInterval(streamRefreshIntervalRef.current)
      }
    }
  }, [examId])

  useEffect(() => {
    if (autoRefresh && examId) {
      const interval = setInterval(async () => {
        await loadFlags()
        try {
          const sessionsData = await sessionAPI.getSessions(examId)
          setSessions(prev => {
            const newSessions = Array.isArray(sessionsData) ? sessionsData : []
            // Merge: keep real-time WS updates (audio, face detection, etc.) but update DB data
            return newSessions.map(newS => {
              const existing = prev.find(s => s.student_id === newS.student_id)
              if (existing) {
                return {
                  ...newS,
                  // Preserve real-time WS data
                  audio_level: existing.audio_level,
                  face_detected: existing.face_detected,
                  looking_at_screen: existing.looking_at_screen,
                  attention_level: existing.attention_level,
                  integrity_score: existing.integrity_score,
                  // Use WS trust_score if available and different
                  trust_score: existing.trust_score !== 100 ? Math.min(existing.trust_score, newS.trust_score || 100) : (newS.trust_score || 100),
                }
              }
              return newS
            })
          })
        } catch {}
      }, 3000) // Poll every 3s for better real-time feel
      return () => clearInterval(interval)
    }
  }, [autoRefresh, examId])

  const loadExamData = async () => {
    try {
      const data = await examAPI.getExam(examId!)
      setExam(data)
      try {
        const sessionsData = await sessionAPI.getSessions(examId!)
        setSessions(Array.isArray(sessionsData) ? sessionsData : [])
      } catch { setSessions([]) }
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  const loadFlags = async () => {
    try {
      if (examId) {
        const data = await proctoringAPI.getFlags(examId)
        setFlags(data)
      }
    } catch {}
  }

  const playAlertSound = useCallback(() => {
    if (!alertSoundEnabled) return
    try {
      const ctx = audioContextRef.current || new AudioContext()
      audioContextRef.current = ctx
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch {}
  }, [alertSoundEnabled])

  const initializeWebSocket = () => {
    if (!user || !examId) return
    setWsStatus('connecting')
    const wsClient = new WebSocketClient()
    wsClientRef.current = wsClient
    const userId = user._id || user.email || 'unknown'

    wsClient.on('connected', () => setWsStatus('connected'))
    wsClient.on('connection_established', (data: any) => {
      setWsStatus('connected')
      // Request active streams snapshot immediately on connect
      wsClient.send({ type: 'request_streams', exam_id: examId })
      // Update session stats from connection data
      if (data.stats) {
        console.log('[LiveMonitor] Connected, exam stats:', data.stats)
      }
    })
    wsClient.on('disconnect', () => setWsStatus('disconnected'))
    wsClient.onStatusChange(status => setWsStatus(status))

    wsClient.on('video_frame', (data: any) => {
      const studentId = data.student_id
      if (!studentId || !data.frame) return
      setVideoStreams(prev => ({ ...prev, [studentId]: data.frame }))
      setLastFrameTime(prev => ({ ...prev, [studentId]: Date.now() }))
      setFrameUpdateTrigger(prev => prev + 1)
    })

    wsClient.on('ai_violation', (data: any) => {
      if (data.violation) {
        const newFlag = {
          ...data.violation,
          student_id: data.student_id,
          exam_id: examId,
          timestamp: new Date().toISOString()
        }
        setFlags(prev => [...prev, newFlag])
        setNewViolations(prev => [...prev.slice(-4), newFlag])
        
        // Play alert for critical/high violations
        if (['CRITICAL', 'HIGH', 'critical', 'high'].includes(data.violation.severity)) {
          playAlertSound()
          toast.error(`⚠️ ${data.student_id}: ${data.violation.type?.replace(/_/g, ' ')}`, { duration: 4000 })
        }
        
        setSessions(prev => prev.map(session => {
          if (session.student_id === data.student_id) {
            const newFlags = (session.flags || 0) + 1
            return {
              ...session,
              flags: newFlags,
              trust_score: Math.max(0, (session.trust_score || 100) - (
                ['CRITICAL', 'critical'].includes(data.violation.severity) ? 15 :
                ['HIGH', 'high'].includes(data.violation.severity) ? 10 : 5
              )),
              status: newFlags >= 3 ? 'flagged' as const : session.status
            }
          }
          return session
        }))
      }
    })

    wsClient.on('proctoring_status', (data: any) => {
      setSessions(prev => prev.map(session => {
        if (session.student_id === data.student_id && data.status) {
          return {
            ...session,
            audio_level: data.status.audioLevel,
            face_detected: data.status.faceDetected,
            looking_at_screen: data.status.lookingAtScreen,
            attention_level: data.status.attentionLevel,
            integrity_score: data.status.integrityScore,
            trust_score: data.trust_score ?? session.trust_score,
            last_activity: new Date().toISOString()
          }
        }
        return session
      }))
    })

    wsClient.on('active_streams', (data: any) => {
      if (data.streams) {
        const streams: Record<string, string> = {}
        const now = Date.now()
        Object.entries(data.streams).forEach(([sid, sd]: [string, any]) => {
          if (sd.video) {
            streams[sid] = sd.video
            setLastFrameTime(prev => ({ ...prev, [sid]: now }))
          }
        })
        if (Object.keys(streams).length > 0) {
          setVideoStreams(prev => ({ ...prev, ...streams }))
          setFrameUpdateTrigger(prev => prev + 1)
        }
      }
    })

    // Track student heartbeats for online/offline status
    wsClient.on('student_heartbeat', (data: any) => {
      if (data.student_id) {
        setSessions(prev => prev.map(s => {
          if (s.student_id === data.student_id) {
            return { ...s, last_activity: new Date().toISOString(), status: 'active' as const }
          }
          return s
        }))
      }
    })

    // Track when students join
    wsClient.on('student_joined', (data: any) => {
      if (data.student_id) {
        toast.success(`Student joined: ${data.student_id}`, { duration: 2000 })
        // Refresh sessions to get the new student
        sessionAPI.getSessions(examId!).then(sessionsData => {
          setSessions(Array.isArray(sessionsData) ? sessionsData : [])
        }).catch(() => {})
      }
    })

    // Track when students disconnect
    wsClient.on('student_disconnected', (data: any) => {
      if (data.student_id) {
        // Mark as possibly disconnected but don't remove
        setSessions(prev => prev.map(s => {
          if (s.student_id === data.student_id && s.status === 'active') {
            return { ...s, last_activity: new Date().toISOString() }
          }
          return s
        }))
        // Remove stale video frame
        setVideoStreams(prev => {
          const updated = { ...prev }
          delete updated[data.student_id]
          return updated
        })
      }
    })

    wsClient.connect({ userId, role: 'teacher', examId })

    // Periodically re-request active streams to catch any missed frames
    const streamRefreshInterval = window.setInterval(() => {
      if (wsClient.isConnected()) {
        wsClient.send({ type: 'request_streams', exam_id: examId })
      }
    }, 30000)

    return streamRefreshInterval
  }

  const handleIntervene = useCallback(async (studentId: string, action: 'warn' | 'pause' | 'terminate', message: string) => {
    try {
      if (wsClientRef.current) {
        wsClientRef.current.send({
          type: 'intervention',
          exam_id: examId,
          student_id: studentId,
          action,
          message
        })
      }
      const actionLabel = action === 'warn' ? 'Warning sent' : action === 'pause' ? 'Exam paused' : 'Exam terminated'
      toast.success(`✓ ${actionLabel} for student`)
    } catch {
      toast.error('Failed to send intervention')
    }
  }, [examId])

  const getTimeElapsed = (startTime: string) => {
    const elapsed = Date.now() - new Date(startTime).getTime()
    const minutes = Math.floor(elapsed / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    const matchSearch = !searchQuery || s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchFilter = filterStatus === 'all' || s.status === filterStatus
    return matchSearch && matchFilter
  })

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    submitted: sessions.filter(s => s.status === 'submitted').length,
    flagged: sessions.filter(s => s.status === 'flagged').length,
    avgTrustScore: sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + (s.trust_score || 0), 0) / sessions.length) : 0,
    criticalFlags: flags.filter(f => ['CRITICAL', 'critical'].includes(f.severity)).length,
    liveStreams: Object.keys(videoStreams).length
  }

  const selectedStudentData = selectedStudent ? sessions.find(s => s.student_id === selectedStudent) || null : null
  const selectedStudentFlags = flags.filter(f => f.student_id === selectedStudent)
  const selectedStudentVideo = selectedStudent ? (videoStreams[selectedStudent] || null) : null

  if (loading && examId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading monitoring dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Connecting to live data streams</p>
        </div>
      </div>
    )
  }

  if (!examId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
          <Radio className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Monitoring</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Select a specific exam to monitor, or access Live Monitor from an exam's action menu to watch students in real time.
        </p>
        <div className="flex gap-3">
          <a
            href="/teacher/dashboard"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
          >
            Go to Dashboard
          </a>
          <a
            href="/teacher/create-exam"
            className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
          >
            Create Exam
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          Tip: From your dashboard, click "Monitor" on any active exam to start live monitoring.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-128 h-128 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-64 -right-64 w-128 h-128 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Student Detail Modal */}
      {showStudentModal && (
        <StudentDetailModal
          student={selectedStudentData}
          flags={selectedStudentFlags}
          videoFrame={selectedStudentVideo}
          onClose={() => setShowStudentModal(false)}
          onIntervene={handleIntervene}
          totalQuestions={exam?.questions?.length || 25}
        />
      )}

      {/* New Violations Toast Feed */}
      <AnimatePresence>
        {showAlerts && newViolations.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {newViolations.slice(-3).map((v, i) => (
              <motion.div
                key={`${v.timestamp}-${i}`}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className={`border rounded-xl p-3 shadow-xl text-sm backdrop-blur ${
                  ['CRITICAL', 'critical'].includes(v.severity)
                    ? 'bg-red-950/95 border-red-600/50 text-red-300'
                    : 'bg-orange-950/95 border-orange-600/50 text-orange-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-xs mb-0.5">
                      {sessions.find(s => s.student_id === v.student_id)?.student_name || 'Student'}
                    </div>
                    <div className="text-xs opacity-80">{(v.flag_type || v.type || '').replace(/_/g, ' ')}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{exam?.title || 'Live Monitoring'}</h1>
              <p className="text-gray-400 text-sm">Real-time exam proctoring dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Alert Sound Toggle */}
            <button
              onClick={() => setAlertSoundEnabled(prev => !prev)}
              title={alertSoundEnabled ? 'Mute alerts' : 'Enable alert sounds'}
              className={`p-2 rounded-lg border transition ${
                alertSoundEnabled
                  ? 'bg-blue-950/50 border-blue-600/50 text-blue-400'
                  : 'bg-gray-800/50 border-gray-700 text-gray-500'
              }`}
            >
              {alertSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Alert Feed Toggle */}
            <button
              onClick={() => { setShowAlerts(prev => !prev); setNewViolations([]) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                showAlerts
                  ? 'bg-red-950/50 border-red-600/50 text-red-400'
                  : 'bg-gray-800/50 border-gray-700 text-gray-500'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alerts</span>
            </button>

            {/* Auto Refresh */}
            <button
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                autoRefresh
                  ? 'bg-green-950/50 border-green-600/50 text-green-400'
                  : 'bg-gray-800/50 border-gray-700 text-gray-500'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <span>Auto</span>
            </button>

            {/* WebSocket Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${
              wsStatus === 'connected' ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-400' :
              wsStatus === 'connecting' ? 'bg-yellow-950/50 border-yellow-600/50 text-yellow-400' :
              'bg-red-950/50 border-red-600/50 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                wsStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                'bg-red-400'
              }`} />
              {wsStatus === 'connected' ? 'LIVE' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-800/40' },
            { label: 'Active', value: stats.active, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-800/40' },
            { label: 'Submitted', value: stats.submitted, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-950/20 border-blue-800/30' },
            { label: 'Flagged', value: stats.flagged, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-950/30 border-red-800/40' },
            { label: 'Avg Trust', value: `${stats.avgTrustScore}%`, icon: Shield, color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-800/40' },
            { label: 'Critical', value: stats.criticalFlags, icon: Zap, color: 'text-red-400', bg: 'bg-red-950/40 border-red-700/50' },
            { label: 'Live Feeds', value: stats.liveStreams, icon: Camera, color: 'text-cyan-400', bg: 'bg-cyan-950/30 border-cyan-800/40' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl p-4 backdrop-blur-sm`}>
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid xl:grid-cols-3 gap-5">
          {/* Left Panel - Student Grid */}
          <div className="xl:col-span-2 space-y-4">
            {/* Search & Filter */}
            <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 backdrop-blur">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'active', 'flagged', 'submitted'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition border ${
                        filterStatus === status
                          ? status === 'all' ? 'bg-blue-600 border-blue-500 text-white' :
                            status === 'flagged' ? 'bg-red-600 border-red-500 text-white' :
                            status === 'active' ? 'bg-emerald-600 border-emerald-500 text-white' :
                            'bg-gray-600 border-gray-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Video Grid */}
            {Object.keys(videoStreams).length > 0 && (
              <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                    <h3 className="font-bold text-gray-200">Live Camera Feeds</h3>
                    <span className="text-xs bg-red-950/50 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full">
                      {Object.keys(videoStreams).length} streams
                    </span>
                  </div>
                  <button
                    onClick={() => { setFrameUpdateTrigger(p => p + 1); toast.success('Refreshed', { duration: 1000 }) }}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-700 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(videoStreams).map(([studentId, frameData]) => {
                    const student = sessions.find(s => s.student_id === studentId)
                    const lastFrame = lastFrameTime[studentId]
                    const isRecent = lastFrame && (Date.now() - lastFrame < 8000)
                    const isFlagged = student?.status === 'flagged'

                    return (
                      <motion.div
                        key={`${studentId}-${frameUpdateTrigger}`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => { setSelectedStudent(studentId); setShowStudentModal(true) }}
                        className={`cursor-pointer rounded-xl overflow-hidden border-2 transition ${
                          isFlagged ? 'border-red-500/60' :
                          isRecent ? 'border-emerald-500/40' : 'border-gray-700'
                        }`}
                      >
                        <div className="relative">
                          <img
                            key={`img-${studentId}-${lastFrame || Date.now()}`}
                            src={`${frameData}#${Date.now()}`}
                            alt={student?.student_name || studentId}
                            className="w-full h-28 object-cover bg-gray-900"
                            loading="eager"
                            onError={e => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23111" width="100" height="100"/%3E%3C/svg%3E'
                            }}
                          />
                          <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                            isRecent ? 'bg-red-600/90 text-white' : 'bg-gray-700/90 text-gray-300'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isRecent ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
                            {isRecent ? 'LIVE' : 'STALE'}
                          </div>
                          {isFlagged && (
                            <div className="absolute top-1.5 left-1.5 bg-red-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              FLAG
                            </div>
                          )}
                          {/* Audio indicator */}
                          {student?.audio_level !== undefined && (
                            <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                              {[1, 2, 3].map(bar => (
                                <div
                                  key={bar}
                                  className="w-1 rounded-sm"
                                  style={{
                                    height: `${bar * 4}px`,
                                    backgroundColor: (student.audio_level || 0) > bar * 25
                                      ? bar > 2 ? '#ef4444' : '#10b981'
                                      : '#374151'
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-gray-900">
                          <p className="text-white text-xs font-semibold truncate">{student?.student_name || 'Unknown'}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-[10px] font-bold ${
                              (student?.trust_score || 0) >= 80 ? 'text-emerald-400' :
                              (student?.trust_score || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {student?.trust_score || 0}%
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {student?.flags || 0} flags
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Student Sessions List */}
            <div className="bg-gray-900/80 rounded-xl border border-gray-800 backdrop-blur">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-bold text-gray-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Student Sessions ({filteredSessions.length})
                </h3>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No students found</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {sessions.length === 0 ? 'Waiting for students to join...' : 'Try clearing your filters'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredSessions.map(session => {
                    const flagCount = session.flags_count || session.flags || 0
                    const progress = exam?.questions?.length
                      ? (session.answered_questions / exam.questions.length) * 100
                      : 0
                    const videoFrame = videoStreams[session.student_id]
                    const lastFrame = lastFrameTime[session.student_id]
                    const isLive = lastFrame && (Date.now() - lastFrame < 8000)

                    return (
                      <motion.div
                        key={session.student_id}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                        onClick={() => { setSelectedStudent(session.student_id); setShowStudentModal(true) }}
                        className={`p-4 cursor-pointer transition ${
                          selectedStudent === session.student_id ? 'bg-blue-950/20 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Video or Avatar */}
                          <div className="relative flex-shrink-0">
                            {videoFrame ? (
                              <div className="relative">
                                <img
                                  src={videoFrame}
                                  alt={session.student_name}
                                  className="w-20 h-14 object-cover rounded-lg border border-gray-700"
                                />
                                {isLive && (
                                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse border border-green-300" />
                                )}
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                {session.student_name.charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white text-sm truncate">{session.student_name}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                                session.status === 'active' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50' :
                                session.status === 'flagged' ? 'bg-red-900/50 text-red-400 border border-red-800/50' :
                                'bg-blue-900/50 text-blue-400 border border-blue-800/50'
                              }`}>
                                {session.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mb-2">{session.email}</p>

                            {/* Progress bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500 flex-shrink-0">
                                {session.answered_questions}/{exam?.questions?.length || '?'}
                              </span>
                            </div>
                          </div>

                          {/* Metrics */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                           {/* Audio Level */}
                            {session.audio_level !== undefined && (
                              <div className="hidden md:flex items-center gap-1">
                                <Mic className="w-3.5 h-3.5 text-gray-500" />
                                <div className="flex items-end gap-0.5 h-4">
                                  {[1, 2, 3].map(bar => (
                                    <div
                                      key={bar}
                                      className="w-1 rounded-sm transition-all"
                                      style={{
                                        height: `${bar * 4}px`,
                                        backgroundColor: (session.audio_level || 0) > 75
                                          ? '#ef4444' // red — loud/suspicious
                                          : (session.audio_level || 0) > bar * 25
                                            ? '#10b981' : '#374151'
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Trust Score */}
                            <div className="text-center">
                              <div className={`text-sm font-black ${
                                session.trust_score >= 80 ? 'text-emerald-400' :
                                session.trust_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                              }`}>{session.trust_score}%</div>
                              <div className="text-[10px] text-gray-600">Trust</div>
                            </div>

                            {/* Flags */}
                            <div className="text-center">
                              <div className={`text-sm font-black ${flagCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                {flagCount}
                              </div>
                              <div className="text-[10px] text-gray-600">Flags</div>
                            </div>

                            {/* Time */}
                            <div className="text-center hidden lg:block">
                              <div className="text-sm font-semibold text-gray-300">
                                {getTimeElapsed(session.start_time)}
                              </div>
                              <div className="text-[10px] text-gray-600">Time</div>
                            </div>

                            {/* Face Status */}
                            {session.face_detected !== undefined && (
                              <div className="hidden xl:block" aria-label={session.face_detected ? 'Face detected' : 'No face'}>
                                {session.face_detected
                                  ? <Eye className="w-4 h-4 text-emerald-400" />
                                  : <MonitorOff className="w-4 h-4 text-red-400" />
                                }
                              </div>
                            )}

                            {/* Quick Action Buttons */}
                            <div className="hidden xl:flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleIntervene(session.student_id, 'warn', 'Please follow exam rules. Official warning.')}
                                title="Warn student"
                                className="px-2 py-1 bg-yellow-950/60 border border-yellow-700/50 text-yellow-400 text-[10px] font-bold rounded hover:bg-yellow-900/70 transition"
                              >
                                ⚠
                              </button>
                              <button
                                onClick={() => handleIntervene(session.student_id, 'pause', 'Your exam has been paused by the proctor.')}
                                title="Pause exam"
                                className="px-2 py-1 bg-orange-950/60 border border-orange-700/50 text-orange-400 text-[10px] font-bold rounded hover:bg-orange-900/70 transition"
                              >
                                ⏸
                              </button>
                              <button
                                onClick={() => { setSelectedStudent(session.student_id); setShowStudentModal(true) }}
                                title="View details"
                                className="px-2 py-1 bg-blue-950/60 border border-blue-700/50 text-blue-400 text-[10px] font-bold rounded hover:bg-blue-900/70 transition"
                              >
                                🔍
                              </button>
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Violations & Analytics */}
          <div className="space-y-4">
            {/* Real-time Violation Feed */}
            <div className="bg-gray-900/80 rounded-xl border border-gray-800 backdrop-blur">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="font-bold text-gray-200">Violation Feed</h3>
                </div>
                <span className="text-xs text-gray-500">{flags.length} total</span>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {flags.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-emerald-600/40 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No violations recorded</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {[...flags].reverse().slice(0, 20).map((flag, idx) => {
                      const student = sessions.find(s => s.student_id === flag.student_id)
                      const isCritical = ['CRITICAL', 'critical'].includes(flag.severity)
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`border rounded-lg p-2.5 text-xs ${
                            isCritical
                              ? 'border-red-800/50 bg-red-950/20'
                              : 'border-orange-800/30 bg-orange-950/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-white truncate">
                              {student?.student_name || 'Unknown'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isCritical
                                ? 'bg-red-950 text-red-400 border-red-700'
                                : 'bg-orange-950 text-orange-400 border-orange-700'
                            }`}>
                              {flag.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className={`font-medium ${isCritical ? 'text-red-400' : 'text-orange-400'}`}>
                            {(flag.flag_type || flag.type || '').replace(/_/g, ' ')}
                          </p>
                          <p className="text-gray-500 mt-0.5 truncate">
                            {flag.evidence || flag.message || ''}
                          </p>
                          <p className="text-gray-600 mt-1">{new Date(flag.timestamp).toLocaleTimeString()}</p>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Class Analytics */}
            <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-gray-200">Class Analytics</h3>
              </div>

              <div className="space-y-3">
                {/* Trust Score Distribution */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Trust Score Distribution</span>
                    <span>{stats.avgTrustScore}% avg</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                    {sessions.length > 0 && (
                      <>
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(sessions.filter(s => s.trust_score >= 80).length / sessions.length) * 100}%` }}
                          title="High trust (80%+)"
                        />
                        <div
                          className="h-full bg-yellow-500 transition-all"
                          style={{ width: `${(sessions.filter(s => s.trust_score >= 60 && s.trust_score < 80).length / sessions.length) * 100}%` }}
                          title="Medium trust (60-79%)"
                        />
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${(sessions.filter(s => s.trust_score < 60).length / sessions.length) * 100}%` }}
                          title="Low trust (<60%)"
                        />
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px]">
                    <span className="text-emerald-400">● High</span>
                    <span className="text-yellow-400">● Medium</span>
                    <span className="text-red-400">● Low</span>
                  </div>
                </div>

                {/* Violation Types */}
                {flags.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Top Violation Types</div>
                    {Object.entries(
                      flags.reduce((acc, f) => {
                        const t = (f.flag_type || f.type || 'unknown').replace(/_/g, ' ')
                        acc[t] = (acc[t] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                    ).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-400 capitalize truncate">{type}</span>
                            <span className="text-gray-500">{count}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500/70 rounded-full"
                              style={{ width: `${(count / flags.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Intervention */}
            {selectedStudent && selectedStudentData && (
              <div className="bg-gray-900/80 rounded-xl border border-yellow-800/40 p-5 backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Quick Action
                  </h3>
                  <span className="text-xs text-gray-400">{selectedStudentData.student_name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleIntervene(selectedStudent, 'warn', 'Please follow exam rules. This is an official warning.')}
                    className="flex-1 py-2 px-3 bg-yellow-950/50 border border-yellow-800/50 text-yellow-400 rounded-lg text-xs font-semibold hover:bg-yellow-900/50 transition"
                  >
                    ⚠ Warn
                  </button>
                  <button
                    onClick={() => handleIntervene(selectedStudent, 'pause', 'Your exam has been paused by the proctor for review.')}
                    className="flex-1 py-2 px-3 bg-orange-950/50 border border-orange-800/50 text-orange-400 rounded-lg text-xs font-semibold hover:bg-orange-900/50 transition"
                  >
                    ⏸ Pause
                  </button>
                  <button
                    onClick={() => setShowStudentModal(true)}
                    className="flex-1 py-2 px-3 bg-blue-950/50 border border-blue-800/50 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-900/50 transition"
                  >
                    🔍 Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
