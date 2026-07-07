import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Menu,
  Flag,
  Check,
  Maximize,
  Shield,
  BookOpen,
  Zap,
} from 'lucide-react'
import { examAPI, proctoringAPI, sessionAPI } from '../../lib/api'
import { useSwipe } from '../../hooks/useSwipe'
import { useMobileDetect } from '../../hooks/useMobileDetect'
import ProctoringEngine from '../../utils/proctoringEngine'
import type { ProctoringViolation, ProctoringStatus } from '../../utils/proctoringEngine'
import { toast } from 'sonner'
import { WebSocketClient } from '../../lib/websocket'
import { useAuthStore } from '../../store/globalStore'
import ExamSubmitModal from '../../components/ExamSubmitModal'
import ExamTimerWarning from '../../components/ExamTimerWarning'
import ViolationOverlay from '../../components/ViolationOverlay'
import type { ViolationOverlayType } from '../../components/ViolationOverlay'
import ProctoringRightPanel from '../../components/ProctoringRightPanel'
import ExamChat from '../../components/ExamChat'

export default function ExamPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const proctoringEngineRef = useRef<ProctoringEngine | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsClientRef = useRef<WebSocketClient | null>(null)
  const videoStreamIntervalRef = useRef<number | null>(null)
  const initializingRef = useRef<boolean>(false)
  const user = useAuthStore(state => state.user)

  // Exam state
  const [exam, setExam] = useState<any>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [examStarted, setExamStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSaveIndicator, setShowSaveIndicator] = useState(false)

  // Proctoring state
  const [proctoringActive, setProctoringActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [proctoringStatus, setProctoringStatus] = useState<ProctoringStatus | null>(null)
  const [flags, setFlags] = useState<any[]>([])
  const [tabSwitches, setTabSwitches] = useState(0)
  const [trustScore, setTrustScore] = useState(100)
  const [showViolationFlash, setShowViolationFlash] = useState(false)
  const [audioWaveData, setAudioWaveData] = useState<number[]>([])

  // Advanced violation overlay
  const [violationOverlayType, setViolationOverlayType] = useState<ViolationOverlayType | null>(
    null
  )
  const [violationOverlayMsg, setViolationOverlayMsg] = useState('')
  const [violationOverlaySeverity, setViolationOverlaySeverity] = useState<
    'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  >('HIGH')
  const [examPausedByTeacher, setExamPausedByTeacher] = useState(false)
  const [examPausedByEngine, setExamPausedByEngine] = useState(false)

  // Screen sharing & window detection
  const screenShareCheckRef = useRef<number | null>(null)
  const windowSizeCheckRef = useRef<number | null>(null)
  const heartbeatRef = useRef<number | null>(null)
  const trustSyncRef = useRef<number | null>(null)
  const brightnessCheckRef = useRef<number | null>(null)

  // New: dark room block & fullscreen hard block states
  const [darkRoomBlocked, setDarkRoomBlocked] = useState(false)
  const [darkRoomBrightness, setDarkRoomBrightness] = useState(0)
  const fullscreenCountdownRef = useRef<number | null>(null)

  // Modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showTimerWarning, setShowTimerWarning] = useState(false)
  const [timerWarningMinutes, setTimerWarningMinutes] = useState(10)
  const warned10Min = useRef(false)
  const warned1Min = useRef(false)

  // Fullscreen state
  const [fullscreenExited, setFullscreenExited] = useState(false)

  // Refs to avoid stale closures in event listeners
  const examStartedRef = useRef(false)
  const submittingRef = useRef(false)
  const examPausedByEngineRef = useRef(false)
  const timeRemainingRef = useRef(0)
  const answersRef = useRef<Record<string, any>>({})
  const tabSwitchesRef = useRef(0)
  const flagsRef = useRef<any[]>([])
  const trustScoreRef = useRef(100)
  examStartedRef.current = examStarted
  submittingRef.current = submitting
  examPausedByEngineRef.current = examPausedByEngine
  timeRemainingRef.current = timeRemaining
  answersRef.current = answers
  tabSwitchesRef.current = tabSwitches
  flagsRef.current = flags
  trustScoreRef.current = trustScore

  // Connection quality
  const { isMobile, isTablet } = useMobileDetect()

  // Computed
  const answeredCount = Object.keys(answers).length
  const flaggedCount = flaggedQuestions.size
  const timeTaken = exam ? exam.duration * 60 - timeRemaining : 0
  const violationCount = flags.length

  // Swipe navigation
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < exam?.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setShowMobileMenu(false)
    }
  }, [currentQuestionIndex, exam?.questions.length])

  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      setShowMobileMenu(false)
    }
  }, [currentQuestionIndex])

  const swipeHandlers = useSwipe({
    onSwipeLeft: nextQuestion,
    onSwipeRight: prevQuestion,
  })

  // â”€â”€â”€ Fullscreen Lockdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const requestFullscreen = async (): Promise<void> => {
    if (document.fullscreenElement) {
      setIsFullscreen(true)
      setFullscreenExited(false)
      return
    }
    const target = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>
      msRequestFullscreen?: () => Promise<void>
    }
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
    } else if (target.webkitRequestFullscreen) {
      await target.webkitRequestFullscreen()
    } else if (target.msRequestFullscreen) {
      await target.msRequestFullscreen()
    } else {
      throw new Error('Fullscreen API not available')
    }
    if (!document.fullscreenElement) {
      throw new Error('Fullscreen request rejected by browser')
    }
    setIsFullscreen(true)
    setFullscreenExited(false)
  }

  const startExamFlow = async () => {
    if (examStarted) return
    try {
      await requestFullscreen()
      setExamStarted(true)
    } catch {
      setFullscreenExited(true)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      setIsFullscreen(isNowFullscreen)
      if (
        !isNowFullscreen &&
        examStartedRef.current &&
        !submittingRef.current &&
        !examPausedByEngineRef.current
      ) {
        setFullscreenExited(true)
        setTabSwitches(prev => prev + 1)
        createProctoringFlag('fullscreen_exit', 'high', 'Student exited fullscreen mode')
        setTrustScore(prev => Math.max(0, prev - 10))
        // PAUSE the exam immediately
        const engine = proctoringEngineRef.current
        if (engine) {
          engine.pauseExam('Fullscreen mode was exited. Return to fullscreen to resume the exam.')
        }
      } else if (isNowFullscreen) {
        setFullscreenExited(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // â”€â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    loadExam()
    const cleanupProctoring = setupProctoringListeners()
    const cleanupAdvanced = setupAdvancedSecurityListeners()
    return () => {
      stopCamera()
      cleanupProctoring?.()
      cleanupAdvanced?.()
      if (screenShareCheckRef.current) clearInterval(screenShareCheckRef.current)
      if (windowSizeCheckRef.current) clearInterval(windowSizeCheckRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (trustSyncRef.current) clearInterval(trustSyncRef.current)
      if (brightnessCheckRef.current) clearInterval(brightnessCheckRef.current)
      if (fullscreenCountdownRef.current) clearInterval(fullscreenCountdownRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  // Start camera when exam loads
  useEffect(() => {
    if (!exam || loading) return

    const tryStart = () => {
      if (!proctoringEngineRef.current && !initializingRef.current) {
        startCamera()
      }
    }

    const timer = setTimeout(tryStart, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, loading])

  // Timer countdown
  useEffect(() => {
    if (examStarted && timeRemaining > 0 && !submitting) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const next = prev - 1

          // Timer warnings
          const minutesLeft = Math.floor(next / 60)
          if (minutesLeft === 10 && !warned10Min.current && next % 60 === 0) {
            warned10Min.current = true
            setTimerWarningMinutes(10)
            setShowTimerWarning(true)
          }
          if (minutesLeft === 1 && !warned1Min.current) {
            warned1Min.current = true
            setTimerWarningMinutes(1)
            setShowTimerWarning(true)
          }

          if (next <= 1) {
            // Clear interval immediately, submit outside updater
            clearInterval(timer)
            setTimeout(() => doSubmitExam(), 0)
            return 0
          }
          return next
        })
      }, 1000)
      return () => clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, timeRemaining, submitting])

  // Real-time audio wave polling during exam
  useEffect(() => {
    if (!examStarted || submitting) return
    const interval = setInterval(() => {
      const engine = proctoringEngineRef.current
      if (engine && typeof engine.getAudioFrequencyData === 'function') {
        const freqData = engine.getAudioFrequencyData()
        if (freqData.length > 0) {
          setAudioWaveData(freqData.slice(0, 32))
        }
      }
    }, 100)
    return () => clearInterval(interval)
  }, [examStarted, submitting])

  // â”€â”€â”€ API Calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadExam = async () => {
    try {
      const data = await examAPI.getExam(examId!)
      if (!data?.questions?.length) {
        toast.error('This exam has no questions')
        navigate('/student/dashboard')
        return
      }
      setExam(data)
      setTimeRemaining(data.duration * 60)
      setLoading(false)

      try {
        await sessionAPI.startSession(examId!, {})
      } catch {
        /* non-critical */
      }

      // Exam start is triggered by the proctoring engine success path,
      // or by the no-camera fallback. Do NOT start here â€” we wait
      // for the engine's brightness check to pass first.
      // (see startExamFlow() called from Phase 2 success or no-camera fallback)
    } catch {
      toast.error('Failed to load exam. Returning to dashboard.')
      navigate('/student/dashboard')
    }
  }

  const startCamera = async () => {
    if (initializingRef.current) return
    if (cameraReady && videoRef.current?.srcObject) return
    initializingRef.current = true

    // â”€â”€ PHASE 1: Attach stream to video element immediately â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
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

      streamRef.current = stream

      setCameraReady(true)
      setProctoringActive(true)
      initializingRef.current = false

      // WebSocket for live frame streaming
      initializeWebSocket()
    } catch (streamErr) {
      const msg = streamErr instanceof Error ? streamErr.message : String(streamErr)
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        toast.error('Camera permission denied. Please allow camera access and refresh.', {
          duration: 8000,
        })
      } else if (msg.includes('NotFoundError')) {
        toast.error('No camera found. Please connect a camera.', { duration: 8000 })
        console.warn('[Camera] No camera, continuing:', msg)
        setProctoringActive(true)
        initializeWebSocket()
      } else {
        toast.error('Failed to access camera. Check camera settings.', { duration: 5000 })
      }

      // No-camera fallback: start exam flow anyway after a short delay
      setTimeout(() => {
        if (!examStarted) {
          startExamFlow()
        }
      }, 1500)
      return
    }

    // â”€â”€ PHASE 2: Initialize AI engine with the already-playing stream â”€â”€
    setTimeout(async () => {
      const stream = videoRef.current?.srcObject as MediaStream | null
      if (!stream || !stream.active || !videoRef.current) return

      try {
        const engine = new ProctoringEngine();
        (proctoringEngineRef as any).current = engine

        await engine.loadModels()

        // Initialize engine with the already-playing stream
        await engine.initialize(videoRef.current!, stream)

        engine.setOnViolation((violation: ProctoringViolation) => {
          const penalty =
            violation.severity === 'CRITICAL'
              ? 15
              : violation.severity === 'HIGH'
                ? 10
                : violation.severity === 'MEDIUM'
                  ? 5
                  : 2
          setTrustScore(prev => Math.max(0, prev - penalty))

          setShowViolationFlash(true)
          setTimeout(() => setShowViolationFlash(false), 500)

          if (violation.severity === 'CRITICAL') toast.error(violation.message, { duration: 5000 })
          else if (violation.severity === 'HIGH')
            toast.warning(violation.message, { duration: 4000 })

          createProctoringFlag(violation.type, violation.severity, violation.message)
          broadcastViolation(violation)
        })

        engine.setOnStatusChange((status: ProctoringStatus) => {
          setProctoringStatus(status)
        })

        engine.setOnPause((reason: string) => {
          setExamPausedByEngine(true)
          showViolationAlert('SUSPICIOUS_BEHAVIOR', `â¸ï¸ Exam Paused: ${reason}`, 'CRITICAL')
          toast.error(`Exam Paused: ${reason}`, { duration: 10000, id: 'exam-pause' })
          // Notify teacher immediately that this student is paused
          setTimeout(() => sendProctoringStatusUpdate(), 100)
        })

        // Capture reference face after 3s
        setTimeout(async () => {
          const captured = await engine.captureReferenceFace()
          if (captured) {
            toast.success('Identity verified - monitoring active', { duration: 2000 })
          } else {
            toast.warning('Could not verify identity - ensure face is visible', { duration: 4000 })
          }
        }, 3000)

        engine.startMonitoring()
        engine.enableRecording()
        startExamFlow()

        const audioCtx = (engine as any).audioContext
        if (audioCtx?.state === 'suspended') {
          document.addEventListener('click', () => audioCtx.resume(), { once: true })
        }
      } catch (engineErr) {
        const msg = engineErr instanceof Error ? engineErr.message : String(engineErr)
        if (
          msg.includes('lighting') ||
          msg.includes('INSUFFICIENT_LIGHTING') ||
          msg.includes('too dark') ||
          msg.includes('Too dark')
        ) {
          setDarkRoomBlocked(true)
          const brightness = (() => {
            try {
              const c = document.createElement('canvas')
              c.width = 64
              c.height = 48
              const x = c.getContext('2d')
              if (!x || !videoRef.current) return 0
              x.drawImage(videoRef.current, 0, 0, 64, 48)
              const d = x.getImageData(0, 0, 64, 48).data
              let t = 0
              for (let i = 0; i < d.length; i += 4)
                t += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
              return Math.round(t / (d.length / 4))
            } catch {
              return 0
            }
          })()
          setDarkRoomBrightness(brightness)
          createProctoringFlag(
            'dark_room',
            'critical',
            `Room too dark (brightness: ${brightness}/255)`
          )
        } else {
          console.warn('[Proctoring] AI engine failed, basic monitoring continues:', msg)
          streamRef.current = videoRef.current?.srcObject as MediaStream | null
        }
      }
    }, 500)
  }

  const initializeWebSocket = () => {
    if (!user || !examId) return
    const wsClient = new WebSocketClient()
    wsClientRef.current = wsClient
    const userId = user._id || user.email || 'unknown'
    wsClient.connect({ userId, role: 'student', examId })

    // â”€â”€ Teacher Intervention Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    wsClient.on('intervention', (data: any) => {
      const action = data.action as string
      const msg = data.message || ''

      if (action === 'warn') {
        setTeacherMessage({ text: msg || 'Please focus on your exam.', from: 'Teacher' })
        showViolationAlert(
          'SUSPICIOUS_BEHAVIOR',
          `Teacher Warning: ${msg || 'Please focus on your exam.'}`,
          'HIGH'
        )
        toast.warning(`Teacher: ${msg}`, { duration: 6000 })
      } else if (action === 'pause') {
        setExamPausedByTeacher(true)
        showViolationAlert(
          'SUSPICIOUS_BEHAVIOR',
          `â¸ï¸ Exam Paused by Teacher: ${msg || 'Your exam has been paused. Please wait.'}`,
          'CRITICAL'
        )
        toast.error(`Exam paused by teacher: ${msg}`, { duration: 0 })
      } else if (action === 'resume') {
        setExamPausedByTeacher(false)
        setExamPausedByEngine(false)
        setViolationOverlayType(null)
        const engine = proctoringEngineRef.current
        if (engine) engine.resumeExam()
        toast.success('âœ… Exam resumed by teacher', { duration: 3000 })
      } else if (action === 'terminate') {
        showViolationAlert(
          'SUSPICIOUS_BEHAVIOR',
          `ðŸš« Exam Terminated: ${msg || 'Your exam has been terminated by the teacher due to integrity violations.'}`,
          'CRITICAL'
        )
        toast.error('Exam terminated by teacher', { duration: 0 })
        // Auto-submit after 5 seconds
        setTimeout(() => doSubmitExam(), 5000)
      }
    })

    // â”€â”€ Teacher Broadcast Message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    wsClient.on('teacher_message', (data: any) => {
      setTeacherMessage({ text: data.message, from: 'Teacher' })
      toast.info(`ðŸ“¢ Teacher: ${data.message}`, { duration: 8000 })
    })

    wsClient.on('connection_established', () => {
      toast.success('ðŸ”— Live monitoring active', { duration: 1500 })
      // â”€â”€ CRITICAL FIX: Start video streaming when WebSocket connects â”€â”€â”€â”€â”€
      // This was missing - without this call, teachers see NO video feeds
      startVideoStreaming()
    })

    // â”€â”€ Heartbeat: send alive ping every 10 seconds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    heartbeatRef.current = window.setInterval(() => {
      if (wsClient.isConnected()) {
        wsClient.send({
          type: 'heartbeat',
          exam_id: examId,
          student_id: userId,
          timestamp: new Date().toISOString(),
        })
      }
    }, 10000)

    // â”€â”€ Trust Score Sync: send proctoring_status every 15 seconds â”€â”€â”€â”€â”€
    trustSyncRef.current = window.setInterval(() => {
      if (wsClient.isConnected()) {
        wsClient.send({
          type: 'proctoring_status',
          exam_id: examId,
          student_id: userId,
          trust_score: trustScore,
          status: {
            faceDetected: proctoringStatus?.faceDetected ?? true,
            faceCount: proctoringStatus?.faceCount ?? 1,
            lookingAtScreen: proctoringStatus?.lookingAtScreen ?? true,
            audioLevel: proctoringStatus?.audioLevel ?? 0,
            attentionLevel: proctoringStatus?.attentionLevel ?? 100,
            environmentScore: proctoringStatus?.environmentScore ?? 100,
            integrityScore: proctoringStatus?.integrityScore ?? trustScore,
            tabSwitchCount: proctoringStatus?.tabSwitchCount ?? tabSwitches,
            violationCount: flags.length,
            isPaused: examPausedByEngine || examPausedByTeacher,
          },
          timestamp: new Date().toISOString(),
        })
      }
    }, 15000)

    // â”€â”€ Brightness Monitoring During Exam â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    brightnessCheckRef.current = window.setInterval(() => {
      if (!videoRef.current || !examStarted) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 48
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(videoRef.current, 0, 0, 64, 48)
        const imgData = ctx.getImageData(0, 0, 64, 48).data
        let total = 0
        for (let i = 0; i < imgData.length; i += 4) {
          total += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]
        }
        const brightness = total / (imgData.length / 4)
        setDarkRoomBrightness(Math.round(brightness))

        if (brightness < 25) {
          // Very dark â€” send notification and show block overlay
          if (wsClient.isConnected()) {
            wsClient.send({ type: 'brightness_update', brightness, exam_id: examId })
          }
          createProctoringFlag(
            'dark_room_exam',
            'critical',
            `Room too dark during exam (brightness: ${brightness.toFixed(0)}/255)`
          )
          setDarkRoomBlocked(true)
          showViolationAlert(
            'CAMERA_BLOCKED',
            `ðŸŒ‘ Room is too dark! Brightness: ${brightness.toFixed(0)}/255. Exam paused until lighting is improved.`,
            'CRITICAL'
          )
        } else if (brightness < 35) {
          // Warning level â€” log but don't block
          if (wsClient.isConnected()) {
            wsClient.send({ type: 'brightness_update', brightness, exam_id: examId })
          }
          createProctoringFlag(
            'low_light',
            'medium',
            `Low room lighting detected (brightness: ${brightness.toFixed(0)})`
          )
          showViolationAlert(
            'CAMERA_BLOCKED',
            `Low Lighting: ${brightness.toFixed(0)}/255. Please improve your room lighting.`,
            'MEDIUM'
          )
        }
      } catch {
        /* ignore */
      }
    }, 8000) // Check every 8 seconds during exam (was 20s)
  }

  const startVideoStreaming = () => {
    if (!videoRef.current || !wsClientRef.current) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameCount = 0
    videoStreamIntervalRef.current = window.setInterval(() => {
      try {
        const video = videoRef.current
        const wsClient = wsClientRef.current
        if (!video || !wsClient) return
        if (video.readyState < 2 || video.videoWidth === 0) return
        if (wsClient.getStatus() !== 'connected') return

        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const frameData = canvas.toDataURL('image/jpeg', 0.5)
        frameCount++

        wsClient.send({
          type: 'video_frame',
          exam_id: examId!,
          student_id: user?._id || user?.email,
          frame: frameData,
          timestamp: new Date().toISOString(),
          frame_number: frameCount,
        })
      } catch {
        /* ignore frame errors silently */
      }
    }, 3000) // Every 3 seconds (less spam)
  }

  const broadcastViolation = (violation: ProctoringViolation) => {
    if (!wsClientRef.current) return
    wsClientRef.current.send({
      type: 'ai_violation',
      exam_id: examId!,
      violation: {
        type: violation.type,
        severity: violation.severity,
        message: violation.message,
        timestamp: violation.timestamp.toISOString(),
        metadata: violation.metadata,
      },
    })
  }

  const stopCamera = () => {
    initializingRef.current = false
    if (videoStreamIntervalRef.current) {
      clearInterval(videoStreamIntervalRef.current)
      videoStreamIntervalRef.current = null
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    if (trustSyncRef.current) {
      clearInterval(trustSyncRef.current)
      trustSyncRef.current = null
    }
    if (brightnessCheckRef.current) {
      clearInterval(brightnessCheckRef.current)
      brightnessCheckRef.current = null
    }
    if (screenShareCheckRef.current) {
      clearInterval(screenShareCheckRef.current)
      screenShareCheckRef.current = null
    }
    if (windowSizeCheckRef.current) {
      clearInterval(windowSizeCheckRef.current)
      windowSizeCheckRef.current = null
    }
    if (fullscreenCountdownRef.current) {
      clearInterval(fullscreenCountdownRef.current)
      fullscreenCountdownRef.current = null
    }
    if (wsClientRef.current) {
      wsClientRef.current.disconnect()
      wsClientRef.current = null
    }
    proctoringEngineRef.current?.cleanup()
    proctoringEngineRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setProctoringActive(false)
    setCameraReady(false)
  }

  const showViolationAlert = useCallback(
    (
      type: ViolationOverlayType,
      message: string,
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
    ) => {
      setViolationOverlayType(type)
      setViolationOverlayMsg(message)
      setViolationOverlaySeverity(severity)
    },
    []
  )

  const dismissViolationAlert = useCallback(() => {
    setViolationOverlayType(null)
  }, [])

  const setupAdvancedSecurityListeners = () => {
    // â”€â”€ Screen Share Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Check if any display media track is active (indicates screen sharing)
    const checkScreenShare = () => {
      // Method 1: Check via document visibility + display media
      // If getDisplayMedia was called, screen sharing may be active
      const displays = (window as any).__screenShareStream
      if (displays) {
        setScreenShareDetected(true)
        createProctoringFlag('screen_share', 'critical', 'Screen sharing detected during exam')
        showViolationAlert(
          'SCREEN_SHARE',
          'Screen sharing was detected! This is a critical violation. Please stop screen sharing immediately.',
          'CRITICAL'
        )
      }
    }
    screenShareCheckRef.current = window.setInterval(checkScreenShare, 3000)

    // â”€â”€ Window Size / Taskbar Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // If window height is significantly less than screen height, taskbar may be visible
    const checkWindowSize = () => {
      if (
        !examStartedRef.current ||
        !document.fullscreenElement ||
        submittingRef.current ||
        examPausedByEngineRef.current
      )
        return
      const screenH = window.screen.height
      const windowH = window.outerHeight
      const ratio = windowH / screenH
      if (ratio < 0.95) {
        // Window is smaller than screen - user exited fullscreen or taskbar visible
        setWindowMinimized(true)
        createProctoringFlag(
          'window_resized',
          'high',
          `Window minimized or taskbar visible (ratio: ${(ratio * 100).toFixed(0)}%)`
        )
        showViolationAlert(
          'WINDOW_MINIMIZED',
          'Exam window was minimized or resized. Exam paused.',
          'HIGH'
        )
        const engine = proctoringEngineRef.current
        if (engine)
          engine.pauseExam('Window was resized or minimized. Return to fullscreen to resume.')
      } else {
        setWindowMinimized(false)
      }
    }
    windowSizeCheckRef.current = window.setInterval(checkWindowSize, 2000)

    // â”€â”€ Blur Detection (clicking outside browser) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleBlur = () => {
      if (!examStartedRef.current || submittingRef.current || examPausedByEngineRef.current) return
      createProctoringFlag(
        'window_blur',
        'high',
        'Browser window lost focus - possible alt-tab or external app'
      )
      showViolationAlert('TAB_SWITCH', 'Application switch detected! Exam paused.', 'HIGH')
      const engine = proctoringEngineRef.current
      if (engine) engine.pauseExam('Application switch detected. Return to the exam to resume.')
    }
    window.addEventListener('blur', handleBlur)

    // â”€â”€ PiP Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handlePiP = () => {
      createProctoringFlag('pip_detected', 'high', 'Picture-in-Picture mode detected during exam')
      showViolationAlert(
        'SCREEN_SHARE',
        'Picture-in-Picture mode is not allowed during exam!',
        'HIGH'
      )
    }
    document.addEventListener('enterpictureinpicture', handlePiP as any)

    // â”€â”€ Copy-Paste-Cut Blocking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleCopy = (e: ClipboardEvent) => {
      if (!examStartedRef.current || submittingRef.current) return
      e.preventDefault()
      createProctoringFlag('copy_attempt', 'medium', 'Copy operation blocked during exam')
    }
    const handlePaste = (e: ClipboardEvent) => {
      if (!examStartedRef.current || submittingRef.current) return
      e.preventDefault()
      createProctoringFlag('paste_attempt', 'medium', 'Paste operation blocked during exam')
    }
    const handleCut = (e: ClipboardEvent) => {
      if (!examStartedRef.current || submittingRef.current) return
      e.preventDefault()
      createProctoringFlag('cut_attempt', 'medium', 'Cut operation blocked during exam')
    }
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCut)

    // â”€â”€ Right-Click / Context Menu Blocking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleContextMenu = (e: MouseEvent) => {
      if (!examStartedRef.current || submittingRef.current) return
      e.preventDefault()
      createProctoringFlag('right_click', 'low', 'Right-click blocked during exam')
    }
    document.addEventListener('contextmenu', handleContextMenu)

    // â”€â”€ Text Selection Prevention â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleSelectStart = (e: Event) => {
      if (!examStartedRef.current || submittingRef.current) return
      e.preventDefault()
    }
    document.addEventListener('selectstart', handleSelectStart)

    return () => {
      if (screenShareCheckRef.current) clearInterval(screenShareCheckRef.current)
      if (windowSizeCheckRef.current) clearInterval(windowSizeCheckRef.current)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('enterpictureinpicture', handlePiP as any)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
    }
  }

  const setupProctoringListeners = () => {
    const handleVisibilityChange = () => {
      if (
        document.hidden &&
        examStartedRef.current &&
        !submittingRef.current &&
        !examPausedByEngineRef.current
      ) {
        setTabSwitches(prev => prev + 1)
        setTrustScore(prev => Math.max(0, prev - 10))
        setShowViolationFlash(true)
        setTimeout(() => setShowViolationFlash(false), 500)
        createProctoringFlag('tab_switch', 'high', 'Student switched tabs or minimized window')
        showViolationAlert(
          'TAB_SWITCH',
          'Tab switch detected! Exam paused. Return to the exam window to resume.',
          'HIGH'
        )
        toast.warning('âš ï¸ Tab switch detected â€” exam paused', { duration: 5000 })
        // PAUSE the exam immediately
        const engine = proctoringEngineRef.current
        if (engine) {
          engine.pauseExam('Tab/Window switch detected. Focus on the exam window to resume.')
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!examStartedRef.current || submittingRef.current || examPausedByEngineRef.current) return
      if ((e.ctrlKey && e.key === 'p') || e.key === 'PrintScreen') {
        e.preventDefault()
        createProctoringFlag('screenshot_attempt', 'medium', 'Screenshot attempt detected')
      }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        createProctoringFlag('alt_tab', 'high', 'Alt+Tab shortcut attempt detected')
        const engine = proctoringEngineRef.current
        if (engine) engine.pauseExam('Alt+Tab detected. Stay focused on the exam to resume.')
      }
      if (e.key === 'Meta' || e.key === 'OS') {
        e.preventDefault()
        createProctoringFlag('win_key', 'medium', 'Windows key pressed during exam')
        const engine = proctoringEngineRef.current
        if (engine) engine.pauseExam('Windows key pressed. Stay focused on the exam to resume.')
      }
      if (e.key === 'Escape' && document.fullscreenElement) {
        e.preventDefault()
        createProctoringFlag('escape_key', 'low', 'Escape key pressed during exam')
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
        e.preventDefault()
        createProctoringFlag(
          'devtools_attempt',
          'high',
          'Developer tools shortcut attempt detected'
        )
      }
      if (e.ctrlKey && ['c', 'v', 'x', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        createProctoringFlag(
          `ctrl_${e.key.toLowerCase()}_blocked`,
          'low',
          `Ctrl+${e.key.toUpperCase()} blocked during exam`
        )
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }

  const lastFlagApiCall = useRef<Record<string, number>>({})

  const createProctoringFlag = async (type: string, severity: string, evidence: string) => {
    const flag = {
      exam_id: examId!,
      student_id: user?._id || user?.email || 'current_user_id',
      flag_type: type,
      severity,
      timestamp: new Date().toISOString(),
      evidence,
    }
    setFlags(prev => [...prev, flag])

    const now = Date.now()
    const lastCall = lastFlagApiCall.current[type] || 0
    if (now - lastCall < 2000) return
    lastFlagApiCall.current[type] = now

    try {
      await proctoringAPI.createFlag(flag)
      await sessionAPI.updateSession(examId!, {
        flags_count: flags.length + 1,
        trust_score: trustScore,
      })
    } catch {
      /* non-critical */
    }
  }

  // â”€â”€â”€ Answer Handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: value }

      // Show save indicator
      setShowSaveIndicator(true)
      setTimeout(() => setShowSaveIndicator(false), 1800)
      setLastSaved(new Date())

      sessionAPI
        .updateSession(examId!, {
          current_question: currentQuestionIndex,
          answered_questions: Object.keys(newAnswers).length,
        })
        .catch(() => {})

      return newAnswers
    })
  }

  const toggleQuestionFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
        toast.info('Question unflagged', { duration: 1200 })
      } else {
        next.add(questionId)
        toast.info('Question flagged for review', { duration: 1200 })
      }
      return next
    })
  }

  // â”€â”€â”€ Submit Exam â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmitClick = () => {
    setShowSubmitModal(true)
  }

  const doSubmitExam = async () => {
    if (submittingRef.current) return
    setSubmitting(true)
    setShowSubmitModal(false)

    // Exit fullscreen
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {
      /* ignore */
    }

    stopCamera()

    // Use refs for fresh state at submission time (avoid stale closures)
    const freshTimeTaken = exam ? exam.duration * 60 - timeRemainingRef.current : 0
    const freshAnswers = { ...answersRef.current }

    const submission = {
      exam_id: examId!,
      answers: freshAnswers,
      time_taken: freshTimeTaken,
      proctoring_data: {
        violations: flagsRef.current.length,
        trust_score: trustScoreRef.current,
        tab_switches: tabSwitchesRef.current,
        flags: flagsRef.current,
      },
    }

    // Save locally as backup before submitting
    try {
      localStorage.setItem(
        `exam_backup_${examId}`,
        JSON.stringify({ ...submission, savedAt: new Date().toISOString() })
      )
    } catch {
      /* ignore storage errors */
    }

    // Retry submit up to 3 times
    let lastError: any = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await examAPI.submitExam(examId!, submission)
        try {
          localStorage.removeItem(`exam_backup_${examId}`)
        } catch {
          /* ignore */
        }
        toast.success('Exam submitted successfully!')
        setTimeout(() => {
          if (result?._id) navigate(`/student/results/${result._id}`, { state: { result } })
          else navigate('/student/results', { state: { result } })
        }, 500)
        return
      } catch (err) {
        lastError = err
        console.error(`Submit attempt ${attempt} failed:`, err)
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500 * attempt))
        }
      }
    }

    // All attempts failed
    console.error('All submit attempts failed:', lastError)
    toast.error(
      'Exam submission failed. Your answers are saved locally. Please contact your teacher and try again.',
      { duration: 10000 }
    )
    setSubmitting(false)
    startCamera()
  }

  // Send immediate proctoring status update (used when pause state changes)
  const sendProctoringStatusUpdate = useCallback(() => {
    const wsClient = wsClientRef.current
    if (!wsClient || !wsClient.isConnected()) return
    const userId = user?.email || user?._id || 'unknown'
    wsClient.send({
      type: 'proctoring_status',
      exam_id: examId,
      student_id: userId,
      trust_score: trustScore,
      status: {
        faceDetected: proctoringStatus?.faceDetected ?? true,
        faceCount: proctoringStatus?.faceCount ?? 1,
        lookingAtScreen: proctoringStatus?.lookingAtScreen ?? true,
        audioLevel: proctoringStatus?.audioLevel ?? 0,
        attentionLevel: proctoringStatus?.attentionLevel ?? 100,
        environmentScore: proctoringStatus?.environmentScore ?? 100,
        integrityScore: proctoringStatus?.integrityScore ?? trustScore,
        tabSwitchCount: proctoringStatus?.tabSwitchCount ?? tabSwitches,
        violationCount: flags.length,
        isPaused: examPausedByEngine || examPausedByTeacher,
      },
      timestamp: new Date().toISOString(),
    })
  }, [
    examId,
    trustScore,
    proctoringStatus,
    tabSwitches,
    flags.length,
    examPausedByEngine,
    examPausedByTeacher,
    user,
  ])

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getQuestionState = (questionId: string, idx: number) => {
    const isCurrentQuestion = idx === currentQuestionIndex
    const isAnswered = !!answers[questionId]
    const isFlagged = flaggedQuestions.has(questionId)
    if (isCurrentQuestion) return 'current'
    if (isFlagged) return 'flagged'
    if (isAnswered) return 'answered'
    return 'unanswered'
  }

  const getBadgeClasses = (state: string) => {
    switch (state) {
      case 'current':
        return 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
      case 'answered':
        return 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200'
      case 'flagged':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
      default:
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
    }
  }

  // â”€â”€â”€ Render Question â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderQuestion = (question: any, index: number) => {
    if (!question) return <p className="text-gray-500">Question not found</p>
    // Normalize question type â€” handle all common backend field names
    const rawType = (question.question_type || question.type || '').toString().toLowerCase().trim()
    const questionId = question._id || question.id || index.toString()

    // Map any known type alias to our canonical types
    const typeAliasMap: Record<string, string> = {
      mcq: 'mcq',
      multiple_choice: 'mcq',
      single_choice: 'mcq',
      single: 'mcq',
      multiple_select: 'multiple_select',
      multi_select: 'multiple_select',
      checkbox: 'multiple_select',
      essay: 'essay',
      long_answer: 'essay',
      long: 'essay',
      descriptive: 'essay',
      subjective: 'essay',
      paragraph: 'essay',
      detailed: 'essay',
      short_answer: 'short_answer',
      short: 'short_answer',
      brief: 'short_answer',
      fill_blank: 'short_answer',
      fill_in_blank: 'short_answer',
      fill_in_the_blank: 'short_answer',
      true_false: 'true_false',
      'true/false': 'true_false',
      boolean: 'true_false',
      tf: 'true_false',
      code: 'code',
      coding: 'code',
      programming: 'code',
      numerical: 'short_answer',
      numeric: 'short_answer',
      number: 'short_answer',
      matching: 'short_answer',
    }
    const questionType = typeAliasMap[rawType] || rawType

    const optionBase =
      'flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 min-h-[52px] touch-manipulation group'
    const optionSelected = 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
    const optionDefault = 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'

    switch (questionType) {
      case 'mcq':
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option: string, i: number) => {
              const selected = answers[questionId] === option
              return (
                <motion.label
                  key={i}
                  whileTap={{ scale: 0.99 }}
                  className={`${optionBase} ${selected ? optionSelected : optionDefault}`}
                >
                  <input
                    type="radio"
                    name={`question_${index}`}
                    value={option}
                    checked={selected}
                    onChange={e => handleAnswerChange(questionId, e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center shrink-0 transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}
                  >
                    {selected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                  <span
                    className={`text-sm sm:text-base ${selected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}
                  >
                    <strong className="mr-2 text-gray-400">{String.fromCharCode(65 + i)}.</strong>
                    {option}
                  </span>
                  {selected && <Check className="w-4 h-4 text-blue-500 ml-auto shrink-0" />}
                </motion.label>
              )
            })}
          </div>
        )

      case 'multiple_select':
        return (
          <div className="space-y-3">
            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 font-medium">
              Select all that apply
            </p>
            {question.options?.map((option: string, i: number) => {
              const checked = answers[questionId]?.includes(option)
              return (
                <motion.label
                  key={i}
                  whileTap={{ scale: 0.99 }}
                  className={`${optionBase} ${checked ? optionSelected : optionDefault}`}
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={checked}
                    onChange={e => {
                      const current = answers[questionId] || []
                      const newValue = e.target.checked
                        ? [...current, option]
                        : current.filter((v: string) => v !== option)
                      handleAnswerChange(questionId, newValue)
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center shrink-0 transition-all ${
                      checked
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <span
                    className={`text-sm sm:text-base ${checked ? 'text-blue-900 font-medium' : 'text-gray-700'}`}
                  >
                    {option}
                  </span>
                </motion.label>
              )
            })}
          </div>
        )

      case 'essay':
      case 'long_answer':
        return (
          <div>
            <textarea
              value={answers[questionId] || ''}
              onChange={e => handleAnswerChange(questionId, e.target.value)}
              className="w-full min-h-[180px] p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-y transition-all font-[inherit]"
              placeholder="Type your detailed answer here..."
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span>{(answers[questionId] || '').split(' ').filter(Boolean).length} words</span>
              <span>{(answers[questionId] || '').length} characters</span>
            </div>
          </div>
        )

      case 'short_answer':
        return (
          <input
            type="text"
            value={answers[questionId] || ''}
            onChange={e => handleAnswerChange(questionId, e.target.value)}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base transition-all"
            placeholder="Type your answer here..."
          />
        )

      case 'true_false':
        return (
          <div className="flex gap-4">
            {['True', 'False'].map(option => {
              const selected = answers[questionId] === option
              return (
                <motion.label
                  key={option}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selected
                      ? option === 'True'
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question_${index}`}
                    value={option}
                    checked={selected}
                    onChange={e => handleAnswerChange(questionId, e.target.value)}
                    className="sr-only"
                  />
                  <span className={`text-2xl`}>{option === 'True' ? 'âœ“' : 'âœ—'}</span>
                  <span
                    className={`font-semibold text-base ${
                      selected
                        ? option === 'True'
                          ? 'text-green-700'
                          : 'text-red-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {option}
                  </span>
                </motion.label>
              )
            })}
          </div>
        )

      case 'code':
        return (
          <div>
            <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-gray-400 font-mono">Answer</span>
              </div>
              <textarea
                value={answers[questionId] || ''}
                onChange={e => handleAnswerChange(questionId, e.target.value)}
                className="w-full min-h-[200px] p-4 bg-gray-900 text-green-400 font-mono text-sm resize-y border-none outline-none"
                placeholder="// Write your code here..."
                spellCheck={false}
                onKeyDown={e => {
                  // Tab inserts 2 spaces
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    const start = e.currentTarget.selectionStart
                    const end = e.currentTarget.selectionEnd
                    const value = e.currentTarget.value
                    const newValue = value.substring(0, start) + '  ' + value.substring(end)
                    handleAnswerChange(questionId, newValue)
                    setTimeout(() => {
                      e.currentTarget.selectionStart = start + 2
                      e.currentTarget.selectionEnd = start + 2
                    }, 0)
                  }
                }}
              />
            </div>
          </div>
        )

      default:
        // Smart fallback: if the question has options â†’ render as MCQ
        // Otherwise â†’ render as a textarea (descriptive / any unknown type)
        if (question.options && Array.isArray(question.options) && question.options.length > 0) {
          return (
            <div className="space-y-3">
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 font-medium">
                Select the correct option
              </p>
              {question.options.map((option: string, i: number) => {
                const selected = answers[questionId] === option
                return (
                  <motion.label
                    key={i}
                    whileTap={{ scale: 0.99 }}
                    className={`${optionBase} ${selected ? optionSelected : optionDefault}`}
                  >
                    <input
                      type="radio"
                      name={`question_${index}`}
                      value={option}
                      checked={selected}
                      onChange={e => handleAnswerChange(questionId, e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center shrink-0 transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 group-hover:border-blue-400'
                      }`}
                    >
                      {selected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <span
                      className={`text-sm sm:text-base ${selected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}
                    >
                      <strong className="mr-2 text-gray-400">{String.fromCharCode(65 + i)}.</strong>
                      {option}
                    </span>
                    {selected && <Check className="w-4 h-4 text-blue-500 ml-auto shrink-0" />}
                  </motion.label>
                )
              })}
            </div>
          )
        }
        // No options â†’ descriptive textarea
        return (
          <div>
            {rawType && rawType !== 'essay' && rawType !== 'descriptive' && (
              <p className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 font-medium mb-3">
                {rawType.charAt(0).toUpperCase() + rawType.slice(1).replace(/_/g, ' ')} â€” Write
                your answer below
              </p>
            )}
            <textarea
              value={answers[questionId] || ''}
              onChange={e => handleAnswerChange(questionId, e.target.value)}
              className="w-full min-h-[160px] p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-y transition-all font-[inherit]"
              placeholder="Type your answer here..."
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span>{(answers[questionId] || '').split(' ').filter(Boolean).length} words</span>
              <span>{(answers[questionId] || '').length} characters</span>
            </div>
          </div>
        )
    }
  }

  // â”€â”€â”€ Loading Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-6" />
          <div className="flex items-center gap-2 text-blue-200 font-medium">
            <BookOpen className="w-5 h-5" />
            <p>Loading Exam...</p>
          </div>
          <p className="text-blue-400/60 text-sm mt-2">Please wait while we prepare your exam</p>
        </motion.div>
      </div>
    )
  }

  const currentQuestion = exam?.questions[currentQuestionIndex]
  const currentQuestionId =
    currentQuestion?._id || currentQuestion?.id || currentQuestionIndex.toString()
  const isTimeCritical = timeRemaining < 300 // < 5 minutes
  const isTimeDanger = timeRemaining < 60 // < 1 minute

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 exam-container no-select">
      {/* Advanced Violation Overlay */}
      <ViolationOverlay
        type={violationOverlayType}
        message={violationOverlayMsg}
        severity={violationOverlaySeverity}
        onDismiss={dismissViolationAlert}
        onForceFullscreen={() => {
          requestFullscreen()
          dismissViolationAlert()
        }}
        autoCountdown={violationOverlaySeverity === 'CRITICAL' ? 0 : 8}
      />

      {/* Violation Flash Overlay */}
      <AnimatePresence>
        {showViolationFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="violation-flash"
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Exit HARD BLOCK Overlay */}
      <AnimatePresence>
        {fullscreenExited && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-gray-950/98 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              className="max-w-md w-full mx-4 text-center"
            >
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/40">
                <Maximize className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3">Fullscreen Required</h2>
              <p className="text-red-400 font-bold text-lg mb-2">VIOLATION RECORDED</p>
              <p className="text-gray-400 text-sm mb-6">
                You exited fullscreen mode during the exam. This has been logged as a security
                violation. Return to fullscreen immediately to continue.
              </p>
              {fullscreenCountdown !== null && (
                <div className="mb-6">
                  <div
                    className={`text-5xl font-black mb-2 ${
                      fullscreenCountdown <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
                    }`}
                  >
                    {fullscreenCountdown}
                  </div>
                  <p className="text-gray-500 text-xs">seconds before auto-submission</p>
                  <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full"
                      animate={{ width: `${(fullscreenCountdown / 30) * 100}%` }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  try {
                    await requestFullscreen()
                    setFullscreenExited(false)
                    if (!examStarted) startExamFlow()
                  } catch {
                    toast.error('Fullscreen was denied. Click the button to try again.', {
                      duration: 3000,
                    })
                  }
                }}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-500/40 hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                <Maximize className="w-5 h-5 inline mr-2" />
                {examStarted ? 'Return to Fullscreen' : 'Enter Fullscreen & Start Exam'}
              </motion.button>
              {!examStarted && (
                <p className="text-gray-500 text-xs mt-2">
                  Fullscreen is required before the exam can begin
                </p>
              )}
              <p className="text-gray-600 text-xs mt-4">Violations: {tabSwitches} total</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Engine/Tab/Fullscreen Pause Overlay â€” teacher-only resume for live exams */}
      <AnimatePresence>
        {(examPausedByEngine || examPausedByTeacher) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-gray-950/98 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              className="max-w-md w-full mx-4 text-center"
            >
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/40">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3">â¸ï¸ Exam Paused</h2>
              <p className="text-red-400 font-bold text-lg mb-2">
                {examPausedByTeacher ? 'Paused by Teacher' : 'âš ï¸ Violation Detected'}
              </p>
              <div className="bg-gray-900 rounded-xl p-4 mb-6 text-left">
                <p className="text-gray-300 text-sm">
                  {proctoringStatus?.pauseReason ||
                    'Exam has been paused due to suspicious activity.'}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 mb-6 space-y-2 text-left">
                <p className="text-gray-400 text-sm font-semibold">To resume:</p>
                <p className="text-gray-400 text-sm">â³ Wait for your teacher to resume the exam</p>
                <p className="text-gray-400 text-sm">âœ… Ensure adequate lighting</p>
                <p className="text-gray-400 text-sm">âœ… Face the camera directly</p>
                <p className="text-gray-400 text-sm">âœ… Stay in fullscreen mode</p>
              </div>
              <div className="w-full py-4 bg-gray-800/50 text-gray-400 rounded-2xl font-bold text-lg border border-gray-700/50 cursor-not-allowed">
                <Clock className="w-5 h-5 inline mr-2" />
                Waiting for Teacher
              </div>

              {/* Chat button inside pause overlay */}
              <div className="mt-4 flex justify-center">
                <ExamChat
                  wsClientRef={wsClientRef}
                  userId={user?._id || user?.email || 'student'}
                  userName={user?.full_name || user?.email || 'Student'}
                  role="student"
                  examId={examId || ''}
                />
              </div>

              <p className="text-gray-600 text-xs mt-4">
                Only your teacher can resume the exam. Please be patient.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dark Room Block Overlay */}
      <AnimatePresence>
        {darkRoomBlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-gray-950/98 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              className="max-w-md w-full mx-4 text-center"
            >
              <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-500/40">
                <span className="text-5xl">ðŸŒ‘</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-3">Room Too Dark</h2>
              <p className="text-yellow-400 font-bold text-lg mb-2">Exam Cannot Start</p>
              <p className="text-gray-400 text-sm mb-4">
                Your room lighting is insufficient for face detection. The system cannot verify your
                identity in these conditions.
              </p>
              <div className="bg-gray-900 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Current brightness</span>
                  <span className="text-red-400 font-bold">{darkRoomBrightness}/255</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full"
                    style={{ width: `${Math.min(100, (darkRoomBrightness / 255) * 100)}%` }}
                  />
                </div>
                <p className="text-yellow-400 text-xs font-semibold">Required: 30/255 minimum</p>
              </div>
              <div className="text-left bg-gray-900 rounded-xl p-4 mb-6 space-y-2">
                <p className="text-gray-300 text-sm font-semibold mb-2">To fix this:</p>
                <p className="text-gray-400 text-sm">âœ… Turn on your room lights</p>
                <p className="text-gray-400 text-sm">âœ… Face a window or bright light source</p>
                <p className="text-gray-400 text-sm">âœ… Avoid sitting with backlight behind you</p>
                <p className="text-gray-400 text-sm">
                  âœ… Remove any camera covers or obstructions
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  // Re-check brightness
                  if (videoRef.current && videoRef.current.readyState >= 2) {
                    const canvas = document.createElement('canvas')
                    canvas.width = 64
                    canvas.height = 48
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                      ctx.drawImage(videoRef.current, 0, 0, 64, 48)
                      const imgData = ctx.getImageData(0, 0, 64, 48).data
                      let total = 0
                      for (let i = 0; i < imgData.length; i += 4) {
                        total +=
                          0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]
                      }
                      const brightness = total / (imgData.length / 4)
                      setDarkRoomBrightness(Math.round(brightness))
                      if (brightness >= 30) {
                        setDarkRoomBlocked(false)
                        setExamStarted(true)
                        requestFullscreen()
                        toast.success('âœ… Lighting verified â€” exam starting!', {
                          duration: 3000,
                        })
                      } else {
                        toast.error(
                          `Still too dark (${Math.round(brightness)}/255). Turn on more lights.`,
                          { duration: 3000 }
                        )
                      }
                    }
                  }
                }}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-yellow-500/30 hover:from-yellow-400 hover:to-orange-400 transition-all"
              >
                ðŸ”† I've Turned on the Lights â€” Re-check
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€â”€ Top Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className={`bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-30 shadow-sm`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile Menu Button */}
            {(isMobile || isTablet) && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Exam Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                {exam?.title}
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                {exam?.course} â€¢ {answeredCount}/{exam?.questions.length} answered
              </p>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Auto-save indicator */}
              <AnimatePresence>
                {showSaveIndicator && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="hidden sm:flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full"
                  >
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Saved
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timer */}
              <motion.div
                animate={isTimeDanger ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm sm:text-base transition-all ${
                  isTimeDanger
                    ? 'bg-red-50 text-red-600 border-2 border-red-300'
                    : isTimeCritical
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-mono tabular-nums">{formatTime(timeRemaining)}</span>
              </motion.div>

              {/* Proctoring Status (Desktop) */}
              {!isMobile && (
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    proctoringActive
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {proctoringActive ? 'Active' : 'Inactive'}
                </div>
              )}

              {/* Trust Score Badge */}
              <div
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${
                  trustScore >= 80
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : trustScore >= 60
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {trustScore}%
              </div>

              {/* Tab Switches Warning */}
              {tabSwitches > 0 && (
                <div className="flex items-center gap-1 text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-xl text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tabSwitches}w</span>
                </div>
              )}

              {/* Chat with Teacher */}
              <ExamChat
                wsClientRef={wsClientRef}
                userId={user?._id || user?.email || 'student'}
                userName={user?.full_name || user?.email || 'Student'}
                role="student"
                examId={examId || ''}
              />
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ Main Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* â”€â”€â”€ Left Navigation Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div
            className={`lg:col-span-2 ${(isMobile || isTablet) && !showMobileMenu ? 'hidden' : 'block lg:block'} ${isMobile || isTablet ? 'fixed inset-0 bg-black/50 z-40' : ''}`}
            onClick={() => setShowMobileMenu(false)}
          >
            <div
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-20 space-y-4 ${
                isMobile || isTablet
                  ? 'absolute left-0 top-0 h-full w-72 max-w-[90vw] overflow-y-auto rounded-none shadow-2xl'
                  : ''
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Navigator
                </h3>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold border border-blue-100">
                  {answeredCount}/{exam?.questions.length}
                </span>
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-3 gap-1.5">
                {exam?.questions.map((q: any, idx: number) => {
                  const qId = q._id || q.id || idx.toString()
                  const state = getQuestionState(qId, idx)
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQuestionIndex(idx)
                        setShowMobileMenu(false)
                      }}
                      className={`w-full aspect-square rounded-lg font-bold text-xs transition-all touch-manipulation relative ${getBadgeClasses(state)}`}
                      title={`Question ${idx + 1}${flaggedQuestions.has(qId) ? ' (Flagged)' : ''}`}
                    >
                      {idx + 1}
                      {flaggedQuestions.has(qId) && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full border border-white" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                {[
                  { color: 'bg-blue-600', label: 'Current' },
                  {
                    color: 'bg-green-100 border border-green-300',
                    label: `Answered (${answeredCount})`,
                  },
                  {
                    color: 'bg-amber-100 border border-amber-300',
                    label: `Flagged (${flaggedCount})`,
                  },
                  {
                    color: 'bg-gray-100 border border-gray-300',
                    label: `Remaining (${(exam?.questions.length || 0) - answeredCount - flaggedCount})`,
                  },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded shrink-0 ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <button
                  onClick={handleSubmitClick}
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60 shadow-lg shadow-green-500/20"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Exam'
                  )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">
                  {(exam?.questions.length || 0) - answeredCount} questions unanswered
                </p>
              </div>
            </div>
          </div>

          {/* â”€â”€â”€ Question Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="lg:col-span-7 space-y-4">
            {/* Progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 premium-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-green-400" />
                    Answered ({answeredCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                    Flagged ({flaggedCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
                    Remaining ({exam?.questions.length - answeredCount})
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-900">
                  {currentQuestionIndex + 1}/{exam?.questions.length}
                </span>
              </div>

              {/* Segmented progress */}
              <div className="flex gap-0.5 h-2">
                {exam?.questions.map((_: any, idx: number) => {
                  const qId = exam.questions[idx]?._id || exam.questions[idx]?.id || idx.toString()
                  const state = getQuestionState(qId, idx)
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        state === 'current'
                          ? 'bg-blue-500'
                          : state === 'answered'
                            ? 'bg-green-400'
                            : state === 'flagged'
                              ? 'bg-amber-400'
                              : 'bg-gray-200'
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Question Card */}
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 premium-card"
              {...swipeHandlers}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between mb-5 gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
                      Question {currentQuestionIndex + 1}
                    </span>
                    {currentQuestion?.points && (
                      <span className="bg-gray-50 text-gray-600 text-xs px-2.5 py-1 rounded-lg border border-gray-200">
                        <Zap className="w-3 h-3 inline mr-0.5" />
                        {currentQuestion.points} pt{currentQuestion.points !== 1 ? 's' : ''}
                      </span>
                    )}
                    {currentQuestion?.difficulty && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                          currentQuestion.difficulty === 'easy'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : currentQuestion.difficulty === 'medium'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                        }`}
                      >
                        {currentQuestion.difficulty}
                      </span>
                    )}
                    {flaggedQuestions.has(currentQuestionId) && (
                      <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 text-sm sm:text-base leading-relaxed font-medium">
                    {currentQuestion?.question_text ||
                      currentQuestion?.question ||
                      'Question text not available'}
                  </p>
                </div>

                {/* Flag button */}
                <button
                  onClick={() => toggleQuestionFlag(currentQuestionId)}
                  title={
                    flaggedQuestions.has(currentQuestionId) ? 'Unflag question' : 'Flag for review'
                  }
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    flaggedQuestions.has(currentQuestionId)
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 border border-amber-300'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-amber-500 border border-gray-200'
                  }`}
                >
                  <Flag
                    className="w-4 h-4"
                    fill={flaggedQuestions.has(currentQuestionId) ? 'currentColor' : 'none'}
                  />
                </button>
              </div>

              {/* Answer Options */}
              {renderQuestion(currentQuestion, currentQuestionIndex)}

              {/* Mobile swipe hint */}
              {(isMobile || isTablet) && (
                <p className="mt-5 text-center text-xs text-gray-300">
                  â† Swipe to navigate questions â†’
                </p>
              )}
            </motion.div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 min-h-[48px] bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-sm text-gray-700 touch-manipulation flex-1 sm:flex-initial"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Previous
              </button>

              {currentQuestionIndex === exam?.questions.length - 1 ? (
                <button
                  onClick={handleSubmitClick}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-5 sm:px-8 py-3 min-h-[48px] bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 transition-all font-semibold text-sm shadow-lg shadow-green-500/25 touch-manipulation flex-1 sm:flex-initial"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit Exam</>
                  )}
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-sm shadow-lg shadow-blue-500/20 touch-manipulation flex-1 sm:flex-initial"
                >
                  Next
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>

          {/* â”€â”€â”€ Proctoring Right Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="hidden lg:block lg:col-span-3 overflow-y-auto max-h-[calc(100vh-5rem)]">
            <ProctoringRightPanel
              videoRef={videoRef}
              proctoringActive={proctoringActive}
              cameraReady={cameraReady}
              trustScore={trustScore}
              proctoringStatus={
                proctoringStatus
                  ? {
                      faceDetected: proctoringStatus.faceDetected,
                      lookingAtScreen: proctoringStatus.lookingAtScreen,
                      faceCount: proctoringStatus.faceCount,
                      audioLevel: proctoringStatus.audioLevel,
                      isActive: proctoringStatus.isActive,
                      integrityScore: proctoringStatus.integrityScore,
                    }
                  : null
              }
              audioWaveData={audioWaveData}
              tabSwitches={tabSwitches}
              flags={flags}
              mode="live"
            />
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ExamSubmitModal
        isOpen={showSubmitModal}
        onConfirm={doSubmitExam}
        onCancel={() => setShowSubmitModal(false)}
        examTitle={exam?.title || ''}
        totalQuestions={exam?.questions.length || 0}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
        timeTaken={timeTaken}
        violationCount={violationCount}
        trustScore={trustScore}
        submitting={submitting}
      />

      <ExamTimerWarning
        isOpen={showTimerWarning}
        minutesLeft={timerWarningMinutes}
        onDismiss={() => setShowTimerWarning(false)}
      />
    </div>
  )
}
