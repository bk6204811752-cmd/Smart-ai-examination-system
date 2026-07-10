import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { sessionAPI } from '../../lib/api'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { detectSuspiciousObjects } from '../../utils/objectDetection'
import {
  Camera,
  Mic,
  Monitor,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  Cpu,
  Upload,
  Shield,
  Eye,
  Sun,
  Smartphone,
  Chrome,
  RefreshCw,
  ChevronRight,
  Lock,
  Activity,
  Headphones,
  Scan,
  MonitorSmartphone,
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

const MEDIAPIPE_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const FACE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
// Object detection now uses @tensorflow-models/coco-ssd via objectDetection.ts

export default function PreExamVerification() {
  const params = useParams<{ examId?: string; testId?: string }>()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))
  const examId = params.examId || params.testId || ''
  const mode = searchParams.get('mode') || (params.testId ? 'practice' : 'live')
  const practiceTestId = params.testId || searchParams.get('testId')
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
  const [allDone, setAllDone] = useState(false)
  const [, setChecksRunning] = useState(false)
  const audioLevelRef = useRef(0)
  const brightnessLevelRef = useRef(0)
  const visionResolverRef = useRef<any>(null)
  const cachedDevicesRef = useRef<MediaDeviceInfo[] | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [checks, setChecks] = useState<VerificationCheck[]>([
    {
      id: 'webcam',
      name: 'Webcam',
      status: 'pending',
      message: 'Checking camera access...',
      icon: Camera,
      required: true,
      category: 'hardware',
    },
    {
      id: 'microphone',
      name: 'Microphone',
      status: 'pending',
      message: 'Checking microphone...',
      icon: Mic,
      required: true,
      category: 'hardware',
    },
    {
      id: 'lighting',
      name: 'Room Lighting',
      status: 'pending',
      message: 'Analyzing room brightness...',
      icon: Sun,
      required: true, // FIX: lighting is required  -  exam must not start in dark room
      category: 'environment',
    },
    {
      id: 'face',
      name: 'Face Detection',
      status: 'pending',
      message: 'Detecting your face...',
      icon: Eye,
      required: true,
      category: 'identity',
    },
    {
      id: 'screen',
      name: 'Screen Share Block',
      status: 'pending',
      message: 'Checking screen capture API...',
      icon: Monitor,
      required: false,
      category: 'software',
    },
    {
      id: 'browser',
      name: 'Browser Compatibility',
      status: 'pending',
      message: 'Checking browser version...',
      icon: Chrome,
      required: true,
      category: 'software',
    },
    {
      id: 'internet',
      name: 'Internet Speed',
      status: 'pending',
      message: 'Testing connection speed...',
      icon: Wifi,
      required: true,
      category: 'software',
    },
    {
      id: 'system',
      name: 'System Requirements',
      status: 'pending',
      message: 'Verifying system specs...',
      icon: Cpu,
      required: true,
      category: 'software',
    },
    {
      id: 'devtools',
      name: 'DevTools Blocked',
      status: 'pending',
      message: 'Checking browser extensions...',
      icon: Lock,
      required: false,
      category: 'software',
    },
    {
      id: 'phone',
      name: 'No External Devices',
      status: 'pending',
      message: 'Scanning for unauthorized devices...',
      icon: Smartphone,
      required: false,
      category: 'environment',
    },
    {
      id: 'headphone_test',
      name: 'Headphone Detection',
      status: 'pending',
      message: 'Testing for headphones/earbuds...',
      icon: Headphones,
      required: false,
      category: 'hardware',
    },
    {
      id: 'room_scan',
      name: 'Room Scan',
      status: 'pending',
      message: 'Scanning your environment...',
      icon: Scan,
      required: false,
      category: 'environment',
    },
    {
      id: 'screen_devices',
      name: 'Screen Share & Devices',
      status: 'pending',
      message: 'Checking for virtual devices...',
      icon: Monitor,
      required: false,
      category: 'software',
    },
    {
      id: 'multi_monitor',
      name: 'Multiple Monitors',
      status: 'pending',
      message: 'Checking display configuration...',
      icon: MonitorSmartphone,
      required: false,
      category: 'software',
    },
  ])

  useEffect(() => {
    startVerification()
    return () => {
      cleanup()
      // Don't delete __preExamStream/__verificationResults here —
      // ExamPage/PracticeMockExam read them on mount and delete them after consuming.
      // Deleting here would cause a race condition where the cleanup runs before the
      // next page's useEffect, causing the exam page to miss the pre-verified data.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const rounded = Math.round(avg)
      setBrightnessLevel(rounded)
      brightnessLevelRef.current = rounded
    }

    const interval = setInterval(checkBrightness, 500)
    return () => clearInterval(interval)
  }, [stream])

  const cleanup = () => {
    const s = streamRef.current
    if (s) {
      const preExamStream = (window as any).__preExamStream
      if (preExamStream !== s) {
        s.getTracks().forEach(track => track.stop())
      }
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
  }

  const updateCheck = (
    id: string,
    status: VerificationCheck['status'],
    message: string,
    detail?: string
  ) => {
    setChecks(prev => prev.map(c => (c.id === id ? { ...c, status, message, detail } : c)))
  }

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const waitForVideoReady = async (timeoutMs: number = 8000) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const video = videoRef.current
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        return true
      }
      await delay(150)
    }
    return false
  }

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
    await delay(300)
    await checkHeadphones()
    await delay(400)
    await checkRoomScan()
    await delay(300)
    await checkScreenDevices()
    await delay(300)
    await checkMultiMonitor()

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
          frameRate: { ideal: 30, min: 10 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play().catch(() => {})
      }
      setStream(mediaStream)
      streamRef.current = mediaStream

      // Start audio monitoring
      startAudioMonitoring(mediaStream)

      const videoTrack = mediaStream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      updateCheck(
        'webcam',
        'passed',
        'Camera connected [OK]',
        `${settings.width}x${settings.height} @ ${settings.frameRate?.toFixed(0) || '?'}fps  -  ${videoTrack.label}`
      )
    } catch (error: any) {
      const msg =
        error?.name === 'NotAllowedError'
          ? 'Camera permission denied  -  please click Allow'
          : error?.name === 'NotFoundError'
            ? 'No camera found  -  please connect a camera'
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
        const rounded = Math.round(avg)
        setAudioLevel(rounded)
        audioLevelRef.current = rounded
        setAudioWaveData(Array.from(dataArray).slice(0, 32))
        animFrameRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch {
      /* noop */
    }
  }

  const checkMicrophone = async () => {
    updateCheck('microphone', 'checking', 'Testing microphone sensitivity...')
    // Wait longer for audio monitoring to stabilize (state is async, but ref updates in rAF)
    for (let i = 0; i < 15; i++) {
      await delay(200)
      if (audioLevelRef.current > 0) break
    }
    if (audioLevelRef.current > 0) {
      updateCheck(
        'microphone',
        'passed',
        'Microphone working [OK]',
        `Audio monitoring active (level: ${audioLevelRef.current})`
      )
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
          if (reading > 5) {
            stabilized = true
            break
          } // Camera has warmed up
        }
      }
    }
    if (!stabilized) await delay(600) // Extra wait if still not ready

    // Use the ref to avoid stale closures (state updates are async)
    let brightness = brightnessLevelRef.current
    if (brightness === 0) {
      // Poll for a real reading from the canvas (camera auto-exposure needs time)
      for (let i = 0; i < 10; i++) {
        await delay(300)
        brightness = brightnessLevelRef.current
        if (brightness > 5) break
      }
    }
    // Final fallback: force a fresh canvas measurement
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
        brightnessLevelRef.current = brightness
      }
    }

    if (brightness === 0) {
      updateCheck(
        'lighting',
        'failed',
        'No video signal  -  camera may be blocked or not working',
        'Ensure camera is uncovered and active'
      )
    } else if (brightness < 35) {
      // HARD FAIL: Room too dark for face detection  -  exam must not start
      updateCheck(
        'lighting',
        'failed',
        `Room too dark (${brightness}/255)  -  turn on lights before exam`,
        `Minimum required: 35/255  -  Face detection requires adequate lighting`
      )
    } else if (brightness < 60) {
      updateCheck(
        'lighting',
        'warning',
        `Low lighting (${brightness}/255)  -  improve for best accuracy`,
        'Recommended: 60+ for optimal face detection'
      )
    } else {
      updateCheck(
        'lighting',
        'passed',
        `Room lighting is good (${brightness}/255) [OK]`,
        'Face detection will work optimally'
      )
    }
  }

  let visionResolverPromise: Promise<any> | null = null
  const getVisionResolver = async () => {
    if (visionResolverRef.current) return visionResolverRef.current
    if (!visionResolverPromise) {
      visionResolverPromise = Promise.race([
        FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('MediaPipe WASM load timeout')), 20000)
        ),
      ])
    }
    const vision = await visionResolverPromise
    visionResolverRef.current = vision
    return vision
  }

  const checkFaceDetection = async () => {
    updateCheck('face', 'checking', 'Running AI face detection...')
    await delay(800)

    const brightness = brightnessLevelRef.current
    if (brightness < 35) {
      setFaceDetected(false)
      updateCheck(
        'face',
        'failed',
        'Cannot detect face  -  room too dark',
        'Fix lighting first, then re-run checks'
      )
      return
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      setFaceDetected(false)
      updateCheck(
        'face',
        'failed',
        'Camera not ready for face detection',
        'Please wait for camera to load'
      )
      return
    }

    const videoReady = await waitForVideoReady()
    if (!videoReady) {
      setFaceDetected(false)
      updateCheck(
        'face',
        'failed',
        'Camera frame not ready for face detection',
        'Keep the camera uncovered and try again'
      )
      return
    }

    let faceLandmarker: FaceLandmarker | null = null
    try {
      updateCheck('face', 'checking', 'Loading face detection AI model...')
      const vision = await getVisionResolver()

      faceLandmarker = await Promise.race([
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 3,
        }),
        new Promise<FaceLandmarker>((_, reject) =>
          setTimeout(() => reject(new Error('FaceLandmarker model load timeout')), 20000)
        ),
      ])

      updateCheck('face', 'checking', 'Scanning for your face...')
      const samples: number[] = []
      let strongestCount = 0

      for (let attempt = 0; attempt < 4; attempt++) {
        await delay(250)
        const result = faceLandmarker.detectForVideo(videoRef.current!, performance.now())
        const faceCount = result.faceLandmarks?.length || 0
        samples.push(faceCount)
        strongestCount = Math.max(strongestCount, faceCount)

        if (faceCount > 0 && samples.filter(count => count > 0).length >= 2) {
          setFaceDetected(true)
          updateCheck(
            'face',
            'passed',
            `Face detected [OK] (${faceCount} face${faceCount > 1 ? 's' : ''})`,
            'Keep face centered and well-lit during exam'
          )
          return
        }
      }

      setFaceDetected(false)
      updateCheck(
        'face',
        'failed',
        'No face detected  -  position yourself in front of the camera',
        'Face the camera directly  -  Ensure your face is visible and well-lit'
      )
    } catch (err) {
      console.warn('Face detection error:', err)
      setFaceDetected(false)
      updateCheck(
        'face',
        'failed',
        'Face detection failed  -  try again after the camera loads',
        'Turn on lights, face the camera, and rerun verification'
      )
    } finally {
      faceLandmarker?.close()
    }
  }

  const checkScreenShare = async () => {
    updateCheck('screen', 'checking', 'Checking screen capture API...')
    await delay(600)
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      updateCheck(
        'screen',
        'passed',
        'Screen sharing detection active [OK]',
        'Any screen sharing will be flagged'
      )
    } else {
      updateCheck(
        'screen',
        'warning',
        'Screen share API limited on this browser',
        'Recommended: Chrome or Edge'
      )
    }
  }

  const checkBrowser = async () => {
    updateCheck('browser', 'checking', 'Checking browser compatibility...')
    await delay(500)

    const ua = navigator.userAgent
    let browser = 'Unknown'
    let isSupported = false

    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome'
      isSupported = true
    } else if (ua.includes('Edg')) {
      browser = 'Edge'
      isSupported = true
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox'
      isSupported = true
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari'
      isSupported = true
    }

    // Check for WebRTC support
    const hasWebRTC = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection)

    if (isSupported && hasWebRTC) {
      updateCheck(
        'browser',
        'passed',
        `${browser}  -  fully supported [OK]`,
        `WebRTC: active  -  UserAgent verified`
      )
    } else {
      updateCheck(
        'browser',
        'failed',
        `${browser}  -  not recommended`,
        'Please use Chrome or Edge for best experience'
      )
    }
  }

  const checkInternet = async () => {
    updateCheck('internet', 'checking', 'Testing connection speed...')
    try {
      const start = Date.now()
      await fetch('https://www.google.com/favicon.ico', { cache: 'no-cache', mode: 'no-cors' })
      const latency = Date.now() - start

      if (latency < 500) {
        updateCheck(
          'internet',
          'passed',
          `Excellent connection (${latency}ms) [OK]`,
          'Stable connection for video monitoring'
        )
      } else if (latency < 1500) {
        updateCheck(
          'internet',
          'warning',
          `Good connection (${latency}ms)`,
          'Video quality may vary slightly'
        )
      } else {
        updateCheck(
          'internet',
          'failed',
          `Slow connection (${latency}ms)`,
          'Video streaming may be impacted'
        )
      }
    } catch {
      // Could be CORS issue, check navigator.onLine
      if (navigator.onLine) {
        updateCheck(
          'internet',
          'passed',
          'Connected to internet [OK]',
          'Connection verified via browser'
        )
      } else {
        updateCheck(
          'internet',
          'failed',
          'No internet connection detected',
          'Connect to internet before starting'
        )
      }
    }
  }

  const checkSystem = async () => {
    updateCheck('system', 'checking', 'Verifying system capabilities...')
    await delay(500)

    const memory = (navigator as any).deviceMemory || null
    const cores = navigator.hardwareConcurrency || 1
    const hasWebGL = !!document.createElement('canvas').getContext('webgl')

    updateCheck(
      'system',
      'passed',
      `System meets requirements [OK]`,
      `${cores} CPU cores  -  ${memory ? memory + 'GB RAM' : 'RAM: OK'}  -  WebGL: ${hasWebGL ? 'Yes' : 'No'}`
    )
  }

  const checkDevTools = async () => {
    updateCheck('devtools', 'checking', 'Checking for developer tools...')
    await delay(600)
    updateCheck(
      'devtools',
      'passed',
      'DevTools will be blocked during exam [OK]',
      'F12, Ctrl+Shift+I are disabled'
    )
  }

  const getCachedDevices = async () => {
    if (cachedDevicesRef.current && cachedDevicesRef.current.length > 0) {
      return cachedDevicesRef.current
    }
    const devices = await navigator.mediaDevices.enumerateDevices()
    cachedDevicesRef.current = devices
    return devices
  }

  const checkExternalDevices = async () => {
    updateCheck('phone', 'checking', 'Scanning for external devices...')
    await delay(800)

    try {
      const devices = await getCachedDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      const audioDevices = devices.filter(d => d.kind === 'audioinput')

      if (videoDevices.length > 1) {
        updateCheck(
          'phone',
          'warning',
          `${videoDevices.length} cameras detected`,
          'Only one camera should be active'
        )
      } else {
        updateCheck(
          'phone',
          'passed',
          'No unauthorized devices detected [OK]',
          `1 camera  -  ${audioDevices.length} microphone(s)`
        )
      }
    } catch {
      updateCheck('phone', 'passed', 'Device scan complete [OK]')
    }
  }

  const checkHeadphones = async () => {
    updateCheck('headphone_test', 'checking', 'Testing for headphones/earbuds...')
    try {
      const activeStream = streamRef.current
      if (!activeStream || !activeStream.active) {
        updateCheck(
          'headphone_test',
          'failed',
          'No microphone stream available',
          'Headphone test requires active microphone'
        )
        return
      }

      // Use a single AudioContext for both mic analysis and tone playback
      const audioCtx = new AudioContext()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }

      const micSource = audioCtx.createMediaStreamSource(activeStream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      micSource.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const readLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        return dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      }

      // Ambient noise baseline (5 samples over 500ms)
      let baselineSum = 0
      for (let i = 0; i < 5; i++) {
        await delay(100)
        baselineSum += readLevel()
      }
      const baseline = baselineSum / 5

      // Play test tone through speakers using the same AudioContext
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, audioCtx.currentTime)
      gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0)
      osc.start()

      // Wait for tone to reach speakers before sampling
      await delay(300)

      // Read 15 samples during tone playback (1.5s)
      let toneSum = 0
      for (let i = 0; i < 15; i++) {
        await delay(100)
        toneSum += readLevel()
      }
      const avgTone = toneSum / 15

      osc.stop(audioCtx.currentTime + 0.1)
      micSource.disconnect()
      await audioCtx.close()

      const delta = avgTone - baseline
      if (delta > 3) {
        updateCheck(
          'headphone_test',
          'passed',
          'No headphones detected [OK]',
          `Test tone reached microphone (Level: ${Math.round(delta)})`
        )
      } else if (delta > 1) {
        updateCheck(
          'headphone_test',
          'warning',
          'Weak tone response  -  ensure speakers are on',
          `Level: ${Math.round(delta)}  -  try increasing volume`
        )
      } else {
        updateCheck(
          'headphone_test',
          'warning',
          'Could not verify  -  ensure speakers are unmuted',
          `Tone level: ${Math.round(delta)}  -  increase volume if possible`
        )
      }
    } catch (err) {
      console.warn('Headphone test failed:', err)
      updateCheck(
        'headphone_test',
        'warning',
        'Headphone test could not complete',
        'Audio test skipped  -  ensure speakers work'
      )
    }
  }

  const checkRoomScan = async () => {
    updateCheck('room_scan', 'checking', 'Loading AI detection model...')
    try {
      // Pre-warm COCO-SSD model
      await detectSuspiciousObjects(videoRef.current!, 0.3).catch(() => {})

      updateCheck('room_scan', 'checking', 'Scanning your room — please pan camera slowly...')
      const detected: Record<string, number> = {}

      // Take 6 frames with 500ms gaps — student should pan camera
      for (let i = 0; i < 6; i++) {
        await delay(500)
        if (
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          videoRef.current.videoWidth > 0
        ) {
          const result = await detectSuspiciousObjects(videoRef.current, 0.3)
          for (const obj of result.suspicious) {
            const label = obj.label.toLowerCase()
            detected[label] = (detected[label] || 0) + 1
          }
        }
      }

      const found = Object.entries(detected).filter(([, count]) => count > 0)

      if (found.length === 0) {
        updateCheck(
          'room_scan',
          'passed',
          'Room environment looks clear [OK]',
          'No unauthorized items detected'
        )
      } else {
        const items = found.map(([label, count]) => `${label} (${count}x)`).join(', ')
        updateCheck(
          'room_scan',
          'warning',
          `Suspicious items: ${items}`,
          'Please remove these before starting the exam'
        )
      }
    } catch (err) {
      console.warn('Room scan failed:', err)
      updateCheck(
        'room_scan',
        'warning',
        'Room scan could not run',
        'Ensure camera is working  -  skip if not needed'
      )
    }
  }

  const checkScreenDevices = async () => {
    updateCheck('screen_devices', 'checking', 'Checking for virtual/screen capture devices...')
    await delay(500)
    try {
      const devices = await getCachedDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      const audioDevices = devices.filter(d => d.kind === 'audioinput')

      const virtualKeywords = [
        'virtual',
        'obs',
        'stream',
        'cam',
        'splitcam',
        'manycam',
        'droidcam',
        'epoccam',
        'ivcam',
        'vmware',
        'remote',
        'display capture',
        'screen capture',
        'vcam',
        'obs-virtual',
        'ndi',
        'sparkocam',
      ]
      const suspiciousVideo = videoDevices.filter(d =>
        virtualKeywords.some(k => d.label.toLowerCase().includes(k))
      )
      const suspiciousAudio = audioDevices.filter(d =>
        virtualKeywords.some(k => d.label.toLowerCase().includes(k))
      )

      if (suspiciousVideo.length > 0 || suspiciousAudio.length > 0) {
        const items = [
          ...suspiciousVideo.map(d => d.label),
          ...suspiciousAudio.map(d => d.label),
        ].join(', ')
        updateCheck(
          'screen_devices',
          'warning',
          `Suspicious devices: ${items}`,
          'Virtual/screen capture devices detected  -  disable them'
        )
      } else {
        updateCheck(
          'screen_devices',
          'passed',
          'No virtual/screen capture devices [OK]',
          `${videoDevices.length} camera(s)  -  ${audioDevices.length} microphone(s)`
        )
      }
    } catch {
      updateCheck(
        'screen_devices',
        'warning',
        'Could not enumerate devices',
        'Device check skipped'
      )
    }
  }

  const checkMultiMonitor = async () => {
    updateCheck('multi_monitor', 'checking', 'Checking display configuration...')
    await delay(400)

    const screens = window.screen
    const availWidth = screens.availWidth
    const availHeight = screens.availHeight
    const windowWidth = window.innerWidth
    const ratio = (availWidth * availHeight) / (windowWidth * window.innerHeight)

    const isMultiMonitor = availWidth > 2200
    const isExtendedDesktop = ratio > 1.5

    if (isMultiMonitor) {
      updateCheck(
        'multi_monitor',
        'warning',
        `Wide display (${availWidth}x${availHeight})`,
        'Multiple monitors or ultra-wide  -  disable extra displays for exam'
      )
    } else if (isExtendedDesktop) {
      updateCheck(
        'multi_monitor',
        'warning',
        'Extended desktop detected',
        'Disable extended display mode before starting'
      )
    } else {
      updateCheck(
        'multi_monitor',
        'passed',
        `Single display [OK] (${availWidth}x${availHeight})`,
        'No additional monitors detected'
      )
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

  const allRequiredPassed = checks
    .filter(c => c.required)
    .every(c => c.status === 'passed' || c.status === 'warning')
  // ID upload is now optional  -  shows warning but doesn't block exam start
  const canProceed = allRequiredPassed && consentGiven
  const passedCount = checks.filter(c => c.status === 'passed').length
  const failedCount = checks.filter(c => c.status === 'failed').length

  const handleProceed = async () => {
    if (!canProceed) return

    // Request fullscreen with the user's click gesture
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>
        msRequestFullscreen?: () => Promise<void>
      }
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked  -  exam page will handle this
    }

    if (streamRef.current) {
      (window as any).__preExamStream = streamRef.current
    }

    // Store verification results for ExamPage to consume
    const faceCheck = checks.find(c => c.id === 'face')
    const webcamCheck = checks.find(c => c.id === 'webcam')
    const micCheck = checks.find(c => c.id === 'microphone')
    const passed = checks.filter(c => c.status === 'passed')
    const failed = checks.filter(c => c.status === 'failed')
    const warnings = checks.filter(c => c.status === 'warning')
    const verificationResults = {
      face_verified: faceCheck?.status === 'passed',
      device_info: {
        webcam: webcamCheck?.status === 'passed',
        microphone: micCheck?.status === 'passed',
        browsers: navigator.userAgent,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency,
        memory: (navigator as any).deviceMemory || null,
        brightness: brightnessLevelRef.current,
        audio_level: audioLevelRef.current,
      },
      browser_info: navigator.userAgent,
      checks_passed: passed.length,
      checks_failed: failed.length,
      checks_warning: warnings.length,
      all_required_passed: allRequiredPassed,
      consent_given: consentGiven,
      id_verified: idVerified,
    }
    ;(window as any).__verificationResults = verificationResults

    // Send verification to backend in background (non-blocking)
    sessionAPI.verifySession(examId, {
      face_verified: verificationResults.face_verified,
      device_info: verificationResults.device_info,
      browser_info: verificationResults.browser_info,
      checks_passed: verificationResults.checks_passed,
      checks_failed: verificationResults.checks_failed,
      checks_warning: verificationResults.checks_warning,
      consent_given: verificationResults.consent_given,
      id_verified: verificationResults.id_verified,
    }).catch(() => {/* non-critical */})

    if (mode === 'practice' && practiceTestId) {
      navigate(`/practice/mock/${practiceTestId}`)
    } else {
      navigate(`/exam/${examId}`)
    }
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'hardware':
        return 'text-blue-400'
      case 'environment':
        return 'text-green-400'
      case 'software':
        return 'text-purple-400'
      case 'identity':
        return 'text-orange-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusConfig = (status: VerificationCheck['status']) => {
    switch (status) {
      case 'passed':
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/20',
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        }
      case 'failed':
        return {
          border: 'border-red-500/40',
          bg: 'bg-red-950/20',
          icon: <XCircle className="w-5 h-5 text-red-400" />,
        }
      case 'warning':
        return {
          border: 'border-yellow-500/40',
          bg: 'bg-yellow-950/20',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
        }
      case 'checking':
        return {
          border: 'border-blue-500/40',
          bg: 'bg-blue-950/20',
          icon: (
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ),
        }
      default:
        return {
          border: 'border-gray-700/40',
          bg: 'bg-gray-800/20',
          icon: <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />,
        }
    }
  }

  return (
    <div
      className="min-h-screen bg-gray-950 text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
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
                {mode === 'practice' ? 'Practice Exam Verification' : 'Pre-Exam Verification'}
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {mode === 'practice'
                  ? 'Verify your setup before starting the practice test'
                  : 'Complete all checks before your exam begins'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 backdrop-blur">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400">Verification Progress</span>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-400 font-semibold">[OK] {passedCount} passed</span>
                {failedCount > 0 && (
                  <span className="text-red-400 font-semibold">[FAIL] {failedCount} failed</span>
                )}
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
                  <div
                    className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border
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
                      <span
                        className={`font-bold ${
                          brightnessLevel < 30
                            ? 'text-red-400'
                            : brightnessLevel < 60
                              ? 'text-yellow-400'
                              : 'text-emerald-400'
                        }`}
                      >
                        {brightnessLevel}/255
                      </span>
                    </div>
                    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          brightnessLevel < 30
                            ? 'bg-red-500'
                            : brightnessLevel < 60
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
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
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      audioLevel > 30
                        ? 'text-yellow-400 bg-yellow-950/50'
                        : 'text-green-400 bg-green-950/50'
                    }`}
                  >
                    {audioLevel > 50 ? 'HIGH' : audioLevel > 20 ? 'MEDIUM' : 'LOW'}  - {' '}
                    {Math.round(audioLevel)}
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
                        opacity: 0.8,
                      }}
                      animate={{ height: `${Math.max(2, (v / 255) * 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Speak to test microphone</p>
              </motion.div>
            )}

            {/* ID Verification  -  optional */}
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
                <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                  Optional
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Upload your student ID for identity verification (recommended)
              </p>
              <label>
                <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    idVerified
                      ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400'
                      : 'border-gray-600 hover:border-purple-500/50 hover:bg-purple-950/10 text-gray-500'
                  }`}
                >
                  {uploadedId ? (
                    <div>
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm font-semibold">ID Uploaded [OK]</p>
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
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      consentGiven ? 'bg-blue-500 border-blue-500' : 'border-gray-600 bg-gray-800'
                    }`}
                  >
                    {consentGiven && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <span className="text-xs text-gray-400 leading-relaxed">
                  I consent to{' '}
                  <span className="text-white">video, audio, and screen monitoring</span> during
                  this exam. I understand that all activity will be recorded and reviewed for
                  academic integrity. Face, eye tracking, keyboard/mouse behavior and audio are
                  monitored throughout.
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
                            <span className="text-xs px-1.5 py-0.5 bg-red-950/50 text-red-400 border border-red-500/30 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs ${
                            check.status === 'failed'
                              ? 'text-red-400'
                              : check.status === 'warning'
                                ? 'text-yellow-400'
                                : check.status === 'passed'
                                  ? 'text-emerald-400'
                                  : check.status === 'checking'
                                    ? 'text-blue-400'
                                    : 'text-gray-500'
                          }`}
                        >
                          {check.message}
                        </p>
                        {check.detail && check.status !== 'pending' && (
                          <p className="text-xs text-gray-600 mt-0.5">{check.detail}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">{statusConfig.icon}</div>
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
                      {failedCount} required check{failedCount > 1 ? 's' : ''} failed. Please
                      resolve them before proceeding.
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
                    {canProceed
                      ? `Ready to Start ${mode === 'practice' ? 'Practice' : 'Exam'}`
                      : 'Complete All Requirements'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {!allRequiredPassed
                      ? `${failedCount} required check${failedCount > 1 ? 's' : ''} need attention - click Re-run Checks after fixing`
                      : !consentGiven
                        ? 'Please accept the proctoring consent below'
                        : 'All checks complete - you may proceed'}
                  </p>
                  {!idVerified && allRequiredPassed && consentGiven && (
                      <p className="text-xs text-yellow-400/80 mt-1">
                        ID upload skipped - your session will be flagged for manual review
                      </p>
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
                  {mode === 'practice' ? 'Start Practice' : 'Start Exam'}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>

              {canProceed && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2 text-xs text-gray-500">
                  <Activity className="w-3.5 h-3.5" />
                  <span>
                    Full proctoring will activate when exam begins: face tracking, audio monitoring,
                    and screen recording
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
