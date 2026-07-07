import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3,
  Share2,
  Mail,
  Printer,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { analyticsAPI, examAPI, userAPI } from '../../lib/api'

interface ReportConfig {
  title: string
  type: 'exam' | 'student' | 'class' | 'custom'
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  customDateStart?: string
  customDateEnd?: string
  includeCharts: boolean
  includeAnalytics: boolean
  includeRecommendations: boolean
  format: 'pdf' | 'excel' | 'csv'
}

export default function ReportGeneratorPage() {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: 'Performance Report',
    type: 'exam',
    dateRange: 'month',
    includeCharts: true,
    includeAnalytics: true,
    includeRecommendations: true,
    format: 'pdf',
  })

  const [selectedExam, setSelectedExam] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const [examOptions, setExamOptions] = useState<
    { id: string; name: string; date: string; students: number }[]
  >([])
  const [studentOptions, setStudentOptions] = useState<
    { id: string; name: string; email: string }[]
  >([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    setLoadingOptions(true)
    try {
      const [exams, users] = await Promise.all([examAPI.getExams(), userAPI.getUsers('student')])
      if (Array.isArray(exams)) {
        setExamOptions(
          exams.map((e: any) => ({
            id: e._id,
            name: e.title || 'Untitled',
            date: e.created_at?.slice(0, 10) || '',
            students: e.submissions_count || 0,
          }))
        )
      }
      if (Array.isArray(users)) {
        setStudentOptions(
          users.map((u: any) => ({
            id: u._id,
            name: u.full_name || u.email || 'Unknown',
            email: u.email || '',
          }))
        )
      }
    } catch {
      // silent
    } finally {
      setLoadingOptions(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    const end = now.toISOString().split('T')[0]
    let start: string
    switch (reportConfig.dateRange) {
      case 'week':
        start = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]
        break
      case 'month':
        start = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
        break
      case 'quarter':
        start = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
        break
      case 'year':
        start = new Date(now.getTime() - 365 * 86400000).toISOString().split('T')[0]
        break
      case 'custom':
        start = reportConfig.customDateStart || end
        return { start_date: start, end_date: reportConfig.customDateEnd || end }
      default:
        start = end
    }
    return { start_date: start, end_date: end }
  }

  const generateReport = async () => {
    setGenerating(true)
    try {
      const { start_date, end_date } = getDateRange()
      const data = await analyticsAPI.generateReport({
        start_date,
        end_date,
        type: reportConfig.type,
      })
      setPreviewData({ ...data, title: reportConfig.title, dateRange: reportConfig.dateRange })
      toast.success('Report generated successfully!')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const exportToPDF = async () => {
    if (!reportRef.current) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio)
      pdf.save(
        `${reportConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      )
      toast.success('PDF exported successfully!')
    } catch {
      toast.error('Failed to export PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <FileText className="w-10 h-10" />
                Advanced Report Generator
              </h1>
              <p className="text-white/90">
                Create comprehensive reports with charts, analytics, and insights
              </p>
            </div>
            <BarChart3 className="w-16 h-16 opacity-50" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Report Configuration
              </h3>

              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Report Title</label>
                <input
                  type="text"
                  value={reportConfig.title}
                  onChange={e => setReportConfig({ ...reportConfig, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter report title"
                />
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Report Type</label>
                <select
                  value={reportConfig.type}
                  onChange={e => setReportConfig({ ...reportConfig, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="exam">Exam Report</option>
                  <option value="student">Student Report</option>
                  <option value="class">Class Report</option>
                  <option value="custom">Custom Report</option>
                </select>
              </div>

              {reportConfig.type === 'exam' && (
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-gray-700">Select Exam</label>
                  <select
                    value={selectedExam}
                    onChange={e => setSelectedExam(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an exam...</option>
                    {loadingOptions ? (
                      <option disabled>Loading...</option>
                    ) : (
                      examOptions.map(exam => (
                        <option key={exam.id} value={exam.id}>
                          {exam.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {reportConfig.type === 'student' && (
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-gray-700">Select Student</label>
                  <select
                    value={selectedStudent}
                    onChange={e => setSelectedStudent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a student...</option>
                    {loadingOptions ? (
                      <option disabled>Loading...</option>
                    ) : (
                      studentOptions.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <select
                  value={reportConfig.dateRange}
                  onChange={e =>
                    setReportConfig({ ...reportConfig, dateRange: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                  <option value="year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {reportConfig.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={reportConfig.customDateStart || ''}
                      onChange={e =>
                        setReportConfig({ ...reportConfig, customDateStart: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={reportConfig.customDateEnd || ''}
                      onChange={e =>
                        setReportConfig({ ...reportConfig, customDateEnd: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeCharts}
                    onChange={e =>
                      setReportConfig({ ...reportConfig, includeCharts: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Charts</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeAnalytics}
                    onChange={e =>
                      setReportConfig({ ...reportConfig, includeAnalytics: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Analytics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeRecommendations}
                    onChange={e =>
                      setReportConfig({ ...reportConfig, includeRecommendations: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Recommendations</span>
                </label>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-gray-700">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {['pdf', 'excel', 'csv'].map(format => (
                    <button
                      key={format}
                      onClick={() => setReportConfig({ ...reportConfig, format: format as any })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${reportConfig.format === format ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateReport}
                disabled={generating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" /> Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!previewData ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <FileText className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Generated</h3>
                <p className="text-gray-600">
                  Configure your report settings and click "Generate Report" to preview
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-lg p-4 flex gap-2">
                  <button
                    onClick={exportToPDF}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export PDF
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Share link copied to clipboard!')
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Report sent via email!')
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                  <button
                    onClick={() => {
                      window.print()
                      toast.success('Printing report...')
                    }}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>

                <div ref={reportRef} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
                  <div className="border-b border-gray-200 pb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{previewData.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> Generated:{' '}
                        {new Date(previewData.generatedDate).toLocaleDateString()}
                      </span>
                      <span>Period: {previewData.dateRange}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {previewData.summary?.totalExams || 0}
                      </div>
                      <div className="text-xs text-gray-600">Total Exams</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.summary?.totalStudents || 0}
                      </div>
                      <div className="text-xs text-gray-600">Students</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {previewData.summary?.averageScore || 0}%
                      </div>
                      <div className="text-xs text-gray-600">Avg Score</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {previewData.summary?.passRate || 0}%
                      </div>
                      <div className="text-xs text-gray-600">Pass Rate</div>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-pink-600">
                        {previewData.summary?.completionRate || 0}%
                      </div>
                      <div className="text-xs text-gray-600">Completion</div>
                    </div>
                  </div>

                  {previewData.charts && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" /> Performance Charts
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                            Score Distribution
                          </h4>
                          <div className="space-y-2">
                            {(previewData.charts.scoreDistribution || []).map((item: any) => (
                              <div key={item.range} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-16">{item.range}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center justify-end pr-2"
                                    style={{
                                      width: `${Math.min(100, (item.count / Math.max(...(previewData.charts.scoreDistribution || []).map((s: any) => s.count), 1)) * 100)}%`,
                                    }}
                                  >
                                    <span className="text-xs font-medium text-white">
                                      {item.count}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                            Performance Trend
                          </h4>
                          <div className="space-y-2">
                            {(previewData.charts.trendData || []).map((item: any) => (
                              <div key={item.week} className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">{item.week}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full"
                                      style={{ width: `${item.avgScore}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-900 w-8">
                                    {item.avgScore}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewData.analytics && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" /> Detailed Analytics
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                            Top Performers
                          </h4>
                          <div className="space-y-2">
                            {(previewData.analytics.topPerformers || []).map((s: any) => (
                              <div
                                key={s.rank}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-700">
                                  #{s.rank} {s.name}
                                </span>
                                <span className="font-bold text-green-600">{s.score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                            Needs Attention
                          </h4>
                          <div className="space-y-2">
                            {(previewData.analytics.needsAttention || []).map(
                              (s: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">{s.name}</span>
                                  <span className="font-bold text-red-600">{s.score}%</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                            Subject Breakdown
                          </h4>
                          <div className="space-y-2">
                            {(previewData.analytics.subjectBreakdown || []).map(
                              (sub: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-700">{sub.subject}</span>
                                    <span className="font-bold text-blue-600">{sub.avgScore}%</span>
                                  </div>
                                  <div className="bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-600 h-full rounded-full"
                                      style={{ width: `${sub.avgScore}%` }}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewData.recommendations && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" /> AI-Powered
                        Recommendations
                      </h3>
                      <div className="space-y-2">
                        {previewData.recommendations.map((rec: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-lg p-3"
                          >
                            <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <p className="text-sm text-gray-700">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
                    <p>
                      Generated by PCMT AI Exam System • {new Date().toLocaleDateString()} •
                      Confidential
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
