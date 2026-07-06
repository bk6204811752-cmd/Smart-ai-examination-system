import { useState, useEffect } from 'react'
import { Database, Plus, Search, Filter, Upload, Download, Edit, Trash2, Copy, Eye, Star, TrendingUp, BookOpen, Tag, Brain, X, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { questionBankAPI } from '../../lib/api'

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

interface Stats {
  total: number
  byDifficulty: { easy: number; medium: number; hard: number }
  byType: { 'multiple-choice': number; 'true-false': number; 'short-answer': number; essay: number; coding: number }
  avgUsage: number
  avgScore: number
  subjects: string[]
  tags: string[]
}

function questionTypeLabel(type: string) {
  switch (type) {
    case 'multiple-choice': return '📝'
    case 'true-false': return '✓✗'
    case 'short-answer': return '✍️'
    case 'essay': return '📄'
    case 'coding': return '💻'
    default: return '❓'
  }
}

function difficultyColor(d: string) {
  switch (d) {
    case 'easy': return 'bg-green-100 text-green-700'
    case 'medium': return 'bg-yellow-100 text-yellow-700'
    case 'hard': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const defaultForm: {
  text: string; type: Question['type']; subject: string; topic: string; difficulty: Question['difficulty'];
  tags: string; options: string; correctAnswer: string; points: number; timeLimit: string; bloomsLevel: string; learningObjective: string;
} = {
  text: '', type: 'multiple-choice', subject: '', topic: '', difficulty: 'medium',
  tags: '', options: '', correctAnswer: '', points: 10, timeLimit: '', bloomsLevel: 'Remember', learningObjective: '',
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
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null)
  const [editQuestion, setEditQuestion] = useState<Question | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [allSubjects, setAllSubjects] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    filterQuestions()
  }, [questions, searchQuery, selectedSubject, selectedDifficulty, selectedType, selectedTags, sortBy])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [qData, statsData, subjects, tags] = await Promise.all([
        questionBankAPI.getQuestions(),
        questionBankAPI.getStats(),
        questionBankAPI.getSubjects(),
        questionBankAPI.getTags(),
      ])
      setQuestions(qData || [])
      setStats(statsData)
      setAllSubjects(subjects || [])
      setAllTags(tags || [])
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load question bank')
    } finally {
      setLoading(false)
    }
  }

  const filterQuestions = () => {
    let filtered = [...questions]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.text.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    if (selectedSubject !== 'all') filtered = filtered.filter(item => item.subject === selectedSubject)
    if (selectedDifficulty !== 'all') filtered = filtered.filter(item => item.difficulty === selectedDifficulty)
    if (selectedType !== 'all') filtered = filtered.filter(item => item.type === selectedType)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => selectedTags.every(t => item.tags.includes(t)))
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'usage': return b.usageCount - a.usageCount
        case 'score': return b.averageScore - a.averageScore
        case 'difficulty':
          const order = { easy: 1, medium: 2, hard: 3 }
          return order[a.difficulty] - order[b.difficulty]
        case 'date':
        default:
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
      }
    })
    setFilteredQuestions(filtered)
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    try {
      await questionBankAPI.deleteQuestion(questionId)
      toast.success('Question deleted successfully!')
      loadAll()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to delete question')
    }
  }

  const handleDuplicate = async (question: Question) => {
    try {
      await questionBankAPI.duplicateQuestion(question.id)
      toast.success('Question duplicated successfully!')
      loadAll()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to duplicate question')
    }
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredQuestions, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `question-bank-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    toast.success('Questions exported successfully!')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        if (!Array.isArray(imported)) throw new Error('Invalid format')
        let count = 0
        for (const q of imported) {
          await questionBankAPI.createQuestion({
            text: q.text || q.question || '',
            type: q.type || 'multiple-choice',
            subject: q.subject || '',
            topic: q.topic || '',
            difficulty: q.difficulty || 'medium',
            tags: q.tags || [],
            options: q.options,
            correctAnswer: q.correctAnswer ?? q.correct_answer,
            points: q.points || 10,
            timeLimit: q.timeLimit || q.time_limit,
            bloomsLevel: q.bloomsLevel || q.blooms_level || 'Remember',
            learningObjective: q.learningObjective || q.learning_objective || '',
          })
          count++
        }
        toast.success(`Imported ${count} questions successfully!`)
        loadAll()
      } catch {
        toast.error('Failed to import questions. Check file format.')
      }
    }
    input.click()
  }

  const openAddModal = () => {
    setForm(defaultForm)
    setEditQuestion(null)
    setShowAddModal(true)
  }

  const openEditModal = (q: Question) => {
    setEditQuestion(q)
    setForm({
      text: q.text,
      type: q.type,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      tags: q.tags.join(', '),
      options: q.options?.join(' | ') || '',
      correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : (q.correctAnswer || ''),
      points: q.points,
      timeLimit: q.timeLimit?.toString() || '',
      bloomsLevel: q.bloomsLevel,
      learningObjective: q.learningObjective,
    })
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error('Question text is required'); return }
    if (!form.subject.trim()) { toast.error('Subject is required'); return }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const options = form.type === 'multiple-choice' || form.type === 'true-false'
      ? form.options.split('|').map(o => o.trim()).filter(Boolean)
      : undefined
    const correctAnswer = form.correctAnswer.trim() || undefined
    const timeLimit = form.timeLimit ? parseInt(form.timeLimit) : undefined

    setSaving(true)
    try {
      const payload = {
        text: form.text,
        type: form.type,
        subject: form.subject,
        topic: form.topic,
        difficulty: form.difficulty,
        tags,
        options: options && options.length > 0 ? options : undefined,
        correctAnswer,
        points: form.points,
        timeLimit,
        bloomsLevel: form.bloomsLevel,
        learningObjective: form.learningObjective,
      }

      if (editQuestion) {
        await questionBankAPI.updateQuestion(editQuestion.id, payload)
        toast.success('Question updated successfully!')
      } else {
        await questionBankAPI.createQuestion(payload)
        toast.success('Question created successfully!')
      }
      setShowAddModal(false)
      loadAll()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save question')
    } finally {
      setSaving(false)
    }
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
              <button onClick={handleImport} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
                <Upload className="w-4 h-4" /> Import
              </button>
              <button onClick={handleExport} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
                <Download className="w-4 h-4" /> Export
              </button>
              <button onClick={openAddModal} className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg">
                <Plus className="w-5 h-5" /> Add Question
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2"><Database className="w-8 h-8 text-indigo-500" /></div>
            <div className="text-2xl font-bold text-gray-900">{stats?.total ?? '-'}</div>
            <div className="text-sm text-gray-600">Total Questions</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2"><TrendingUp className="w-8 h-8 text-green-500" /></div>
            <div className="text-2xl font-bold text-gray-900">{stats ? stats.avgUsage.toFixed(0) : '-'}</div>
            <div className="text-sm text-gray-600">Avg Usage</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2"><Star className="w-8 h-8 text-yellow-500" /></div>
            <div className="text-2xl font-bold text-gray-900">{stats ? `${stats.avgScore.toFixed(1)}%` : '-'}</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2"><BookOpen className="w-8 h-8 text-blue-500" /></div>
            <div className="text-2xl font-bold text-gray-900">{allSubjects.length}</div>
            <div className="text-sm text-gray-600">Subjects</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2"><Tag className="w-8 h-8 text-purple-500" /></div>
            <div className="text-2xl font-bold text-gray-900">{allTags.length}</div>
            <div className="text-sm text-gray-600">Tags</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search questions, topics, or tags..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Subjects</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Types</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="short-answer">Short Answer</option>
              <option value="essay">Essay</option>
              <option value="coding">Coding</option>
            </select>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { id: 'date', label: 'Date' }, { id: 'usage', label: 'Usage' },
                  { id: 'score', label: 'Score' }, { id: 'difficulty', label: 'Difficulty' },
                ].map(option => (
                  <button key={option.id} onClick={() => setSortBy(option.id as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${sortBy === option.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-sm text-gray-600">{loading ? 'Loading...' : `${filteredQuestions.length} questions`}</span>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading questions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map(question => (
              <div key={question.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{questionTypeLabel(question.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{question.text}</h3>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${difficultyColor(question.difficulty)}`}>
                            {question.difficulty.toUpperCase()}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                            {question.type.replace('-', ' ')}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                            {question.subject}
                          </span>
                          {question.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">#{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setViewQuestion(question)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDuplicate(question)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Duplicate">
                          <Copy className="w-5 h-5" />
                        </button>
                        <button onClick={() => openEditModal(question)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Edit">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(question.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div><div className="text-gray-600">Topic</div><div className="font-medium text-gray-900">{question.topic}</div></div>
                      <div><div className="text-gray-600">Points</div><div className="font-medium text-gray-900">{question.points}</div></div>
                      <div><div className="text-gray-600">Usage</div><div className="font-medium text-gray-900">{question.usageCount}x</div></div>
                      <div><div className="text-gray-600">Avg Score</div><div className="font-medium text-green-600">{question.averageScore.toFixed(1)}%</div></div>
                      <div><div className="text-gray-600">Bloom's Level</div><div className="font-medium text-gray-900">{question.bloomsLevel}</div></div>
                      <div><div className="text-gray-600">Created</div><div className="font-medium text-gray-900">{new Date(question.createdDate).toLocaleDateString()}</div></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredQuestions.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Database className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Questions Found</h3>
            <p className="text-gray-600">Try adjusting your filters or add new questions to the bank</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editQuestion ? 'Edit Question' : 'Add New Question'}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
                <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter the question..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                    <option value="short-answer">Short Answer</option>
                    <option value="essay">Essay</option>
                    <option value="coding">Coding</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                  <input type="number" value={form.points} onChange={e => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" min={1} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} list="subjects-list"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Data Structures" />
                  <datalist id="subjects-list">
                    {allSubjects.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Searching Algorithms" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bloom's Level</label>
                  <select value={form.bloomsLevel} onChange={e => setForm({ ...form, bloomsLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="Remember">Remember</option>
                    <option value="Understand">Understand</option>
                    <option value="Apply">Apply</option>
                    <option value="Analyze">Analyze</option>
                    <option value="Evaluate">Evaluate</option>
                    <option value="Create">Create</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (seconds)</label>
                  <input value={form.timeLimit} onChange={e => setForm({ ...form, timeLimit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Optional" type="number" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. algorithms, python, sorting" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Learning Objective</label>
                <input value={form.learningObjective} onChange={e => setForm({ ...form, learningObjective: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Understand algorithm time complexity" />
              </div>
              {(form.type === 'multiple-choice' || form.type === 'true-false') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Options (separated by |)</label>
                    <textarea value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder={form.type === 'true-false' ? 'True | False' : 'O(log n) | O(n) | O(n²) | O(1)'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                    <input value={form.correctAnswer} onChange={e => setForm({ ...form, correctAnswer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder={form.type === 'true-false' ? 'True or False' : 'e.g. O(log n)'} />
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editQuestion ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewQuestion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Question Details</h2>
              <button onClick={() => setViewQuestion(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Question</div>
                <div className="text-lg font-medium text-gray-900">{viewQuestion.text}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-sm text-gray-600">Subject</div><div className="font-medium">{viewQuestion.subject}</div></div>
                <div><div className="text-sm text-gray-600">Topic</div><div className="font-medium">{viewQuestion.topic}</div></div>
                <div><div className="text-sm text-gray-600">Type</div><div className="font-medium capitalize">{viewQuestion.type.replace('-', ' ')}</div></div>
                <div><div className="text-sm text-gray-600">Difficulty</div><div className="font-medium capitalize">{viewQuestion.difficulty}</div></div>
                <div><div className="text-sm text-gray-600">Points</div><div className="font-medium">{viewQuestion.points}</div></div>
                <div><div className="text-sm text-gray-600">Time Limit</div><div className="font-medium">{viewQuestion.timeLimit ? `${viewQuestion.timeLimit}s` : 'N/A'}</div></div>
                <div><div className="text-sm text-gray-600">Bloom's Level</div><div className="font-medium">{viewQuestion.bloomsLevel}</div></div>
                <div><div className="text-sm text-gray-600">Usage Count</div><div className="font-medium">{viewQuestion.usageCount}</div></div>
                <div><div className="text-sm text-gray-600">Avg Score</div><div className="font-medium text-green-600">{viewQuestion.averageScore.toFixed(1)}%</div></div>
                <div><div className="text-sm text-gray-600">Created By</div><div className="font-medium">{viewQuestion.createdBy}</div></div>
              </div>
              {viewQuestion.learningObjective && (
                <div><div className="text-sm text-gray-600">Learning Objective</div><div className="font-medium">{viewQuestion.learningObjective}</div></div>
              )}
              {viewQuestion.options && viewQuestion.options.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Options</div>
                  <div className="space-y-1">
                    {viewQuestion.options.map((opt, i) => (
                      <div key={i} className={`px-3 py-2 rounded-lg text-sm ${opt === viewQuestion.correctAnswer ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50'}`}>
                        {opt} {opt === viewQuestion.correctAnswer && '✓'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewQuestion.tags.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {viewQuestion.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">#{t}</span>)}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => setViewQuestion(null)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
