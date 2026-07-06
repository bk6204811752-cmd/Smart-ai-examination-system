import { useState, useEffect } from 'react'
import { BookTemplate, Plus, Search, Star, Copy, Trash2, Download, Eye, Filter, TrendingUp, Users, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { templateAPI } from '../../lib/api'

interface ExamTemplate {
  id: string
  name: string
  description: string
  subject: string
  category: string
  difficulty: string
  duration: number
  totalQuestions: number
  passingScore: number
  tags: string[]
  createdBy: string
  usageCount: number
  rating: number
  lastUpdated: string
  questions: { type: string; count: number; points: number }[]
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
  const [templates, setTemplates] = useState<ExamTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent'>('popular')
  const [previewTemplate, setPreviewTemplate] = useState<ExamTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await templateAPI.getTemplates()
      setTemplates(data || [])
    } catch {
      // silent — could be first run with no templates
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates
    .filter(t => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q))
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || t.difficulty === selectedDifficulty
      return matchesSearch && matchesCategory && matchesDifficulty
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return b.usageCount - a.usageCount
      if (sortBy === 'rating') return b.rating - a.rating
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    })

  const useTemplate = (t: ExamTemplate) => navigate('/teacher/create-exam', { state: { template: t } })

  const duplicateTemplate = async (t: ExamTemplate) => {
    try {
      await templateAPI.duplicateTemplate(t.id)
      toast.success('Template duplicated successfully!')
      loadTemplates()
    } catch {
      toast.error('Failed to duplicate template')
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      await templateAPI.deleteTemplate(id)
      toast.success('Template deleted successfully!')
      loadTemplates()
    } catch {
      toast.error('Failed to delete template')
    }
  }

  const getDifficultyColor = (d: string) => {
    const colors: Record<string, string> = { beginner: 'bg-green-100 text-green-700', intermediate: 'bg-yellow-100 text-yellow-700', advanced: 'bg-red-100 text-red-700' }
    return colors[d] || 'bg-gray-100 text-gray-700'
  }

  const getCategoryColor = (c: string) => {
    const colors: Record<string, string> = { academic: 'bg-blue-100 text-blue-700', certification: 'bg-purple-100 text-purple-700', assessment: 'bg-orange-100 text-orange-700', practice: 'bg-green-100 text-green-700' }
    return colors[c] || 'bg-gray-100 text-gray-700'
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
            <div className="text-2xl font-bold text-gray-900">{templates.reduce((s, t) => s + t.usageCount, 0)}</div>
            <div className="text-sm text-gray-600">Total Uses</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <Star className="w-8 h-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{templates.length ? (templates.reduce((s, t) => s + t.rating, 0) / templates.length).toFixed(1) : '0'}</div>
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
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="certification">Certification</option>
              <option value="assessment">Assessment</option>
              <option value="practice">Practice</option>
            </select>
            <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
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
                {[{ id: 'popular', label: 'Most Popular' }, { id: 'rating', label: 'Highest Rated' }, { id: 'recent', label: 'Recently Updated' }]
                  .map(option => (
                    <button key={option.id} onClick={() => setSortBy(option.id as any)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${sortBy === option.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {option.label}
                    </button>
                  ))}
              </div>
            </div>
            <span className="text-sm text-gray-600">{filteredTemplates.length} templates</span>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading templates...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <div key={template.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
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
                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(template.category)}`}>{template.category}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(template.difficulty)}`}>{template.difficulty}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-2"><div className="text-lg font-bold text-gray-900">{template.totalQuestions}</div><div className="text-xs text-gray-600">Questions</div></div>
                    <div className="bg-gray-50 rounded-lg p-2"><div className="text-lg font-bold text-gray-900">{template.duration}m</div><div className="text-xs text-gray-600">Duration</div></div>
                    <div className="bg-gray-50 rounded-lg p-2"><div className="text-lg font-bold text-gray-900">{template.passingScore}%</div><div className="text-xs text-gray-600">Pass Score</div></div>
                  </div>
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
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">#{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-4 pt-4 border-t border-gray-200">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{template.usageCount} uses</span>
                    <span>by {template.createdBy}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => useTemplate(template)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Use Template
                    </button>
                    <div className="grid grid-cols-3 gap-1">
                      <button onClick={() => duplicateTemplate(template)}
                        className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center" title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => setPreviewTemplate(template)}
                        className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center" title="Preview">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTemplate(template.id)}
                        className="bg-gray-100 text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all flex items-center justify-center" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTemplates.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <BookTemplate className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Templates Found</h3>
            <p className="text-gray-600">Try adjusting your filters or create a new template</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{previewTemplate.name}</h2>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">{previewTemplate.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Subject:</span> <span className="font-medium">{previewTemplate.subject}</span></div>
                <div><span className="text-gray-500">Category:</span> <span className="font-medium capitalize">{previewTemplate.category}</span></div>
                <div><span className="text-gray-500">Difficulty:</span> <span className="font-medium capitalize">{previewTemplate.difficulty}</span></div>
                <div><span className="text-gray-500">Duration:</span> <span className="font-medium">{previewTemplate.duration} min</span></div>
                <div><span className="text-gray-500">Questions:</span> <span className="font-medium">{previewTemplate.totalQuestions}</span></div>
                <div><span className="text-gray-500">Passing Score:</span> <span className="font-medium">{previewTemplate.passingScore}%</span></div>
                <div><span className="text-gray-500">Created By:</span> <span className="font-medium">{previewTemplate.createdBy}</span></div>
                <div><span className="text-gray-500">Usage:</span> <span className="font-medium">{previewTemplate.usageCount} times</span></div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Question Breakdown</h4>
                <div className="space-y-1">
                  {previewTemplate.questions.map((q, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{q.type}</span>
                      <span>{q.count} questions × {q.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Settings</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${previewTemplate.settings.randomizeQuestions ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Randomize Questions
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${previewTemplate.settings.randomizeOptions ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Randomize Options
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${previewTemplate.settings.showResults ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Show Results
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${previewTemplate.settings.allowReview ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Allow Review
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${previewTemplate.settings.proctoring ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Proctoring
                  </div>
                </div>
              </div>
              {previewTemplate.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {previewTemplate.tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setPreviewTemplate(null)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Close</button>
              <button onClick={() => { useTemplate(previewTemplate); setPreviewTemplate(null) }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 font-medium flex items-center gap-2">
                <Download className="w-4 h-4" /> Use This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
