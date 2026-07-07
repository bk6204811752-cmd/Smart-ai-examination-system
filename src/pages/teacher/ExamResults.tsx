import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { resultsAPI, examAPI } from '../../lib/api'
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  BarChart3,
  Search,
  Eye,
  Award,
} from 'lucide-react'

interface SubmissionResult {
  _id: string
  exam_id: string
  exam_title?: string
  student_id: string
  student_name?: string
  score: number
  total: number
  percentage: number
  time_taken: number
  date: string
  passed: boolean
  proctoring_violations?: number
  detailed_results?: Array<{
    question: string
    student_answer: any
    correct_answer: any
    is_correct: boolean
    explanation?: string
    marks?: number
  }>
}

export default function ExamResultsPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<SubmissionResult[]>([])
  const [exam, setExam] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPassed, setFilterPassed] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionResult | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [examData, resultsData] = await Promise.all([
        examId ? examAPI.getExam(examId).catch(() => null) : Promise.resolve(null),
        examId ? resultsAPI.getExamResults(examId) : Promise.resolve([]),
      ])
      setExam(examData)
      setSubmissions(Array.isArray(resultsData) ? resultsData : [])
    } catch (err) {
      console.error('Failed to load exam results:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDetailedResult = async (submission: SubmissionResult) => {
    if (submission.detailed_results && submission.detailed_results.length > 0) {
      setSelectedSubmission(submission)
      return
    }
    setDetailLoading(true)
    try {
      const detailed = await resultsAPI.getDetailedResult(submission._id)
      setSelectedSubmission(detailed)
    } catch (err) {
      console.error('Failed to load detailed result:', err)
    } finally {
      setDetailLoading(false)
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
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const filteredSubmissions = submissions.filter(s => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !q ||
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.student_id || '').toLowerCase().includes(q)
    const matchesFilter =
      filterPassed === 'all' ||
      (filterPassed === 'passed' && s.passed) ||
      (filterPassed === 'failed' && !s.passed)
    return matchesSearch && matchesFilter
  })

  const avgScore =
    submissions.length > 0
      ? submissions.reduce((s, r) => s + r.percentage, 0) / submissions.length
      : 0
  const passCount = submissions.filter(r => r.passed).length
  const passRate = submissions.length > 0 ? (passCount / submissions.length) * 100 : 0
  const totalViolations = submissions.reduce((s, r) => s + (r.proctoring_violations || 0), 0)

  const exportCSV = () => {
    const csv = [
      [
        'Student Name',
        'Student ID',
        'Score',
        'Total',
        'Percentage',
        'Passed',
        'Time Taken',
        'Violations',
        'Date',
      ],
      ...filteredSubmissions.map(s => [
        s.student_name || 'N/A',
        s.student_id,
        s.score,
        s.total,
        s.percentage?.toFixed(1),
        s.passed ? 'Yes' : 'No',
        formatTime(s.time_taken),
        s.proctoring_violations || 0,
        formatDate(s.date),
      ]),
    ]
      .map(r => r.join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam-results-${examId}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-200 transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam?.title || 'Exam Results'}</h1>
              <p className="text-sm text-gray-500">
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''} • {passCount}{' '}
                passed • {avgScore.toFixed(1)}% avg
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={filteredSubmissions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-semibold"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total Submissions</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{submissions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Average Score</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{avgScore.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Pass Rate</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{passRate.toFixed(0)}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Total Violations</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{totalViolations}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by student name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <select
            value={filterPassed}
            onChange={e => setFilterPassed(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="all">All Students</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-400 font-medium text-lg">No submissions found</p>
            <p className="text-gray-300 text-sm mt-1">
              {searchQuery
                ? 'Try a different search query'
                : 'No students have submitted this exam yet'}
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Submissions List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Students ({filteredSubmissions.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {filteredSubmissions.map(sub => (
                  <div
                    key={sub._id}
                    onClick={() => loadDetailedResult(sub)}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedSubmission?._id === sub._id
                        ? 'bg-blue-50 border-l-2 border-blue-500'
                        : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                        sub.passed ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {sub.passed ? 'P' : 'F'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {sub.student_name || `Student (${sub.student_id?.slice(0, 8)})`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>
                          {sub.score}/{sub.total}
                        </span>
                        <span>•</span>
                        <span>{sub.percentage?.toFixed(1)}%</span>
                        {sub.proctoring_violations ? (
                          <>
                            <span>•</span>
                            <span className="text-orange-500">
                              {sub.proctoring_violations} violation
                              {sub.proctoring_violations !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          sub.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {sub.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <Eye className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Detail / Question Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {detailLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">Loading details...</p>
                  </div>
                </div>
              ) : selectedSubmission ? (
                <div>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      {selectedSubmission.student_name || 'Student'} – Detail
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Score:</span>
                      <span
                        className={`font-bold ${selectedSubmission.passed ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {selectedSubmission.percentage?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                    {selectedSubmission.detailed_results?.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-4 ${q.is_correct ? 'bg-green-50/30' : 'bg-red-50/30'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              q.is_correct
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {q.is_correct ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-gray-500 uppercase">
                                Q{idx + 1}
                              </span>
                              <span className="text-xs text-gray-400">
                                {q.marks || 1} pt{q.marks !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mb-3 leading-relaxed">
                              {q.question}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div
                                className={`rounded-lg p-2 border ${
                                  q.is_correct
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                                }`}
                              >
                                <p className="text-xs font-bold text-gray-500 mb-0.5">
                                  Student Answer
                                </p>
                                <p className="text-xs font-semibold text-gray-800">
                                  {q.student_answer !== null && q.student_answer !== undefined ? (
                                    Array.isArray(q.student_answer) ? (
                                      q.student_answer.join(', ')
                                    ) : (
                                      String(q.student_answer)
                                    )
                                  ) : (
                                    <span className="text-gray-400 italic">Not answered</span>
                                  )}
                                </p>
                              </div>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                <p className="text-xs font-bold text-gray-500 mb-0.5">
                                  Correct Answer
                                </p>
                                <p className="text-xs font-semibold text-green-800">
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
                            {q.explanation && (
                              <div className="mt-2 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-2">
                                <p className="text-xs text-blue-800">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedSubmission.detailed_results ||
                      selectedSubmission.detailed_results.length === 0) && (
                      <div className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                        <p className="text-gray-400">
                          No detailed results available for this submission
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Time taken: {formatTime(selectedSubmission.time_taken)}
                    </span>
                    <span className="text-gray-500">
                      Date: {formatDate(selectedSubmission.date)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-400 font-medium">Select a student</p>
                    <p className="text-gray-300 text-sm mt-1">
                      Click on a student to view their question-by-question breakdown
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
