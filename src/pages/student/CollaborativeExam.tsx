import { useState, useEffect, useRef } from 'react'
import { Users, MessageSquare, Send, Video, Mic, MicOff, VideoOff, UserPlus, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useWebSocket } from '../../lib/websocket'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'leader' | 'member'
  status: 'online' | 'away' | 'offline'
  currentQuestion: number
  contributionScore: number
  avatar?: string
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: string
  type: 'text' | 'system' | 'answer'
}

interface Answer {
  questionId: number
  answer: string
  submittedBy: string
  timestamp: string
  votes: string[]
  isSelected: boolean
}

export default function CollaborativeExamPage() {
  const examId = 'collaborative-exam-123'
  const { client, status, send } = useWebSocket({ userId: 'user1', examId, role: 'student' })
  
  const [team, setTeam] = useState<TeamMember[]>([
    {
      id: 'user1',
      name: 'You',
      email: 'you@pcmt.edu',
      role: 'leader',
      status: 'online',
      currentQuestion: 1,
      contributionScore: 45
    },
    {
      id: 'user2',
      name: 'Alice Chen',
      email: 'alice@pcmt.edu',
      role: 'member',
      status: 'online',
      currentQuestion: 1,
      contributionScore: 38
    },
    {
      id: 'user3',
      name: 'Bob Smith',
      email: 'bob@pcmt.edu',
      role: 'member',
      status: 'online',
      currentQuestion: 2,
      contributionScore: 32
    }
  ])

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      userId: 'system',
      userName: 'System',
      message: 'Team collaboration exam started. Work together to solve the questions!',
      timestamp: new Date().toISOString(),
      type: 'system'
    }
  ])

  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState<Record<number, Answer[]>>({})
  const [newMessage, setNewMessage] = useState('')
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const questions = [
    {
      id: 1,
      text: 'What is the time complexity of merge sort?',
      type: 'multiple-choice',
      options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
      correctAnswer: 'O(n log n)'
    },
    {
      id: 2,
      text: 'Explain the concept of closure in JavaScript with an example.',
      type: 'essay',
      correctAnswer: 'A closure is a function that has access to variables in its outer scope...'
    },
    {
      id: 3,
      text: 'Implement a function to reverse a linked list.',
      type: 'coding',
      correctAnswer: 'def reverse_linked_list(head): ...'
    }
  ]

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (client) {
      client.on('team_message', handleIncomingMessage)
      client.on('team_member_joined', handleMemberJoined)
      client.on('answer_submitted', handleAnswerSubmitted)
      client.on('answer_voted', handleAnswerVoted)
    }

    return () => {
      if (client) {
        client.off('team_message', handleIncomingMessage)
        client.off('team_member_joined', handleMemberJoined)
        client.off('answer_submitted', handleAnswerSubmitted)
        client.off('answer_voted', handleAnswerVoted)
      }
    }
  }, [client])

  const handleIncomingMessage = (data: any) => {
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      userId: data.userId,
      userName: data.userName,
      message: data.message,
      timestamp: new Date().toISOString(),
      type: 'text'
    }
    setMessages(prev => [...prev, newMsg])
  }

  const handleMemberJoined = (data: any) => {
    const newMember: TeamMember = {
      ...data,
      status: 'online',
      currentQuestion: 1,
      contributionScore: 0
    }
    setTeam(prev => [...prev, newMember])
    
    const systemMsg: ChatMessage = {
      id: `m${Date.now()}`,
      userId: 'system',
      userName: 'System',
      message: `${data.name} joined the team`,
      timestamp: new Date().toISOString(),
      type: 'system'
    }
    setMessages(prev => [...prev, systemMsg])
  }

  const handleAnswerSubmitted = (data: any) => {
    const newAnswer: Answer = {
      questionId: data.questionId,
      answer: data.answer,
      submittedBy: data.userId,
      timestamp: new Date().toISOString(),
      votes: [],
      isSelected: false
    }
    
    setAnswers(prev => ({
      ...prev,
      [data.questionId]: [...(prev[data.questionId] || []), newAnswer]
    }))

    toast.success(`${data.userName} submitted an answer`)
  }

  const handleAnswerVoted = (data: any) => {
    setAnswers(prev => {
      const questionAnswers = prev[data.questionId] || []
      const updatedAnswers = questionAnswers.map(ans => {
        if (ans.submittedBy === data.answerId) {
          return {
            ...ans,
            votes: [...ans.votes, data.userId]
          }
        }
        return ans
      })
      return {
        ...prev,
        [data.questionId]: updatedAnswers
      }
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !client) return

    const message: ChatMessage = {
      id: `m${Date.now()}`,
      userId: 'user1',
      userName: 'You',
      message: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    setMessages(prev => [...prev, message])
    send({
      type: 'team_message',
      userId: 'user1',
      userName: 'You',
      message: newMessage
    })

    setNewMessage('')
  }

  const submitAnswer = (questionId: number, answer: string) => {
    if (!client) return

    send({
      type: 'answer_submitted',
      questionId,
      answer,
      userId: 'user1',
      userName: 'You'
    })

    toast.success('Answer submitted to team for review')
  }

  const voteForAnswer = (questionId: number, answerId: string) => {
    if (!client) return

    send({
      type: 'answer_voted',
      questionId,
      answerId,
      userId: 'user1'
    })

    toast.success('Vote recorded')
  }

  const selectFinalAnswer = (questionId: number, answerId: string) => {
    setAnswers(prev => {
      const questionAnswers = prev[questionId] || []
      const updatedAnswers = questionAnswers.map(ans => ({
        ...ans,
        isSelected: ans.submittedBy === answerId
      }))
      return {
        ...prev,
        [questionId]: updatedAnswers
      }
    })

    toast.success('Final answer selected!')
  }

  const toggleVideo = async () => {
    if (!videoEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setVideoEnabled(true)
        toast.success('Video enabled')
      } catch (error) {
        toast.error('Failed to access camera')
      }
    } else {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
      setVideoEnabled(false)
      toast.success('Video disabled')
    }
  }

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled)
    toast.success(audioEnabled ? 'Microphone muted' : 'Microphone enabled')
  }

  const inviteTeamMember = () => {
    setShowInviteModal(true)
  }

  const currentQ = questions[currentQuestion - 1]
  const questionAnswers = answers[currentQuestion] || []

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-3">
                <Users className="w-8 h-8" />
                Collaborative Team Exam
              </h1>
              <p className="text-white/90 text-sm">Data Structures Final - Team Alpha</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-xl font-bold">45:23</div>
                <div className="text-xs opacity-90">Time Left</div>
              </div>
              <div className="text-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-xl font-bold">{currentQuestion}/3</div>
                <div className="text-xs opacity-90">Question</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Main Content - Question & Answers */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Question */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                      Question {currentQuestion}
                    </span>
                    <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                      {currentQ.type}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{currentQ.text}</h3>
                </div>
              </div>

              {currentQ.type === 'multiple-choice' && (
                <div className="space-y-3">
                  {currentQ.options?.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => submitAnswer(currentQ.id, option)}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="font-medium text-gray-900">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(currentQ.type === 'essay' || currentQ.type === 'coding') && (
                <div className="space-y-3">
                  <textarea
                    placeholder={currentQ.type === 'coding' ? 'Write your code here...' : 'Write your answer here...'}
                    className={`w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                      currentQ.type === 'coding' ? 'font-mono text-sm' : ''
                    }`}
                    rows={8}
                  />
                  <button
                    onClick={() => submitAnswer(currentQ.id, 'User answer here')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all"
                  >
                    Submit to Team
                  </button>
                </div>
              )}
            </div>

            {/* Submitted Answers */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Team Answers ({questionAnswers.length})</h3>
              
              {questionAnswers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                  <p>No answers submitted yet</p>
                  <p className="text-sm">Be the first to submit an answer!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questionAnswers.map((answer, idx) => (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-4 ${
                        answer.isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                            {answer.submittedBy[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{answer.submittedBy}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(answer.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {answer.isSelected && (
                          <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                            SELECTED
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-gray-900">{answer.answer}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => voteForAnswer(currentQ.id, answer.submittedBy)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                            answer.votes.includes('user1')
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          👍 {answer.votes.length}
                        </button>
                        
                        {team[0].role === 'leader' && !answer.isSelected && (
                          <button
                            onClick={() => selectFinalAnswer(currentQ.id, answer.submittedBy)}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                          >
                            Select as Final
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar - Team & Chat */}
          <div className="space-y-4">
            
            {/* Team Members */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Team Members ({team.length})
                </h3>
                <button
                  onClick={inviteTeamMember}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {team.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${
                      member.status === 'online' ? 'from-green-400 to-emerald-400' : 'from-gray-400 to-gray-500'
                    } flex items-center justify-center text-white font-bold`}>
                      {member.name[0]}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{member.name}</span>
                        {member.role === 'leader' && (
                          <Shield className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        Q{member.currentQuestion} • {member.contributionScore} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Video Controls */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <button
                    onClick={toggleVideo}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      videoEnabled
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      audioEnabled
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                </div>
                {videoEnabled && (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full rounded-lg mt-2"
                  />
                )}
              </div>
            </div>

            {/* Team Chat */}
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-96">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Team Chat
              </h3>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`${
                    msg.type === 'system' ? 'text-center' : ''
                  }`}>
                    {msg.type === 'system' ? (
                      <div className="text-xs text-gray-600 bg-gray-100 inline-block px-3 py-1 rounded-full">
                        {msg.message}
                      </div>
                    ) : (
                      <div className={`flex items-start gap-2 ${
                        msg.userId === 'user1' ? 'flex-row-reverse' : ''
                      }`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {msg.userName[0]}
                        </div>
                        <div className={`flex-1 ${
                          msg.userId === 'user1' ? 'text-right' : ''
                        }`}>
                          <div className="text-xs text-gray-600 mb-1">{msg.userName}</div>
                          <div className={`inline-block px-3 py-2 rounded-lg ${
                            msg.userId === 'user1'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {msg.message}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(1, currentQuestion - 1))}
            disabled={currentQuestion === 1}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestion(idx + 1)}
                className={`w-10 h-10 rounded-lg font-bold transition-all ${
                  currentQuestion === idx + 1
                    ? 'bg-blue-600 text-white'
                    : answers[idx + 1]?.length > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentQuestion(Math.min(questions.length, currentQuestion + 1))}
            disabled={currentQuestion === questions.length}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

      </div>
    </div>
  )
}
