import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  BookOpen, Brain, Globe, Calculator, Beaker, History, 
  Trophy, Clock, Target, ArrowRight, Play, Star, Award,
  ChevronRight, TrendingUp, Users, FileText
} from 'lucide-react'
import { useMobileDetect } from '../../hooks/useMobileDetect'

interface PracticeCategory {
  id: string
  name: string
  icon: any
  color: string
  gradient: string
  description: string
  totalQuestions: number
  topics: string[]
  difficulty: string[]
}

interface MockTest {
  id: string
  title: string
  category: string
  questions: number
  duration: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  attempted: number
  highScore: number
}

export default function PracticeSectionPage() {
  const navigate = useNavigate()
  const { isMobile } = useMobileDetect()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'categories' | 'mock-tests' | 'statistics'>('categories')

  const categories: PracticeCategory[] = [
    {
      id: 'mathematics',
      name: 'Mathematics',
      icon: Calculator,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      description: 'Algebra, Geometry, Calculus, Statistics',
      totalQuestions: 500,
      topics: ['Algebra', 'Geometry', 'Trigonometry', 'Calculus', 'Statistics', 'Number Theory'],
      difficulty: ['Easy', 'Medium', 'Hard', 'Expert']
    },
    {
      id: 'science',
      name: 'Science',
      icon: Beaker,
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      description: 'Physics, Chemistry, Biology',
      totalQuestions: 600,
      topics: ['Physics', 'Chemistry', 'Biology', 'Environmental Science', 'Astronomy'],
      difficulty: ['Easy', 'Medium', 'Hard']
    },
    {
      id: 'general-knowledge',
      name: 'General Knowledge',
      icon: Globe,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      description: 'Current Affairs, Geography, History',
      totalQuestions: 800,
      topics: ['Current Affairs', 'Geography', 'World History', 'Politics', 'Economics', 'Culture'],
      difficulty: ['Easy', 'Medium', 'Hard']
    },
    {
      id: 'history',
      name: 'History',
      icon: History,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      description: 'Ancient, Medieval, Modern History',
      totalQuestions: 400,
      topics: ['Ancient History', 'Medieval History', 'Modern History', 'Indian History', 'World Wars'],
      difficulty: ['Easy', 'Medium', 'Hard']
    },
    {
      id: 'english',
      name: 'English',
      icon: FileText,
      color: 'pink',
      gradient: 'from-pink-500 to-pink-600',
      description: 'Grammar, Vocabulary, Comprehension',
      totalQuestions: 450,
      topics: ['Grammar', 'Vocabulary', 'Reading Comprehension', 'Writing Skills', 'Literature'],
      difficulty: ['Easy', 'Medium', 'Hard']
    },
    {
      id: 'reasoning',
      name: 'Logical Reasoning',
      icon: Brain,
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-600',
      description: 'Puzzles, Patterns, Logical Thinking',
      totalQuestions: 350,
      topics: ['Verbal Reasoning', 'Non-Verbal Reasoning', 'Analytical Reasoning', 'Puzzles', 'Data Interpretation'],
      difficulty: ['Easy', 'Medium', 'Hard']
    }
  ]

  const mockTests: MockTest[] = [
    // Mathematics
    { id: 'mock-math-1', title: 'Mathematics - Algebra Basics', category: 'mathematics', questions: 30, duration: 45, difficulty: 'Easy', attempted: 0, highScore: 0 },
    { id: 'mock-math-2', title: 'Mathematics - Geometry & Trigonometry', category: 'mathematics', questions: 40, duration: 60, difficulty: 'Medium', attempted: 0, highScore: 0 },
    { id: 'mock-math-3', title: 'Mathematics - Advanced Calculus', category: 'mathematics', questions: 50, duration: 90, difficulty: 'Hard', attempted: 0, highScore: 0 },
    
    // Science
    { id: 'mock-sci-1', title: 'Science - Physics Fundamentals', category: 'science', questions: 35, duration: 50, difficulty: 'Easy', attempted: 0, highScore: 0 },
    { id: 'mock-sci-2', title: 'Science - Chemistry & Biology', category: 'science', questions: 40, duration: 60, difficulty: 'Medium', attempted: 0, highScore: 0 },
    { id: 'mock-sci-3', title: 'Science - Advanced Physics', category: 'science', questions: 45, duration: 75, difficulty: 'Hard', attempted: 0, highScore: 0 },
    
    // General Knowledge
    { id: 'mock-gk-1', title: 'GK - Current Affairs 2024-25', category: 'general-knowledge', questions: 50, duration: 40, difficulty: 'Easy', attempted: 0, highScore: 0 },
    { id: 'mock-gk-2', title: 'GK - World Geography & Politics', category: 'general-knowledge', questions: 60, duration: 50, difficulty: 'Medium', attempted: 0, highScore: 0 },
    { id: 'mock-gk-3', title: 'GK - Comprehensive Test', category: 'general-knowledge', questions: 100, duration: 90, difficulty: 'Hard', attempted: 0, highScore: 0 },
    
    // History
    { id: 'mock-hist-1', title: 'History - Ancient Civilizations', category: 'history', questions: 30, duration: 40, difficulty: 'Easy', attempted: 0, highScore: 0 },
    { id: 'mock-hist-2', title: 'History - Indian Independence', category: 'history', questions: 35, duration: 50, difficulty: 'Medium', attempted: 0, highScore: 0 },
    { id: 'mock-hist-3', title: 'History - World Wars & Modern Era', category: 'history', questions: 40, duration: 60, difficulty: 'Hard', attempted: 0, highScore: 0 },
    
    // English
    { id: 'mock-eng-1', title: 'English - Grammar Basics', category: 'english', questions: 25, duration: 30, difficulty: 'Easy', attempted: 0, highScore: 0 },
    { id: 'mock-eng-2', title: 'English - Vocabulary & Comprehension', category: 'english', questions: 35, duration: 45, difficulty: 'Medium', attempted: 0, highScore: 0 },
    { id: 'mock-eng-3', title: 'English - Advanced Literature', category: 'english', questions: 40, duration: 60, difficulty: 'Hard', attempted: 0, highScore: 0 },
    
    // Reasoning
    { id: 'mock-reas-1', title: 'Reasoning - Basic Puzzles', category: 'reasoning', questions: 30, duration: 40, difficulty: 'Easy', attempted: 0, highScore: 0 },
    { id: 'mock-reas-2', title: 'Reasoning - Analytical Thinking', category: 'reasoning', questions: 35, duration: 50, difficulty: 'Medium', attempted: 0, highScore: 0 },
    { id: 'mock-reas-3', title: 'Reasoning - Complex Problems', category: 'reasoning', questions: 40, duration: 60, difficulty: 'Hard', attempted: 0, highScore: 0 }
  ]

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredMockTests = selectedCategory 
    ? mockTests.filter(test => test.category === selectedCategory)
    : mockTests

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Practice Section</h1>
                <p className="text-sm sm:text-base text-blue-100">Master every subject with AI-proctored mock tests</p>
              </div>
            </div>
            <Link
              to="/student/dashboard"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm sm:text-base min-h-[44px] flex items-center touch-manipulation"
            >
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{categories.reduce((sum, cat) => sum + cat.totalQuestions, 0)}</p>
              <p className="text-xs sm:text-sm text-gray-600">Total Questions</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{mockTests.length}</p>
              <p className="text-xs sm:text-sm text-gray-600">Mock Tests</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{categories.length}</p>
              <p className="text-xs sm:text-sm text-gray-600">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-orange-600">0</p>
              <p className="text-xs sm:text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'categories', label: 'Categories', icon: BookOpen },
              { id: 'mock-tests', label: 'Mock Tests', icon: Trophy },
              { id: 'statistics', label: 'Statistics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 transition min-h-[44px] whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium text-sm sm:text-base">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Choose Your Subject</h2>
              <p className="text-sm sm:text-base text-gray-600">Select a category to start practicing</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <div
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id)
                      setActiveTab('mock-tests')
                    }}
                    className={`bg-gradient-to-br ${category.gradient} rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition transform hover:scale-105 touch-manipulation`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                        {category.totalQuestions} Qs
                      </span>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{category.name}</h3>
                    <p className="text-xs sm:text-sm text-white/80 mb-4">{category.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {category.topics.slice(0, 3).map((topic, idx) => (
                        <span key={idx} className="bg-white/20 px-2 py-1 rounded text-xs">
                          {topic}
                        </span>
                      ))}
                      {category.topics.length > 3 && (
                        <span className="bg-white/20 px-2 py-1 rounded text-xs">
                          +{category.topics.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Start Practice →</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mock Tests Tab */}
        {activeTab === 'mock-tests' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Mock Tests</h2>
                <p className="text-sm sm:text-base text-gray-600">AI-proctored practice exams</p>
              </div>
              
              {/* Category Filter */}
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-sm sm:text-base"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredMockTests.map((test) => {
                const category = categories.find(c => c.id === test.category)
                const Icon = category?.icon || Trophy
                
                return (
                  <div key={test.id} className="bg-white rounded-xl shadow-sm border-2 border-gray-100 hover:border-blue-200 hover:shadow-md transition p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${category?.gradient} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(test.difficulty)}`}>
                        {test.difficulty}
                      </span>
                    </div>

                    <h3 className="font-bold text-base sm:text-lg mb-2 line-clamp-2">{test.title}</h3>
                    
                    <div className="flex items-center space-x-4 text-xs sm:text-sm text-gray-600 mb-4">
                      <span className="flex items-center">
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {test.questions} Qs
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {test.duration} mins
                      </span>
                    </div>

                    {test.attempted > 0 && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">High Score</span>
                          <span className="font-bold text-green-600">{test.highScore}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Attempted {test.attempted} time(s)</p>
                      </div>
                    )}

                    <Link
                      to={`/practice/mock/${test.id}/verify`}
                      className={`flex items-center justify-center space-x-2 w-full py-2 sm:py-3 rounded-lg transition min-h-[44px] touch-manipulation ${
                        test.attempted > 0
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      <span className="text-sm sm:text-base font-semibold">
                        {test.attempted > 0 ? 'Retry' : 'Start Test'}
                      </span>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Your Performance</h2>
              <p className="text-sm sm:text-base text-gray-600">Track your progress across all categories</p>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-2 border-blue-100">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 mb-3" />
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Tests Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-2 border-green-100">
                <Star className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 mb-3" />
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Average Score</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">0%</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-2 border-purple-100">
                <Target className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 mb-3" />
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Questions Solved</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-2 border-orange-100">
                <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 mb-3" />
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Time Spent</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">0h</p>
              </div>
            </div>

            {/* Category-wise Performance */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="font-bold text-lg sm:text-xl mb-4">Category Performance</h3>
              <div className="space-y-4">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <div key={category.id} className="flex items-center space-x-4 p-3 sm:p-4 border rounded-lg">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${category.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm sm:text-base mb-1">{category.name}</h4>
                        <div className="flex items-center space-x-4 text-xs sm:text-sm text-gray-600">
                          <span>0/{mockTests.filter(t => t.category === category.id).length} tests</span>
                          <span>•</span>
                          <span>0% avg score</span>
                        </div>
                      </div>
                      <Award className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Get Started Message */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 sm:p-8 text-center">
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Start Your Practice Journey!</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">Take your first mock test to see your statistics here</p>
              <button
                onClick={() => setActiveTab('mock-tests')}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition min-h-[44px] touch-manipulation text-sm sm:text-base"
              >
                Browse Mock Tests
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
