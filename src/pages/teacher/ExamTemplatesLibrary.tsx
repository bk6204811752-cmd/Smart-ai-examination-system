import { useState } from 'react'
import { BookTemplate, Plus, Search, Star, Copy, Edit, Trash2, Download, Eye, Filter, TrendingUp, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface ExamTemplate {
  id: string
  name: string
  description: string
  subject: string
  category: 'academic' | 'certification' | 'assessment' | 'practice'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  totalQuestions: number
  passingScore: number
  tags: string[]
  createdBy: string
  usageCount: number
  rating: number
  lastUpdated: string
  questions: {
    type: string
    count: number
    points: number
  }[]
  settings: {
    randomizeQuestions: boolean
    randomizeOptions: boolean
    showResults: boolean
    allowReview: boolean
    proctoring: boolean
  }
}

export default function ExamTemplatesLibrary() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ExamTemplate[]>([
    {
      id: 't1',
      name: 'Python Programming Fundamentals',
      description: 'Comprehensive exam covering Python basics, data structures, and OOP concepts',
      subject: 'Programming',
      category: 'academic',
      difficulty: 'beginner',
      duration: 60,
      totalQuestions: 30,
      passingScore: 70,
      tags: ['python', 'programming', 'basics', 'OOP'],
      createdBy: 'Prof. Kumar',
      usageCount: 145,
      rating: 4.8,
      lastUpdated: '2024-02-15',
      questions: [
        { type: 'Multiple Choice', count: 20, points: 2 },
        { type: 'True/False', count: 5, points: 1 },
        { type: 'Short Answer', count: 5, points: 3 }
      ],
      settings: {
        randomizeQuestions: true,
        randomizeOptions: true,
        showResults: true,
        allowReview: false,
        proctoring: true
      }
    },
    {
      id: 't2',
      name: 'Data Structures & Algorithms',
      description: 'Advanced exam testing knowledge of common data structures and algorithmic problem-solving',
      subject: 'Computer Science',
      category: 'academic',
      difficulty: 'advanced',
      duration: 120,
      totalQuestions: 40,
      passingScore: 75,
      tags: ['algorithms', 'data-structures', 'complexity', 'coding'],
      createdBy: 'Dr. Lee',
      usageCount: 89,
      rating: 4.9,
      lastUpdated: '2024-02-10',
      questions: [
        { type: 'Multiple Choice', count: 15, points: 3 },
        { type: 'Coding', count: 10, points: 10 },
        { type: 'Essay', count: 5, points: 8 },
        { type: 'Short Answer', count: 10, points: 4 }
      ],
      settings: {
        randomizeQuestions: false,
        randomizeOptions: true,
        showResults: false,
        allowReview: true,
        proctoring: true
      }
    },
    {
      id: 't3',
      name: 'Machine Learning Basics Quiz',
      description: 'Quick assessment of ML fundamentals, supervised/unsupervised learning, and model evaluation',
      subject: 'Artificial Intelligence',
      category: 'practice',
      difficulty: 'intermediate',
      duration: 45,
      totalQuestions: 25,
      passingScore: 60,
      tags: ['machine-learning', 'AI', 'models', 'evaluation'],
      createdBy: 'Prof. Kumar',
      usageCount: 203,
      rating: 4.7,
      lastUpdated: '2024-02-12',
      questions: [
        { type: 'Multiple Choice', count: 20, points: 4 },
        { type: 'True/False', count: 5, points: 2 }
      ],
      settings: {
        randomizeQuestions: true,
        randomizeOptions: true,
        showResults: true,
        allowReview: true,
        proctoring: false
      }
    },
    {
      id: 't4',
      name: 'Database Management Certification',
      description: 'Professional certification exam for SQL, database design, and normalization',
      subject: 'Databases',
      category: 'certification',
      difficulty: 'advanced',
      duration: 90,
      totalQuestions: 50,
      passingScore: 80,
      tags: ['SQL', 'databases', 'normalization', 'queries'],
      createdBy: 'Dr. Lee',
      usageCount: 67,
      rating: 4.6,
      lastUpdated: '2024-02-08',
      questions: [
        { type: 'Multiple Choice', count: 30, points: 2 },
        { type: 'Coding', count: 10, points: 5 },
        { type: 'Short Answer', count: 10, points: 3 }
      ],
      settings: {
        randomizeQuestions: true,
        randomizeOptions: false,
        showResults: false,
        allowReview: false,
        proctoring: true
      }
    },
    {
      id: 't5',
      name: 'Web Development Skills Assessment',
      description: 'Evaluate HTML, CSS, JavaScript, and React knowledge for web developers',
      subject: 'Web Development',
      category: 'assessment',
      difficulty: 'intermediate',
      duration: 75,
      totalQuestions: 35,
      passingScore: 70,
      tags: ['HTML', 'CSS', 'JavaScript', 'React', 'frontend'],
      createdBy: 'Prof. Kumar',
      usageCount: 178,
      rating: 4.9,
      lastUpdated: '2024-02-14',
      questions: [
        { type: 'Multiple Choice', count: 15, points: 2 },
        { type: 'Coding', count: 10, points: 8 },
        { type: 'True/False', count: 10, points: 1 }
      ],
      settings: {
        randomizeQuestions: true,
        randomizeOptions: true,
        showResults: true,
        allowReview: true,
        proctoring: false
      }
    },
    {
      id: 't6',
      name: 'Cybersecurity Fundamentals',
      description: 'Cover encryption, network security, threats, and best practices',
      subject: 'Security',
      category: 'academic',
      difficulty: 'intermediate',
      duration: 60,
      totalQuestions: 30,
      passingScore: 75,
      tags: ['security', 'encryption', 'networks', 'threats'],
      createdBy: 'Dr. Lee',
      usageCount: 124,
      rating: 4.8,
      lastUpdated: '2024-02-11',
      questions: [
        { type: 'Multiple Choice', count: 20, points: 3 },
        { type: 'Short Answer', count: 10, points: 5 }
      ],
      settings: {
        randomizeQuestions: true,
        randomizeOptions: true,
        showResults: false,
        allowReview: true,
        proctoring: true
      }
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent'>('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredTemplates = templates
    .filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || t.difficulty === selectedDifficulty
      
      return matchesSearch && matchesCategory && matchesDifficulty
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return b.usageCount - a.usageCount
      if (sortBy === 'rating') return b.rating - a.rating
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'academic': return 'bg-blue-100 text-blue-700'
      case 'certification': return 'bg-purple-100 text-purple-700'
      case 'assessment': return 'bg-orange-100 text-orange-700'
      case 'practice': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const useTemplate = (template: ExamTemplate) => {
    toast.success(`Using template: ${template.name}`)
    navigate('/teacher/create-exam', { state: { template } })
  }

  const duplicateTemplate = (template: ExamTemplate) => {
    const newTemplate = {
      ...template,
      id: `t${Date.now()}`,
      name: `${template.name} (Copy)`,
      usageCount: 0
    }
    setTemplates([...templates, newTemplate])
    toast.success('Template duplicated successfully!')
  }

  const deleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== templateId))
      toast.success('Template deleted successfully!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <BookTemplate className="w-10 h-10" />
                Exam Templates Library
              </h1>
              <p className="text-white/90">Pre-built exam templates to accelerate your assessment creation</p>
            </div>
            <button
              onClick={() => toast.success('Create custom template feature coming soon!')}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Template
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <BookTemplate className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{templates.length}</div>
            <div className="text-sm text-gray-600">Total Templates</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <Users className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{templates.reduce((sum, t) => sum + t.usageCount, 0)}</div>
            <div className="text-sm text-gray-600">Total Uses</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <Star className="w-8 h-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{(templates.reduce((sum, t) => sum + t.rating, 0) / templates.length).toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg Rating</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{templates.filter(t => t.category === 'certification').length}</div>
            <div className="text-sm text-gray-600">Certifications</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="certification">Certification</option>
              <option value="assessment">Assessment</option>
              <option value="practice">Practice</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { id: 'popular', label: 'Most Popular' },
                  { id: 'rating', label: 'Highest Rated' },
                  { id: 'recent', label: 'Recently Updated' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSortBy(option.id as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      sortBy === option.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-sm text-gray-600">{filteredTemplates.length} templates</span>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              {/* Template Header */}
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{template.name}</h3>
                    <p className="text-sm text-white/90">{template.subject}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                    <span className="text-sm font-bold">{template.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-white/80 line-clamp-2">{template.description}</p>
              </div>

              {/* Template Body */}
              <div className="p-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(template.difficulty)}`}>
                    {template.difficulty}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-gray-900">{template.totalQuestions}</div>
                    <div className="text-xs text-gray-600">Questions</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-gray-900">{template.duration}m</div>
                    <div className="text-xs text-gray-600">Duration</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-gray-900">{template.passingScore}%</div>
                    <div className="text-xs text-gray-600">Pass Score</div>
                  </div>
                </div>

                {/* Question Breakdown */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">Question Types:</div>
                  <div className="space-y-1">
                    {template.questions.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                        <span>{q.type}</span>
                        <span className="font-medium">{q.count} × {q.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-600 mb-4 pt-4 border-t border-gray-200">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {template.usageCount} uses
                  </span>
                  <span>by {template.createdBy}</span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => useTemplate(template)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Use Template
                  </button>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => duplicateTemplate(template)}
                      className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toast.success('Preview feature coming soon!')}
                      className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="bg-gray-100 text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <BookTemplate className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Templates Found</h3>
            <p className="text-gray-600">Try adjusting your filters or create a new template</p>
          </div>
        )}

      </div>
    </div>
  )
}
