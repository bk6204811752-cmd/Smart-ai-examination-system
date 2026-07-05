import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Save, Calendar, Clock, Users, BookOpen } from 'lucide-react'
import { examAPI } from '../../lib/api'

interface Question {
  id: string
  question: string
  type: 'mcq' | 'multiple_select' | 'essay' | 'true_false' | 'code' | 'fill_blank'
  options: string[]
  correct_answer: any
  points: number
  explanation?: string
}

export default function CreateExamPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: 60,
    program: 'BCA',
    course: '',
    exam_type: 'practice',
    proctoring_level: 'strict',
    scheduled_date: '',
    passing_score: 60,
    shuffle_questions: true,
    show_results: true,
  })

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      question: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
      explanation: ''
    }
  ])

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
      explanation: ''
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ))
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options]
        newOptions[optionIndex] = value
        return { ...q, options: newOptions }
      }
      return q
    }))
  }

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...q.options, ''] }
      }
      return q
    }))
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options.length > 2) {
        const newOptions = q.options.filter((_, i) => i !== optionIndex)
        return { ...q, options: newOptions }
      }
      return q
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!examData.title || !examData.course || !examData.scheduled_date) {
      alert('Please fill in all required fields')
      return
    }

    if (questions.some(q => !q.question)) {
      alert('All questions must have a question text')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...examData,
        total_questions: questions.length,
        questions: questions.map(q => ({
          question_text: q.question,
          question_type: q.type,
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.points,
          difficulty: 'medium',
          explanation: q.explanation
        }))
      }
      
      await examAPI.createExam(payload)
      alert('Exam created successfully!')
      navigate('/teacher/dashboard')
    } catch (error) {
      console.error('Failed to create exam:', error)
      alert('Failed to create exam. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Exam</h1>
          <p className="text-gray-600">Fill in the details below to create a new examination</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Data Structures Mid Term"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name *
                </label>
                <input
                  type="text"
                  value={examData.course}
                  onChange={(e) => setExamData({ ...examData, course: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Data Structures"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Program
                </label>
                <select
                  value={examData.program}
                  onChange={(e) => setExamData({ ...examData, program: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="BBA">BBA</option>
                  <option value="BCA">BCA</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="MBA">MBA</option>
                  <option value="MCA">MCA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="w-4 h-4 inline mr-1" />
                  Exam Type
                </label>
                <select
                  value={examData.exam_type}
                  onChange={(e) => setExamData({ ...examData, exam_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="practice">Practice</option>
                  <option value="live">Live</option>
                  <option value="adaptive">Adaptive</option>
                  <option value="timed">Timed</option>
                  <option value="certification">Certification</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={examData.duration}
                  onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={examData.scheduled_date}
                  onChange={(e) => setExamData({ ...examData, scheduled_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  value={examData.passing_score}
                  onChange={(e) => setExamData({ ...examData, passing_score: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proctoring Level
                </label>
                <select
                  value={examData.proctoring_level}
                  onChange={(e) => setExamData({ ...examData, proctoring_level: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="full">Full</option>
                  <option value="strict">Strict</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={examData.description}
                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Exam instructions and description..."
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={examData.shuffle_questions}
                  onChange={(e) => setExamData({ ...examData, shuffle_questions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Shuffle questions for each student</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={examData.show_results}
                  onChange={(e) => setExamData({ ...examData, show_results: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Show results immediately after submission</span>
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={question.id} className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-lg">Question {qIndex + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      className="text-red-600 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Type
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="mcq">Multiple Choice (Single)</option>
                          <option value="multiple_select">Multiple Select</option>
                          <option value="true_false">True/False</option>
                          <option value="essay">Essay/Descriptive</option>
                          <option value="code">Code</option>
                          <option value="fill_blank">Fill in the Blank</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Points
                        </label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text *
                      </label>
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        rows={2}
                        placeholder="Enter your question..."
                        required
                      />
                    </div>

                    {/* Options for MCQ and Multiple Select */}
                    {(question.type === 'mcq' || question.type === 'multiple_select') && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options *
                          </label>
                          <button
                            type="button"
                            onClick={() => addOption(question.id)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center space-x-2">
                              <input
                                type={question.type === 'mcq' ? 'radio' : 'checkbox'}
                                name={`correct_${question.id}`}
                                checked={
                                  question.type === 'mcq' 
                                    ? question.correct_answer === option
                                    : question.correct_answer?.includes(option)
                                }
                                onChange={(e) => {
                                  if (question.type === 'mcq') {
                                    updateQuestion(question.id, 'correct_answer', option)
                                  } else {
                                    const current = question.correct_answer || []
                                    const newValue = e.target.checked
                                      ? [...current, option]
                                      : current.filter((v: string) => v !== option)
                                    updateQuestion(question.id, 'correct_answer', newValue)
                                  }
                                }}
                                className="w-4 h-4 text-blue-600"
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                placeholder={`Option ${oIndex + 1}`}
                              />
                              {question.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(question.id, oIndex)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {question.type === 'mcq' ? 'Select the correct answer' : 'Select all correct answers'}
                        </p>
                      </div>
                    )}

                    {/* True/False */}
                    {question.type === 'true_false' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correct Answer *
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`correct_${question.id}`}
                              checked={question.correct_answer === 'True'}
                              onChange={() => updateQuestion(question.id, 'correct_answer', 'True')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>True</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`correct_${question.id}`}
                              checked={question.correct_answer === 'False'}
                              onChange={() => updateQuestion(question.id, 'correct_answer', 'False')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>False</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Explanation (Optional)
                      </label>
                      <textarea
                        value={question.explanation || ''}
                        onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        rows={2}
                        placeholder="Explanation to show after exam..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/teacher/dashboard')}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create Exam'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
