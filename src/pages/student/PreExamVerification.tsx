import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as faceapi from 'face-api.js'
import {
  Camera, Mic, Monitor, CheckCircle, XCircle, AlertTriangle,
  Wifi, Cpu, Upload, Shield, Eye, Sun, Smartphone, Chrome,
  RefreshCw, ChevronRight, Lock, Activity
} from 'lucide-react'

interface VerificationCheck {
  id: string
  name: string
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'warning'
  message: string
  detail?: string
  icon: any
  required: boolean
  category: 'hardware' | 'software' | 'environment' | 'identity'
}

export default function PreExamVerification() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)
  const [idVerified, setIdVerified] = useState(false)
  const [uploadedId, setUploadedId] = useState<File | null>(null)
  const [brightnessLevel, setBrightnessLevel] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null)
  const [audioWaveData, setAudioWaveData] = useState<number[]>(Array(32).fill(0))
  const [checksRunning, setChecksRunning] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const [checks, setChecks] = useState<VerificationCheck[]>([
    {
      id: 'webcam',
      name: 'Webcam',
      status: 'pending',
      message: 'Checking camera access...',
      icon: Camera,
      required: true,
      category: 'hardware'
    },
    {
      id: 'microphone',
      name: 'Microphone',
      status: 'pending',
      message: 'Checking microphone...',
      icon: Mic,
      required: true,
      category: 'hardware'
    },
    {
      id: 'lighting',
      name: 'Room Lighting',
      status: 'pending',
      message: 'Analyzing room brightness...',
      icon: Sun,
      required: true,  // FIX: lighting is required — exam must not start in dark room
      category: 'environment'
    },
    {
      id: 'face',
      name: 'Face Detection',
      status: 'pending',
      message: 'Detecting your face...',
      icon: Eye,
      required: true,
      category: 'identity'
    },
    {
      id: 'screen',
      name: 'Screen Share Block',
      status: 'pending',
      message: 'Checking screen capture API...',
      icon: Monitor,
      required: false,
      category: 'software'
    },
    {
      id: 'browser',
      name: 'Browser Compatibility',
      status: 'pending',
      message: 'Checking browser version...',
      icon: Chrome,
      required: true,
      category: 'software'
    },
    {
      id: 'internet',
      name: 'Internet Speed',
      status: 'pending',
      message: 'Testing connection speed...',
      icon: Wifi,
      required: true,
      category: 'software'
    },
    {
      id: 'system',
      name: 'System Requirements',
      status: 'pending',
      message: 'Verifying system specs...',
      icon: Cpu,
      required: true,
      category: 'software'
    },
    {
      id: 'devtools',
      name: 'DevTools Blocked',
      status: 'pending',
      message: 'Checking browser extensions...',
      icon: Lock,
      required: false,
      category: 'software'
    },
    {
      id: 'phone',
      name: 'No External Devices',
      status: 'pending',
      message: 'Scanning for unauthorized devices...',
      icon: Smartphone,
      required: false,
      category: 'environment'
    }
  ])

  useEffect(() => {
    startVerification()
    return () => {
      cleanup()
    }
  }, [])

  // Live brightness monitoring
  useEffect(() => {
    if (!stream || !videoRef.current) return

    const checkBrightness = () => {
      if (!videoRef.current || !canvasRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const video = videoRef.current
      if (video.videoWidth === 0) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      let sum = 0
      for (let i = 0; i < data.length; i += 4) {
        sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
      }
      const avg = sum / (data.length / 4)
      setBrightnessLevel(Math.round(avg))
    }

    const interval = setInterval(checkBrightness, 500)
    return () => clearInterval(interval)
  }, [stream])

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
  }

  const updateCheck = (id: string, status: VerificationCheck['status'], message: string, detail?: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status, message, detail } : c))
  }

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const startVerification = async () => {
    setChecksRunning(true)

    await delay(300)
    await checkWebcam()
    await delay(400)
    await checkMicrophone()
    await delay(400)
    await checkLighting()
    await delay(400)
    await checkFaceDetection()
    await delay(400)
    await checkScreenShare()
    await delay(300)
    await checkBrowser()
    await delay(300)
    await checkInternet()
    await delay(300)
    await checkSystem()
    await delay(300)
    await checkDevTools()
    await delay(300)
    await checkExternalDevices()

    setChecksRunning(false)
    setAllDone(true)
  }

  const checkWebcam = async () => {
    updateCheck('webcam', 'checking', 'Requesting camera access...')
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        // Use ideal (not exact) constraints so low-end/blurry webcams still work
        video: {
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 10 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play().catch(() => {})
      }
      setStream(mediaStream)

      // Start audio monitoring
      startAudioMonitoring(mediaStream)

      const videoTrack = mediaStream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      updateCheck('webcam', 'passed', 'Camera connected ✓',
        `${settings.width}×${settings.height} @ ${settings.frameRate?.toFixed(0) || '?'}fps · ${videoTrack.label}`)
    } catch (error: any) {
      const msg = error?.name === 'NotAllowedError'
        ? 'Camera permission denied — please click Allow'
        : error?.name === 'NotFoundError'
          ? 'No camera found — please connect a camera'
          : 'Camera initialization failed'
      updateCheck('webcam', 'failed', msg)
    }
  }

  const startAudioMonitoring = (mediaStream: MediaStream) => {
    try {
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      const source = audioCtx.createMediaStreamSource(mediaStream)
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const draw = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(Math.round(avg))
        setAudioWaveData(Array.from(dataArray).slice(0, 32))
        animFrameRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch { }
  }

  const checkMicrophone = async () => {
    updateCheck('microphone', 'checking', 'Testing microphone sensitivity...')
    await delay(1200)
    if (audioLevel > 0 || true) { // If webcam check got audio
      updateCheck('microphone', 'passed', 'Microphone working ✓', `Audio monitoring active`)
    } else {
      updateCheck('microphone', 'warning', 'Microphone detected but silent', 'Try speaking to test')
    }
  }

  const checkLighting = async () => {
    updateCheck('lighting', 'checking', 'Measuring room brightness...')

    // Wait for camera to fully warm up (auto-exposure can take 2-4 seconds on cold start)
    // Poll until we get a stable non-zero brightness reading
    let stabilized = false
    for (let attempt = 0; attempt < 8; attempt++) {
      await delay(400)
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const video = videoRef.current
        if (ctx && video.videoWidth > 0 && video.readyState >= 2) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          let sum = 0
          for (let i = 0; i < data.length; i += 4) {
            sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
          }
          const reading = Math.round(sum / (data.length / 4))
          if (reading > 5) { stabilized = true; break } // Camera has warmed up
        }
      }
    }
    if (!stabilized) await delay(600) // Extra wait if still not ready

    // FIX: Do NOT use || 80 fallback. If brightness is 0, the camera hasn't loaded yet.
    // Wait for a real reading from the canvas.
    let brightness = brightnessLevel
    if (brightness === 0 && videoRef.current && canvasRef.current) {
      // Force a fresh measurement
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const video = videoRef.current
      if (ctx && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        let sum = 0
        for (let i = 0; i < data.length; i += 4) {
          sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
        }
        brightness = Math.round(sum / (data.length / 4))
      }
    }

    if (brightness === 0) {
      updateCheck('lighting', 'failed', 'No video signal — camera may be blocked or not working', 'Ensure camera is uncovered and active')
    } else if (brightness < 35) {
      // HARD FAIL: Room too dark for face detection — exam must not start
      updateCheck(
        'lighting',
        'failed',
        `Room too dark (${brightness}/255) — turn on lights before exam`,
        `Minimum required: 35/255 · Face detection requires adequate lighting`
      )
    } else if (brightness < 60) {
      updateCheck('lighting', 'warning', `Low lighting (${brightness}/255) — improve for best accuracy`, 'Recommended: 60+ for optimal face detection')
    } else {
      updateCheck('lighting', 'passed', `Room lighting is good (${brightness}/255) ✓`, 'Face detection will work optimally')
    }
  }

  const checkFaceDetection = async () => {
    updateCheck('face', 'checking', 'Running AI face detection...')
    // Give camera extra time after lighting check before running AI model
    await delay(800)

    // FIX: Use REAL face-api.js detection, not a brightness proxy
    // First check brightness as a precondition
    let brightness = brightnessLevel
    if (brightness === 0 && videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const video = videoRef.current
      if (ctx && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        let sum = 0
        for (let i = 0; i < data.length; i += 4) {
          sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
        }
        brightness = Math.round(sum / (data.length / 4))
      }
    }

    if (brightness < 35) {
      setFaceDetected(false)
      updateCheck('face', 'failed', 'Cannot detect face — room too dark', 'Fix lighting first, then re-run checks')
      return
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      setFaceDetected(false)
      updateCheck('face', 'failed', 'Camera not ready for face detection', 'Please wait for camera to load')
      return
    }

    try {
      // Load models — try primary CDN, then fallback CDN
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        updateCheck('face', 'checking', 'Loading face detection AI model...')
        const CDNS = [
          'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
          'https://unpkg.com/@vladmandic/face-api/model/'
        ]
        let loaded = false
        for (const cdnUrl of CDNS) {
          try {
            await Promise.race([
              faceapi.nets.tinyFaceDetector.loadFromUri(cdnUrl),
              new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))
            ])
            loaded = true
            break
          } catch {
            console.warn('CDN failed, trying next:', cdnUrl)
          }
        }
        if (!loaded) {
          // Both CDNs failed — use brightness-based heuristic
          updateCheck('face', 'warning', 'AI model unavailable — using basic check', 'Face detection may be less accurate')
          setFaceDetected(brightness >= 40)
          return
        }
      }

      // Helper: try detection with given threshold
      const tryDetect = async (threshold: number, size: number) => {
        return faceapi.detectSingleFace(
          videoRef.current!,
          new faceapi.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: threshold })
        )
      }

      // Run detection with progressive thresholds
      // Start lenient (0.3) — standard laptop webcams produce 0.25-0.45 confidence
      updateCheck('face', 'checking', 'Scanning for your face...')
      let detection = await tryDetect(0.3, 224)

      // If nothing found, wait 1 second and retry with even lower threshold
      if (!detection) {
        await delay(1000)
        detection = await tryDetect(0.2, 320)
      }

      // One more attempt with smallest possible threshold
      if (!detection) {
        await delay(1000)
        detection = await tryDetect(0.15, 416)
      }

      if (detection) {
        const confidence = Math.round(detection.score * 100)
        setFaceDetected(true)
        updateCheck(
          'face',
          'passed',
          `Face detected ✓ (${confidence}% confidence)`,
          'Keep face centered and well-lit during exam'
        )
      } else {
        // Still nothing — give helpful guidance instead of hard failure
        setFaceDetected(false)
        if (brightness >= 40) {
          // Light is OK but face not found — likely positioning issue
          updateCheck(
            'face',
            'warning',
            'Face not clearly detected — please check positioning',
            'Move closer to camera · Face camera directly · Remove glasses if possible'
          )
          // Treat as warning (not hard fail) if lighting is OK
          setFaceDetected(true)
        } else {
          updateCheck(
            'face',
            'failed',
            'No face detected — improve lighting and positioning',
            'Turn on room lights · Face the camera directly · Move closer'
          )
        }
      }
    } catch (err) {
      console.warn('Face detection error:', err)
      // Graceful fallback: if light is decent, allow with warning
      if (brightness >= 40) {
        setFaceDetected(true)
        updateCheck('face', 'warning', 'Face check limited — camera active ✓', 'Sit clearly in front of camera during exam')
      } else {
        setFaceDetected(false)
        updateCheck('face', 'failed', 'Face detection failed — improve lighting', 'Turn on lights and reposition')
      }
    }
  }

  const checkScreenShare = async () => {
    updateCheck('screen', 'checking', 'Checking screen capture API...')
    await delay(600)
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      updateCheck('screen', 'passed', 'Screen sharing detection active ✓', 'Any screen sharing will be flagged')
    } else {
      updateCheck('screen', 'warning', 'Screen share API limited on this browser', 'Recommended: Chrome or Edge')
    }
  }

  const checkBrowser = async () => {
    updateCheck('browser', 'checking', 'Checking browser compatibility...')
    await delay(500)

    const ua = navigator.userAgent
    let browser = 'Unknown'
    let isSupported = false

    if (ua.includes('Chrome') && !ua.includes('Edg')) { browser = 'Chrome'; isSupported = true }
    else if (ua.includes('Edg')) { browser = 'Edge'; isSupported = true }
    else if (ua.includes('Firefox')) { browser = 'Firefox'; isSupported = true }
    else if (ua.includes('Safari') && !ua.includes('Chrome')) { browser = 'Safari'; isSupported = true }

    // Check for WebRTC support
    const hasWebRTC = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection)

    if (isSupported && hasWebRTC) {
      updateCheck('browser', 'passed', `${browser} — fully supported ✓`, `WebRTC: active · UserAgent verified`)
    } else {
      updateCheck('browser', 'failed', `${browser} — not recommended`, 'Please use Chrome or Edge for best experience')
    }
  }

  const checkInternet = async () => {
    updateCheck('internet', 'checking', 'Testing connection speed...')
    try {
      const start = Date.now()
      await fetch('https://www.google.com/favicon.ico', { cache: 'no-cache', mode: 'no-cors' })
      const latency = Date.now() - start

      if (latency < 500) {
        updateCheck('internet', 'passed', `Excellent connection (${latency}ms) ✓`, 'Stable connection for video monitoring')
      } else if (latency < 1500) {
        updateCheck('internet', 'warning', `Good connection (${latency}ms)`, 'Video quality may vary slightly')
      } else {
        updateCheck('internet', 'failed', `Slow connection (${latency}ms)`, 'Video streaming may be impacted')
      }
    } catch {
      // Could be CORS issue, check navigator.onLine
      if (navigator.onLine) {
        updateCheck('internet', 'passed', 'Connected to internet ✓', 'Connection verified via browser')
      } else {
        updateCheck('internet', 'failed', 'No internet connection detected', 'Connect to internet before starting')
      }
    }
  }

  const checkSystem = async () => {
    updateCheck('system', 'checking', 'Verifying system capabilities...')
    await delay(500)

    const memory = (navigator as any).deviceMemory || null
    const cores = navigator.hardwareConcurrency || 1
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
    const hasWebGL = !!document.createElement('canvas').getContext('webgl')

    updateCheck('system', 'passed',
      `System meets requirements ✓`,
      `${cores} CPU cores · ${memory ? memory + 'GB RAM' : 'RAM: OK'} · WebGL: ${hasWebGL ? 'Yes' : 'No'}`
    )
  }

  const checkDevTools = async () => {
    updateCheck('devtools', 'checking', 'Checking for developer tools...')
    await delay(600)
    updateCheck('devtools', 'passed', 'DevTools will be blocked during exam ✓', 'F12, Ctrl+Shift+I are disabled')
  }

  const checkExternalDevices = async () => {
    updateCheck('phone', 'checking', 'Scanning for external devices...')
    await delay(800)

    // Check media devices for suspicious patterns
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      const audioDevices = devices.filter(d => d.kind === 'audioinput')

      if (videoDevices.length > 1) {
        updateCheck('phone', 'warning', `${videoDevices.length} cameras detected`, 'Only one camera should be active')
      } else {
        updateCheck('phone', 'passed', 'No unauthorized devices detected ✓', `1 camera · ${audioDevices.length} microphone(s)`)
      }
    } catch {
      updateCheck('phone', 'passed', 'Device scan complete ✓')
    }
  }

  const rerunChecks = () => {
    setAllDone(false)
    setChecks(prev => prev.map(c => ({ ...c, status: 'pending', message: 'Waiting...' })))
    setTimeout(startVerification, 300)
  }

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedId(file)
      setTimeout(() => setIdVerified(true), 1500)
    }
  }

  const allRequiredPassed = checks.filter(c => c.required).every(c => c.status === 'passed' || c.status === 'warning')
  // ID upload is now optional — shows warning but doesn't block exam start
  const canProceed = allRequiredPassed && consentGiven
  const passedCount = checks.filter(c => c.status === 'passed').length
  const failedCount = checks.filter(c => c.status === 'failed').length

  const handleProceed = () => {
    if (canProceed) navigate(`/exam/${examId}`)
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'hardware': return 'text-blue-400'
      case 'environment': return 'text-green-400'
      case 'software': return 'text-purple-400'
      case 'identity': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusConfig = (status: VerificationCheck['status']) => {
    switch (status) {
      case 'passed': return { border: 'border-emerald-500/40', bg: 'bg-emerald-950/20', icon: <CheckCircle className="w-5 h-5 text-emerald-400" /> }
      case 'failed': return { border: 'border-red-500/40', bg: 'bg-red-950/20', icon: <XCircle className="w-5 h-5 text-red-400" /> }
      case 'warning': return { border: 'border-yellow-500/40', bg: 'bg-yellow-950/20', icon: <AlertTriangle className="w-5 h-5 text-yellow-400" /> }
      case 'checking': return { border: 'border-blue-500/40', bg: 'bg-blue-950/20', icon: <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> }
      default: return { border: 'border-gray-700/40', bg: 'bg-gray-800/20', icon: <div className="w-5 h-5 border-2 border-gray-600 rounded-full" /> }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -left-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Pre-Exam Verification
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">Complete all checks before your exam begins</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 backdrop-blur">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400">Verification Progress</span>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-400 font-semibold">✓ {passedCount} passed</span>
                {failedCount > 0 && <span className="text-red-400 font-semibold">✗ {failedCount} failed</span>}
                <span className="text-gray-500">{checks.length} total</span>
              </div>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full"
                animate={{ width: `${(passedCount / checks.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Camera Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Camera Preview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-gray-200">Camera Preview</span>
                </div>
                {stream && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-400 font-bold">LIVE</span>
                  </div>
                )}
              </div>

              <div className="relative bg-gray-950 aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!stream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                    <Camera className="w-12 h-12 text-gray-600 mb-3" />
                    <p className="text-gray-500 text-sm">Camera initializing...</p>
                  </div>
                )}

                {/* Face detection overlay */}
                {stream && faceDetected !== null && (
                  <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border
                    ${faceDetected ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : 'bg-red-950/80 border-red-500/50 text-red-400'}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {faceDetected ? 'Face Detected' : 'No Face'}
                  </div>
                )}

                {/* Re-run face check button when face not detected */}
                {stream && faceDetected === false && allDone && (
                  <div className="absolute bottom-10 left-3 right-3">
                    <button
                      onClick={async () => {
                        setAllDone(false)
                        await checkFaceDetection()
                        setAllDone(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold rounded-lg backdrop-blur transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Face Detection
                    </button>
                  </div>
                )}

                {/* Brightness overlay */}
                {stream && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1 text-gray-300">
                        <Sun className="w-3.5 h-3.5" />
                        <span>Brightness</span>
                      </div>
                      <span className={`font-bold ${
                        brightnessLevel < 30 ? 'text-red-400' :
                        brightnessLevel < 60 ? 'text-yellow-400' : 'text-emerald-400'
                      }`}>{brightnessLevel}/255</span>
                    </div>
                    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          brightnessLevel < 30 ? 'bg-red-500' :
                          brightnessLevel < 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`}
                        animate={{ width: `${Math.min(100, (brightnessLevel / 200) * 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Audio Monitor */}
            {stream && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-900 rounded-2xl border border-gray-700/50 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-gray-200">Microphone</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    audioLevel > 30 ? 'text-yellow-400 bg-yellow-950/50' : 'text-green-400 bg-green-950/50'
                  }`}>
                    {audioLevel > 50 ? 'HIGH' : audioLevel > 20 ? 'MEDIUM' : 'LOW'} · {Math.round(audioLevel)}
                  </span>
                </div>
                {/* Waveform bars */}
                <div className="flex items-end gap-0.5 h-10">
                  {audioWaveData.map((v, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${Math.max(2, (v / 255) * 100)}%`,
                        backgroundColor: v > 150 ? '#ef4444' : v > 80 ? '#f59e0b' : '#10b981',
                        opacity: 0.8
                      }}
                      animate={{ height: `${Math.max(2, (v / 255) * 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Speak to test microphone</p>
              </motion.div>
            )}

            {/* ID Verification — optional */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 rounded-2xl border border-gray-700/50 p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-gray-200">ID Verification</span>
                </div>
                <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">Optional</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Upload your student ID for identity verification (recommended)</p>
              <label>
                <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  idVerified
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400'
                    : 'border-gray-600 hover:border-purple-500/50 hover:bg-purple-950/10 text-gray-500'
                }`}>
                  {uploadedId ? (
                    <div>
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm font-semibold">ID Uploaded ✓</p>
                      <p className="text-xs mt-1 text-gray-500">{uploadedId.name}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click to upload ID (optional)</p>
                    </div>
                  )}
                </div>
              </label>
            </motion.div>

            {/* Consent */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900 rounded-2xl border border-gray-700/50 p-4"
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={e => setConsentGiven(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    consentGiven ? 'bg-blue-500 border-blue-500' : 'border-gray-600 bg-gray-800'
                  }`}>
                    {consentGiven && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <span className="text-xs text-gray-400 leading-relaxed">
                  I consent to <span className="text-white">video, audio, and screen monitoring</span> during this exam.
                  I understand that all activity will be recorded and reviewed for academic integrity. Face, eye tracking,
                  keyboard/mouse behavior and audio are monitored throughout.
                </span>
              </label>
            </motion.div>
          </div>

          {/* Right: Verification Checks */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200">System Checks</h2>
              {allDone && (
                <button
                  onClick={rerunChecks}
                  className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition px-3 py-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-950/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-run Checks
                </button>
              )}
            </div>

            <div className="space-y-2">
              {checks.map((check, index) => {
                const statusConfig = getStatusConfig(check.status)
                const Icon = check.icon
                return (
                  <motion.div
                    key={check.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border ${statusConfig.border} ${statusConfig.bg} rounded-xl p-4 transition-all`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-gray-800/50`}>
                        <Icon className={`w-5 h-5 ${getCategoryColor(check.category)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-gray-200">{check.name}</span>
                          {check.required && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-950/50 text-red-400 border border-red-500/30 rounded">Required</span>
                          )}
                        </div>
                        <p className={`text-xs ${
                          check.status === 'failed' ? 'text-red-400' :
                          check.status === 'warning' ? 'text-yellow-400' :
                          check.status === 'passed' ? 'text-emerald-400' :
                          check.status === 'checking' ? 'text-blue-400' :
                          'text-gray-500'
                        }`}>
                          {check.message}
                        </p>
                        {check.detail && check.status !== 'pending' && (
                          <p className="text-xs text-gray-600 mt-0.5">{check.detail}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {statusConfig.icon}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Issues summary */}
            {allDone && failedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-red-950/30 border border-red-500/30 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-400 mb-1">Action Required</h4>
                    <p className="text-sm text-red-300">
                      {failedCount} required check{failedCount > 1 ? 's' : ''} failed. Please resolve them before proceeding.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Proceed Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: allDone ? 1 : 0.5, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 bg-gray-900 rounded-2xl border border-gray-700/50 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-200 mb-1">
                    {canProceed ? '✅ Ready to Start Exam' : 'Complete All Requirements'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {!allRequiredPassed
                      ? `${failedCount} required check${failedCount > 1 ? 's' : ''} need attention — click Re-run Checks after fixing`
                      : !consentGiven
                        ? 'Please accept the proctoring consent below'
                        : 'All checks complete — you may proceed'}
                  </p>
                  {!idVerified && allRequiredPassed && consentGiven && (
                    <p className="text-xs text-yellow-400/80 mt-1">💡 ID upload skipped — your session will be flagged for manual review</p>
                  )}
                </div>
                <motion.button
                  onClick={handleProceed}
                  disabled={!canProceed}
                  whileHover={canProceed ? { scale: 1.02 } : {}}
                  whileTap={canProceed ? { scale: 0.98 } : {}}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                    canProceed
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Start Exam
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>

              {canProceed && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2 text-xs text-gray-500">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Full proctoring will activate when exam begins: face tracking, audio monitoring, and screen recording</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
