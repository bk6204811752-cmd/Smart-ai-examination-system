import { BookOpen, Target, TrendingUp, Clock, Video, FileText, Brain, Award } from 'lucide-react'
import { LearningPathRecommendation, WeakArea } from '../utils/adaptiveExamEngine'

interface LearningPathRecommendationsProps {
  learningPath: LearningPathRecommendation[]
  weakAreas: WeakArea[]
}

export default function LearningPathRecommendations({ 
  learningPath, 
  weakAreas 
}: LearningPathRecommendationsProps) {
  
  const getPriorityColor = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'Practice Test': return <Brain className="w-4 h-4" />
      case 'Video Tutorial': return <Video className="w-4 h-4" />
      case 'Reading Material': return <FileText className="w-4 h-4" />
      case 'Interactive Quiz': return <Award className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  const getDifficultyColor = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    switch (difficulty) {
      case 'Easy': return 'text-emerald-600'
      case 'Medium': return 'text-yellow-600'
      case 'Hard': return 'text-red-600'
    }
  }

  if (learningPath.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
        <div className="text-center">
          <Award className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Excellent Performance! 🎉</h3>
          <p className="text-gray-600">
            You've demonstrated strong mastery across all topics. Keep practicing to maintain your skills!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weak Areas Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Target className="w-6 h-6 mr-2 text-orange-600" />
          Areas for Improvement
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weakAreas.filter(area => area.needsImprovement).map((area, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200"
            >
              <h4 className="font-bold text-gray-900 mb-2">{area.category}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className={`font-bold ${area.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {area.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-semibold text-gray-900">
                    {area.correctAnswers}/{area.totalQuestions}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      area.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${area.accuracy}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personalized Learning Paths */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
          Personalized Learning Path
        </h3>
        <div className="space-y-6">
          {learningPath.map((path, index) => (
            <div 
              key={index}
              className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent rounded-r-lg p-4 sm:p-6"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{path.category}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(path.priority)}`}>
                      {path.priority} Priority
                    </span>
                    <span className="flex items-center text-sm text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200">
                      <Clock className="w-3 h-3 mr-1" />
                      {path.estimatedStudyHours}h study time
                    </span>
                  </div>
                </div>
              </div>

              {/* Weak Areas */}
              <div className="mb-4">
                <h5 className="font-semibold text-gray-700 mb-2 text-sm">Focus Areas:</h5>
                <div className="flex flex-wrap gap-2">
                  {path.weakAreas.map((weakness, wIndex) => (
                    <span 
                      key={wIndex}
                      className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs border border-red-200"
                    >
                      {weakness}
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggested Topics */}
              <div className="mb-4">
                <h5 className="font-semibold text-gray-700 mb-2 text-sm">Recommended Topics:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {path.suggestedTopics.map((topic, tIndex) => (
                    <div 
                      key={tIndex}
                      className="flex items-center text-sm text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200"
                    >
                      <BookOpen className="w-3 h-3 mr-2 text-blue-600 flex-shrink-0" />
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Resources */}
              <div>
                <h5 className="font-semibold text-gray-700 mb-3 text-sm">Recommended Resources:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {path.resources.map((resource, rIndex) => (
                    <div 
                      key={rIndex}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          {getResourceIcon(resource.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {resource.type}
                            </span>
                            <span className={`text-xs font-bold ${getDifficultyColor(resource.difficulty)}`}>
                              {resource.difficulty}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {resource.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Start Learning Path
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study Tips */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-600" />
          Study Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-purple-600 font-bold mr-2">•</span>
            <span>Focus on high-priority topics first for maximum impact</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 font-bold mr-2">•</span>
            <span>Practice regularly with mock tests to track your improvement</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 font-bold mr-2">•</span>
            <span>Review explanations carefully to understand concepts deeply</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 font-bold mr-2">•</span>
            <span>Allocate study time based on estimated hours for each topic</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
