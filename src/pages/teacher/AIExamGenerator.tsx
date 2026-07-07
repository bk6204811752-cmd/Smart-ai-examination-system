import { useState } from 'react'
import { smartExamAPI } from '../../lib/advancedAPIs'
import { Brain, Sparkles, Target, BarChart3, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ExamBlueprint {
  total_questions: number
  total_points: number
  estimated_duration: number
  difficulty_distribution: Record<string, number>
  topic_distribution: Record<string, number>
  bloom_distribution: Record<string, number>
  estimated_pass_rate: number
  quality_score: number
  recommendations: string[]
}

export default function AIExamGenerator() {
  const [generating, setGenerating] = useState(false)
  const [blueprint, setBlueprint] = useState<ExamBlueprint | null>(null)
  const [config, setConfig] = useState({
    title: '',
    subject: '',
    topics: [] as string[],
    num_questions: 25,
    duration: 90,
    difficulty_level: 'medium' as 'easy' | 'medium' | 'hard',
    bloom_focus: [] as string[],
    target_pass_rate: 0.7,
  })

  const [topicInput, setTopicInput] = useState('')

  const bloomLevels = [
    { value: 'knowledge', label: 'Knowledge', desc: 'Recall facts' },
    { value: 'comprehension', label: 'Comprehension', desc: 'Understand concepts' },
    { value: 'application', label: 'Application', desc: 'Apply knowledge' },
    { value: 'analysis', label: 'Analysis', desc: 'Analyze information' },
    { value: 'synthesis', label: 'Synthesis', desc: 'Create new ideas' },
    { value: 'evaluation', label: 'Evaluation', desc: 'Make judgments' },
  ]

  const handleAddTopic = () => {
    if (topicInput.trim() && !config.topics.includes(topicInput.trim())) {
      setConfig({ ...config, topics: [...config.topics, topicInput.trim()] })
      setTopicInput('')
    }
  }

  const handleRemoveTopic = (topic: string) => {
    setConfig({ ...config, topics: config.topics.filter(t => t !== topic) })
  }

  const toggleBloomFocus = (level: string) => {
    setConfig({
      ...config,
      bloom_focus: config.bloom_focus.includes(level)
        ? config.bloom_focus.filter(l => l !== level)
        : [...config.bloom_focus, level],
    })
  }

  const generateExam = async () => {
    if (!config.title || !config.subject || config.topics.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setGenerating(true)
    try {
      const result = await smartExamAPI.generateAIExam(config)
      setGeneratedExam(result.exam)
      setBlueprint(result.blueprint)
      toast.success('AI Exam generated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate exam')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                AI Exam Generator
                <Sparkles className="w-6 h-6" />
              </h1>
              <p className="text-white/90 mt-1">
                Create intelligent, balanced exams with ML-powered question selection
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Exam Configuration</h2>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Title *
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={e => setConfig({ ...config, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Mid-Term Examination"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={config.subject}
                      onChange={e => setConfig({ ...config, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topics * ({config.topics.length} added)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={topicInput}
                      onChange={e => setTopicInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleAddTopic()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Add topic and press Enter"
                    />
                    <button
                      onClick={handleAddTopic}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.topics.map(topic => (
                      <span
                        key={topic}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {topic}
                        <button
                          onClick={() => handleRemoveTopic(topic)}
                          className="hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Exam Parameters */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Questions
                    </label>
                    <input
                      type="number"
                      value={config.num_questions}
                      onChange={e =>
                        setConfig({ ...config, num_questions: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="5"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      value={config.duration}
                      onChange={e => setConfig({ ...config, duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="15"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={config.difficulty_level}
                      onChange={e =>
                        setConfig({ ...config, difficulty_level: e.target.value as any })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Target Pass Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Pass Rate: {Math.round(config.target_pass_rate * 100)}%
                  </label>
                  <input
                    type="range"
                    value={config.target_pass_rate}
                    onChange={e =>
                      setConfig({ ...config, target_pass_rate: parseFloat(e.target.value) })
                    }
                    min="0.4"
                    max="0.9"
                    step="0.05"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Challenging (40%)</span>
                    <span>Balanced (70%)</span>
                    <span>Easy (90%)</span>
                  </div>
                </div>

                {/* Bloom's Taxonomy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Bloom's Taxonomy Focus (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {bloomLevels.map(level => (
                      <button
                        key={level.value}
                        onClick={() => toggleBloomFocus(level.value)}
                        className={`p-3 rounded-lg border-2 transition text-left ${
                          config.bloom_focus.includes(level.value)
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">{level.label}</div>
                        <div className="text-xs text-gray-500">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateExam}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate AI Exam
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Blueprint Preview */}
          <div className="space-y-6">
            {blueprint && (
              <>
                {/* Quality Score */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Quality Score</h3>
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="text-5xl font-bold mb-2">
                    {blueprint.quality_score.toFixed(1)}
                  </div>
                  <div className="text-sm opacity-90">Out of 100</div>
                  <div className="mt-4 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-full rounded-full transition-all"
                      style={{ width: `${blueprint.quality_score}%` }}
                    />
                  </div>
                </div>

                {/* Exam Stats */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Exam Statistics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Questions</span>
                      <span className="font-bold text-gray-900">{blueprint.total_questions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Points</span>
                      <span className="font-bold text-gray-900">{blueprint.total_points}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Duration</span>
                      <span className="font-bold text-gray-900">
                        {blueprint.estimated_duration} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pass Rate</span>
                      <span className="font-bold text-green-600">
                        {Math.round(blueprint.estimated_pass_rate * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    AI Insights
                  </h3>
                  <div className="space-y-2">
                    {blueprint.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribution Charts */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Difficulty Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(blueprint.difficulty_distribution).map(
                      ([level, percentage]) => (
                        <div key={level}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize text-gray-600">{level}</span>
                            <span className="font-medium text-gray-900">{percentage}%</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-full rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
