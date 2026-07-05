import { MessageSquare, AlertCircle, Ban, Play } from 'lucide-react'
import { useState } from 'react'

interface TeacherInterventionProps {
  studentId: string
  studentName: string
  onSendMessage: (studentId: string, message: string) => void
  onWarnStudent: (studentId: string) => void
  onPauseExam: (studentId: string) => void
  onResumeExam: (studentId: string) => void
}

export function TeacherIntervention({
  studentId,
  studentName,
  onSendMessage,
  onWarnStudent,
  onPauseExam,
  onResumeExam
}: TeacherInterventionProps) {
  const [message, setMessage] = useState('')
  const [showMessageInput, setShowMessageInput] = useState(false)

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(studentId, message.trim())
      setMessage('')
      setShowMessageInput(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 flex items-center">
        <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
        Intervention Controls - {studentName}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowMessageInput(!showMessageInput)}
          className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Send Message
        </button>

        <button
          onClick={() => onWarnStudent(studentId)}
          className="flex items-center justify-center px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition text-sm"
        >
          <AlertCircle className="w-4 h-4 mr-1" />
          Send Warning
        </button>

        <button
          onClick={() => onPauseExam(studentId)}
          className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm"
        >
          <Ban className="w-4 h-4 mr-1" />
          Pause Exam
        </button>

        <button
          onClick={() => onResumeExam(studentId)}
          className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
        >
          <Play className="w-4 h-4 mr-1" />
          Resume Exam
        </button>
      </div>

      {showMessageInput && (
        <div className="space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message to the student..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setMessage('')
                setShowMessageInput(false)
              }}
              className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        <p>• Messages appear as notifications to the student</p>
        <p>• Warnings reduce trust score by 10%</p>
        <p>• Pause immediately stops the exam timer</p>
      </div>
    </div>
  )
}
