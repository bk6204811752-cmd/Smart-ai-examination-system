import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Camera, Mic, Monitor, AlertTriangle, CheckCircle, XCircle,
  Eye, Clock, Flag, ChevronLeft, ChevronRight, Menu, X,
  Brain, Trophy, Target, ArrowRight, TrendingUp, Maximize
} from 'lucide-react'
import { useSwipe } from '../../hooks/useSwipe'
import { useMobileDetect } from '../../hooks/useMobileDetect'
import { getQuestionsByCategory, getQuestionsByDifficulty, Question as QuestionType } from '../../data/questionBank'
import AdaptiveExamEngine, { DifficultyLevel } from '../../utils/adaptiveExamEngine'
import ProctoringEngineV2, { ProctoringViolation, ProctoringStatus } from '../../utils/proctoringEngine_v2'
import ViolationWarning, { ProctoringStatusBar, ViolationSummary } from '../../components/ViolationWarning'
import { AnimatePresence, motion } from 'framer-motion'

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
  const cameraStoppedRef = useRef<boolean>(false)
  const navigationPendingRef = useRef<boolean>(false)

  // Proctoring Engine V2
  const proctoringEngine = useMemo(() => new ProctoringEngineV2(), [])
  const [proctoringStatus, setProctoringStatus] = useState<ProctoringStatus | null>(null)
  const [activeViolations, setActiveViolations] = useState<ProctoringViolation[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Adaptive Exam Engine
  const adaptiveEngine = useMemo(() => new AdaptiveExamEngine('Medium'), [])
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('Medium')
  const [difficultyHistory, setDifficultyHistory] = useState<DifficultyLevel[]>(['Medium'])

  // Exam State
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: any }>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(3600) // seconds
  const [examStarted, setExamStarted] = useState(false)
  const [examEnded, setExamEnded] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Proctoring State
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [violations, setViolations] = useState<string[]>([])
  const [tabSwitches, setTabSwitches] = useState(0)
  const [brightness, setBrightness] = useState<number>(100)
  const [isInitializingCamera, setIsInitializingCamera] = useState(false)

  // Mock test data based on testId
  const mockTestData: MockTestData = getMockTestData(testId || '')

  // Swipe handlers for mobile
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => currentQuestion < mockTestData.questions.length - 1 && setCurrentQuestion(currentQuestion + 1),
    onSwipeRight: () => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)
  })

  // Simple, reliable camera shutdown
  const stopCamera = useCallback(async () => {
    try {
      // Stop monitoring first
      if (proctoringEngine) {
        proctoringEngine.stopMonitoring()
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
      
      // Nuclear: stop ALL video elements on page
      document.querySelectorAll('video').forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream
          stream.getTracks().forEach(track => track.stop())
          video.srcObject = null
        }
      })
      
      // Reset state
      setCameraEnabled(false)
      setMicEnabled(false)
      setProctoringStatus(null)
      setActiveViolations([])
      
      // Wait for hardware release
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Shutdown error:', error)
    }
  }, [proctoringEngine])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (proctoringEngine) {
        proctoringEngine.stopMonitoring()
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
    if (!examStarted || examEnded) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [examStarted, examEnded])

  // Initialize Proctoring Engine when camera is enabled
  useEffect(() => {
    if (cameraEnabled && videoRef.current && !proctoringStatus?.isActive) {
      initializeProctoring()
    }
  }, [cameraEnabled])

  // Update sidebar video stream when exam starts
  useEffect(() => {
    const connectSidebarVideo = async () => {
      if (sidebarVideoRef.current && examStarted && proctoringStatus?.isActive) {
        const stream = proctoringEngine.getStream()
        if (stream) {
          console.log('\n' + '📺 '.repeat(25))
          console.log('📺 CONNECTING SIDEBAR VIDEO STREAM')
          console.log('📺 '.repeat(25))
          
          sidebarVideoRef.current.srcObject = stream
          
          // Wait for video to be ready and play
          try {
            await sidebarVideoRef.current.play()
            console.log('✅ SIDEBAR VIDEO PLAYING')
            console.log('   - Width:', sidebarVideoRef.current.videoWidth)
            console.log('   - Height:', sidebarVideoRef.current.videoHeight)
            console.log('   - ReadyState:', sidebarVideoRef.current.readyState)
          } catch (error) {
            console.error('❌ Failed to play sidebar video:', error)
          }
          
          console.log('📺 '.repeat(25) + '\n')
        } else {
          console.error('⚠️ No stream available from proctoring engine!')
        }
      }
    }
    
    connectSidebarVideo()
    
    // Cleanup sidebar video when exam ends
    return () => {
      if (sidebarVideoRef.current && !examStarted) {
        sidebarVideoRef.current.srcObject = null
        console.log('🧹 Sidebar video cleared')
      }
    }
  }, [proctoringStatus?.isActive, examStarted])

  // Start monitoring when exam starts
  useEffect(() => {
    if (examStarted && proctoringStatus?.isActive) {
      // Monitoring is already started during camera initialization
      // Just ensure it's running
      if (!proctoringEngine.isMonitoringActive()) {
        console.log('🔍 Starting monitoring for exam...')
        proctoringEngine.startMonitoring()
      } else {
        console.log('✅ Monitoring already active from camera preview')
      }
      
      // Update brightness periodically
      const brightnessInterval = setInterval(() => {
        setBrightness(proctoringEngine.getBrightness())
      }, 2000)
      
      return () => {
        clearInterval(brightnessInterval)
        // Don't stop monitoring here - it will be stopped when camera is disabled
      }
    }

    return () => {
      // Don't stop monitoring when exam ends - only when camera is disabled
    }
  }, [examStarted])

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examStarted && !examEnded) {
        proctoringEngine.recordTabSwitch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [examStarted, examEnded])

  // Window blur detection (clicking outside browser)
  useEffect(() => {
    const handleWindowBlur = () => {
      if (examStarted && !examEnded) {
        proctoringEngine.recordWindowBlur()
      }
    }

    window.addEventListener('blur', handleWindowBlur)
    return () => window.removeEventListener('blur', handleWindowBlur)
  }, [examStarted, examEnded])

  // Fullscreen enforcement
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      setIsFullscreen(isNowFullscreen)

      if (!isNowFullscreen && examStarted && !examEnded) {
        proctoringEngine.recordFullscreenExit()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [examStarted, examEnded])

  // Safety net: Stop camera on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopCamera()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [stopCamera])

  // Initialize proctoring
  const initializeProctoring = async () => {
    if (!videoRef.current) {
      const error = new Error('Video element not available. This should not happen - please report this bug.')
      console.error('❌ CRITICAL ERROR:', error)
      throw error
    }

    console.log('🚀 Initializing proctoring engine...')
    console.log('Video element state:', {
      readyState: videoRef.current.readyState,
      videoWidth: videoRef.current.videoWidth,
      videoHeight: videoRef.current.videoHeight,
      paused: videoRef.current.paused
    })

    try {
      console.log('📹 Loading face detection models...')
      await proctoringEngine.loadModels()
      console.log('✅ Models loaded')
      
      console.log('🎥 Initializing camera and microphone...')
      await proctoringEngine.initialize(videoRef.current)
      console.log('✅ Camera and microphone initialized')
      
      // Set up callbacks
      proctoringEngine.setOnViolation((violation) => {
        console.log('⚠️ Violation detected:', violation)
        // Add to active violations for display
        setActiveViolations(prev => [violation, ...prev].slice(0, 5))
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setActiveViolations(prev => prev.filter(v => v !== violation))
        }, 5000)

        // Add to violations list
        setViolations(prev => [...prev, violation.message])
      })

      proctoringEngine.setOnStatusChange((status) => {
        setProctoringStatus(status)
        setTabSwitches(status.tabSwitchCount)
      })

      // Set up auto-pause callback
      proctoringEngine.setOnPause((reason) => {
        alert(`⚠️ EXAM PAUSED\n\n${reason}\n\nPlease contact the proctor to resume.`)
      })

      console.log('⏳ Waiting for video to stabilize...')
      // Capture reference face for identity verification
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait longer for video to stabilize
      
      console.log('📸 Capturing reference face...')
      const faceCapture = await proctoringEngine.captureReferenceFace()
      if (faceCapture) {
        console.log('✅ Reference face captured for identity verification')
      } else {
        console.warn('⚠️ Reference face capture failed - continuing without identity verification')
      }

      // Enable session recording for audit trail
      console.log('🎬 Enabling session recording...')
      proctoringEngine.enableRecording()

      setCameraEnabled(true)
      setMicEnabled(true)
      
      // Start monitoring immediately for camera preview (even before exam starts)
      console.log('🔍 Starting monitoring for camera preview...')
      proctoringEngine.startMonitoring()
      
      console.log('✅ Proctoring initialization complete!')
      console.log('Face detection is now active - you should see console logs every 2 seconds')
      console.log('Audio detection is now active - you should see console logs every 100ms')
    } catch (error) {
      console.error('❌ Proctoring initialization failed:', error)
      
      // Clean up on error
      setCameraEnabled(false)
      setMicEnabled(false)
      
      // Re-throw to let startCamera handle the error display
      throw error
    }
  }

  // Enter fullscreen
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } catch (error) {
      console.error('Fullscreen failed:', error)
    }
  }

  const startCamera = async () => {
    console.log('🎥 Starting camera...')
    console.log('Video ref exists:', !!videoRef.current)
    
    try {
      // Show loading state immediately
      setIsInitializingCamera(true)
      
      // Video element should always be available now (rendered with sr-only when hidden)
      if (videoRef.current) {
        console.log('✅ Video element found:', {
          tagName: videoRef.current.tagName,
          isConnected: videoRef.current.isConnected,
          parentElement: !!videoRef.current.parentElement
        })
      } else {
        console.error('❌ Video ref is null - this should not happen!')
      }
      
      // Initialize proctoring
      console.log('🚀 Starting proctoring initialization...')
      await initializeProctoring()
      
      console.log('✅ Camera started successfully')
      setIsInitializingCamera(false)
    } catch (error) {
      console.error('❌ Error starting camera:', error)
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      
      setIsInitializingCamera(false)
      setCameraEnabled(false)
      setMicEnabled(false)
      
      // Show specific error messages based on error type
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase()
        const errorName = error.constructor.name.toLowerCase()
        
        console.log('🔍 Analyzing error - Name:', errorName, 'Message:', errorMsg)
        
        if (errorMsg.includes('lighting') || errorMsg.includes('insufficient')) {
          alert(
            '🚨 INSUFFICIENT LIGHTING!\n\n' +
            'Your room is too dark for face detection to work.\n\n' +
            '✅ Turn on lights\n' +
            '✅ Sit near a window or lamp\n' +
            '✅ Ensure your face is well-lit\n\n' +
            'Minimum brightness required: 50/255\n\n' +
            'Please improve lighting and try again.'
          )
        } else if (errorName.includes('notallowed') || errorMsg.includes('permission') || errorMsg.includes('denied')) {
          alert(
            '🚨 CAMERA PERMISSION DENIED!\n\n' +
            'Please allow camera and microphone access.\n\n' +
            'Steps to fix:\n' +
            '✅ Click the camera icon in your address bar\n' +
            '✅ Select "Allow" for camera and microphone\n' +
            '✅ Refresh the page and try again\n\n' +
            'Or check your browser settings to enable permissions.'
          )
        } else if (errorName.includes('notfound') || errorMsg.includes('not found') || errorMsg.includes('no device')) {
          alert(
            '🚨 NO CAMERA FOUND!\n\n' +
            'No camera device detected on your computer.\n\n' +
            'Steps to fix:\n' +
            '✅ Connect a webcam to your computer\n' +
            '✅ Make sure camera drivers are installed\n' +
            '✅ Check if camera works in other apps\n' +
            '✅ Restart your browser and try again'
          )
        } else if (errorName.includes('notreadable') || errorMsg.includes('in use') || errorMsg.includes('already')) {
          alert(
            '🚨 CAMERA IS BUSY!\n\n' +
            'Another application is using your camera.\n\n' +
            'Steps to fix:\n' +
            '✅ Close other apps that might use the camera (Zoom, Teams, Skype, etc.)\n' +
            '✅ Close other browser tabs using the camera\n' +
            '✅ Restart your browser\n' +
            '✅ Try again'
          )
        } else if (errorMsg.includes('video element') || errorMsg.includes('not ready')) {
          alert(
            '🚨 VIDEO ELEMENT NOT READY!\n\n' +
            'The camera preview area is not loaded yet.\n\n' +
            'Steps to fix:\n' +
            '✅ Scroll down to see the "Camera Preview" section\n' +
            '✅ Wait 1-2 seconds for the page to fully load\n' +
            '✅ Click "Enable Camera" again\n\n' +
            'If problem persists, refresh the page.'
          )
        } else {
          alert(
            '❌ Camera Initialization Failed\n\n' +
            `Error Type: ${error.constructor.name}\n` +
            `Error: ${error.message}\n\n` +
            'Possible solutions:\n' +
            '✅ Scroll down to see the camera preview section\n' +
            '✅ Allow camera/microphone permissions\n' +
            '✅ Close other apps using the camera\n' +
            '✅ Refresh the page and try again\n' +
            '✅ Try a different browser (Chrome recommended)'
          )
        }
      } else {
        alert(
          '❌ Unknown Error\n\n' +
          'An unexpected error occurred.\n\n' +
          'Please refresh the page and try again.\n' +
          'If the problem persists, try a different browser.'
        )
      }
    }
  }

  const handleStartExam = async () => {
    if (!cameraEnabled || !micEnabled) {
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
    
    // Final brightness check before allowing exam to start
    const currentBrightness = proctoringEngine.getBrightness()
    if (currentBrightness < 50) {
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

    // Enter fullscreen mode
    await enterFullscreen()
    
    setExamStarted(true)
    setTimeRemaining(mockTestData.duration * 60)
  }

  const handleAnswerChange = (questionId: number, answer: any) => {
    const previousAnswer = answers[questionId]
    const isChangingAnswer = previousAnswer !== undefined
    
    setAnswers({ ...answers, [questionId]: answer })
    
    // Only process for adaptive logic if this is the first time answering (not changing answer)
    if (!isChangingAnswer) {
      const question = mockTestData.questions[questionId]
      const isCorrect = checkAnswer(question, answer)
      
      // Update adaptive engine
      adaptiveEngine.processAnswer(isCorrect, question.difficulty as DifficultyLevel)
      
      // Update current difficulty
      const newDifficulty = adaptiveEngine.getCurrentDifficulty()
      if (newDifficulty !== currentDifficulty) {
        setCurrentDifficulty(newDifficulty)
        setDifficultyHistory(prev => [...prev, newDifficulty])
      }
    }
  }

  // Helper function to check if answer is correct
  const checkAnswer = (question: Question, userAnswer: any): boolean => {
    if (question.type === 'multiple-answer') {
      return Array.isArray(question.correctAnswer) 
        ? JSON.stringify(userAnswer?.sort()) === JSON.stringify(question.correctAnswer.sort())
        : false
    }
    return userAnswer === question.correctAnswer
  }

  const handleFlagQuestion = () => {
    const newFlagged = new Set(flaggedQuestions)
    if (newFlagged.has(currentQuestion)) {
      newFlagged.delete(currentQuestion)
    } else {
      newFlagged.add(currentQuestion)
    }
    setFlaggedQuestions(newFlagged)
  }

  const handleSubmitExam = async () => {
    if (window.confirm('Are you sure you want to submit the exam?')) {
      console.log('🛑 ========== EXAM SUBMISSION STARTED ==========')
      
      // BLOCK navigation until camera is stopped
      navigationPendingRef.current = true
      cameraStoppedRef.current = false
      
      try {
        console.log('� Step 1: Stopping camera...')
        await stopCamera()
        
        console.log('🔍 Step 2: Verifying all tracks stopped...')
        // Aggressive verification - check multiple times
        for (let attempt = 0; attempt < 5; attempt++) {
          let activeTracks = 0
          
          // Check all video elements on page
          document.querySelectorAll('video').forEach((video) => {
            if (video.srcObject) {
              const stream = video.srcObject as MediaStream
              stream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                  console.warn(`⚠️ Active track found (${track.kind}): ${track.label}`)
                  track.stop() // Force stop
                  activeTracks++
                }
              })
              // Detach stream
              video.srcObject = null
              video.pause()
              video.load()
            }
          })
          
          console.log(`   Attempt ${attempt + 1}/5: Active tracks = ${activeTracks}`)
          
          if (activeTracks === 0) {
            console.log('✅ All tracks confirmed stopped!')
            break
          }
          
          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        console.log('⏳ Step 3: Waiting 1 second for hardware release...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // STEP 3.5: Verify engine is fully shutdown
        console.log('🔍 Step 3.5: Verifying engine shutdown...')
        let engineShutdownAttempts = 0
        while (!proctoringEngine.isFullyShutdown() && engineShutdownAttempts < 5) {
          console.log(`   ⏳ Engine not fully shutdown, attempt ${engineShutdownAttempts + 1}/5...`)
          await new Promise(resolve => setTimeout(resolve, 500))
          engineShutdownAttempts++
        }
        
        if (proctoringEngine.isFullyShutdown()) {
          console.log('   ✅ Engine confirmed fully shutdown!')
        } else {
          console.error('   ⚠️ Engine shutdown incomplete, proceeding anyway...')
        }
        
        cameraStoppedRef.current = true
        console.log('✅ Camera fully stopped and verified!')
        
        console.log('📊 Step 4: Calculating results...')
        setExamEnded(true)
        
        // Calculate results synchronously WITHOUT navigating yet
        calculateResultsWithoutNavigation()
        
      } catch (error) {
        console.error('❌ Error during exam submission:', error)
        // Even on error, try to stop camera
        cameraStoppedRef.current = true
        calculateResultsWithoutNavigation()
      }
    }
  }

  const calculateResultsWithoutNavigation = () => {
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
      const userAnswer = answers[index]
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
        percentage,
        violations,
        tabSwitches,
        timeTaken: mockTestData.duration * 60 - timeRemaining,
        // Adaptive exam data
        weakAreas,
        learningPath,
        performanceMetrics,
        performanceTrend,
        difficultyHistory
      }
    })
    
    console.log('✅ ========== EXAM SUBMISSION COMPLETE ==========')
  }

  const calculateResults = () => {
    // Legacy function - redirect to new implementation
    calculateResultsWithoutNavigation()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAnsweredCount = () => Object.keys(answers).length
  const getQuestionStatus = (index: number) => {
    if (answers[index] !== undefined) return 'answered'
    if (flaggedQuestions.has(index)) return 'flagged'
    return 'unanswered'
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Violation Warnings */}
        <AnimatePresence>
          {activeViolations.map((violation, index) => (
            <div key={`${violation.timestamp.getTime()}-${index}`} style={{ top: `${4 + index * 120}px` }}>
              <ViolationWarning
                violation={violation}
                onDismiss={() => setActiveViolations(prev => prev.filter(v => v !== violation))}
              />
            </div>
          ))}
        </AnimatePresence>

        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Brain className="w-8 h-8" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">{mockTestData.title}</h1>
                  <p className="text-xs sm:text-sm text-blue-100">AI-Proctored Mock Test</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/practice')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition min-h-[44px] text-sm sm:text-base touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* System Check */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Target className="w-6 h-6 mr-2 text-blue-600" />
              Pre-Exam System Check
            </h2>

            <div className="space-y-4 mb-6">
              {/* Camera Check */}
              <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Camera className={`w-6 h-6 ${cameraEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold">Camera Access</p>
                    <p className="text-sm text-gray-600">Required for proctoring</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    console.log('🖱️ Camera button clicked!')
                    console.log('Current state - cameraEnabled:', cameraEnabled, 'isInitializing:', isInitializingCamera)
                    if (cameraEnabled) {
                      stopCamera()
                    } else {
                      startCamera()
                    }
                  }}
                  disabled={isInitializingCamera}
                  className={`px-4 py-2 rounded-lg min-h-[44px] touch-manipulation transition-colors ${
                    isInitializingCamera 
                      ? 'bg-yellow-500 text-white cursor-wait' 
                      : cameraEnabled 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isInitializingCamera ? '⏳ Initializing...' : cameraEnabled ? '✓ Enabled (Click to Disable)' : 'Enable Camera'}
                </button>
              </div>

              {/* Microphone Check */}
              <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mic className={`w-6 h-6 ${micEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold">Microphone Access</p>
                    <p className="text-sm text-gray-600">Audio monitoring enabled automatically</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg ${micEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {micEnabled ? 'Enabled ✓' : 'Enable camera first'}
                </div>
              </div>

              {/* Screen Sharing */}
              <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Monitor className={`w-6 h-6 ${screenSharing ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold">Screen Sharing</p>
                    <p className="text-sm text-gray-600">Optional screen recording</p>
                  </div>
                </div>
                <button
                  onClick={() => setScreenSharing(!screenSharing)}
                  className={`px-4 py-2 rounded-lg min-h-[44px] touch-manipulation ${
                    screenSharing ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {screenSharing ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>

            {/* Diagnostic Tools */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">🔧 Diagnostic Tools</h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={async () => {
                    console.log('🧪 Testing basic camera access...')
                    try {
                      const testStream = await navigator.mediaDevices.getUserMedia({ 
                        video: true, 
                        audio: true 
                      })
                      console.log('✅ Camera test successful!', testStream)
                      alert('✅ Camera Test PASSED!\n\nYour camera and microphone are working correctly.\n\nCamera tracks: ' + testStream.getVideoTracks().length + '\nAudio tracks: ' + testStream.getAudioTracks().length + '\n\nYou can now try enabling the camera above.')
                      // Stop test stream
                      testStream.getTracks().forEach(track => track.stop())
                    } catch (err) {
                      console.error('❌ Camera test failed:', err)
                      const error = err as Error
                      alert('❌ Camera Test FAILED!\n\nError: ' + error.name + '\nMessage: ' + error.message + '\n\nPlease check:\n✅ Camera permissions\n✅ Camera not in use by other apps\n✅ Camera drivers installed')
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 min-h-[44px] touch-manipulation text-sm"
                >
                  🎥 Test Camera Independently
                </button>
                <button
                  onClick={() => {
                    console.log('📊 System Information:')
                    console.log('Browser:', navigator.userAgent)
                    console.log('Camera enabled:', cameraEnabled)
                    console.log('Mic enabled:', micEnabled)
                    console.log('Proctoring status:', proctoringStatus)
                    console.log('Video ref exists:', !!videoRef.current)
                    console.log('MediaDevices available:', !!navigator.mediaDevices)
                    alert('📊 System info logged to console (F12)\n\nCheck console for details.')
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 min-h-[44px] touch-manipulation text-sm"
                >
                  📊 Show System Info
                </button>
              </div>
            </div>

            {/* Camera Preview - Always render for ref */}
            <div className="mb-6">
              {cameraEnabled && <p className="font-semibold mb-2">Camera Preview</p>}
              <div className={`relative bg-black rounded-lg overflow-hidden aspect-video ${!cameraEnabled ? 'sr-only h-0 overflow-hidden' : ''}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {cameraEnabled && (
                  <>
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                      Live
                    </div>
                  
                  {/* Audio Level Meter */}
                  <div className="absolute top-2 left-2 bg-black/80 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <Mic className={`w-4 h-4 ${(proctoringStatus?.audioLevel || 0) > 10 ? 'text-red-400 animate-pulse' : 'text-green-400'}`} />
                      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            (proctoringStatus?.audioLevel || 0) > 20 ? 'bg-red-500' :
                            (proctoringStatus?.audioLevel || 0) > 10 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((proctoringStatus?.audioLevel || 0) * 2, 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-xs font-mono">{Math.round(proctoringStatus?.audioLevel || 0)}</span>
                    </div>
                  </div>
                  
                  {/* Debug Info Overlay */}
                  <div className="absolute bottom-2 left-2 bg-black/80 text-white p-2 rounded text-xs space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={proctoringStatus?.isActive ? 'text-green-400' : 'text-red-400'}>●</span>
                      <span>Monitoring: {proctoringStatus?.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={proctoringStatus?.faceDetected ? 'text-green-400' : 'text-red-400'}>●</span>
                      <span>Face: {proctoringStatus?.faceDetected ? 'Detected' : 'Not Detected'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={(proctoringStatus?.audioLevel || 0) > 10 ? 'text-yellow-400' : 'text-green-400'}>●</span>
                      <span>Audio: {Math.round(proctoringStatus?.audioLevel || 0)} {(proctoringStatus?.audioLevel || 0) > 10 ? '🔊' : ''}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={(proctoringStatus?.violations.length || 0) > 0 ? 'text-orange-400' : 'text-green-400'}>●</span>
                      <span>Violations: {proctoringStatus?.violations.length || 0}</span>
                    </div>
                    {proctoringStatus?.integrityScore !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className={proctoringStatus.integrityScore > 70 ? 'text-green-400' : 'text-orange-400'}>●</span>
                        <span>Integrity: {Math.round(proctoringStatus.integrityScore)}%</span>
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
              
              {cameraEnabled && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2 text-sm">
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-gray-700 flex-1">
                      <strong className="text-blue-700">Testing Audio Detection:</strong>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• Open console (F12) to see detailed logs</li>
                        <li>• Make any sound - watch the audio meter above</li>
                        <li>• You should see "🎤 Audio:" messages in console</li>
                        <li>• Warning will appear after detecting sound</li>
                      </ul>
                      <button
                        onClick={() => {
                          console.log('🧪 Manual audio test triggered')
                          console.log('Current audio level:', proctoringStatus?.audioLevel)
                          alert('Check console (F12) for audio monitoring details.\n\nIf you see "🎤 Audio:" messages appearing continuously, audio monitoring is working!\n\nTry talking or making noise now.')
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Test Audio System
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Exam Instructions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-lg mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-blue-600" />
                Important Instructions
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Ensure you are in a quiet, well-lit environment</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Do not switch tabs or minimize the browser during the exam</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Your face must be visible throughout the exam</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Exam will run in fullscreen mode - do not exit fullscreen</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>No external assistance or resources allowed</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Questions: {mockTestData.questions.length} | Duration: {mockTestData.duration} minutes</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Passing score: {mockTestData.passingScore}%</span>
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartExam}
              disabled={!cameraEnabled}
              className={`w-full py-4 rounded-lg text-lg font-bold transition min-h-[44px] touch-manipulation ${
                cameraEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {cameraEnabled ? 'Start Exam' : 'Enable Camera to Start'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const question = mockTestData.questions[currentQuestion]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Violation Warnings */}
      <AnimatePresence>
        {activeViolations.map((violation, index) => (
          <div key={`${violation.timestamp.getTime()}-${index}`} style={{ top: `${4 + index * 120}px` }}>
            <ViolationWarning
              violation={violation}
              onDismiss={() => setActiveViolations(prev => prev.filter(v => v !== violation))}
            />
          </div>
        ))}
      </AnimatePresence>

      {/* Violation Summary */}
      {proctoringStatus && (
        <ViolationSummary violations={proctoringStatus.violations} />
      )}

      {/* Proctoring Status Bar */}
      {proctoringStatus && !examEnded && (
        <ProctoringStatusBar
          faceDetected={proctoringStatus.faceDetected}
          faceCount={proctoringStatus.faceCount}
          lookingAtScreen={proctoringStatus.lookingAtScreen}
          audioLevel={proctoringStatus.audioLevel}
          isFullscreen={isFullscreen}
          brightness={brightness}
          attentionLevel={proctoringStatus.attentionLevel}
          integrityScore={proctoringStatus.integrityScore}
        />
      )}

      {/* Fullscreen Warning */}
      {!isFullscreen && (
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

      {/* Exam Paused Overlay */}
      {proctoringStatus?.isPaused && (
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
              <p className="text-gray-600 mb-6">{proctoringStatus.pauseReason}</p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Suspicious Activity Score:</strong> {proctoringStatus.suspiciousActivityScore}/100
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Multiple critical violations detected. Please contact the proctor to resume.
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
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Brain className="w-6 h-6 sm:w-8 sm:h-8" />
              <div>
                <h1 className="text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-none">
                  {mockTestData.title}
                </h1>
                <p className="text-xs text-blue-100 hidden sm:block">Question {currentQuestion + 1} of {mockTestData.questions.length}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-500' : 'bg-white/20'
              } min-h-[44px]`}>
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-bold text-sm sm:text-base">{formatTime(timeRemaining)}</span>
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
        {showMobileMenu && (isMobile || isTablet) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowMobileMenu(false)}>
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-bold">Questions</h3>
                <button onClick={() => setShowMobileMenu(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <QuestionNavigator
                  totalQuestions={mockTestData.questions.length}
                  currentQuestion={currentQuestion}
                  getQuestionStatus={getQuestionStatus}
                  onQuestionClick={(index) => {
                    setCurrentQuestion(index)
                    setShowMobileMenu(false)
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
              currentQuestion={currentQuestion}
              getQuestionStatus={getQuestionStatus}
              onQuestionClick={setCurrentQuestion}
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
                      Question {currentQuestion + 1}
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
                    {currentDifficulty !== 'Medium' && (
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1 ${
                        currentDifficulty === 'Easy' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        Next: {currentDifficulty}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-relaxed">{question.text}</h2>
                </div>
                <button
                  onClick={handleFlagQuestion}
                  className={`p-2 rounded-lg transition min-h-[44px] min-w-[44px] touch-manipulation ${
                    flaggedQuestions.has(currentQuestion)
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
                      answers[currentQuestion] === option
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      value={option}
                      checked={answers[currentQuestion] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm sm:text-base">{option}</span>
                  </label>
                ))}

                {question.type === 'multiple-answer' && question.options?.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center space-x-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition min-h-[44px] touch-manipulation ${
                      answers[currentQuestion]?.includes(option)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={answers[currentQuestion]?.includes(option) || false}
                      onChange={(e) => {
                        const current = answers[currentQuestion] || []
                        const newAnswers = e.target.checked
                          ? [...current, option]
                          : current.filter((a: string) => a !== option)
                        handleAnswerChange(currentQuestion, newAnswers)
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
                          answers[currentQuestion] === option
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion}`}
                          value={option}
                          checked={answers[currentQuestion] === option}
                          onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="text-sm sm:text-base font-semibold">{option}</span>
                      </label>
                    ))}
                  </>
                )}

                {question.type === 'short-answer' && (
                  <textarea
                    value={answers[currentQuestion] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
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
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
                className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px] touch-manipulation flex-1 sm:flex-initial justify-center"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-semibold hidden sm:inline">Previous</span>
              </button>

              {currentQuestion === mockTestData.questions.length - 1 ? (
                <button
                  onClick={handleSubmitExam}
                  className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition min-h-[44px] touch-manipulation flex-1 sm:flex-initial justify-center"
                >
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base font-semibold">Submit Exam</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition min-h-[44px] touch-manipulation flex-1 sm:flex-initial justify-center"
                >
                  <span className="text-sm sm:text-base font-semibold hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Proctoring Panel - Desktop Only */}
        {!isMobile && !isTablet && (
          <div className="hidden xl:block w-80 bg-white border-l overflow-y-auto">
            <div className="p-4">
              <h3 className="font-bold text-lg mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-blue-600" />
                AI Proctoring
              </h3>

              {/* Camera Feed */}
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Live Camera</p>
                <div className={`relative bg-black rounded-lg overflow-hidden aspect-video ${
                  !(cameraEnabled && proctoringStatus?.isActive) ? 'opacity-0 h-0 overflow-hidden' : ''
                }`}>
                  <video
                    ref={sidebarVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {cameraEnabled && proctoringStatus?.isActive && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                      REC
                    </div>
                  )}
                </div>
              </div>

              {/* Status Indicators */}
              <div className="space-y-3">
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  proctoringStatus?.faceDetected && proctoringStatus?.faceCount === 1 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className="text-sm font-medium">Face Detection</span>
                  {proctoringStatus?.faceDetected && proctoringStatus?.faceCount === 1 ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-xs text-green-700">1 Face ✓</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-xs text-red-700">
                        {proctoringStatus?.faceCount === 0 && 'No Face'}
                        {proctoringStatus && proctoringStatus.faceCount > 1 && `${proctoringStatus.faceCount} Faces!`}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  proctoringStatus?.lookingAtScreen ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <span className="text-sm font-medium">Eye Tracking</span>
                  {proctoringStatus?.lookingAtScreen ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  tabSwitches === 0 ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <span className="text-sm font-medium">Tab Switches</span>
                  <span className="font-bold">{tabSwitches}</span>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  (proctoringStatus?.audioLevel || 0) < 40 ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <span className="text-sm font-medium">Audio Level</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${(proctoringStatus?.audioLevel || 0) > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((proctoringStatus?.audioLevel || 0) * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                  <span className="text-sm font-medium">Total Violations</span>
                  <span className="font-bold">{violations.length}</span>
                </div>
              </div>

              {/* Violation Log */}
              {violations.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Violation Log</p>
                  <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {violations.map((violation, index) => (
                      <p key={index} className="text-xs text-red-800 mb-1">
                        ⚠️ {violation}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

