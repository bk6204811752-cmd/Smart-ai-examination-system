import { useState, useEffect } from 'react'
import { Database, Plus, Search, Filter, Tag, Upload, Download, Edit, Trash2, Copy, Eye, Star, TrendingUp, BookOpen, Brain } from 'lucide-react'
import { toast } from 'sonner'

interface Question {
  id: string
  text: string
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'coding'
  subject: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  options?: string[]
  correctAnswer?: string | string[]
  points: number
  timeLimit?: number
  createdBy: string
  createdDate: string
  usageCount: number
  averageScore: number
  lastUsed?: string
  bloomsLevel: string
  learningObjective: string
}

export default function QuestionBankManagerPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'usage' | 'score' | 'difficulty'>('date')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  
  const [stats, setStats] = useState({
    total: 0,
    byDifficulty: { easy: 0, medium: 0, hard: 0 },
    byType: { 'multiple-choice': 0, 'true-false': 0, 'short-answer': 0, essay: 0, coding: 0 },
    avgUsage: 0,
    avgScore: 0
  })

  useEffect(() => {
    loadQuestions()
  }, [])

  useEffect(() => {
    filterQuestions()
  }, [questions, searchQuery, selectedSubject, selectedDifficulty, selectedType, selectedTags, sortBy])

  const loadQuestions = async () => {
    // Simulated question bank data
    const mockQuestions: Question[] = [
      {
        id: 'q1',
        text: 'What is the time complexity of binary search?',
        type: 'multiple-choice',
        subject: 'Data Structures',
        topic: 'Searching Algorithms',
        difficulty: 'medium',
        tags: ['algorithms', 'complexity', 'searching'],
        options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
        correctAnswer: 'O(log n)',
        points: 10,
        timeLimit: 120,
        createdBy: 'Prof. Kumar',
        createdDate: '2024-01-15',
        usageCount: 45,
        averageScore: 78.5,
        lastUsed: '2024-02-10',
        bloomsLevel: 'Remember',
        learningObjective: 'Understand algorithm time complexity'
      },
      {
        id: 'q2',
        text: 'Explain the concept of polymorphism in OOP with examples.',
        type: 'essay',
        subject: 'Object-Oriented Programming',
        topic: 'Core Concepts',
        difficulty: 'hard',
        tags: ['OOP', 'concepts', 'polymorphism'],
        points: 20,
        timeLimit: 600,
        createdBy: 'Dr. Lee',
        createdDate: '2024-01-20',
        usageCount: 28,
        averageScore: 65.3,
        lastUsed: '2024-02-12',
        bloomsLevel: 'Understand',
        learningObjective: 'Explain OOP principles with real-world examples'
      },
      {
        id: 'q3',
        text: 'Is Python a compiled language?',
        type: 'true-false',
        subject: 'Programming Languages',
        topic: 'Python Basics',
        difficulty: 'easy',
        tags: ['python', 'basics', 'compilation'],
        correctAnswer: 'false',
        points: 5,
        timeLimit: 60,
        createdBy: 'Prof. Kumar',
        createdDate: '2024-01-25',
        usageCount: 67,
        averageScore: 92.1,
        lastUsed: '2024-02-15',
        bloomsLevel: 'Remember',
        learningObjective: 'Identify language characteristics'
      },
      {
        id: 'q4',
        text: 'Implement a function to reverse a linked list in Python.',
        type: 'coding',
        subject: 'Data Structures',
        topic: 'Linked Lists',
        difficulty: 'hard',
        tags: ['linked-list', 'coding', 'algorithms', 'python'],
        points: 25,
        timeLimit: 900,
        createdBy: 'Dr. Lee',
        createdDate: '2024-02-01',
        usageCount: 12,
        averageScore: 58.7,
        lastUsed: '2024-02-14',
        bloomsLevel: 'Apply',
        learningObjective: 'Implement data structure operations'
      },
      {
        id: 'q5',
        text: 'What does SQL stand for?',
        type: 'short-answer',
        subject: 'Databases',
        topic: 'SQL Basics',
        difficulty: 'easy',
        tags: ['SQL', 'databases', 'terminology'],
        correctAnswer: 'Structured Query Language',
        points: 5,
        timeLimit: 90,
        createdBy: 'Prof. Kumar',
        createdDate: '2024-02-05',
        usageCount: 53,
        averageScore: 95.8,
        lastUsed: '2024-02-16',
        bloomsLevel: 'Remember',
        learningObjective: 'Define database terminology'
      }
    ]

    setQuestions(mockQuestions)
    
    // Calculate stats
    const statsData = {
      total: mockQuestions.length,
      byDifficulty: {
        easy: mockQuestions.filter(q => q.difficulty === 'easy').length,
        medium: mockQuestions.filter(q => q.difficulty === 'medium').length,
        hard: mockQuestions.filter(q => q.difficulty === 'hard').length
      },
      byType: {
        'multiple-choice': mockQuestions.filter(q => q.type === 'multiple-choice').length,
        'true-false': mockQuestions.filter(q => q.type === 'true-false').length,
        'short-answer': mockQuestions.filter(q => q.type === 'short-answer').length,
        essay: mockQuestions.filter(q => q.type === 'essay').length,
        coding: mockQuestions.filter(q => q.type === 'coding').length
      },
      avgUsage: mockQuestions.reduce((sum, q) => sum + q.usageCount, 0) / mockQuestions.length,
      avgScore: mockQuestions.reduce((sum, q) => sum + q.averageScore, 0) / mockQuestions.length
    }
    
    setStats(statsData)
  }

  const filterQuestions = () => {
    let filtered = [...questions]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(q => 
        q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(q => q.subject === selectedSubject)
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty)
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(q => q.type === selectedType)
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(q => 
        selectedTags.every(tag => q.tags.includes(tag))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.usageCount - a.usageCount
        case 'score':
          return b.averageScore - a.averageScore
        case 'difficulty':
          const diffOrder = { easy: 1, medium: 2, hard: 3 }
          return diffOrder[a.difficulty] - diffOrder[b.difficulty]
        case 'date':
        default:
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
      }
    })

    setFilteredQuestions(filtered)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'hard': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple-choice': return '📝'
      case 'true-false': return '✓✗'
      case 'short-answer': return '✍️'
      case 'essay': return '📄'
      case 'coding': return '💻'
      default: return '❓'
    }
  }

  const allSubjects = [...new Set(questions.map(q => q.subject))]
  const allTags = [...new Set(questions.flatMap(q => q.tags))]

  const duplicateQuestion = (question: Question) => {
    const newQuestion = { ...question, id: `q${Date.now()}`, text: `${question.text} (Copy)` }
    setQuestions([...questions, newQuestion])
    toast.success('Question duplicated successfully!')
  }

  const deleteQuestion = (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setQuestions(questions.filter(q => q.id !== questionId))
      toast.success('Question deleted successfully!')
    }
  }

  const importQuestions = () => {
    toast.success('Import feature coming soon!')
  }

  const exportQuestions = () => {
    const dataStr = JSON.stringify(filteredQuestions, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `question-bank-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    toast.success('Questions exported successfully!')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Database className="w-10 h-10" />
                Question Bank Manager
              </h1>
              <p className="text-white/90">Organize, filter, and manage your question repository</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={importQuestions}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={exportQuestions}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Question
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Questions</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgUsage.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Avg Usage</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgScore.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{allSubjects.length}</div>
            <div className="text-sm text-gray-600">Subjects</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Tag className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{allTags.length}</div>
            <div className="text-sm text-gray-600">Tags</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions, topics, or tags..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Subjects</option>
              {allSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="short-answer">Short Answer</option>
              <option value="essay">Essay</option>
              <option value="coding">Coding</option>
            </select>
          </div>

          {/* Sort and View */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { id: 'date', label: 'Date' },
                  { id: 'usage', label: 'Usage' },
                  { id: 'score', label: 'Score' },
                  { id: 'difficulty', label: 'Difficulty' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSortBy(option.id as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      sortBy === option.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{filteredQuestions.length} questions</span>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map(question => (
            <div key={question.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                {/* Type Icon */}
                <div className="text-3xl">{getTypeIcon(question.type)}</div>

                {/* Question Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{question.text}</h3>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty.toUpperCase()}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {question.type.replace('-', ' ')}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                          {question.subject}
                        </span>
                        {question.tags.map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedQuestion(question)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => duplicateQuestion(question)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toast.success('Edit feature coming soon!')}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Topic</div>
                      <div className="font-medium text-gray-900">{question.topic}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Points</div>
                      <div className="font-medium text-gray-900">{question.points}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Usage</div>
                      <div className="font-medium text-gray-900">{question.usageCount}x</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Avg Score</div>
                      <div className="font-medium text-green-600">{question.averageScore.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Bloom's Level</div>
                      <div className="font-medium text-gray-900">{question.bloomsLevel}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Created</div>
                      <div className="font-medium text-gray-900">{new Date(question.createdDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredQuestions.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Database className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Questions Found</h3>
            <p className="text-gray-600">Try adjusting your filters or add new questions to the bank</p>
          </div>
        )}

      </div>
    </div>
  )
}
