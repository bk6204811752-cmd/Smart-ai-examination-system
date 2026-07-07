import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, X } from 'lucide-react'
import { WebSocketClient } from '../lib/websocket'

interface ChatMessage {
  message_id: string
  type: 'student_message' | 'teacher_reply'
  student_id?: string
  student_name?: string
  teacher_id?: string
  teacher_name?: string
  message: string
  timestamp: string
}

interface ExamChatProps {
  wsClientRef: React.RefObject<WebSocketClient | null>
  userId: string
  userName: string
  role: 'student' | 'teacher'
  examId: string
  forStudentId?: string
}

export default function ExamChat({
  wsClientRef,
  userId,
  userName,
  role,
  examId,
  forStudentId,
}: ExamChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isTeacher = role === 'teacher'

  // Register WebSocket handlers
  useEffect(() => {
    const ws = wsClientRef.current
    if (!ws) return

    const handleStudentMessage = (data: any) => {
      const msg: ChatMessage = {
        message_id: data.message_id || `msg_${Date.now()}`,
        type: 'student_message',
        student_id: data.student_id,
        student_name: data.student_name || data.student_id,
        message: data.message,
        timestamp: data.timestamp,
      }
      setMessages(prev => [...prev, msg])
      if (!isOpen) setUnreadCount(c => c + 1)
    }

    const handleTeacherReply = (data: any) => {
      const msg: ChatMessage = {
        message_id: data.message_id || `reply_${Date.now()}`,
        type: 'teacher_reply',
        student_id: data.student_id,
        teacher_id: data.teacher_id,
        teacher_name: data.teacher_name || data.teacher_id,
        message: data.message,
        timestamp: data.timestamp,
      }
      setMessages(prev => [...prev, msg])
      if (!isOpen) setUnreadCount(c => c + 1)
    }

    const handleMessageHistory = (data: any) => {
      if (Array.isArray(data.messages)) {
        setMessages(data.messages)
      }
    }

    ws.on('student_message', handleStudentMessage)
    ws.on('teacher_reply', handleTeacherReply)
    ws.on('message_history', handleMessageHistory)

    return () => {
      ws.off('student_message', handleStudentMessage)
      ws.off('teacher_reply', handleTeacherReply)
      ws.off('message_history', handleMessageHistory)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsClientRef.current, isOpen])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset unread when opening
  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !wsClientRef.current) return

    if (isTeacher) {
      if (!forStudentId) return
      wsClientRef.current.send({
        type: 'teacher_reply',
        exam_id: examId,
        student_id: forStudentId,
        teacher_name: userName,
        message: text,
        timestamp: new Date().toISOString(),
      })
    } else {
      wsClientRef.current.send({
        type: 'student_message',
        exam_id: examId,
        student_name: userName,
        message: text,
        timestamp: new Date().toISOString(),
      })
    }

    setInput('')
    if (inputRef.current) inputRef.current.focus()
  }

  const showMessage = (msg: ChatMessage) => {
    if (isTeacher && forStudentId) {
      return (
        msg.student_id === forStudentId ||
        (msg.type === 'teacher_reply' && msg.student_id === forStudentId)
      )
    }
    return true
  }

  const filteredMessages = messages.filter(showMessage)

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-all"
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.2 }}
            className="fixed bottom-4 right-4 z-[9999] w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-gray-200">
                  {isTeacher ? 'Student Messages' : 'Contact Teacher'}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-3"
              style={{ minHeight: '200px', maxHeight: '400px' }}
            >
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs font-medium">No messages yet</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {isTeacher
                      ? 'Waiting for student messages...'
                      : 'Send a message to your teacher'}
                  </p>
                </div>
              ) : (
                filteredMessages.map(msg => {
                  const isFromMe = isTeacher
                    ? msg.type === 'teacher_reply' && msg.teacher_id === userId
                    : msg.type === 'student_message'
                  const isStudentMsg = msg.type === 'student_message'

                  return (
                    <div
                      key={msg.message_id}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                          isFromMe
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : isStudentMsg
                              ? 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700'
                              : 'bg-emerald-700/80 text-gray-100 rounded-bl-sm'
                        }`}
                      >
                        {!isFromMe && (
                          <p className="text-xs font-semibold mb-0.5 opacity-80">
                            {isStudentMsg
                              ? msg.student_name || 'Student'
                              : msg.teacher_name || 'Teacher'}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${isFromMe ? 'text-blue-200' : 'text-gray-500'}`}
                        >
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-700 p-3">
              <div className="flex items-center gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={isTeacher ? 'Type your reply...' : 'Type your message...'}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
