import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Trophy, CheckCircle, XCircle, Clock, Target, TrendingUp,
  Award, Star, AlertTriangle, Eye, ArrowRight, BarChart, Brain
} from 'lucide-react'
import LearningPathRecommendations from '../../components/LearningPathRecommendations'
import { LearningPathRecommendation, WeakArea, PerformanceMetrics, DifficultyLevel } from '../../utils/adaptiveExamEngine'

export default function PracticeResults() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const {
    testId,
    testTitle,
    totalQuestions,
    correctAnswers,
    percentage,
    violations,
    tabSwitches,
    timeTaken,
    // Adaptive exam data
    weakAreas,
    learningPath,
    performanceMetrics,
    performanceTrend,
    difficultyHistory
  } = location.state || {
    testId: '',
    testTitle: 'Practice Test',
    totalQuestions: 0,
    correctAnswers: 0,
    percentage: 0,
    violations: [],
    tabSwitches: 0,
    timeTaken: 0,
    weakAreas: [] as WeakArea[],
    learningPath: [] as LearningPathRecommendation[],
    performanceMetrics: null as PerformanceMetrics | null,
    performanceTrend: 'Stable' as 'Improving' | 'Declining' | 'Stable',
    difficultyHistory: [] as DifficultyLevel[]
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getPerformanceLevel = () => {
    if (percentage >= 90) return { label: 'Outstanding', color: 'text-purple-600', bg: 'bg-purple-50' }
    if (percentage >= 75) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' }
    if (percentage >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (percentage >= 40) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const performance = getPerformanceLevel()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Test Results</h1>
                <p className="text-sm sm:text-base text-blue-100">{testTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Score Card */}
        <div className={`${performance.bg} border-2 ${performance.color.replace('text-', 'border-')} rounded-2xl p-8 mb-8 text-center`}>
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white shadow-lg flex items-center justify-center">
              <div>
                <p className={`text-5xl sm:text-6xl font-bold ${performance.color}`}>{percentage}%</p>
                <p className="text-sm text-gray-600 mt-1">Score</p>
              </div>
            </div>
          </div>
          <h2 className={`text-2xl sm:text-3xl font-bold ${performance.color} mb-2`}>
            {performance.label}!
          </h2>
          <p className="text-gray-700">
            You answered <span className="font-bold">{correctAnswers}</span> out of{' '}
            <span className="font-bold">{totalQuestions}</span> questions correctly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Statistics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-xl mb-6 flex items-center">
              <BarChart className="w-6 h-6 mr-2 text-blue-600" />
              Performance Statistics
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-semibold">Correct Answers</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{correctAnswers}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <span className="font-semibold">Incorrect Answers</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswers}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <span className="font-semibold">Time Taken</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{formatTime(timeTaken)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Target className="w-6 h-6 text-purple-600" />
                  <span className="font-semibold">Accuracy</span>
                </div>
                <span className="text-2xl font-bold text-purple-600">{percentage}%</span>
              </div>
            </div>
          </div>

          {/* Proctoring Report */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-xl mb-6 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-indigo-600" />
              Proctoring Report
            </h3>

            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg ${
                tabSwitches === 0 ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className={`w-6 h-6 ${tabSwitches === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className="font-semibold">Tab Switches</span>
                </div>
                <span className={`text-2xl font-bold ${tabSwitches === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {tabSwitches}
                </span>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg ${
                violations.length === 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <XCircle className={`w-6 h-6 ${violations.length === 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="font-semibold">Violations Detected</span>
                </div>
                <span className={`text-2xl font-bold ${violations.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {violations.length}
                </span>
              </div>

              {violations.length > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-red-800 mb-2">Violation Log:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {violations.map((violation: string, index: number) => (
                      <p key={index} className="text-sm text-red-700">
                        ⚠️ {violation}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {tabSwitches === 0 && violations.length === 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Clean Test!</p>
                  <p className="text-sm text-green-700">No violations detected during the exam</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Achievements */}
        {percentage >= 75 && (
          <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-xl p-6 mb-8 text-white">
            <div className="flex items-center space-x-4">
              <Award className="w-16 h-16" />
              <div>
                <h3 className="text-2xl font-bold mb-1">Achievement Unlocked!</h3>
                <p className="text-lg">
                  {percentage >= 90 ? '🌟 Perfect Score Master' : '🏆 High Achiever'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="font-bold text-xl mb-4 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
            Recommendations
          </h3>
          
          <div className="space-y-3">
            {percentage < 60 && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-900">Practice More</p>
                  <p className="text-sm text-yellow-800">
                    Review the topics you struggled with and attempt more practice tests
                  </p>
                </div>
              </div>
            )}
            
            {percentage >= 60 && percentage < 90 && (
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <Star className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Good Progress</p>
                  <p className="text-sm text-blue-800">
                    You're doing well! Try harder difficulty tests to challenge yourself
                  </p>
                </div>
              </div>
            )}
            
            {percentage >= 90 && (
              <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                <Star className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-purple-900">Excellent Work!</p>
                  <p className="text-sm text-purple-800">
                    You've mastered this topic! Try exploring advanced topics
                  </p>
                </div>
              </div>
            )}

            {tabSwitches > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-900">Avoid Tab Switching</p>
                  <p className="text-sm text-orange-800">
                    Stay focused on the exam tab to avoid violations in future tests
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Adaptive Performance Analytics */}
        {performanceMetrics && difficultyHistory && difficultyHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Brain className="w-6 h-6 mr-2 text-purple-600" />
              Adaptive Performance Analysis
            </h2>

            {/* Performance Trend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${
                performanceTrend === 'Improving' ? 'bg-green-50 border-2 border-green-200' :
                performanceTrend === 'Declining' ? 'bg-red-50 border-2 border-red-200' :
                'bg-blue-50 border-2 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Performance Trend</span>
                  <TrendingUp className={`w-5 h-5 ${
                    performanceTrend === 'Improving' ? 'text-green-600' :
                    performanceTrend === 'Declining' ? 'text-red-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <p className={`text-2xl font-bold mt-2 ${
                  performanceTrend === 'Improving' ? 'text-green-600' :
                  performanceTrend === 'Declining' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {performanceTrend}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Current Difficulty</span>
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {performanceMetrics.currentDifficulty}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-indigo-50 border-2 border-indigo-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Correct Streak</span>
                  <Award className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-indigo-600 mt-2">
                  {performanceMetrics.correctStreak}
                </p>
              </div>
            </div>

            {/* Difficulty Progression Chart */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Difficulty Progression</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-end space-x-1 h-32">
                  {difficultyHistory.map((difficulty: DifficultyLevel, index: number) => {
                    const height = difficulty === 'Easy' ? '33%' : difficulty === 'Medium' ? '66%' : '100%'
                    const color = difficulty === 'Easy' ? 'bg-emerald-400' : difficulty === 'Medium' ? 'bg-yellow-400' : 'bg-red-400'
                    
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col justify-end"
                        title={`Step ${index + 1}: ${difficulty}`}
                      >
                        <div
                          className={`${color} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                          style={{ height }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Start</span>
                  <span>Progression →</span>
                  <span>End</span>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-emerald-400 rounded"></div>
                    <span>Easy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-400 rounded"></div>
                    <span>Hard</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance by Difficulty */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Performance by Difficulty Level</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['Easy', 'Medium', 'Hard'] as const).map(difficulty => {
                  const stats = performanceMetrics.performanceByDifficulty[difficulty]
                  const accuracy = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) : '0'
                  
                  return (
                    <div key={difficulty} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${
                          difficulty === 'Easy' ? 'text-emerald-600' :
                          difficulty === 'Medium' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {difficulty}
                        </span>
                        <span className="text-sm text-gray-600">
                          {stats.correct}/{stats.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full ${
                            difficulty === 'Easy' ? 'bg-emerald-500' :
                            difficulty === 'Medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{accuracy}% Accuracy</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Learning Path Recommendations */}
        {weakAreas && learningPath && (
          <div className="mb-8">
            <LearningPathRecommendations 
              learningPath={learningPath}
              weakAreas={weakAreas}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate(`/practice/mock/${testId}`)}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition min-h-[44px] touch-manipulation"
          >
            <Trophy className="w-5 h-5" />
            <span className="font-semibold">Retry Test</span>
          </button>

          <button
            onClick={() => navigate('/practice')}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition min-h-[44px] touch-manipulation"
          >
            <Target className="w-5 h-5" />
            <span className="font-semibold">More Tests</span>
          </button>

          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition min-h-[44px] touch-manipulation"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="font-semibold">Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
