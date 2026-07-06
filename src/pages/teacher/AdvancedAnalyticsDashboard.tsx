import { useState, useEffect } from 'react'
import { analyticsAPI } from '../../lib/api'
import { smartExamAPI } from '../../lib/advancedAPIs'
import { 
  TrendingUp, Users, AlertTriangle, Target, Brain, BarChart3, 
  PieChart, Activity, Award, Clock, Eye, Zap 
} from 'lucide-react'

interface AdvancedMetrics {
  overview: {
    total_exams: number
    total_students: number
    avg_completion_rate: number
    avg_pass_rate: number
    total_violations: number
    high_risk_sessions: number
  }
  performance: {
    exam_difficulty_accuracy: number
    question_quality_avg: number
    discrimination_index_avg: number
    prediction_accuracy: number
  }
  proctoring: {
    sessions_monitored: number
    violations_detected: number
    false_positive_rate: number
    auto_interventions: number
    manual_interventions: number
    avg_risk_score: number
  }
  trends: {
    daily_exams: Array<{ date: string; count: number; violations: number }>
    violation_types: Array<{ type: string; count: number; severity: string }>
    emotion_distribution: Array<{ emotion: string; percentage: number }>
    attention_trends: Array<{ hour: number; avg_attention: number }>
  }
}

export default function AdvancedAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')

  useEffect(() => {
    fetchAdvancedMetrics()
  }, [timeRange])

  const fetchAdvancedMetrics = async () => {
    setLoading(true)
    try {
      const data = await analyticsAPI.getAdvancedAnalytics()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-xl shadow-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Brain className="w-8 h-8" />
                Advanced Analytics Dashboard
              </h1>
              <p className="text-white/90 mt-2">
                AI-powered insights and predictive analytics for your examination system
              </p>
            </div>
            <div className="flex gap-2">
              {['7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    timeRange === range
                      ? 'bg-white text-purple-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Exams */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+12.5%</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Exams</h3>
            <p className="text-3xl font-bold text-gray-900">{metrics.overview.total_exams}</p>
            <p className="text-xs text-gray-500 mt-2">Across all programs</p>
          </div>

          {/* Active Students */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+8.3%</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Active Students</h3>
            <p className="text-3xl font-bold text-gray-900">{metrics.overview.total_students.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Monitored sessions</p>
          </div>

          {/* Pass Rate */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+3.2%</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Average Pass Rate</h3>
            <p className="text-3xl font-bold text-gray-900">{metrics.overview.avg_pass_rate}%</p>
            <p className="text-xs text-gray-500 mt-2">Prediction accuracy: {metrics.performance.prediction_accuracy}%</p>
          </div>

          {/* Violations */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-sm text-red-600 font-medium">-5.7%</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Violations</h3>
            <p className="text-3xl font-bold text-gray-900">{metrics.overview.total_violations}</p>
            <p className="text-xs text-gray-500 mt-2">High-risk sessions: {metrics.overview.high_risk_sessions}</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              AI Performance Metrics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Exam Difficulty Accuracy</span>
                  <span className="text-sm font-bold text-gray-900">{metrics.performance.exam_difficulty_accuracy}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${metrics.performance.exam_difficulty_accuracy}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Question Quality Average</span>
                  <span className="text-sm font-bold text-gray-900">{metrics.performance.question_quality_avg}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${metrics.performance.question_quality_avg}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Discrimination Index</span>
                  <span className="text-sm font-bold text-gray-900">{metrics.performance.discrimination_index_avg}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all"
                    style={{ width: `${metrics.performance.discrimination_index_avg * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Pass Rate Prediction</span>
                  <span className="text-sm font-bold text-gray-900">{metrics.performance.prediction_accuracy}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${metrics.performance.prediction_accuracy}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Proctoring Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Proctoring Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-blue-600">{metrics.proctoring.sessions_monitored}</p>
                <p className="text-xs text-gray-600 mt-1">Sessions Monitored</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-red-600">{metrics.proctoring.violations_detected}</p>
                <p className="text-xs text-gray-600 mt-1">Violations Detected</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600">{metrics.proctoring.false_positive_rate}%</p>
                <p className="text-xs text-gray-600 mt-1">False Positive Rate</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-purple-600">{metrics.proctoring.avg_risk_score}</p>
                <p className="text-xs text-gray-600 mt-1">Avg Risk Score</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-orange-600">{metrics.proctoring.auto_interventions}</p>
                <p className="text-xs text-gray-600 mt-1">Auto Interventions</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-indigo-600">{metrics.proctoring.manual_interventions}</p>
                <p className="text-xs text-gray-600 mt-1">Manual Interventions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Violation Types */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Top Violation Types
            </h3>
            <div className="space-y-3">
              {metrics.trends.violation_types.map((violation, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    violation.severity === 'critical' ? 'bg-red-500' :
                    violation.severity === 'high' ? 'bg-orange-500' :
                    'bg-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700">{violation.type}</span>
                      <span className="text-sm font-bold text-gray-900">{violation.count}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-full rounded-full ${
                          violation.severity === 'critical' ? 'bg-red-500' :
                          violation.severity === 'high' ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${(violation.count / 342) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emotion Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Emotion Distribution
            </h3>
            <div className="space-y-3">
              {metrics.trends.emotion_distribution.map((emotion, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-xl">
                        {emotion.emotion === 'Focused' ? '🎯' :
                         emotion.emotion === 'Neutral' ? '😐' :
                         emotion.emotion === 'Confused' ? '😕' :
                         emotion.emotion === 'Stressed' ? '😰' : '🤨'}
                      </span>
                      {emotion.emotion}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{emotion.percentage}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${emotion.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Trends Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Exam & Violation Trends
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {metrics.trends.daily_exams.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1">
                  <div 
                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:opacity-80"
                    style={{ height: `${(day.count / 40) * 200}px` }}
                    title={`${day.count} exams`}
                  />
                  <div 
                    className="bg-gradient-to-t from-red-500 to-red-400 rounded-t transition-all hover:opacity-80"
                    style={{ height: `${(day.violations / 10) * 40}px` }}
                    title={`${day.violations} violations`}
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium">{day.date}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-sm text-gray-600">Exams</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-gray-600">Violations</span>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-xl p-8 text-white">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain className="w-6 h-6" />
            AI-Generated Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm mb-2">📈 Trend Analysis</p>
              <p className="text-xs opacity-90">Exam participation increased by 12.5% this week. AI predicts continued growth.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm mb-2">🎯 Quality Improvement</p>
              <p className="text-xs opacity-90">Question discrimination index improved. Consider using AI-generated exams more frequently.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm mb-2">🔒 Security Alert</p>
              <p className="text-xs opacity-90">Violation rate decreased by 5.7%. Enhanced proctoring is working effectively.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
