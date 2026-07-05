import { useState, useRef } from 'react'
import { FileText, Download, Filter, Calendar, Users, TrendingUp, BarChart3, PieChart, LineChart, Eye, Share2, Mail, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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
    format: 'pdf'
  })
  
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const examOptions = [
    { id: 'e1', name: 'AI-101 Midterm Exam', date: '2024-02-15', students: 45 },
    { id: 'e2', name: 'Data Structures Final', date: '2024-02-10', students: 38 },
    { id: 'e3', name: 'Machine Learning Quiz 3', date: '2024-02-05', students: 52 }
  ]

  const studentOptions = [
    { id: 's1', name: 'John Doe', email: 'john@pcmt.edu', exams: 12 },
    { id: 's2', name: 'Jane Smith', email: 'jane@pcmt.edu', exams: 15 },
    { id: 's3', name: 'Mike Johnson', email: 'mike@pcmt.edu', exams: 10 }
  ]

  const classOptions = [
    { id: 'c1', name: 'AI-101 Section A', students: 45, teacher: 'Prof. Kumar' },
    { id: 'c2', name: 'CS-201 Section B', students: 38, teacher: 'Dr. Lee' }
  ]

  const generateReport = async () => {
    setGenerating(true)
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockData = {
        title: reportConfig.title,
        generatedDate: new Date().toISOString(),
        dateRange: reportConfig.dateRange,
        summary: {
          totalExams: 12,
          totalStudents: 45,
          averageScore: 78.5,
          passRate: 87.3,
          completionRate: 95.2
        },
        charts: reportConfig.includeCharts ? {
          scoreDistribution: [
            { range: '0-20', count: 2 },
            { range: '21-40', count: 5 },
            { range: '41-60', count: 8 },
            { range: '61-80', count: 15 },
            { range: '81-100', count: 15 }
          ],
          trendData: [
            { week: 'Week 1', avgScore: 72 },
            { week: 'Week 2', avgScore: 75 },
            { week: 'Week 3', avgScore: 78 },
            { week: 'Week 4', avgScore: 81 }
          ]
        } : null,
        analytics: reportConfig.includeAnalytics ? {
          topPerformers: [
            { name: 'Alice Chen', score: 98, rank: 1 },
            { name: 'Bob Smith', score: 95, rank: 2 },
            { name: 'Carol Wang', score: 93, rank: 3 }
          ],
          needsAttention: [
            { name: 'David Lee', score: 45, improvement: -5 },
            { name: 'Emma Brown', score: 52, improvement: -3 }
          ],
          subjectBreakdown: [
            { subject: 'Mathematics', avgScore: 82, questions: 20 },
            { subject: 'Science', avgScore: 75, questions: 15 },
            { subject: 'Programming', avgScore: 78, questions: 25 }
          ]
        } : null,
        recommendations: reportConfig.includeRecommendations ? [
          'Focus on improving Science section performance (75% avg)',
          'Consider additional support for 2 students scoring below 55%',
          'Maintain current teaching approach for Mathematics (82% avg)',
          'Increase practice questions for Programming section'
        ] : null
      }

      setPreviewData(mockData)
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
        useCORS: true
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 0

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      pdf.save(`${reportConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      
      toast.success('PDF exported successfully!')
    } catch (error) {
      toast.error('Failed to export PDF')
    } finally {
      setGenerating(false)
    }
  }

  const shareReport = () => {
    toast.success('Share link copied to clipboard!')
  }

  const emailReport = () => {
    toast.success('Report sent via email!')
  }

  const printReport = () => {
    window.print()
    toast.success('Printing report...')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <FileText className="w-10 h-10" />
                Advanced Report Generator
              </h1>
              <p className="text-white/90">Create comprehensive reports with charts, analytics, and insights</p>
            </div>
            <BarChart3 className="w-16 h-16 opacity-50" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Report Configuration
              </h3>

              {/* Report Title */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Report Title</label>
                <input
                  type="text"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter report title"
                />
              </div>

              {/* Report Type */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Report Type</label>
                <select
                  value={reportConfig.type}
                  onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="exam">Exam Report</option>
                  <option value="student">Student Report</option>
                  <option value="class">Class Report</option>
                  <option value="custom">Custom Report</option>
                </select>
              </div>

              {/* Conditional Selections */}
              {reportConfig.type === 'exam' && (
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-gray-700">Select Exam</label>
                  <select
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an exam...</option>
                    {examOptions.map(exam => (
                      <option key={exam.id} value={exam.id}>{exam.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportConfig.type === 'student' && (
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-gray-700">Select Student</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a student...</option>
                    {studentOptions.map(student => (
                      <option key={student.id} value={student.id}>{student.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportConfig.type === 'class' && (
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-gray-700">Select Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a class...</option>
                    {classOptions.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <select
                  value={reportConfig.dateRange}
                  onChange={(e) => setReportConfig({ ...reportConfig, dateRange: e.target.value as any })}
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
                      onChange={(e) => setReportConfig({ ...reportConfig, customDateStart: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={reportConfig.customDateEnd || ''}
                      onChange={(e) => setReportConfig({ ...reportConfig, customDateEnd: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Include Options */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeCharts}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeCharts: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Charts</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeAnalytics}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeAnalytics: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Analytics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeRecommendations}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeRecommendations: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Recommendations</span>
                </label>
              </div>

              {/* Export Format */}
              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-gray-700">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {['pdf', 'excel', 'csv'].map(format => (
                    <button
                      key={format}
                      onClick={() => setReportConfig({ ...reportConfig, format: format as any })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        reportConfig.format === format
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateReport}
                disabled={generating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview/Report Panel */}
          <div className="lg:col-span-2">
            {!previewData ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <FileText className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Generated</h3>
                <p className="text-gray-600">Configure your report settings and click "Generate Report" to preview</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="bg-white rounded-xl shadow-lg p-4 flex gap-2">
                  <button
                    onClick={exportToPDF}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                  <button
                    onClick={shareReport}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={emailReport}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    onClick={printReport}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                {/* Report Preview */}
                <div ref={reportRef} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
                  {/* Report Header */}
                  <div className="border-b border-gray-200 pb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{previewData.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Generated: {new Date(previewData.generatedDate).toLocaleDateString()}
                      </span>
                      <span>Period: {previewData.dateRange}</span>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-5 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{previewData.summary.totalExams}</div>
                      <div className="text-xs text-gray-600">Total Exams</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{previewData.summary.totalStudents}</div>
                      <div className="text-xs text-gray-600">Students</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{previewData.summary.averageScore}%</div>
                      <div className="text-xs text-gray-600">Avg Score</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{previewData.summary.passRate}%</div>
                      <div className="text-xs text-gray-600">Pass Rate</div>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-pink-600">{previewData.summary.completionRate}%</div>
                      <div className="text-xs text-gray-600">Completion</div>
                    </div>
                  </div>

                  {/* Charts Section */}
                  {previewData.charts && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Performance Charts
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* Score Distribution */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Score Distribution</h4>
                          <div className="space-y-2">
                            {previewData.charts.scoreDistribution.map((item: any) => (
                              <div key={item.range} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-16">{item.range}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center justify-end pr-2"
                                    style={{ width: `${(item.count / 15) * 100}%` }}
                                  >
                                    <span className="text-xs font-medium text-white">{item.count}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Trend Chart */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Performance Trend</h4>
                          <div className="space-y-2">
                            {previewData.charts.trendData.map((item: any) => (
                              <div key={item.week} className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">{item.week}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full"
                                      style={{ width: `${item.avgScore}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-900 w-8">{item.avgScore}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analytics Section */}
                  {previewData.analytics && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Detailed Analytics
                      </h3>

                      <div className="grid grid-cols-3 gap-4">
                        {/* Top Performers */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Top Performers</h4>
                          <div className="space-y-2">
                            {previewData.analytics.topPerformers.map((student: any) => (
                              <div key={student.rank} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">#{student.rank} {student.name}</span>
                                <span className="font-bold text-green-600">{student.score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Needs Attention */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Needs Attention</h4>
                          <div className="space-y-2">
                            {previewData.analytics.needsAttention.map((student: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{student.name}</span>
                                <span className="font-bold text-red-600">{student.score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Subject Breakdown */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Subject Breakdown</h4>
                          <div className="space-y-2">
                            {previewData.analytics.subjectBreakdown.map((subject: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-700">{subject.subject}</span>
                                  <span className="font-bold text-blue-600">{subject.avgScore}%</span>
                                </div>
                                <div className="bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-600 h-full rounded-full"
                                    style={{ width: `${subject.avgScore}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {previewData.recommendations && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        AI-Powered Recommendations
                      </h3>
                      <div className="space-y-2">
                        {previewData.recommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <p className="text-sm text-gray-700">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
                    <p>Generated by PCMT AI Exam System • {new Date().toLocaleDateString()} • Confidential</p>
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
