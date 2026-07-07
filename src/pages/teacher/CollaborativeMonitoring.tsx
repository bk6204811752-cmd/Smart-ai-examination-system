import { useState, useEffect } from 'react'
import { collaborativeMonitoringAPI } from '../../lib/advancedAPIs'
import { Users, AlertTriangle, MessageSquare, CheckCircle, Brain } from 'lucide-react'
import { toast } from 'sonner'

interface Alert {
  alert_id: string
  student_id: string
  student_name: string
  alert_type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  ai_recommendation: string
  assigned_teacher: string | null
  status: 'pending' | 'reviewing' | 'resolved'
  timestamp: number
}

interface StudentState {
  student_id: string
  student_name: string
  current_question: number
  progress_percentage: number
  time_remaining: number
  current_risk_score: number
  violation_count: number
  attention_level: number
  is_paused: boolean
  teacher_watching: string | null
  flags: string[]
}

interface ExamState {
  exam_id: string
  exam_title: string
  active_students: Record<string, StudentState>
  alerts: Alert[]
  teachers: Array<{
    teacher_id: string
    teacher_name: string
    workload_score: number
    watching_count: number
  }>
  team_messages: Array<{
    teacher_name: string
    message: string
    timestamp: number
  }>
}

export default function CollaborativeMonitoring({
  examId = '',
  teacherId = '',
  teacherName = 'Teacher',
}: {
  examId?: string
  teacherId?: string
  teacherName?: string
}) {
  const [examState, setExamState] = useState<ExamState | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [filter, setFilter] = useState<'all' | 'high-risk' | 'flagged'>('all')

  useEffect(() => {
    joinMonitoring()
    const interval = setInterval(fetchExamState, 2000) // Refresh every 2 seconds
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const joinMonitoring = async () => {
    try {
      await collaborativeMonitoringAPI.teacherJoin({
        exam_id: examId,
        teacher_id: teacherId,
        teacher_name: teacherName,
      })
      toast.success('Joined collaborative monitoring')
      fetchExamState()
    } catch (error: any) {
      toast.error('Failed to join monitoring')
    }
  }

  const fetchExamState = async () => {
    try {
      const state = await collaborativeMonitoringAPI.getExamState(examId)
      setExamState(state)
    } catch (error) {
      console.error('Failed to fetch exam state:', error)
    }
  }

  const handleIntervention = async (
    studentId: string,
    action: 'WARNING' | 'PAUSE_EXAM' | 'MESSAGE' | 'TERMINATE' | 'CLEAR_VIOLATION',
    message?: string
  ) => {
    try {
      await collaborativeMonitoringAPI.teacherIntervene({
        exam_id: examId,
        student_id: studentId,
        teacher_id: teacherId,
        action,
        message,
      })
      toast.success(`Intervention sent: ${action}`)
      fetchExamState()
    } catch (error: any) {
      toast.error('Failed to send intervention')
    }
  }

  const getStudentsList = () => {
    if (!examState) return []
    const students = Object.values(examState.active_students)

    switch (filter) {
      case 'high-risk':
        return students.filter(s => s.current_risk_score >= 70)
      case 'flagged':
        return students.filter(s => s.flags.length > 0)
      default:
        return students
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500'
      case 'HIGH':
        return 'bg-orange-500'
      case 'MEDIUM':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 85) return 'bg-red-500'
    if (score >= 70) return 'bg-orange-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const pendingAlerts = examState?.alerts.filter(a => a.status === 'pending') || []
  const highRiskCount = examState
    ? Object.values(examState.active_students).filter(s => s.current_risk_score >= 70).length
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Collaborative Monitoring
              </h1>
              <p className="text-white/90 mt-1">{examState?.exam_title || 'Loading...'}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {Object.keys(examState?.active_students || {}).length}
                </div>
                <div className="text-xs text-white/80">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-200">{highRiskCount}</div>
                <div className="text-xs text-white/80">High Risk</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-200">{pendingAlerts.length}</div>
                <div className="text-xs text-white/80">Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{examState?.teachers.length || 0}</div>
                <div className="text-xs text-white/80">Teachers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Student Grid */}
          <div className="col-span-8 space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Students ({Object.keys(examState?.active_students || {}).length})
              </button>
              <button
                onClick={() => setFilter('high-risk')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'high-risk'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                High Risk ({highRiskCount})
              </button>
              <button
                onClick={() => setFilter('flagged')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'flagged'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Flagged
              </button>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-2 gap-4">
              {getStudentsList().map(student => (
                <div
                  key={student.student_id}
                  className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition hover:shadow-md ${
                    selectedStudent === student.student_id ? 'ring-2 ring-purple-600' : ''
                  }`}
                  onClick={() => setSelectedStudent(student.student_id)}
                >
                  {/* Student Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{student.student_name}</h3>
                      <p className="text-xs text-gray-500">
                        Q {student.current_question} • {student.progress_percentage}% complete
                      </p>
                    </div>
                    {student.is_paused && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                        PAUSED
                      </span>
                    )}
                  </div>

                  {/* Risk Score */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Risk Score</span>
                      <span className="text-sm font-bold">{student.current_risk_score}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all ${getRiskColor(student.current_risk_score)}`}
                        style={{ width: `${student.current_risk_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{student.violation_count}</div>
                      <div className="text-gray-500">Violations</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{student.attention_level}%</div>
                      <div className="text-gray-500">Attention</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-900">
                        {Math.floor(student.time_remaining / 60)}
                      </div>
                      <div className="text-gray-500">Min left</div>
                    </div>
                  </div>

                  {/* Flags */}
                  {student.flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {student.flags.map((flag, idx) => (
                        <span
                          key={idx}
                          className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="mt-3 flex gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleIntervention(student.student_id, 'WARNING')
                      }}
                      className="flex-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs hover:bg-yellow-200 transition"
                    >
                      Warn
                    </button>
                    {!student.is_paused ? (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleIntervention(student.student_id, 'PAUSE_EXAM')
                        }}
                        className="flex-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs hover:bg-orange-200 transition"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleIntervention(student.student_id, 'CLEAR_VIOLATION')
                        }}
                        className="flex-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200 transition"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-4 space-y-4">
            {/* Alert Queue */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                Alert Queue ({pendingAlerts.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pendingAlerts.map(alert => (
                  <div key={alert.alert_id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className={`w-1 h-full ${getPriorityColor(alert.priority)} rounded`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {alert.student_name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              alert.priority === 'CRITICAL'
                                ? 'bg-red-100 text-red-700'
                                : alert.priority === 'HIGH'
                                  ? 'bg-orange-100 text-orange-700'
                                  : alert.priority === 'MEDIUM'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {alert.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{alert.message}</p>
                        <div className="flex items-start gap-1 mb-2">
                          <Brain className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-purple-700">{alert.ai_recommendation}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleIntervention(alert.student_id, 'WARNING')}
                            className="flex-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs hover:bg-yellow-200"
                          >
                            Warn
                          </button>
                          <button
                            onClick={() => handleIntervention(alert.student_id, 'PAUSE_EXAM')}
                            className="flex-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs hover:bg-orange-200"
                          >
                            Pause
                          </button>
                          <button
                            onClick={() => handleIntervention(alert.student_id, 'TERMINATE')}
                            className="flex-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200"
                          >
                            End
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingAlerts.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No pending alerts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Teacher Team */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Teacher Team ({examState?.teachers.length || 0})
              </h3>
              <div className="space-y-2">
                {examState?.teachers.map(teacher => (
                  <div
                    key={teacher.teacher_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-900">{teacher.teacher_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {teacher.watching_count} watching
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          teacher.workload_score > 80
                            ? 'bg-red-500'
                            : teacher.workload_score > 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Chat */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Team Chat
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {examState?.team_messages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium text-gray-900">{msg.teacher_name}:</span>
                    <span className="text-gray-600 ml-1">{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && messageInput.trim()) {
                      // Send message via API
                      setMessageInput('')
                    }
                  }}
                  placeholder="Type message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
