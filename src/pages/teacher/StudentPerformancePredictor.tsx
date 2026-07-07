import { useState, useEffect } from 'react'
import { TrendingUp, Brain, Target, Award, AlertCircle, LineChart, BarChart3, Activity } from 'lucide-react'

interface StudentPerformanceData {
  student_id: string
  student_name: string
  historical_data: {
    exam_id: string
    exam_title: string
    score: number
    difficulty: number
    completion_time: number
    topics_covered: string[]
    date: string
  }[]
  current_metrics: {
    average_score: number
    score_trend: 'improving' | 'declining' | 'stable'
    consistency_index: number
    learning_velocity: number
    subject_strengths: { [key: string]: number }
    subject_weaknesses: { [key: string]: number }
  }
  predictions: {
    next_exam_score: {
      predicted: number
      confidence: number
      lower_bound: number
      upper_bound: number
    }
    optimal_exam_difficulty: number
    recommended_study_time: number
    risk_of_failure: number
    improvement_potential: number
    time_to_mastery: number
  }
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    action: string
    impact: string
    estimated_improvement: number
  }[]
  ml_insights: {
    learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
    optimal_study_duration: number
    best_time_of_day: string
    attention_span: number
    retention_rate: number
    stress_indicators: string[]
  }
}

export default function StudentPerformancePredictor({ studentId = 'default' }: { studentId?: string }) {
  const [performanceData, setPerformanceData] = useState<StudentPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'overview' | 'predictions' | 'recommendations' | 'insights'>('overview')

  useEffect(() => {
    loadPerformanceData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const loadPerformanceData = async () => {
    setLoading(true)
    try {
      // Simulated ML-powered predictions
      const mockData: StudentPerformanceData = {
        student_id: studentId,
        student_name: 'Alex Johnson',
        historical_data: [
          {
            exam_id: 'e1',
            exam_title: 'Data Structures Midterm',
            score: 75,
            difficulty: 0.65,
            completion_time: 85,
            topics_covered: ['Arrays', 'Linked Lists', 'Stacks'],
            date: '2024-01-15'
          },
          {
            exam_id: 'e2',
            exam_title: 'Algorithms Quiz',
            score: 82,
            difficulty: 0.70,
            completion_time: 78,
            topics_covered: ['Sorting', 'Searching', 'Recursion'],
            date: '2024-02-10'
          },
          {
            exam_id: 'e3',
            exam_title: 'Advanced Trees',
            score: 88,
            difficulty: 0.75,
            completion_time: 72,
            topics_covered: ['BST', 'AVL', 'Red-Black Trees'],
            date: '2024-03-05'
          },
          {
            exam_id: 'e4',
            exam_title: 'Graph Algorithms',
            score: 91,
            difficulty: 0.80,
            completion_time: 68,
            topics_covered: ['BFS', 'DFS', 'Dijkstra'],
            date: '2024-03-20'
          }
        ],
        current_metrics: {
          average_score: 84,
          score_trend: 'improving',
          consistency_index: 0.87,
          learning_velocity: 1.35,
          subject_strengths: {
            'Algorithms': 0.92,
            'Data Structures': 0.85,
            'Problem Solving': 0.88
          },
          subject_weaknesses: {
            'Time Complexity': 0.62,
            'Dynamic Programming': 0.58,
            'Graph Theory': 0.70
          }
        },
        predictions: {
          next_exam_score: {
            predicted: 93,
            confidence: 0.89,
            lower_bound: 88,
            upper_bound: 96
          },
          optimal_exam_difficulty: 0.82,
          recommended_study_time: 18,
          risk_of_failure: 0.08,
          improvement_potential: 0.87,
          time_to_mastery: 45
        },
        recommendations: [
          {
            priority: 'high',
            action: 'Focus on Dynamic Programming concepts',
            impact: 'Could increase overall score by 8-12%',
            estimated_improvement: 10
          },
          {
            priority: 'high',
            action: 'Practice time complexity analysis',
            impact: 'Will improve problem-solving efficiency',
            estimated_improvement: 7
          },
          {
            priority: 'medium',
            action: 'Increase study session duration to 45 minutes',
            impact: 'Optimal retention based on your learning pattern',
            estimated_improvement: 5
          },
          {
            priority: 'low',
            action: 'Review graph algorithm fundamentals',
            impact: 'Strengthen foundation for advanced topics',
            estimated_improvement: 4
          }
        ],
        ml_insights: {
          learning_style: 'visual',
          optimal_study_duration: 45,
          best_time_of_day: 'Morning (9-11 AM)',
          attention_span: 38,
          retention_rate: 0.82,
          stress_indicators: ['Decreases speed under time pressure', 'Performance dips in late evening']
        }
      }

      setPerformanceData(mockData)
    } catch (error) {
      console.error('Failed to load performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !performanceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analyzing performance with AI...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Brain className="w-8 h-8" />
                AI Performance Predictor
              </h1>
              <p className="text-white/90 mt-2">
                Machine learning-powered analysis for {performanceData.student_name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{performanceData.current_metrics.average_score}%</div>
                <div className="text-xs text-white/90">Current Average</div>
              </div>
              <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{performanceData.predictions.next_exam_score.predicted}%</div>
                <div className="text-xs text-white/90">Predicted Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-2 flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'predictions', label: 'Predictions', icon: TrendingUp },
            { id: 'recommendations', label: 'Recommendations', icon: Target },
            { id: 'insights', label: 'ML Insights', icon: Brain }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                  selectedView === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Overview */}
        {selectedView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-blue-600" />
                Performance Trend
              </h3>
              <div className="space-y-4">
                {performanceData.historical_data.map((exam, index) => (
                  <div key={exam.exam_id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{exam.exam_title}</h4>
                        <p className="text-xs text-gray-500">{new Date(exam.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{exam.score}%</div>
                        {index > 0 && (
                          <div className={`text-xs ${
                            exam.score > performanceData.historical_data[index - 1].score
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {exam.score > performanceData.historical_data[index - 1].score ? '↑' : '↓'}
                            {Math.abs(exam.score - performanceData.historical_data[index - 1].score)}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${exam.score}%` }}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {exam.topics_covered.map(topic => (
                        <span key={topic} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="space-y-6">
              {/* Strengths */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Top Strengths
                </h3>
                <div className="space-y-3">
                  {Object.entries(performanceData.current_metrics.subject_strengths).map(([subject, score]) => (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{subject}</span>
                        <span className="text-green-600 font-bold">{(score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="bg-green-100 rounded-full h-2">
                        <div
                          className="bg-green-600 h-full rounded-full"
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Areas for Improvement
                </h3>
                <div className="space-y-3">
                  {Object.entries(performanceData.current_metrics.subject_weaknesses).map(([subject, score]) => (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{subject}</span>
                        <span className="text-red-600 font-bold">{(score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="bg-red-100 rounded-full h-2">
                        <div
                          className="bg-red-600 h-full rounded-full"
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Predictions */}
        {selectedView === 'predictions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PredictionCard
              title="Next Exam Score"
              value={`${performanceData.predictions.next_exam_score.predicted}%`}
              subtitle={`Confidence: ${(performanceData.predictions.next_exam_score.confidence * 100).toFixed(0)}%`}
              details={`Range: ${performanceData.predictions.next_exam_score.lower_bound}% - ${performanceData.predictions.next_exam_score.upper_bound}%`}
              color="blue"
            />
            <PredictionCard
              title="Failure Risk"
              value={`${(performanceData.predictions.risk_of_failure * 100).toFixed(1)}%`}
              subtitle="Very Low Risk"
              details="Based on current trajectory"
              color="green"
            />
            <PredictionCard
              title="Improvement Potential"
              value={`${(performanceData.predictions.improvement_potential * 100).toFixed(0)}%`}
              subtitle="High potential"
              details="With focused study"
              color="purple"
            />
            <PredictionCard
              title="Optimal Difficulty"
              value={`${(performanceData.predictions.optimal_exam_difficulty * 100).toFixed(0)}%`}
              subtitle="Recommended level"
              details="For maximum learning"
              color="orange"
            />
            <PredictionCard
              title="Study Time Needed"
              value={`${performanceData.predictions.recommended_study_time}h`}
              subtitle="Per week"
              details="For next exam prep"
              color="pink"
            />
            <PredictionCard
              title="Time to Mastery"
              value={`${performanceData.predictions.time_to_mastery} days`}
              subtitle="Current pace"
              details="Expert level achievement"
              color="indigo"
            />
          </div>
        )}

        {/* Recommendations */}
        {selectedView === 'recommendations' && (
          <div className="space-y-4">
            {performanceData.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
                  rec.priority === 'high' ? 'border-red-500' :
                  rec.priority === 'medium' ? 'border-yellow-500' :
                  'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                        +{rec.estimated_improvement}% potential
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{rec.action}</h3>
                    <p className="text-gray-600">{rec.impact}</p>
                  </div>
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ML Insights */}
        {selectedView === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Learning Profile
              </h3>
              <div className="space-y-4">
                <InfoRow label="Learning Style" value={performanceData.ml_insights.learning_style} />
                <InfoRow label="Optimal Study Duration" value={`${performanceData.ml_insights.optimal_study_duration} minutes`} />
                <InfoRow label="Best Time of Day" value={performanceData.ml_insights.best_time_of_day} />
                <InfoRow label="Attention Span" value={`${performanceData.ml_insights.attention_span} minutes`} />
                <InfoRow label="Retention Rate" value={`${(performanceData.ml_insights.retention_rate * 100).toFixed(0)}%`} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600" />
                Stress Indicators
              </h3>
              <div className="space-y-3">
                {performanceData.ml_insights.stress_indicators.map((indicator, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <p className="text-sm text-gray-700">{indicator}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PredictionCard({ title, value, subtitle, details, color }: {
  title: string
  value: string
  subtitle: string
  details: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo'
}) {
  const getColorClass = (c: typeof color): string => {
    switch (c) {
      case 'blue': return 'from-blue-500 to-blue-600'
      case 'green': return 'from-green-500 to-green-600'
      case 'purple': return 'from-purple-500 to-purple-600'
      case 'orange': return 'from-orange-500 to-orange-600'
      case 'pink': return 'from-pink-500 to-pink-600'
      case 'indigo': return 'from-indigo-500 to-indigo-600'
    }
  }

  return (
    <div className={`bg-gradient-to-br ${getColorClass(color)} rounded-xl shadow-lg p-6 text-white`}>
      <h3 className="text-sm font-medium opacity-90 mb-2">{title}</h3>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <p className="text-sm opacity-90">{subtitle}</p>
      <p className="text-xs opacity-75 mt-2">{details}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  )
}
