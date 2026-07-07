import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  AlertTriangle,
  Camera,
  Clock,
  Shield,
  Eye,
  Mic,
  CheckCircle,
  XCircle,
  Pause,
  MessageSquare,
  BarChart3,
  Activity,
} from 'lucide-react'
import AudioWaveform from './AudioWaveform'
import ExamChat from './ExamChat'
import { WebSocketClient } from '../lib/websocket'

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
  is_paused?: boolean
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

interface StudentDetailModalProps {
  student: StudentSession | null
  flags: ViolationFlag[]
  videoFrame: string | null
  onClose: () => void
  onIntervene: (
    studentId: string,
    action: 'warn' | 'pause' | 'resume' | 'terminate',
    message: string
  ) => void
  totalQuestions: number
  wsClientRef?: React.RefObject<WebSocketClient | null>
  examId?: string
}

export default function StudentDetailModal({
  student,
  flags,
  videoFrame,
  onClose,
  onIntervene,
  totalQuestions,
  wsClientRef,
  examId,
}: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'violations' | 'intervention' | 'chat'>(
    'overview'
  )
  const [interventionMessage, setInterventionMessage] = useState('')
  const [intervening, setIntervening] = useState(false)

  if (!student) return null

  const studentFlags = flags.filter(f => f.student_id === student.student_id)
  const criticalFlags = studentFlags.filter(
    f => f.severity === 'CRITICAL' || f.severity === 'critical'
  )
  const highFlags = studentFlags.filter(f => f.severity === 'HIGH' || f.severity === 'high')
  const progress = totalQuestions > 0 ? (student.answered_questions / totalQuestions) * 100 : 0
  const timeElapsed = Math.floor((Date.now() - new Date(student.start_time).getTime()) / 60000)
  const audioLevel = student.audio_level || 0

  const trustColor =
    student.trust_score >= 80
      ? 'text-emerald-400'
      : student.trust_score >= 60
        ? 'text-yellow-400'
        : 'text-red-400'

  const getSeverityBadge = (severity: string) => {
    const s = severity.toUpperCase()
    switch (s) {
      case 'CRITICAL':
        return 'bg-red-600/30 text-red-400 border-red-500/50'
      case 'HIGH':
        return 'bg-orange-600/30 text-orange-400 border-orange-500/50'
      case 'MEDIUM':
        return 'bg-yellow-600/30 text-yellow-400 border-yellow-500/50'
      default:
        return 'bg-gray-600/30 text-gray-400 border-gray-500/50'
    }
  }

  const handleIntervene = async (action: 'warn' | 'pause' | 'resume' | 'terminate') => {
    if (!interventionMessage.trim() && action !== 'terminate' && action !== 'resume') return
    setIntervening(true)
    const message =
      action === 'resume'
        ? 'Your exam has been resumed by the proctor.'
        : interventionMessage || `Exam ${action}d by proctor`
    onIntervene(student.student_id, action, message)
    setTimeout(() => setIntervening(false), 1000)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {student.student_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{student.student_name}</h2>
                <p className="text-gray-400 text-sm">{student.email}</p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  student.status === 'active'
                    ? 'bg-green-600/20 text-green-400 border-green-500/50'
                    : student.status === 'flagged'
                      ? 'bg-red-600/20 text-red-400 border-red-500/50'
                      : 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                }`}
              >
                {student.status.toUpperCase()}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 bg-gray-800/50">
            {(['overview', 'violations', 'intervention', 'chat'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-semibold transition capitalize ${
                  activeTab === tab
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
                {tab === 'violations' && studentFlags.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-600/30 text-red-400 text-xs rounded-full border border-red-500/30">
                    {studentFlags.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="p-5 grid grid-cols-2 gap-5">
                {/* Video Feed */}
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-750 border-b border-gray-700">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300 font-medium">Live Camera</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-red-400 font-semibold">LIVE</span>
                      </div>
                    </div>
                    {videoFrame ? (
                      <img
                        src={videoFrame}
                        alt="Student camera"
                        className="w-full aspect-video object-cover"
                      />
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-gray-900">
                        <div className="text-center text-gray-500">
                          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">No video feed</p>
                        </div>
                      </div>
                    )}
                    {/* Face & eye detection overlays */}
                    <div className="p-3 flex items-center gap-4 border-t border-gray-700">
                      <div
                        className={`flex items-center gap-1.5 text-xs ${student.face_detected ? 'text-green-400' : 'text-red-400'}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {student.face_detected ? 'Face Detected' : 'No Face'}
                      </div>
                      <div
                        className={`flex items-center gap-1.5 text-xs ${student.looking_at_screen ? 'text-green-400' : 'text-yellow-400'}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {student.looking_at_screen ? 'Looking at Screen' : 'Looking Away'}
                      </div>
                    </div>
                  </div>

                  {/* Audio Level */}
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-300 font-medium">Audio Level</span>
                      </div>
                      <span
                        className={`text-xs font-bold ${audioLevel > 60 ? 'text-red-400' : audioLevel > 30 ? 'text-yellow-400' : 'text-green-400'}`}
                      >
                        {audioLevel > 60 ? '⚠ HIGH' : audioLevel > 30 ? 'MEDIUM' : 'LOW'}
                      </span>
                    </div>
                    <AudioWaveform
                      audioLevel={audioLevel}
                      isActive={student.status === 'active'}
                      height={48}
                      barCount={30}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>0</span>
                      <span className="text-gray-400">{Math.round(audioLevel)}%</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>

                {/* Stats Panel */}
                <div className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                      <Shield className="w-5 h-5 text-purple-400 mb-2" />
                      <div className={`text-2xl font-black ${trustColor}`}>
                        {student.trust_score}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Trust Score</div>
                      <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            student.trust_score >= 80
                              ? 'bg-emerald-500'
                              : student.trust_score >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${student.trust_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                      <Activity className="w-5 h-5 text-blue-400 mb-2" />
                      <div className="text-2xl font-black text-blue-400">
                        {student.attention_level || 0}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Attention</div>
                      <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${student.attention_level || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                      <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
                      <div className="text-2xl font-black text-red-400">
                        {student.flags_count || student.flags || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Flags</div>
                      <div className="text-xs text-red-400 mt-1">
                        {criticalFlags.length} critical, {highFlags.length} high
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                      <Clock className="w-5 h-5 text-gray-400 mb-2" />
                      <div className="text-2xl font-black text-gray-300">{timeElapsed}m</div>
                      <div className="text-xs text-gray-500 mt-1">Time Elapsed</div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-300 font-medium">Exam Progress</span>
                      <span className="text-sm font-bold text-white">
                        {student.answered_questions} / {totalQuestions}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Started: {new Date(student.start_time).toLocaleTimeString()}</span>
                      <span>{Math.round(progress)}% complete</span>
                    </div>
                  </div>

                  {/* Recent Violations Summary */}
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-300 font-medium">Violation Summary</span>
                    </div>
                    {studentFlags.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>No violations detected</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {studentFlags.slice(-3).map((flag, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 truncate flex-1">
                              {flag.flag_type || flag.type || 'Violation'}
                            </span>
                            <span
                              className={`ml-2 px-2 py-0.5 rounded border text-xs ${getSeverityBadge(flag.severity)}`}
                            >
                              {flag.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIOLATIONS TAB */}
            {activeTab === 'violations' && (
              <div className="p-5">
                {studentFlags.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-400 text-lg font-semibold">No Violations Recorded</p>
                    <p className="text-gray-600 text-sm mt-1">
                      This student has maintained exam integrity
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...studentFlags].reverse().map((flag, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`border-l-4 rounded-lg p-4 ${
                          (flag.severity || '').toUpperCase() === 'CRITICAL'
                            ? 'border-red-500 bg-red-950/30'
                            : (flag.severity || '').toUpperCase() === 'HIGH'
                              ? 'border-orange-500 bg-orange-950/30'
                              : 'border-yellow-500 bg-yellow-950/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle
                                className={`w-4 h-4 flex-shrink-0 ${
                                  (flag.severity || '').toUpperCase() === 'CRITICAL'
                                    ? 'text-red-400'
                                    : (flag.severity || '').toUpperCase() === 'HIGH'
                                      ? 'text-orange-400'
                                      : 'text-yellow-400'
                                }`}
                              />
                              <span className="font-semibold text-sm text-white">
                                {(flag.flag_type || flag.type || 'Violation').replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-1">
                              {flag.evidence || flag.message || 'Violation recorded'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-2 py-0.5 rounded border text-xs font-bold ${getSeverityBadge(flag.severity)}`}
                            >
                              {flag.severity.toUpperCase()}
                            </span>
                            <span className="text-gray-600 text-xs">
                              {new Date(flag.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INTERVENTION TAB */}
            {activeTab === 'intervention' && (
              <div className="p-5 space-y-5">
                <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-4 text-sm text-yellow-300">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Use interventions carefully. All actions are logged and visible to the student.
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    Intervention Message
                  </label>
                  <textarea
                    value={interventionMessage}
                    onChange={e => setInterventionMessage(e.target.value)}
                    placeholder="Enter message to send to student..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleIntervene('warn')}
                    disabled={!interventionMessage.trim() || intervening}
                    className="flex flex-col items-center gap-2 p-4 bg-yellow-950/30 border border-yellow-600/50 rounded-xl text-yellow-400 hover:bg-yellow-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-sm font-semibold">Send Warning</span>
                    <span className="text-xs text-yellow-600">Student sees message</span>
                  </button>

                  {student.is_paused ? (
                    <button
                      onClick={() => handleIntervene('resume')}
                      disabled={intervening}
                      className="flex flex-col items-center gap-2 p-4 bg-green-950/30 border border-green-600/50 rounded-xl text-green-400 hover:bg-green-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pause className="w-6 h-6" />
                      <span className="text-sm font-semibold">Resume Exam</span>
                      <span className="text-xs text-green-600">Let student continue</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleIntervene('pause')}
                      disabled={!interventionMessage.trim() || intervening}
                      className="flex flex-col items-center gap-2 p-4 bg-orange-950/30 border border-orange-600/50 rounded-xl text-orange-400 hover:bg-orange-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pause className="w-6 h-6" />
                      <span className="text-sm font-semibold">Pause Exam</span>
                      <span className="text-xs text-orange-600">Stops student temporarily</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleIntervene('terminate')}
                    disabled={intervening}
                    className="flex flex-col items-center gap-2 p-4 bg-red-950/30 border border-red-600/50 rounded-xl text-red-400 hover:bg-red-900/30 transition"
                  >
                    <XCircle className="w-6 h-6" />
                    <span className="text-sm font-semibold">Terminate</span>
                    <span className="text-xs text-red-600">Ends exam permanently</span>
                  </button>
                </div>

                {intervening && (
                  <div className="text-center text-green-400 text-sm animate-pulse">
                    ✓ Intervention sent successfully
                  </div>
                )}
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && wsClientRef && examId && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-bold">Chat with {student.student_name}</h3>
                </div>
                <div className="flex justify-center">
                  <div className="w-full" style={{ position: 'relative', minHeight: '300px' }}>
                    <ExamChat
                      wsClientRef={wsClientRef}
                      userId={''}
                      userName={'Teacher'}
                      role="teacher"
                      examId={examId}
                      forStudentId={student.student_id}
                    />
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-4 text-center">
                  Messages are sent in real-time. Student will see your reply immediately.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
