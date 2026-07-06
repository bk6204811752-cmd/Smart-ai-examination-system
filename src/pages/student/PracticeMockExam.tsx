import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Camera, Mic, Monitor, AlertTriangle, CheckCircle, XCircle,
  Eye, Clock, Flag, ChevronLeft, ChevronRight, Menu, X,
  Brain, Trophy, Target, ArrowRight, TrendingUp, Maximize
} from 'lucide-react'
import { useSwipe } from '../../hooks/useSwipe'
import { useMobileDetect } from '../../hooks/useMobileDetect'
import { useExamState } from '../../hooks/useExamState'
import { logger } from '../../lib/logger'
import { getQuestionsByCategory, getQuestionsByDifficulty, Question as QuestionType } from '../../data/questionBank'
import AdaptiveExamEngine, { DifficultyLevel } from '../../utils/adaptiveExamEngine'
import ProctoringEngine from '../../utils/proctoringEngine'
import type { ProctoringViolation, ProctoringStatus } from '../../utils/proctoringEngine'
import ViolationWarning, { ProctoringStatusBar, ViolationSummary } from '../../components/ViolationWarning'
import ProctoringRightPanel from '../../components/ProctoringRightPanel'
import { AnimatePresence, motion } from 'framer-motion'
import { WebSocketClient } from '../../lib/websocket'
import { useAuthStore } from '../../store/globalStore'

interface Question {
  id: number
  text: string
  type: 'mcq' | 'multiple-answer' | 'true-false' | 'short-answer'
  options?: string[]
  correctAnswer: string | string[]
  points: number
  explanation: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

interface MockTestData {
  id: string
  title: string
  category: string
  duration: number
  questions: Question[]
  passingScore: number
}

export default function PracticeMockExam() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useMobileDetect()
  const videoRef = useRef<HTMLVideoElement>(null)
  const sidebarVideoRef = useRef<HTMLVideoElement>(null)
  const wsClientRef = useRef<WebSocketClient | null>(null)
  const user = useAuthStore(state => state.user)
  const heartbeatRef = useRef<number | null>(null)
  const trustSyncRef = useRef<number | null>(null)

  // Mock test data based on testId
  const mockTestData: MockTestData = getMockTestData(testId || '')

  // Centralized state management with useExamState hook (replaces 20+ useState)
  const [examState, dispatch] = useExamState(mockTestData.duration)

  // Local state
  const [examPaused, setExamPaused] = useState(false)
  const [initMessage, setInitMessage] = useState('Preparing your exam...')
  const [audioWaveData, setAudioWaveData] = useState<number[]>([])

  // Proctoring Engine V1 (same as live exams)
  const proctoringEngine = useMemo(() => new ProctoringEngine(), [])

  // Adaptive Exam Engine
  const adaptiveEngine = useMemo(() => new AdaptiveExamEngine('Medium'), [])

  // Swipe handlers for mobile
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (examState.currentQuestion < mockTestData.questions.length - 1) {
        dispatch({ type: 'SET_CURRENT_QUESTION', payload: examState.currentQuestion + 1 })
      }
    },
    onSwipeRight: () => {
      if (examState.currentQuestion > 0) {
        dispatch({ type: 'SET_CURRENT_QUESTION', payload: examState.currentQuestion - 1 })
      }
    }
  })

  // Simple, reliable camera shutdown with logger
  const stopCamera = useCallback(async () => {
    try {
      logger.info('Stopping camera and proctoring')
      
      // Stop WebSocket
      if (wsClientRef.current) {
        wsClientRef.current.disconnect()
        wsClientRef.current = null
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      if (trustSyncRef.current) {
        clearInterval(trustSyncRef.current)
        trustSyncRef.current = null
      }
      
      // Get all tracks and stop them
      const stopAllTracks = (videoEl: HTMLVideoElement | null) => {
        if (videoEl?.srcObject) {
          const stream = videoEl.srcObject as MediaStream
          stream.getTracks().forEach(track => track.stop())
          videoEl.srcObject = null
          videoEl.pause()
        }
      }
      
      stopAllTracks(videoRef.current)
      stopAllTracks(sidebarVideoRef.current)
      
      // Engine cleanup
      if (proctoringEngine) {
        await proctoringEngine.cleanup()
      }
      
      // Reset state using dispatch
      dispatch({ type: 'ENABLE_CAMERA', payload: false })
      dispatch({ type: 'ENABLE_MIC', payload: false })
      dispatch({ type: 'SET_PROCTORING_STATUS', payload: null })
      dispatch({ type: 'SET_ACTIVE_VIOLATIONS', payload: [] })
      
      // Wait for hardware release
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      logger.info('Camera stopped successfully')
    } catch (error) {
      logger.error('Camera shutdown error', error)
    }
  }, [proctoringEngine, dispatch])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (proctoringEngine) {
        proctoringEngine.cleanup()
      }
      
      const cleanupVideo = (ref: React.RefObject<HTMLVideoElement>) => {
        if (ref.current?.srcObject) {
          const stream = ref.current.srcObject as MediaStream
          stream.getTracks().forEach(track => track.stop())
          ref.current.srcObject = null
        }
      }
      
      cleanupVideo(videoRef)
      cleanupVideo(sidebarVideoRef)
    }
  }, [proctoringEngine])

  // Timer
  useEffect(() => {
    if (!examState.examStarted || examState.examEnded || examState.isSubmitting) return

    const timer = setInterval(() => {
      dispatch({ type: 'DECREMENT_TIME' })
    }, 1000)

    return () => clearInterval(timer)
  }, [examState.examStarted, examState.examEnded, examState.isSubmitting])

  // Auto-start exam when camera + proctoring are ready
  useEffect(() => {
    if (examState.cameraEnabled && examState.proctoringStatus?.isActive && !examState.examStarted && !examState.isSubmitting) {
      setInitMessage('Starting exam...')
      const timer = setTimeout(() => {
        handleStartExam(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [examState.cameraEnabled, examState.proctoringStatus?.isActive])

  // Auto-submit when time expires (separate effect)
  useEffect(() => {
    if (examState.examStarted && !examState.examEnded && !examState.isSubmitting && examState.timeRemaining === 0) {
      console.log('⏰ Time expired - auto-submitting exam')
      handleSubmitExam()
    }
  }, [examState.timeRemaining, examState.examStarted, examState.examEnded, examState.isSubmitting])

  // Real-time audio wave polling during exam
  useEffect(() => {
    if (!examState.examStarted || examState.examEnded) return
    const interval = setInterval(() => {
      const freqData = proctoringEngine.getAudioFrequencyData()
      if (freqData.length > 0) {
        setAudioWaveData(freqData.slice(0, 32))
      }
    }, 100)
    return () => clearInterval(interval)
  }, [examState.examStarted, examState.examEnded, proctoringEngine])

  // Start camera when camera not yet enabled
  useEffect(() => {
    if (!examState.cameraEnabled && !examState.isInitializingCamera) {
      startCamera()
    }
  }, [examState.cameraEnabled])

  // Update sidebar video stream when exam starts
  useEffect(() => {
    const connectSidebarVideo = async () => {
      if (examState.examStarted && examState.proctoringStatus?.isActive) {
        const stream = proctoringEngine.getStream()
        if (stream) {
          logger.debug('Connecting sidebar video stream')
          
          // Attach to sidebar video (small camera preview in UI)
          if (sidebarVideoRef.current) {
            sidebarVideoRef.current.srcObject = stream
            try {
              await sidebarVideoRef.current.play()
              logger.debug('Sidebar video playing', {
                width: sidebarVideoRef.current.videoWidth,
                height: sidebarVideoRef.current.videoHeight
              })
            } catch (error) {
              logger.error('Failed to play sidebar video', error)
            }
          }
          
          // Also re-attach to main videoRef (ProctoringRightPanel's video)
          // This handles the case where the loading screen's <video> unmounted
          // and the ProctoringRightPanel's <video> just mounted with no srcObject
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            try {
              await videoRef.current.play()
            } catch (error) {
              logger.error('Failed to play main video', error)
            }
          }
        } else {
          logger.warn('No stream available from proctoring engine')
        }
      }
    }
    
    connectSidebarVideo()
    
    // Cleanup sidebar video when exam ends
    return () => {
      if (sidebarVideoRef.current && !examState.examStarted) {
        sidebarVideoRef.current.srcObject = null
        logger.debug('Sidebar video cleared')
      }
    }
  }, [examState.proctoringStatus?.isActive, examState.examStarted])

  // Start monitoring when exam starts
  useEffect(() => {
    if (examState.examStarted && examState.proctoringStatus?.isActive) {
      // Monitoring is already started during camera initialization
      // Just ensure it's running
      if (!proctoringEngine.isMonitoringActive()) {
        logger.info('Starting monitoring for exam')
        proctoringEngine.startMonitoring()
      } else {
        logger.info('Monitoring already active from camera preview')
      }
    }
  }, [examState.examStarted, examState.proctoringStatus?.isActive, proctoringEngine])

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Don't record examState.violations during submission process
      if (document.hidden && examState.examStarted && !examState.examEnded && !examState.isSubmitting) {
        proctoringEngine.recordTabSwitch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [examState.examStarted, examState.examEnded, examState.isSubmitting])

  // Window blur detection (clicking outside browser)
  useEffect(() => {
    const handleWindowBlur = () => {
      // Don't record examState.violations during submission process
      if (examState.examStarted && !examState.examEnded && !examState.isSubmitting) {
        proctoringEngine.recordWindowBlur()
      }
    }

    window.addEventListener('blur', handleWindowBlur)
    return () => window.removeEventListener('blur', handleWindowBlur)
  }, [examState.examStarted, examState.examEnded, examState.isSubmitting])

  // Fullscreen enforcement with auto re-entry
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      dispatch({ type: 'SET_FULLSCREEN', payload: isNowFullscreen })

      if (!isNowFullscreen && examState.examStarted && !examState.examEnded && !examState.isSubmitting) {
        proctoringEngine.recordFullscreenExit()
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {})
        }, 500)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [examState.examStarted, examState.examEnded, examState.isSubmitting])

  // Safety net: Stop camera on page unload + warn user
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examState.examStarted && !examState.examEnded) {
        e.preventDefault()
        e.returnValue = 'Exam in progress! Leaving will forfeit your answers.'
        return e.returnValue
      }
      stopCamera()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [stopCamera, examState.examStarted, examState.examEnded])

  // Enter fullscreen
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen()
      dispatch({ type: 'SET_FULLSCREEN', payload: true })
    } catch (error) {
      console.error('Fullscreen failed:', error)
    }
  }

  const startCamera = async () => {
    dispatch({ type: 'SET_INITIALIZING_CAMERA', payload: true })
    setInitMessage('Initializing camera...')

    // ── PHASE 1: Attach stream to video element immediately ────────────
    try {
      const preExamStream = (window as any).__preExamStream as MediaStream | undefined
      let stream: MediaStream

      if (preExamStream && preExamStream.active) {
        stream = preExamStream
        delete (window as any).__preExamStream
        console.log('[Camera] Reusing pre-exam stream')
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        })
      }

      if (videoRef.current) {
        if (videoRef.current.srcObject && videoRef.current.srcObject !== stream) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        }
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        videoRef.current.play().catch(e => console.warn('[Camera] play():', e))
      }

      dispatch({ type: 'ENABLE_CAMERA', payload: true })
      dispatch({ type: 'ENABLE_MIC', payload: true })
      dispatch({ type: 'SET_INITIALIZING_CAMERA', payload: false })

      // Initialize WebSocket for teacher monitoring
      if (user) {
        try {
          const testIdValue = testId || 'practice'
          const wsClient = new WebSocketClient()
          wsClientRef.current = wsClient
          const userId = user._id || user.email || 'unknown'
          wsClient.connect({ userId, role: 'student', examId: testIdValue })

          // Heartbeat
          heartbeatRef.current = window.setInterval(() => {
            if (wsClient.isConnected()) {
              wsClient.send({
                type: 'heartbeat',
                exam_id: testIdValue,
                student_id: userId,
                timestamp: new Date().toISOString(),
              })
            }
          }, 10000)

          // Trust score sync
          trustSyncRef.current = window.setInterval(() => {
            if (wsClient.isConnected()) {
              wsClient.send({
                type: 'proctoring_status',
                exam_id: testIdValue,
                student_id: userId,
                trust_score: 100,
                status: { isActive: true }
              })
            }
          }, 30000)

          wsClient.on('intervention', (data: any) => {
            const action = data.action as string
            if (action === 'pause') {
              alert('Exam paused by teacher. Please wait.')
              setExamPaused(true)
            } else if (action === 'resume') {
              setExamPaused(false)
            }
          })
        } catch (wsErr) {
          console.warn('[WebSocket] Connection failed:', wsErr)
        }
      }
    } catch (streamErr) {
      const msg = streamErr instanceof Error ? streamErr.message : String(streamErr)
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        alert('Camera permission denied. Please allow camera access and refresh.')
      } else if (msg.includes('NotFoundError')) {
        alert('No camera found. Please connect a camera.')
      }
      dispatch({ type: 'ENABLE_CAMERA', payload: false })
      dispatch({ type: 'ENABLE_MIC', payload: false })
      dispatch({ type: 'SET_INITIALIZING_CAMERA', payload: false })
      return
    }

    // ── PHASE 2: Initialize AI engine with the already-playing stream ──
    setInitMessage('Loading AI proctoring engine...')
    setTimeout(async () => {
      const stream = videoRef.current?.srcObject as MediaStream | null
      if (!stream || !stream.active || !videoRef.current) return

      try {
        await proctoringEngine.loadModels()
        await proctoringEngine.initialize(videoRef.current!, stream)

        proctoringEngine.setOnViolation((violation) => {
          dispatch({ type: 'ADD_ACTIVE_VIOLATION', payload: violation })
          setTimeout(() => {
            dispatch({ type: 'REMOVE_ACTIVE_VIOLATION', payload: violation })
          }, 5000)
          dispatch({ type: 'ADD_VIOLATION', payload: violation.message })
        })

        proctoringEngine.setOnStatusChange((status) => {
          dispatch({ type: 'SET_PROCTORING_STATUS', payload: status })
          dispatch({ type: 'SET_TAB_SWITCHES', payload: status.tabSwitchCount })
        })

        proctoringEngine.setOnPause((reason) => {
          alert('Exam paused: ' + reason)
        })

        setTimeout(async () => {
          const faceCapture = await proctoringEngine.captureReferenceFace()
          if (faceCapture) {
            console.log('Reference face captured for identity verification')
          } else {
            console.warn('Reference face capture failed - continuing')
          }
        }, 3000)

        proctoringEngine.enableRecording()
        proctoringEngine.startMonitoring()
      } catch (engineErr) {
        console.warn('[Proctoring] AI engine initialization failed:', engineErr)
      }
    }, 500)
  }

  const handleStartExam = async (isAutoStart = false) => {
    if (!examState.cameraEnabled || !examState.micEnabled) {
      if (isAutoStart) {
        console.warn('[AutoStart] Camera/mic not ready, deferring')
        return
      }
      alert(
        '⚠️ CAMERA AND MICROPHONE REQUIRED\n\n' +
        'You must enable camera and microphone before starting the exam.\n\n' +
        'If camera failed to enable, it may be due to:\n' +
        '✅ Insufficient lighting - Turn on lights\n' +
        '✅ No camera permission - Allow camera access\n' +
        '✅ Camera already in use - Close other apps\n\n' +
        'Please fix the issue and click "Enable Camera" again.'
      )
      return
    }
    
    // Brightness check: warn during auto-start, block during manual
    const currentBrightness = proctoringEngine.getBrightness()
    if (currentBrightness < 50) {
      if (isAutoStart) {
        console.warn(`[AutoStart] Low brightness (${Math.round(currentBrightness)}/255), starting anyway`)
      } else {
        alert(
          `🚨 CANNOT START EXAM\n\n` +
          `Room lighting is too low: ${Math.round(currentBrightness)}/255\n` +
          `Minimum required: 50/255\n\n` +
          `✅ Turn on lights immediately\n` +
          `✅ Ensure your face is well-lit\n` +
          `✅ Sit near a window or lamp\n\n` +
          `Exam cannot start until lighting improves.\n` +
          `This is mandatory to prevent cheating.`
        )
        return
      }
    }

    // Enter fullscreen mode
    await enterFullscreen()
    
    dispatch({ type: 'START_EXAM' })
  }

  const handleAnswerChange = (questionId: number, answer: any) => {
    const previousAnswer = examState.answers[questionId]
    const isChangingAnswer = previousAnswer !== undefined
    
    // Update answer in state
    dispatch({ type: 'SET_ANSWER', payload: { questionId, answer } })
    
    // Only process for adaptive logic if this is the first time answering (not changing answer)
    if (!isChangingAnswer) {
      const question = mockTestData.questions[questionId]
      const isCorrect = checkAnswer(question, answer)
      
      // Update adaptive engine
      adaptiveEngine.processAnswer(isCorrect, question.difficulty as DifficultyLevel)
      
      // Update current difficulty
      const newDifficulty = adaptiveEngine.getCurrentDifficulty()
      if (newDifficulty !== examState.currentDifficulty) {
        dispatch({ type: 'SET_DIFFICULTY', payload: newDifficulty })
        dispatch({ type: 'ADD_DIFFICULTY_HISTORY', payload: newDifficulty })
      }
    }
  }

  // Helper function to check if answer is correct
  const checkAnswer = (question: Question, userAnswer: any): boolean => {
    if (!userAnswer) return false
    
    if (question.type === 'multiple-answer') {
      if (!Array.isArray(userAnswer) || !Array.isArray(question.correctAnswer)) return false
      if (userAnswer.length !== question.correctAnswer.length) return false
      return JSON.stringify([...userAnswer].sort()) === JSON.stringify([...question.correctAnswer].sort())
    }
    
    // Handle string comparison (case-insensitive for short-answer)
    if (question.type === 'short-answer') {
      return String(userAnswer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
    }
    
    return userAnswer === question.correctAnswer
  }

  const handleFlagQuestion = () => {
    dispatch({ type: 'TOGGLE_FLAG', payload: examState.currentQuestion })
  }

  const handleSubmitExam = async () => {
    // Prevent duplicate submissions
    if (examState.isSubmitting || examState.examEnded) {
      console.log('⚠️ Already submitting or exam ended, ignoring...')
      return
    }

    // Set submitting flag BEFORE any dialogs or actions
    dispatch({ type: 'SET_SUBMITTING', payload: true })
    
    // Small delay to let state update propagate
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check if auto-submit (time expired) or manual submit
    const isAutoSubmit = examState.timeRemaining === 0
    const shouldSubmit = isAutoSubmit || window.confirm('Are you sure you want to submit the exam?')
    
    if (shouldSubmit) {
      console.log('🛑 Stopping camera and monitoring before submission...')
      await stopCamera()
      dispatch({ type: 'END_EXAM' })
      calculateResults()
    } else {
      // User cancelled - reset submitting flag
      dispatch({ type: 'SET_SUBMITTING', payload: false })
    }
  }

  const calculateResults = () => {
    let correctAnswers = 0
    let totalPoints = 0
    let earnedPoints = 0

    // Prepare data for weak area analysis
    const answerData: Array<{
      category: string;
      difficulty: DifficultyLevel;
      isCorrect: boolean;
    }> = []

    mockTestData.questions.forEach((question, index) => {
      totalPoints += question.points
      const userAnswer = examState.answers[index]
      let isCorrect = false
      
      if (question.type === 'multiple-answer') {
        isCorrect = Array.isArray(question.correctAnswer) 
          ? JSON.stringify(userAnswer?.sort()) === JSON.stringify(question.correctAnswer.sort())
          : false
        if (isCorrect) {
          correctAnswers++
          earnedPoints += question.points
        }
      } else {
        isCorrect = userAnswer === question.correctAnswer
        if (isCorrect) {
          correctAnswers++
          earnedPoints += question.points
        }
      }

      // Collect data for adaptive analysis
      answerData.push({
        category: mockTestData.category,
        difficulty: question.difficulty as DifficultyLevel,
        isCorrect
      })
    })

    const percentage = Math.round((earnedPoints / totalPoints) * 100)
    
    // Analyze weak areas and generate learning path
    const weakAreas = adaptiveEngine.analyzeWeakAreas(answerData)
    const learningPath = adaptiveEngine.generateLearningPath(weakAreas)
    const performanceMetrics = adaptiveEngine.getMetrics()
    const performanceTrend = adaptiveEngine.getPerformanceTrend()
    
    console.log('🚀 Step 5: Navigating to results (camera confirmed stopped)...')
    
    // NOW navigate - camera is guaranteed stopped
    navigate('/practice/results', {
      state: {
        testId: mockTestData.id,
        testTitle: mockTestData.title,
        totalQuestions: mockTestData.questions.length,
        correctAnswers,
        percentage, violations: examState.violations, tabSwitches: examState.tabSwitches,
        timeTaken: mockTestData.duration * 60 - examState.timeRemaining,
        // Adaptive exam data
        weakAreas,
        learningPath,
        performanceMetrics,
        performanceTrend, difficultyHistory: examState.difficultyHistory,
        // Question review data
        questions: mockTestData.questions,
        userAnswers: examState.answers
      }
    })
    
    console.log('✅ ========== EXAM SUBMISSION COMPLETE ==========')
  }



  const formatTime = (seconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(seconds))
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAnsweredCount = () => Object.keys(examState.answers).length
  const getQuestionStatus = (index: number) => {
    if (examState.answers[index] !== undefined) return 'answered'
    if (examState.flaggedQuestions.has(index)) return 'flagged'
    return 'unanswered'
  }

  if (!examState.examStarted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <Brain className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            {mockTestData.title}
          </h1>
          <p className="text-gray-400 text-sm mb-8">AI-Proctored Mock Test</p>

          {/* Spinner + Status */}
          {examState.isInitializingCamera && (
            <>
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-blue-400 font-medium text-sm">{initMessage}</p>
              <p className="text-gray-600 text-xs mt-2">This may take a few seconds</p>
            </>
          )}

          {/* Camera preview (hidden but accessible for ref) */}
          <div className={`mt-6 bg-gray-900 rounded-xl overflow-hidden ${examState.cameraEnabled ? 'w-48 h-36 mx-auto' : 'sr-only h-0'}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Error: camera failed */}
          {!examState.isInitializingCamera && !examState.cameraEnabled && (
            <div className="mt-4">
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-red-400 font-medium text-sm">Camera initialization failed</p>
                <p className="text-red-300 text-xs mt-1">Please check camera permissions and try again</p>
              </div>
              <button
                onClick={() => startCamera()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
              >
                Retry Camera
              </button>
              <button
                onClick={() => navigate('/practice')}
                className="px-6 py-3 mt-2 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition block w-full"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const question = mockTestData.questions[examState.currentQuestion]
  
  // Safety check - redirect if invalid question index
  if (!question && examState.examStarted) {
    console.error('Invalid question index:', examState.currentQuestion)
    navigate('/practice')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Violation Warnings */}
      <AnimatePresence>
        {examState.activeViolations.map((violation, index) => (
          <div key={`${violation.timestamp.getTime()}-${index}`} style={{ top: `${4 + index * 120}px` }}>
            <ViolationWarning
              violation={violation}
              onDismiss={() => dispatch({ type: 'REMOVE_ACTIVE_VIOLATION', payload: violation })}
            />
          </div>
        ))}
      </AnimatePresence>

      {/* Violation Summary */}
      {examState.proctoringStatus && (
        <ViolationSummary violations={examState.proctoringStatus.violations} />
      )}

      {/* Proctoring Status Bar */}
      {examState.proctoringStatus && !examState.examEnded && (
        <ProctoringStatusBar
          faceDetected={examState.proctoringStatus.faceDetected}
          faceCount={examState.proctoringStatus.faceCount}
          lookingAtScreen={examState.proctoringStatus.lookingAtScreen}
          audioLevel={examState.proctoringStatus.audioLevel}
          isFullscreen={examState.isFullscreen}
          brightness={examState.proctoringStatus.brightness ?? examState.brightness}
          attentionLevel={examState.proctoringStatus.attentionLevel}
          integrityScore={examState.proctoringStatus.integrityScore}
        />
      )}

      {/* Fullscreen Warning */}
      {!examState.isFullscreen && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-pulse">
          <Maximize className="w-5 h-5" />
          <span className="font-bold">Please return to fullscreen mode!</span>
          <button
            onClick={enterFullscreen}
            className="ml-2 bg-white text-red-600 px-3 py-1 rounded-full text-sm font-bold hover:bg-gray-100"
          >
            Enter Fullscreen
          </button>
        </div>
      )}

      {/* Submitting Overlay */}
      {examState.isSubmitting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submitting Exam...</h2>
            <p className="text-gray-600">Please wait while we process your answers and stop the camera.</p>
          </div>
        </div>
      )}

      {/* Exam Paused Overlay */}
      {examState.proctoringStatus?.isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Paused</h2>
              <p className="text-gray-600 mb-6">{examState.proctoringStatus.pauseReason}</p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Suspicious Activity Score:</strong> {examState.proctoringStatus.suspiciousActivityScore}/100
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Multiple critical examState.violations detected. Please contact the proctor to resume.
                </p>
              </div>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to resume? Make sure you\'re ready to continue with proper conduct.')) {
                    proctoringEngine.resumeExam()
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Resume Exam
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-full px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Brain className="w-6 h-6 sm:w-8 sm:h-8" />
              <div>
                <h1 className="text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-none">
                  {mockTestData.title}
                </h1>
                <p className="text-xs text-blue-100 hidden sm:block">Question {examState.currentQuestion + 1} of {mockTestData.questions.length}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                examState.timeRemaining < 300 ? 'bg-red-500' : 'bg-white/20'
              } min-h-[44px]`}>
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-bold text-sm sm:text-base">{formatTime(examState.timeRemaining)}</span>
              </div>
              {!isMobile && (
                <div className="flex items-center space-x-1 bg-white/20 px-3 py-2 rounded-lg">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">AI Monitoring</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Question Navigator */}
        {examState.showMobileMenu && (isMobile || isTablet) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}>
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-bold">Questions</h3>
                <button onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <QuestionNavigator
                  totalQuestions={mockTestData.questions.length}
                  currentQuestion={examState.currentQuestion}
                  getQuestionStatus={getQuestionStatus}
                  onQuestionClick={(index) => {
                    dispatch({ type: 'SET_CURRENT_QUESTION', payload: index })
                    dispatch({ type: 'TOGGLE_MOBILE_MENU' })
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className={`hidden lg:block w-80 bg-white border-r overflow-y-auto`}>
          <div className="p-4">
            <QuestionNavigator
              totalQuestions={mockTestData.questions.length}
              currentQuestion={examState.currentQuestion}
              getQuestionStatus={getQuestionStatus}
              onQuestionClick={(index) => dispatch({ type: 'SET_CURRENT_QUESTION', payload: index })}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-3 sm:p-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4">
              <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{getAnsweredCount()} / {mockTestData.questions.length} answered</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(getAnsweredCount() / mockTestData.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div {...swipeHandlers} className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-4 touch-pan-y">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Question {examState.currentQuestion + 1}
                    </span>
                    <span className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                      {question.points} <span className="hidden sm:inline">points</span><span className="sm:hidden">pt</span>
                    </span>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1 ${
                      question.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                      question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      {question.difficulty}
                    </span>
                    {examState.currentDifficulty !== 'Medium' && (
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1 ${
                        examState.currentDifficulty === 'Easy' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        Next: {examState.currentDifficulty}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-relaxed">{question.text}</h2>
                </div>
                <button
                  onClick={handleFlagQuestion}
                  className={`p-2 rounded-lg transition min-h-[44px] min-w-[44px] touch-manipulation ${
                    examState.flaggedQuestions.has(examState.currentQuestion)
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-400 hover:text-red-600'
                  }`}
                >
                  <Flag className="w-5 h-5" />
                </button>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {question.type === 'mcq' && question.options?.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center space-x-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition min-h-[44px] touch-manipulation ${
                      examState.answers[examState.currentQuestion] === option
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${examState.currentQuestion}`}
                      value={option}
                      checked={examState.answers[examState.currentQuestion] === option}
                      onChange={(e) => handleAnswerChange(examState.currentQuestion, e.target.value)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm sm:text-base">{option}</span>
                  </label>
                ))}

                {question.type === 'multiple-answer' && question.options?.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center space-x-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition min-h-[44px] touch-manipulation ${
                      examState.answers[examState.currentQuestion]?.includes(option)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={examState.answers[examState.currentQuestion]?.includes(option) || false}
                      onChange={(e) => {
                        const current = examState.answers[examState.currentQuestion] || []
                        const newAnswers = e.target.checked
                          ? [...current, option]
                          : current.filter((a: string) => a !== option)
                        handleAnswerChange(examState.currentQuestion, newAnswers)
                      }}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm sm:text-base">{option}</span>
                  </label>
                ))}

                {question.type === 'true-false' && (
                  <>
                    {['True', 'False'].map((option) => (
                      <label
                        key={option}
                        className={`flex items-center space-x-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition min-h-[44px] touch-manipulation ${
                          examState.answers[examState.currentQuestion] === option
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${examState.currentQuestion}`}
                          value={option}
                          checked={examState.answers[examState.currentQuestion] === option}
                          onChange={(e) => handleAnswerChange(examState.currentQuestion, e.target.value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="text-sm sm:text-base font-semibold">{option}</span>
                      </label>
                    ))}
                  </>
                )}

                {question.type === 'short-answer' && (
                  <textarea
                    value={examState.answers[examState.currentQuestion] || ''}
                    onChange={(e) => handleAnswerChange(examState.currentQuestion, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-500 resize-y min-h-[120px] text-sm sm:text-base"
                  />
                )}
              </div>

              {/* Mobile Swipe Hint */}
              {(isMobile || isTablet) && (
                <p className="text-center text-xs text-gray-400 mt-4">
                  Swipe left/right to navigate questions
                </p>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_QUESTION', payload: examState.currentQuestion - 1 })}
                disabled={examState.currentQuestion === 0}
                className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px] touch-manipulation flex-1 sm:flex-initial justify-center"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-semibold hidden sm:inline">Previous</span>
              </button>

              {examState.currentQuestion === mockTestData.questions.length - 1 ? (
                <button
                  onClick={handleSubmitExam}
                  className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition min-h-[44px] touch-manipulation flex-1 sm:flex-initial justify-center"
                >
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base font-semibold">Submit Exam</span>
                </button>
              ) : (
                <button
                  onClick={() => dispatch({ type: 'SET_CURRENT_QUESTION', payload: examState.currentQuestion + 1 })}
                  className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition min-h-[44px] touch-manipulation flex-1 sm:flex-initial justify-center"
                >
                  <span className="text-sm sm:text-base font-semibold hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Proctoring Right Panel */}
        <div className="hidden xl:block w-80 overflow-y-auto max-h-[calc(100vh-5rem)]">
          <ProctoringRightPanel
            videoRef={videoRef}
            proctoringActive={examState.cameraEnabled && !!examState.proctoringStatus?.isActive}
            cameraReady={examState.cameraEnabled}
            trustScore={examState.proctoringStatus?.integrityScore ?? 100}
            proctoringStatus={examState.proctoringStatus ? {
              faceDetected: examState.proctoringStatus.faceDetected,
              lookingAtScreen: examState.proctoringStatus.lookingAtScreen,
              faceCount: examState.proctoringStatus.faceCount,
              audioLevel: examState.proctoringStatus.audioLevel,
              isActive: examState.proctoringStatus.isActive,
              integrityScore: examState.proctoringStatus.integrityScore,
            } : null}
            audioWaveData={audioWaveData}
            tabSwitches={examState.tabSwitches}
            flags={examState.violations.map((v: any) => typeof v === 'string' ? { evidence: v, severity: 'medium' } : v)}
            mode="practice"
          />
        </div>
      </div>
    </div>
  )
}

// Question Navigator Component
function QuestionNavigator({
  totalQuestions,
  currentQuestion,
  getQuestionStatus,
  onQuestionClick
}: {
  totalQuestions: number
  currentQuestion: number
  getQuestionStatus: (index: number) => string
  onQuestionClick: (index: number) => void
}) {
  return (
    <>
      <h3 className="font-bold mb-4">Questions</h3>
      <div className="grid grid-cols-5 gap-2 mb-6">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const status = getQuestionStatus(i)
          return (
            <button
              key={i}
              onClick={() => onQuestionClick(i)}
              className={`aspect-square rounded-lg font-semibold text-sm transition min-h-[44px] touch-manipulation ${
                i === currentQuestion
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                  : status === 'answered'
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : status === 'flagged'
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 rounded" />
          <span>Answered</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <span>Not Answered</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 rounded" />
          <span>Flagged</span>
        </div>
      </div>
    </>
  )
}

// Mock test data generator using comprehensive question bank
function getMockTestData(testId: string): MockTestData {
  const testConfigs: { [key: string]: { category: string, difficulty: string, count: number, duration: number, title: string } } = {
    // Mathematics Tests
    'mock-math-1': { category: 'mathematics', difficulty: 'Easy', count: 30, duration: 45, title: 'Mathematics - Algebra Basics' },
    'mock-math-2': { category: 'mathematics', difficulty: 'Medium', count: 40, duration: 60, title: 'Mathematics - Geometry & Trigonometry' },
    'mock-math-3': { category: 'mathematics', difficulty: 'Hard', count: 50, duration: 90, title: 'Mathematics - Advanced Calculus' },
    
    // Science Tests
    'mock-sci-1': { category: 'science', difficulty: 'Easy', count: 35, duration: 50, title: 'Science - Physics Fundamentals' },
    'mock-sci-2': { category: 'science', difficulty: 'Medium', count: 40, duration: 60, title: 'Science - Chemistry & Biology' },
    'mock-sci-3': { category: 'science', difficulty: 'Hard', count: 45, duration: 75, title: 'Science - Advanced Physics' },
    
    // General Knowledge Tests
    'mock-gk-1': { category: 'general-knowledge', difficulty: 'Easy', count: 50, duration: 40, title: 'GK - Current Affairs 2024-25' },
    'mock-gk-2': { category: 'general-knowledge', difficulty: 'Medium', count: 60, duration: 50, title: 'GK - World Geography & Politics' },
    'mock-gk-3': { category: 'general-knowledge', difficulty: 'Hard', count: 100, duration: 90, title: 'GK - Comprehensive Test' },
    
    // History Tests
    'mock-hist-1': { category: 'history', difficulty: 'Easy', count: 30, duration: 40, title: 'History - Ancient Civilizations' },
    'mock-hist-2': { category: 'history', difficulty: 'Medium', count: 35, duration: 50, title: 'History - Indian Independence' },
    'mock-hist-3': { category: 'history', difficulty: 'Hard', count: 40, duration: 60, title: 'History - World Wars & Modern Era' },
    
    // English Tests
    'mock-eng-1': { category: 'english', difficulty: 'Easy', count: 25, duration: 30, title: 'English - Grammar Basics' },
    'mock-eng-2': { category: 'english', difficulty: 'Medium', count: 35, duration: 45, title: 'English - Vocabulary & Comprehension' },
    'mock-eng-3': { category: 'english', difficulty: 'Hard', count: 40, duration: 60, title: 'English - Advanced Literature' },
    
    // Reasoning Tests
    'mock-reas-1': { category: 'reasoning', difficulty: 'Easy', count: 30, duration: 40, title: 'Reasoning - Basic Puzzles' },
    'mock-reas-2': { category: 'reasoning', difficulty: 'Medium', count: 35, duration: 50, title: 'Reasoning - Analytical Thinking' },
    'mock-reas-3': { category: 'reasoning', difficulty: 'Hard', count: 40, duration: 60, title: 'Reasoning - Complex Problems' }
  }

  const config = testConfigs[testId]
  
  if (config) {
    // Get questions from question bank
    const bankQuestions = getQuestionsByCategory(config.category, config.difficulty, config.count)
    
    // If not enough questions in bank, supplement with generated ones
    const questions: Question[] = bankQuestions.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      explanation: q.explanation,
      difficulty: q.difficulty
    }))
    
    // Generate additional questions if needed
    if (questions.length < config.count) {
      const additionalCount = config.count - questions.length
      const generated = generateCategoryQuestions(config.category, additionalCount, questions.length + 1)
      questions.push(...generated)
    }
    
    return {
      id: testId,
      title: config.title,
      category: config.category,
      duration: config.duration,
      passingScore: 60,
      questions: questions.slice(0, config.count)
    }
  }
  
  // Default fallback
  return {
    id: testId,
    title: 'Practice Test',
    category: 'general',
    duration: 60,
    passingScore: 60,
    questions: generateGenericQuestions(30)
  }
}

// Generate category-specific questions when bank doesn't have enough
function generateCategoryQuestions(category: string, count: number, startId: number): Question[] {
  const questions: Question[] = []
  const templates = getCategoryTemplates(category)
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length]
    questions.push({
      id: startId + i,
      text: template.text || 'Sample question',
      type: template.type || 'mcq',
      options: template.options,
      correctAnswer: template.correctAnswer || 'Option A',
      points: 2,
      explanation: template.explanation || 'Sample explanation',
      difficulty: template.difficulty || 'Medium'
    })
  }
  return questions
}

// Get question templates based on category
function getCategoryTemplates(category: string): Partial<Question>[] {
  const templates: { [key: string]: Partial<Question>[] } = {
    mathematics: [
      { text: 'Solve for x: 3x - 7 = 14', type: 'mcq', options: ['7', '21', '14', '5'], correctAnswer: '7', explanation: '3x = 21, x = 7' },
      { text: 'What is 15% of 200?', type: 'mcq', options: ['30', '25', '20', '35'], correctAnswer: '30', explanation: '200 × 0.15 = 30' }
    ],
    science: [
      { text: 'What is the boiling point of water at sea level?', type: 'mcq', options: ['90°C', '100°C', '110°C', '120°C'], correctAnswer: '100°C', explanation: 'Water boils at 100°C at standard atmospheric pressure.' },
      { text: 'Which gas do plants absorb during photosynthesis?', type: 'mcq', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctAnswer: 'Carbon Dioxide', explanation: 'Plants use CO₂ and sunlight to produce glucose.' }
    ],
    'general-knowledge': [
      { text: 'What is the largest country by area?', type: 'mcq', options: ['Canada', 'China', 'Russia', 'USA'], correctAnswer: 'Russia', explanation: 'Russia is the largest country covering 17.1 million km²' },
      { text: 'How many colors are in a rainbow?', type: 'mcq', options: ['5', '6', '7', '8'], correctAnswer: '7', explanation: 'ROYGBIV: Red, Orange, Yellow, Green, Blue, Indigo, Violet' }
    ],
    history: [
      { text: 'Who discovered America in 1492?', type: 'mcq', options: ['Vasco da Gama', 'Christopher Columbus', 'Marco Polo', 'Ferdinand Magellan'], correctAnswer: 'Christopher Columbus', explanation: 'Columbus reached the Americas in 1492.' },
      { text: 'The Magna Carta was signed in which year?', type: 'mcq', options: ['1215', '1315', '1415', '1515'], correctAnswer: '1215', explanation: 'The Magna Carta was signed in 1215 in England.' }
    ],
    english: [
      { text: 'What is the superlative form of "good"?', type: 'mcq', options: ['Gooder', 'Goodest', 'Better', 'Best'], correctAnswer: 'Best', explanation: 'Good → Better → Best (irregular comparison)' },
      { text: 'Identify the adjective: "The blue sky is beautiful."', type: 'mcq', options: ['Sky', 'Blue', 'Is', 'Beautiful'], correctAnswer: 'Blue', explanation: 'Blue describes the noun "sky"' }
    ],
    reasoning: [
      { text: 'If A > B and B > C, then:', type: 'mcq', options: ['A < C', 'A = C', 'A > C', 'Cannot determine'], correctAnswer: 'A > C', explanation: 'Transitive property: if A > B and B > C, then A > C' },
      { text: 'Complete: Square, Circle, Triangle, ?', type: 'mcq', options: ['Rectangle', 'Pentagon', 'Hexagon', 'Star'], correctAnswer: 'Rectangle', explanation: 'Common geometric shapes sequence' }
    ]
  }
  
  return templates[category] || templates['general-knowledge']
}

function generateGenericQuestions(count: number): Question[] {
  const questions: Question[] = []
  for (let i = 0; i < count; i++) {
    questions.push({
      id: i + 1,
      text: `Sample Question ${i + 1}: This is a practice question.`,
      type: 'mcq',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      points: 2,
      explanation: 'This is a sample explanation.',
      difficulty: 'Medium'
    })
  }
  return questions
}












