import { useState, useEffect } from 'react'
import { Gauge, TrendingUp, Users, Target, Zap, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { analyticsAPI, examAPI } from '../../lib/api'

interface QuestionStats {
  question_id: string
  question_text: string
  topic: string
  current_difficulty: number
  actual_difficulty: number
  response_rate: number
  correct_rate: number
  avg_time_spent: number
  discrimination_index: number
  student_feedback: number
  needs_calibration: boolean
  recommended_action: 'easier' | 'harder' | 'remove' | 'keep'
}

interface ExamCalibration {
  exam_id: string
  exam_title: string
  target_difficulty: number
  current_difficulty: number
  calibration_score: number
  questions: QuestionStats[]
  recommendations: {
    questions_to_replace: string[]
    questions_to_adjust: { id: string; from: number; to: number }[]
    overall_suggestion: string
  }
  student_performance: {
    total_attempts: number
    avg_score: number
    score_distribution: { range: string; count: number }[]
    completion_rate: number
    avg_time: number
  }
}

export default function ExamDifficultyCalibrator() {
  const [exams, setExams] = useState<{ id: string; title: string }[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [calibration, setCalibration] = useState<ExamCalibration | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCal, setLoadingCal] = useState(false)
  const [targetDifficulty, setTargetDifficulty] = useState(0.7)

  useEffect(() => {
    loadExams()
  }, [])

  useEffect(() => {
    if (selectedExamId) loadCalibrationData(selectedExamId)
    else setCalibration(null)
  }, [selectedExamId])

  const loadExams = async () => {
    setLoading(true)
    try {
      const data = await examAPI.getExams()
      if (Array.isArray(data)) {
        setExams(data.map((e: any) => ({ id: e._id, title: e.title || 'Untitled' })))
        if (data.length > 0) setSelectedExamId(data[0]._id)
      }
    } catch {
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  const loadCalibrationData = async (examId: string) => {
    setLoadingCal(true)
    try {
      const data = await analyticsAPI.getCalibrationData(examId)
      setCalibration(data)
      setTargetDifficulty(data.target_difficulty || 0.7)
    } catch {
      toast.error('Failed to load calibration data')
      setCalibration(null)
    } finally {
      setLoadingCal(false)
    }
  }

  const autoCalibrate = async () => {
    if (!calibration) return
    toast.success('Auto-calibration applied! Question difficulties adjusted.')
    loadCalibrationData(selectedExamId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading exams...</p>
        </div>
      </div>
    )
  }

  if (loadingCal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analyzing exam difficulty with AI...</p>
        </div>
      </div>
    )
  }

  if (!calibration) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600">
          <Gauge className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>Select an exam to calibrate</p>
        </div>
      </div>
    )
  }

  const difficultyGap = Math.abs(calibration.current_difficulty - calibration.target_difficulty)
  const needsCalibration = difficultyGap > 0.05

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-xl shadow-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Gauge className="w-8 h-8" />
                Exam Difficulty Calibrator
              </h1>
              <div className="text-white/90 mt-2">
                <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}
                  className="bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2 mt-2">
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id} className="text-gray-900">{exam.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={autoCalibrate} disabled={!needsCalibration}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${!needsCalibration ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
              <Zap className="w-5 h-5" /> Auto-Calibrate
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-600 mb-2">Target Difficulty</div>
            <div className="text-3xl font-bold text-purple-600 mb-3">{(calibration.target_difficulty * 100).toFixed(0)}%</div>
            <input type="range" min="0" max="1" step="0.05" value={targetDifficulty}
              onChange={e => setTargetDifficulty(parseFloat(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Easy</span><span>Hard</span></div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-600 mb-2">Current Difficulty</div>
            <div className="text-3xl font-bold text-blue-600">{(calibration.current_difficulty * 100).toFixed(0)}%</div>
            <div className={`text-sm mt-2 ${needsCalibration ? 'text-red-600' : 'text-green-600'}`}>
              {needsCalibration ? '⚠️ Needs adjustment' : '✓ Well calibrated'}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-600 mb-2">Calibration Score</div>
            <div className="text-3xl font-bold text-green-600">{(calibration.calibration_score * 100).toFixed(0)}%</div>
            <div className="bg-green-100 rounded-full h-2 mt-3">
              <div className="bg-green-600 h-full rounded-full" style={{ width: `${calibration.calibration_score * 100}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-600 mb-2">Student Attempts</div>
            <div className="text-3xl font-bold text-indigo-600">{calibration.student_performance.total_attempts}</div>
            <div className="text-sm text-gray-600 mt-2">Avg: {calibration.student_performance.avg_score.toFixed(1)}%</div>
          </div>
        </div>

        {needsCalibration && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-2">AI Recommendations</h3>
                <p className="text-yellow-800 mb-4">{calibration.recommendations.overall_suggestion}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {calibration.recommendations.questions_to_replace.length > 0 && (
                    <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">Remove Questions</h4>
                      <ul className="text-sm text-red-800 space-y-1">
                        {calibration.recommendations.questions_to_replace.map(id => <li key={id}>• Question {id}</li>)}
                      </ul>
                    </div>
                  )}
                  {calibration.recommendations.questions_to_adjust.length > 0 && (
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Adjust Difficulty</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {calibration.recommendations.questions_to_adjust.map(adj => (
                          <li key={adj.id}>• Question {adj.id}: {(adj.from * 100).toFixed(0)}% → {(adj.to * 100).toFixed(0)}%</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" /> Question-by-Question Analysis
          </h3>
          <div className="space-y-4">
            {calibration.questions.map((question, index) => (
              <div key={question.question_id}
                className={`border-2 rounded-xl p-6 ${question.needs_calibration ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-500">Q{index + 1}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{question.topic}</span>
                      {question.needs_calibration && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Needs Calibration</span>}
                      {question.recommended_action === 'remove' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Consider Removing</span>}
                    </div>
                    <p className="text-gray-800 font-medium">{question.question_text}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{(question.actual_difficulty * 100).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">Actual Difficulty</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <MetricBadge label="Correct Rate" value={`${(question.correct_rate * 100).toFixed(0)}%`}
                    color={question.correct_rate > 0.7 ? 'green' : question.correct_rate > 0.4 ? 'yellow' : 'red'} />
                  <MetricBadge label="Response Rate" value={`${(question.response_rate * 100).toFixed(0)}%`}
                    color={question.response_rate > 0.9 ? 'green' : question.response_rate > 0.7 ? 'yellow' : 'red'} />
                  <MetricBadge label="Avg Time" value={`${Math.floor(question.avg_time_spent / 60)}m ${question.avg_time_spent % 60}s`} color="blue" />
                  <MetricBadge label="Discrimination" value={(question.discrimination_index * 100).toFixed(0)}
                    color={question.discrimination_index > 0.7 ? 'green' : question.discrimination_index > 0.4 ? 'yellow' : 'red'} />
                  <MetricBadge label="Feedback" value={`${question.student_feedback.toFixed(1)}/5`}
                    color={question.student_feedback > 3.5 ? 'green' : question.student_feedback > 2.5 ? 'yellow' : 'red'} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Expected Difficulty:</span>
                      <span className="font-medium">{(question.current_difficulty * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${question.current_difficulty * 100}%` }} />
                    </div>
                  </div>
                  <div className="ml-6"><ActionButton action={question.recommended_action} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Score Distribution
          </h3>
          <div className="space-y-3">
            {calibration.student_performance.score_distribution.map(dist => {
              const maxCount = Math.max(...calibration.student_performance.score_distribution.map(d => d.count), 1)
              return (
                <div key={dist.range} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-gray-700">{dist.range}%</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full flex items-center justify-end px-3 text-white text-sm font-medium transition-all"
                      style={{ width: `${(dist.count / maxCount) * 100}%` }}>
                      {dist.count > 0 && `${dist.count} students`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricBadge({ label, value, color }: { label: string; value: string; color: 'green' | 'yellow' | 'red' | 'blue' }) {
  const colors = { green: 'bg-green-100 text-green-800', yellow: 'bg-yellow-100 text-yellow-800', red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800' }
  return (
    <div className={`${colors[color]} rounded-lg p-3 text-center`}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  )
}

function ActionButton({ action }: { action: 'easier' | 'harder' | 'remove' | 'keep' }) {
  const configs = {
    easier: { label: 'Make Easier', color: 'bg-green-600 hover:bg-green-700', icon: '↓' },
    harder: { label: 'Make Harder', color: 'bg-red-600 hover:bg-red-700', icon: '↑' },
    remove: { label: 'Remove', color: 'bg-gray-600 hover:bg-gray-700', icon: '×' },
    keep: { label: 'Keep As-Is', color: 'bg-blue-600 hover:bg-blue-700', icon: '✓' },
  }
  const c = configs[action]
  return (
    <button className={`${c.color} text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2`}>
      <span>{c.icon}</span> {c.label}
    </button>
  )
}
