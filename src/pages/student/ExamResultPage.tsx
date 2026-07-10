import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Home,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Trophy,
} from 'lucide-react'
import { resultsAPI } from '../../lib/api'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface SubmissionResult {
  _id: string
  exam_id: string
  exam_title: string
  student_name: string
  score: number
  total: number
  percentage: number
  time_taken: number
  date: string
  passed: boolean
  proctoring_violations?: number
  answers?: Record<string, any>
  detailed_results?: Array<{
    question: string
    student_answer: any
    correct_answer: any
    is_correct: boolean
    explanation?: string
    marks?: number
  }>
}

export default function ExamResultPage() {
  const navigate = useNavigate()
  const { submissionId } = useParams()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [allResults, setAllResults] = useState<SubmissionResult[]>([])
  const initialResult = (location.state as { result?: SubmissionResult } | null)?.result

  useEffect(() => {
    if (initialResult) {
      setResult(initialResult)
      setLoading(false)
      setError(null)
      return
    }
    loadResults()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, initialResult])

  const loadResults = async () => {
    try {
      setLoading(true)
      setError(null)

      if (submissionId) {
        // Load specific submission
        const data = await resultsAPI.getResult(submissionId)
        setResult(data)
      } else {
        // Load all results for the student
        const data = await resultsAPI.getResults()
        setAllResults(data)
        // Show the most recent result if available
        if (data && data.length > 0) {
          setResult(data[0])
        }
      }
    } catch (error: any) {
      console.error('Failed to load results:', error)
      setError(error?.response?.data?.detail || 'Failed to load results')
      toast.error('Could not load exam results')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600' }
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600' }
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600' }
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600' }
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600' }
    return { grade: 'F', color: 'text-red-600' }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center bg-white rounded-2xl shadow-lg p-10 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Results Found</h2>
          <p className="text-gray-600 mb-6">
            {error || "You haven't taken any exams yet. Complete an exam to see your results."}
          </p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isPassed = result.passed
  const gradeInfo = getGrade(result.percentage)
  const correctCount = result.detailed_results?.filter(q => q.is_correct).length ?? result.score
  const wrongCount = result.detailed_results
    ? result.detailed_results.filter(q => !q.is_correct).length
    : result.total - result.score

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* All Results Selector */}
        {allResults.length > 1 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 overflow-x-auto">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
              Recent Results:
            </span>
            {allResults.slice(0, 5).map((r, i) => (
              <button
                key={r._id}
                onClick={() => setResult(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  result._id === r._id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {r.exam_title || `Exam ${i + 1}`} ({r.percentage?.toFixed(0)}%)
              </button>
            ))}
          </div>
        )}

        {/* Result Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl shadow-xl p-8 mb-8 ${
            isPassed
              ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600'
              : 'bg-gradient-to-br from-red-600 via-orange-600 to-amber-600'
          } text-white`}
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              {isPassed ? (
                <div className="bg-white/20 rounded-full p-3">
                  <CheckCircle className="w-12 h-12" />
                </div>
              ) : (
                <div className="bg-white/20 rounded-full p-3">
                  <XCircle className="w-12 h-12" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">
                  {isPassed ? '🎉 Congratulations!' : '💪 Keep Going!'}
                </h1>
                <p className="text-white/80 text-lg">{result.exam_title || 'Exam Result'}</p>
                <p className="text-white/60 text-sm">{formatDate(result.date)}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold">{result.percentage?.toFixed(1)}%</div>
              <div className="text-xl">
                Grade: <span className="font-bold">{gradeInfo.grade}</span>
              </div>
              <div className="text-white/80 font-medium mt-1">
                {isPassed ? '✅ PASSED' : '❌ FAILED'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-white/80 mb-1">Score</p>
              <p className="text-2xl font-bold">
                {result.score}/{result.total}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-white/80 mb-1">Time Taken</p>
              <p className="text-2xl font-bold">{formatTime(result.time_taken)}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-white/80 mb-1">Correct</p>
              <p className="text-2xl font-bold text-green-300">{correctCount}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-white/80 mb-1">Violations</p>
              <p className="text-2xl font-bold text-yellow-300">
                {result.proctoring_violations || 0}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl shadow-sm p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Correct Answers</h3>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-4xl font-bold text-green-600">{correctCount}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Accuracy</span>
                <span>
                  {result.total > 0 ? Math.round((correctCount / result.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${result.total > 0 ? (correctCount / result.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Wrong Answers</h3>
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-4xl font-bold text-red-600">{wrongCount}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Error Rate</span>
                <span>{result.total > 0 ? Math.round((wrongCount / result.total) * 100) : 0}%</span>
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${result.total > 0 ? (wrongCount / result.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Performance</h3>
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <p className={`text-4xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Score</span>
                <span>{result.percentage?.toFixed(1)}%</span>
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${result.percentage || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust Score */}
        {result.proctoring_violations !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-indigo-100"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-indigo-600" />
              Integrity & Trust Score
            </h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div
                  className={`text-5xl font-bold ${
                    result.proctoring_violations === 0
                      ? 'text-green-600'
                      : result.proctoring_violations <= 2
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {Math.max(0, 100 - (result.proctoring_violations || 0) * 10)}%
                </div>
                <p className="text-sm text-gray-500 mt-1">Trust Score</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Proctoring Violations</span>
                  <span
                    className={`font-semibold ${
                      result.proctoring_violations === 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.proctoring_violations || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      result.proctoring_violations === 0
                        ? 'bg-green-500'
                        : result.proctoring_violations <= 2
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.max(0, 100 - (result.proctoring_violations || 0) * 10)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {result.proctoring_violations === 0
                    ? '✅ Perfect integrity - no violations detected'
                    : `⚠️ ${result.proctoring_violations} violation(s) recorded during the exam`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Question Review - Shows student's selected option for each question */}
        {result.detailed_results && result.detailed_results.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden border border-gray-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Question Review</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {result.detailed_results.filter(q => q.is_correct).length} correct out of{' '}
                  {result.detailed_results.length} questions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600 font-medium">Correct</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-gray-600 font-medium">Wrong</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-gray-600 font-medium">Skipped</span>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="divide-y divide-gray-50">
              {result.detailed_results.map((q, index) => {
                // Fallback: if student_answer is null but raw answers have a value, use that
                const rawFallback = result.answers
                  ? (result.answers[index.toString()] ??
                     result.answers[String(index)] ??
                     Object.values(result.answers)[index])
                  : null
                const studentAnswer = q.student_answer ?? rawFallback ?? null
                const isSkipped =
                  studentAnswer === null ||
                  studentAnswer === undefined ||
                  String(studentAnswer).trim() === ''
                return (
                  <div
                    key={index}
                    className={`p-5 sm:p-6 transition-colors ${
                      isSkipped ? 'bg-gray-50/50' : q.is_correct ? 'bg-green-50/30' : 'bg-red-50/30'
                    }`}
                  >
                    {/* Question Row Header */}
                    <div className="flex items-start gap-3 mb-4">
                      {/* Status Icon */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isSkipped
                            ? 'bg-gray-100 text-gray-500'
                            : q.is_correct
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isSkipped ? '—' : q.is_correct ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        {/* Q# and marks */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                              isSkipped
                                ? 'bg-gray-100 text-gray-500'
                                : q.is_correct
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            Q{index + 1} •{' '}
                            {isSkipped ? 'Skipped' : q.is_correct ? 'Correct' : 'Incorrect'}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            {q.is_correct ? q.marks || 1 : 0}/{q.marks || 1}{' '}
                            {(q.marks || 1) === 1 ? 'mark' : 'marks'}
                          </span>
                        </div>
                        {/* Question Text */}
                        <p className="text-gray-900 text-sm sm:text-base font-medium leading-relaxed">
                          {q.question || 'Question text unavailable'}
                        </p>
                      </div>
                    </div>

                    {/* Answers grid */}
                    <div className="ml-11 grid sm:grid-cols-2 gap-3">
                      {/* Student's Answer */}
                      <div
                        className={`rounded-xl p-3 border ${
                          isSkipped
                            ? 'bg-gray-50 border-gray-200'
                            : q.is_correct
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                          Your Answer
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            isSkipped
                              ? 'text-gray-400 italic'
                              : q.is_correct
                                ? 'text-green-800'
                                : 'text-red-800'
                          }`}
                        >
                          {isSkipped
                            ? 'Not answered'
                            : Array.isArray(studentAnswer)
                              ? studentAnswer.join(', ')
                              : String(studentAnswer)}
                        </p>
                      </div>

                      {/* Correct Answer — always shown */}
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                          Correct Answer
                        </p>
                        <p className="text-sm font-semibold text-green-800">
                          {q.correct_answer !== null && q.correct_answer !== undefined ? (
                            Array.isArray(q.correct_answer) ? (
                              q.correct_answer.join(', ')
                            ) : (
                              String(q.correct_answer)
                            )
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="ml-11 mt-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl p-3">
                        <p className="text-xs font-bold text-blue-700 mb-1">Explanation</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          /* Fallback when detailed_results is not available - show raw answers */
          result.answers && Object.keys(result.answers).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden border border-gray-100"
            >
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="text-xl font-bold text-gray-900">Your Answers</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {Object.keys(result.answers).length} question(s) answered
                </p>
              </div>
              <div className="divide-y divide-gray-50 p-4">
                {Object.entries(result.answers).map(([qId, answer], idx) => (
                  <div key={qId} className="py-3 flex items-start gap-3">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {Array.isArray(answer) ? answer.join(', ') : String(answer)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        )}

        {/* Message if no answer data available at all */}
        {(!result.detailed_results || result.detailed_results.length === 0) &&
          (!result.answers || Object.keys(result.answers).length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center border border-gray-100"
            >
              <p className="text-gray-400">No answer details available for this submission.</p>
            </motion.div>
          )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            <Home className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center space-x-4 flex-wrap gap-3">
            <button
              onClick={() => navigate('/practice')}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Practice More</span>
            </button>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
            >
              <span>Take Another Exam</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
