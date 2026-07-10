import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Save, Calendar, Clock, Users, BookOpen, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
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
  const { examId } = useParams()
  const isEditing = !!examId
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditing)
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

  useEffect(() => {
    if (!examId) return
    const fetchExam = async () => {
      try {
        const exam = await examAPI.getExam(examId)
        const scheduled = exam.scheduled_time
          ? exam.scheduled_time.replace('Z', '').slice(0, 16)
          : ''

        setExamData({
          title: exam.title || '',
          description: exam.instructions || '',
          duration: exam.duration || 60,
          program: exam.program || 'BCA',
          course: exam.subject || '',
          exam_type: exam.exam_type || 'practice',
          proctoring_level: exam.proctoring_level || 'strict',
          scheduled_date: scheduled,
          passing_score: exam.passing_marks || 60,
          shuffle_questions: exam.shuffle_questions ?? true,
          show_results: exam.show_results ?? true,
        })

        if (exam.questions && exam.questions.length > 0) {
          const mapped = exam.questions.map((q: any, i: number) => {
            const correctAnswer = q.type === 'mcq' || q.type === 'multiple_select'
              ? q.correct_answer
              : q.correct_answer ?? ''

            const correctAnswerValue = q.type === 'mcq' && typeof correctAnswer === 'number'
              ? (q.options[correctAnswer] ?? '')
              : q.type === 'multiple_select' && Array.isArray(correctAnswer)
                ? correctAnswer.map((idx: number) => q.options[idx] ?? '')
                : correctAnswer

            return {
              id: String(i + 1),
              question: q.question || '',
              type: q.question_type || q.type || 'mcq',
              options: q.options || ['', '', '', ''],
              correct_answer: correctAnswerValue,
              points: q.marks || 1,
              explanation: q.explanation || '',
            }
          })
          setQuestions(mapped)
        }
      } catch (err) {
        toast.error('Failed to load exam for editing')
        navigate('/teacher/dashboard')
      } finally {
        setFetching(false)
      }
    }
    fetchExam()
  }, [examId, navigate])

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

  const buildPayload = () => ({
    title: examData.title,
    subject: examData.course,
    instructions: examData.description,
    scheduled_time: examData.scheduled_date,
    passing_marks: examData.passing_score,
    duration: examData.duration,
    program: examData.program,
    exam_type: examData.exam_type,
    proctoring_level: examData.proctoring_level,
    shuffle_questions: examData.shuffle_questions,
    show_results: examData.show_results,
    difficulty: 'Medium',
    total_questions: questions.length,
    questions: questions.map(q => {
      const correctAnswer = q.type === 'mcq'
        ? q.options.indexOf(q.correct_answer)
        : q.type === 'multiple_select'
          ? (q.correct_answer || []).map((a: string) => q.options.indexOf(a))
          : q.correct_answer

      return {
        question: q.question,
        question_type: q.type,
        options: q.options,
        correct_answer: correctAnswer,
        marks: q.points,
        difficulty: 'Medium',
        explanation: q.explanation
      }
    })
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!examData.title || !examData.course || !examData.scheduled_date) {
      toast.error('Please fill in all required fields: Title, Course, and Scheduled Date')
      return
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question')
      return
    }

    for (const q of questions) {
      if (!q.question.trim()) {
        toast.error('All questions must have question text')
        return
      }
      if ((q.type === 'mcq' || q.type === 'multiple_select') && q.options.some(o => !o.trim())) {
        toast.error(`Question "${q.question.slice(0, 30)}..." has empty options. Please fill all options.`)
        return
      }
      if ((q.type === 'mcq' || q.type === 'multiple_select') && q.options.length < 2) {
        toast.error(`Question "${q.question.slice(0, 30)}..." needs at least 2 options`)
        return
      }
      if (q.type === 'mcq' && q.correct_answer === '') {
        toast.error(`Question "${q.question.slice(0, 30)}..." — please select the correct answer`)
        return
      }
      if (q.type === 'multiple_select' && (!q.correct_answer || q.correct_answer.length === 0)) {
        toast.error(`Question "${q.question.slice(0, 30)}..." — please select at least one correct answer`)
        return
      }
      if (q.type === 'true_false' && q.correct_answer === '') {
        toast.error(`Question "${q.question.slice(0, 30)}..." — please select True or False`)
        return
      }
    }

    setLoading(true)
    try {
      const payload = buildPayload()
      if (isEditing) {
        await examAPI.updateExam(examId, payload)
        toast.success('Exam updated successfully!')
      } else {
        await examAPI.createExam(payload)
        toast.success('Exam created successfully!')
      }
      navigate('/teacher/dashboard')
    } catch (error) {
      console.error('Failed to save exam:', error)
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} exam. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading exam data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            {isEditing && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                <Edit3 className="w-3.5 h-3.5" />
                EDIT MODE
              </span>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit Exam' : 'Create New Exam'}
            </h1>
          </div>
          <p className="text-gray-600">
            {isEditing
              ? 'Update the exam details, questions, and settings below.'
              : 'Fill in the details below to create a new examination'}
          </p>
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
              <span>{loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Exam' : 'Create Exam')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
