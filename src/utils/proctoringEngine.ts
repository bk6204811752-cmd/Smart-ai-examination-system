import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import {
  detectSuspiciousObjects,
  isObjectDetectionAvailable,
  hasObjectDetectionFailed,
  getLastModelLoadError,
  resetObjectDetector,
  checkObjectDetectionHealth,
} from './objectDetection'
import { soundAlerts } from './soundAlerts'

export interface ProctoringViolation {
  type:
    | 'NO_FACE'
    | 'MULTIPLE_FACES'
    | 'FACE_NOT_LOOKING'
    | 'TAB_SWITCH'
    | 'WINDOW_BLUR'
    | 'FULLSCREEN_EXIT'
    | 'AUDIO_DETECTED'
    | 'SUSPICIOUS_BEHAVIOR'
    | 'FACE_CHANGED'
    | 'COPY_PASTE'
    | 'MOUSE_LEFT_SCREEN'
    | 'RAPID_CLICKING'
    | 'PHONE_DETECTED'
    | 'HEADPHONE_DETECTED'
    | 'UNAUTHORIZED_DEVICE'
    | 'SCREEN_SHARE'
    | 'WINDOW_MINIMIZED'
    | 'PIP_DETECTED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: Date
  message: string
  evidence?: string
  metadata?: {
    audioLevel?: number
    faceCount?: number
    faceConfidence?: number
    keystrokes?: string[]
    mousePosition?: { x: number; y: number }
    brightnessLevel?: number
    attentionScore?: number
    distance?: number
    headPose?: { pitch: number; yaw: number; roll: number }
    gazeDirection?: { x: number; y: number }
  }
}

export interface ProctoringStatus {
  isActive: boolean
  faceDetected: boolean
  faceCount: number
  lookingAtScreen: boolean
  audioLevel: number
  violations: ProctoringViolation[]
  tabSwitchCount: number
  windowBlurCount: number
  fullscreenExitCount: number
  isPaused: boolean
  pauseReason?: string
  sessionRecording: boolean
  identityVerified: boolean
  suspiciousActivityScore: number
  attentionLevel: number
  environmentScore: number
  integrityScore: number
  brightness: number
  // Device detection status
  phoneDetected: boolean
  bookDetected: boolean
  deviceDetected: boolean
  objectDetectionActive: boolean
  objectDetectionError: string | null
  lastDetectedDevices: string[]
}

export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ObjectBox {
  label: string
  score: number
  x: number
  y: number
  width: number
  height: number
}

const MEDIAPIPE_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const FACE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
// Object detection now uses @tensorflow-models/coco-ssd via objectDetection.ts

class ProctoringEngine {
  private videoElement: HTMLVideoElement | null = null
  private audioContext: AudioContext | null = null
  private audioAnalyser: AnalyserNode | null = null
  private audioDataArray: Uint8Array<ArrayBuffer> | null = null
  private stream: MediaStream | null = null

  private faceLandmarker: FaceLandmarker | null = null
  private visionResolver: any = null
  private modelsLoaded = false
  private isMonitoring = false
  private animFrameId: number | null = null
  private frameCount = 0
  private previousLandmarks: any[] | null = null
  private lastObjectDetectTime = 0
  private readonly OBJECT_DETECT_INTERVAL = 1500
  private objectDetectScheduled = false
  private phoneDetected = false
  private bookDetected = false
  private consecutivePhoneDetected = 0
  private consecutiveBookDetected = 0
  private consecutiveHeadphone = 0
  private lastPhoneWarning = 0
  private lastBookWarning = 0
  private isDetectionPaused = false

  // Overlay rendering
  private overlayCanvas: HTMLCanvasElement | null = null
  private faceBoxes: FaceBox[] = []
  private objectBoxes: ObjectBox[] = []
  private faceLandmarkPoints: Array<{
    nose: Array<{x: number, y: number}>,
    mouth: Array<{x: number, y: number}>,
    leftEye: Array<{x: number, y: number}>,
    rightEye: Array<{x: number, y: number}>,
    leftIris: {x: number, y: number} | null,
    rightIris: {x: number, y: number} | null,
  }> = []
  private lastDevToolsWarning = 0
  private lastScreenshotWarning = 0
  private devToolsOpen = false
  private referenceWindowWidth = 0
  private referenceWindowHeight = 0

  private consecutiveNoFace = 0
  private consecutiveMultipleFace = 0
  private consecutiveLookingAway = 0
  private consecutiveAudio = 0
  private consecutiveMusic = 0
  private lastNoFaceWarning = 0
  private lastMultipleFaceWarning = 0
  private lastLookingAwayWarning = 0
  private lastAudioWarning = 0
  private lastMusicWarning = 0
  private lastHeadphoneWarning = 0
  private lastFocusWarning = 0
  private lastStatusUpdate = 0
  private readonly STATUS_UPDATE_INTERVAL = 1000
  private lastBrightnessUpdate = 0
  private readonly BRIGHTNESS_UPDATE_INTERVAL = 2000
  private readonly LOOKING_AWAY_GAZE_THRESHOLD = 0.65
  private readonly LOOKING_AWAY_HEAD_THRESHOLD = 0.8
  private readonly LOOKING_AWAY_GRACE_FRAMES = 5
  private lastBrightnessWarning = 0
  private lastViolationTime = 0
  private readonly SCORE_DECAY_INTERVAL = 3000
  private readonly SCORE_DECAY_AMOUNT = 2
  private violationCount = 0
  private readonly PAUSE_VIOLATION_THRESHOLD = 100
  private readonly CRITICAL_PAUSE_TYPES = new Set<ProctoringViolation['type']>(['TAB_SWITCH', 'FULLSCREEN_EXIT', 'PHONE_DETECTED', 'UNAUTHORIZED_DEVICE', 'WINDOW_BLUR'])

  // Adaptive ambient noise tracking
  private ambientNoiseLevel = 0
  private ambientSamplesCollected = 0
  private readonly AMBIENT_CALIBRATION_SAMPLES = 20
  private ambientCalibrated = false
  private readonly AMBIENT_ADAPT_RATE = 0.99
  private readonly AMBIENT_MARGIN = 6
  private readonly MIN_AUDIO_THRESHOLD = 5
  private readonly AMBIENT_UPDATE_INTERVAL = 500
  private readonly SPEECH_FREQ_BINS = 32
  private lastAmbientUpdate = 0

  private status: ProctoringStatus = {
    isActive: false,
    faceDetected: false,
    faceCount: 0,
    lookingAtScreen: true,
    audioLevel: 0,
    violations: [],
    tabSwitchCount: 0,
    windowBlurCount: 0,
    fullscreenExitCount: 0,
    isPaused: false,
    sessionRecording: false,
    identityVerified: false,
    suspiciousActivityScore: 0,
    attentionLevel: 100,
    environmentScore: 100,
    integrityScore: 100,
    brightness: 100,
    phoneDetected: false,
    bookDetected: false,
    deviceDetected: false,
    objectDetectionActive: false,
    objectDetectionError: null,
    lastDetectedDevices: [],
  }

  private onViolation: ((violation: ProctoringViolation) => void) | null = null
  private onStatusChange: ((status: ProctoringStatus) => void) | null = null
  private onPause: ((reason: string) => void) | null = null

  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private referenceFaceDescriptor: Float32Array | null = null
  private lastMousePosition = { x: 0, y: 0 }
  private suspiciousMouseCount = 0
  private copyPasteAttempts = 0
  private boundCopyHandler: ((e: ClipboardEvent) => void) | null = null
  private boundPasteHandler: ((e: ClipboardEvent) => void) | null = null
  private boundCutHandler: ((e: ClipboardEvent) => void) | null = null
  private boundContextMenuHandler: ((e: MouseEvent) => void) | null = null
  private boundKeyDownHandler: ((e: KeyboardEvent) => void) | null = null
  private boundResizeHandler: (() => void) | null = null

  // Screen security
  private originalGetDisplayMedia: any = null
  private screenSecurityInterval: number | null = null
  private lastKnownScreenWidth = 0
  private lastKnownScreenHeight = 0
  private lastKnownColorDepth = 0
  private readonly SCREEN_SECURITY_INTERVAL = 3000
  private rdpKeyboardCounter = 0
  private lastRDPViolation = 0
  private boundScreenKeyHandler: ((e: KeyboardEvent) => void) | null = null
  private lastScreenShareViolation = 0

  private MODEL_LOAD_TIMEOUT = 30000

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return

    try {
      this.visionResolver = await Promise.race([
        FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN),
        new Promise<any>((_, reject) =>
          setTimeout(
            () => reject(new Error('MediaPipe WASM load timeout')),
            this.MODEL_LOAD_TIMEOUT
          )
        ),
      ])

      this.faceLandmarker = await Promise.race([
        FaceLandmarker.createFromOptions(this.visionResolver, {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 3,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        }),
        new Promise<FaceLandmarker>((_, reject) =>
          setTimeout(
            () => reject(new Error('FaceLandmarker model load timeout')),
            this.MODEL_LOAD_TIMEOUT
          )
        ),
      ])

      this.modelsLoaded = true
    } catch (err) {
      console.warn('[Proctoring] MediaPipe init failed:', err)
      this.modelsLoaded = false
      throw err
    }
  }

  async initialize(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
    this.videoElement = video
    this.stream = stream
    await this.setupAudioMonitoring(stream)
  }

  private async setupAudioMonitoring(stream: MediaStream): Promise<void> {
    try {
      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) {
        console.warn('[Proctoring] No audio track in stream')
        return
      }
      this.audioContext = new AudioContext()
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      const source = this.audioContext.createMediaStreamSource(stream)
      const analyser = this.audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.minDecibels = -80
      analyser.maxDecibels = -10
      source.connect(analyser)
      this.audioAnalyser = analyser
      this.audioDataArray = new Uint8Array(analyser.frequencyBinCount)
    } catch (err) {
      console.warn('[Proctoring] Audio monitoring setup failed:', err)
    }
  }

  setOverlayCanvas(canvas: HTMLCanvasElement | null): void {
    this.overlayCanvas = canvas
  }

  private setupBlockingHandlers(): void {
    this.boundCopyHandler = (e: ClipboardEvent) => {
      e.preventDefault()
      this.copyPasteAttempts++
      this.addViolation({
        type: 'COPY_PASTE',
        severity: 'MEDIUM',
        message: 'Copy operation blocked — cheating attempt detected',
      })
    }
    this.boundPasteHandler = (e: ClipboardEvent) => {
      e.preventDefault()
      this.copyPasteAttempts++
      this.addViolation({
        type: 'COPY_PASTE',
        severity: 'MEDIUM',
        message: 'Paste operation blocked — cheating attempt detected',
      })
    }
    this.boundCutHandler = (e: ClipboardEvent) => {
      e.preventDefault()
    }
    this.boundContextMenuHandler = (e: MouseEvent) => {
      e.preventDefault()
    }
    this.boundKeyDownHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        if (e.key.toLowerCase() === 'v') {
          this.copyPasteAttempts++
          this.addViolation({
            type: 'COPY_PASTE',
            severity: 'MEDIUM',
            message: 'Paste blocked — cheating attempt detected',
          })
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault()
        if (e.key === 'PrintScreen') {
          this.addViolation({
            type: 'SUSPICIOUS_BEHAVIOR',
            severity: 'MEDIUM',
            message: 'Screenshot attempt detected and blocked',
          })
        }
      }
    }

    this.boundResizeHandler = () => {
      if (this.referenceWindowWidth === 0) {
        this.referenceWindowWidth = window.outerWidth
        this.referenceWindowHeight = window.outerHeight
      }
    }

    document.addEventListener('copy', this.boundCopyHandler)
    document.addEventListener('paste', this.boundPasteHandler)
    document.addEventListener('cut', this.boundCutHandler)
    document.addEventListener('contextmenu', this.boundContextMenuHandler)
    document.addEventListener('keydown', this.boundKeyDownHandler)
    document.addEventListener('resize', this.boundResizeHandler)
  }

  private removeBlockingHandlers(): void {
    if (this.boundCopyHandler) document.removeEventListener('copy', this.boundCopyHandler)
    if (this.boundPasteHandler) document.removeEventListener('paste', this.boundPasteHandler)
    if (this.boundCutHandler) document.removeEventListener('cut', this.boundCutHandler)
    if (this.boundContextMenuHandler)
      document.removeEventListener('contextmenu', this.boundContextMenuHandler)
    if (this.boundKeyDownHandler) document.removeEventListener('keydown', this.boundKeyDownHandler)
    if (this.boundResizeHandler) document.removeEventListener('resize', this.boundResizeHandler)
    this.boundCopyHandler = null
    this.boundPasteHandler = null
    this.boundCutHandler = null
    this.boundContextMenuHandler = null
    this.boundKeyDownHandler = null
    this.boundResizeHandler = null
  }

  private setupScreenSecurity(): void {
    this.originalGetDisplayMedia = (navigator.mediaDevices as any).getDisplayMedia
    if (this.originalGetDisplayMedia) {
      (navigator.mediaDevices as any).getDisplayMedia = () => {
        const now = Date.now()
        if (now - this.lastScreenShareViolation > 5000) {
          this.lastScreenShareViolation = now
          this.addViolation({
            type: 'SCREEN_SHARE',
            severity: 'CRITICAL',
            message: 'Screen sharing is not permitted during the exam',
          })
        }
        return Promise.reject(new Error('Screen sharing is disabled during exams'))
      }
    }

    this.lastKnownScreenWidth = screen.width
    this.lastKnownScreenHeight = screen.height
    this.lastKnownColorDepth = screen.colorDepth

    this.boundScreenKeyHandler = (e: KeyboardEvent) => {
      const SCANCODE_RDP_THRESHOLD = 3
      const rdpScancodes = [0x01, 0x3b, 0x3c, 0x3d, 0xc5]
      if ((e as any).scanCode && rdpScancodes.includes((e as any).scanCode)) {
        this.rdpKeyboardCounter++
        if (this.rdpKeyboardCounter > SCANCODE_RDP_THRESHOLD) {
          const now = Date.now()
          if (now - this.lastRDPViolation > 10000) {
            this.lastRDPViolation = now
            this.addViolation({
              type: 'SUSPICIOUS_BEHAVIOR',
              severity: 'CRITICAL',
              message: 'Remote desktop protocol (RDP) detected — exam terminated',
            })
            this.pauseExam('Remote desktop access detected. Please contact your proctor.')
          }
        }
      }
    }
    document.addEventListener('keydown', this.boundScreenKeyHandler)

    this.screenSecurityInterval = window.setInterval(() => {
      const now = Date.now()

      if (
        screen.width !== this.lastKnownScreenWidth ||
        screen.height !== this.lastKnownScreenHeight
      ) {
        const prevWidth = this.lastKnownScreenWidth
        const prevHeight = this.lastKnownScreenHeight
        this.lastKnownScreenWidth = screen.width
        this.lastKnownScreenHeight = screen.height
        this.addViolation({
          type: 'SUSPICIOUS_BEHAVIOR',
          severity: 'HIGH',
          message: `Screen resolution changed from ${prevWidth}x${prevHeight} to ${screen.width}x${screen.height}`,
        })
      }

      if (screen.colorDepth !== this.lastKnownColorDepth) {
        const oldDepth = this.lastKnownColorDepth
        this.lastKnownColorDepth = screen.colorDepth
        this.addViolation({
          type: 'SUSPICIOUS_BEHAVIOR',
          severity: 'HIGH',
          message: `Screen color depth changed from ${oldDepth}-bit to ${screen.colorDepth}-bit — possible remote desktop connection`,
        })
      }

      if (screen.width <= 800 || screen.height <= 600) {
        if (now - this.lastRDPViolation > 15000) {
          this.lastRDPViolation = now
          this.addViolation({
            type: 'SUSPICIOUS_BEHAVIOR',
            severity: 'HIGH',
            message: 'Low screen resolution detected — possible remote desktop connection',
          })
        }
      }
    }, this.SCREEN_SECURITY_INTERVAL)
  }

  private removeScreenSecurity(): void {
    if (this.originalGetDisplayMedia) {
      (navigator.mediaDevices as any).getDisplayMedia = this.originalGetDisplayMedia
      this.originalGetDisplayMedia = null
    }
    if (this.screenSecurityInterval !== null) {
      clearInterval(this.screenSecurityInterval)
      this.screenSecurityInterval = null
    }
    if (this.boundScreenKeyHandler) {
      document.removeEventListener('keydown', this.boundScreenKeyHandler)
      this.boundScreenKeyHandler = null
    }
    this.rdpKeyboardCounter = 0
  }

  startMonitoring(): void {
    if (this.isMonitoring) return
    this.isMonitoring = true
    this.status.isActive = true
    this.frameCount = 0
    this.ambientNoiseLevel = 0
    this.ambientSamplesCollected = 0
    this.ambientCalibrated = false
    this.lastAmbientUpdate = 0
    this.setupBlockingHandlers()
    this.setupScreenSecurity()
    this.processFrame()
  }

  stopMonitoring(): void {
    this.isMonitoring = false
    this.status.isActive = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    this.removeBlockingHandlers()
    this.removeScreenSecurity()
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring
  }

  async cleanup(): Promise<void> {
    this.stopMonitoring()
    this.stopRecording()
    if (this.audioContext) {
      await this.audioContext.close().catch(() => {})
      this.audioContext = null
    }
    this.faceLandmarker?.close()
    this.faceLandmarker = null
    this.modelsLoaded = false
    this.videoElement = null
    this.stream = null
    this.previousLandmarks = null
    if (this.objectDetectionRetryTimer !== null) {
      clearTimeout(this.objectDetectionRetryTimer)
      this.objectDetectionRetryTimer = null
    }
    this.objectDetectionConsecutiveFailures = 0
  }

  private processFrame = async (): Promise<void> => {
    if (!this.isMonitoring) return
    this.animFrameId = requestAnimationFrame(this.processFrame)
    this.frameCount++

    if (typeof document !== 'undefined') {
      const isHidden = document.hidden || !document.hasFocus()
      if (isHidden && !this.status.isPaused) {
        const now = Date.now()
        if (now - this.lastFocusWarning > 1000) {
          this.lastFocusWarning = now
          this.recordTabSwitch()
        }
        return
      }
    }

    if (!this.videoElement || this.videoElement.readyState < 2) return
    if (this.videoElement.videoWidth === 0) return

    // When detection is paused (exam paused by teacher/engine), skip all AI detection
    // but keep the frame loop alive for quick resume
    if (this.isDetectionPaused) {
      // Only update status periodically when paused - no detection work
      const now = Date.now()
      if (now - this.lastStatusUpdate > this.STATUS_UPDATE_INTERVAL) {
        this.lastStatusUpdate = now
        this.onStatusChange?.(this.status)
      }
      return
    }

    if (this.audioDataArray && this.audioAnalyser) {
      if (this.audioContext?.state === 'suspended') {
        try { await this.audioContext.resume() } catch {/* ignore */}
      }
      this.audioAnalyser.getByteFrequencyData(this.audioDataArray)
      const speechBins = this.audioDataArray.slice(0, this.SPEECH_FREQ_BINS)
      const avg = speechBins.reduce((a, b) => a + b, 0) / speechBins.length
      this.status.audioLevel = Math.round(avg)
    }

    if (this.faceLandmarker && this.frameCount % 3 === 0) {
      this.detectFace()
    }

    const now = Date.now()
    if (now - this.lastBrightnessUpdate > this.BRIGHTNESS_UPDATE_INTERVAL) {
      this.lastBrightnessUpdate = now
      this.status.brightness = this.getBrightness()
      this.status.environmentScore = Math.max(0, Math.min(100, Math.round((this.status.brightness / 255) * 100)))
    }

    const objNow = Date.now()
    if (objNow - this.lastObjectDetectTime >= this.OBJECT_DETECT_INTERVAL && !this.objectDetectScheduled) {
      this.lastObjectDetectTime = objNow
      this.objectDetectScheduled = true
      this.detectObjects().finally(() => {
        this.objectDetectScheduled = false
      })
    }

    this.checkHeadphoneDetection()
    this.checkDevTools()
    this.evaluateViolations()

    // Decay suspicious activity score when no violations occur
    if (this.status.suspiciousActivityScore > 0 && now - this.lastViolationTime > this.SCORE_DECAY_INTERVAL) {
      this.status.suspiciousActivityScore = Math.max(0, this.status.suspiciousActivityScore - this.SCORE_DECAY_AMOUNT)
      this.lastViolationTime = now
    }

    this.updateIntegrityScore()

    if (now - this.lastStatusUpdate > this.STATUS_UPDATE_INTERVAL) {
      this.lastStatusUpdate = now
      this.onStatusChange?.(this.status)
    }

    this.drawOverlay()
  }

  private detectFace(): void {
    if (!this.videoElement || !this.faceLandmarker) return
    try {
      const timestamp = performance.now()
      const result = this.faceLandmarker.detectForVideo(this.videoElement, timestamp)

      const faceCount = result.faceLandmarks?.length || 0
      this.status.faceCount = faceCount
      this.status.faceDetected = faceCount > 0

      // Compute face bounding boxes from normalized landmarks
      this.faceBoxes = []
      this.faceLandmarkPoints = []
      if (result.faceLandmarks) {
        for (const landmarks of result.faceLandmarks) {
          let minX = 1, minY = 1, maxX = 0, maxY = 0
          for (const lm of landmarks) {
            if (lm.x < minX) minX = lm.x
            if (lm.y < minY) minY = lm.y
            if (lm.x > maxX) maxX = lm.x
            if (lm.y > maxY) maxY = lm.y
          }
          const padX = (maxX - minX) * 0.15
          const padY = (maxY - minY) * 0.15
          this.faceBoxes.push({
            x: Math.max(0, minX - padX),
            y: Math.max(0, minY - padY),
            width: Math.min(1, maxX - minX + 2 * padX),
            height: Math.min(1, maxY - minY + 2 * padY),
          })

          const getPoint = (idx: number) => ({ x: landmarks[idx].x, y: landmarks[idx].y })
          this.faceLandmarkPoints.push({
            nose: [4, 6, 94].map(i => getPoint(i)),
            mouth: [0, 17, 61, 291].map(i => getPoint(i)),
            leftEye: [33, 133, 159, 145].map(i => getPoint(i)),
            rightEye: [263, 362, 386, 374].map(i => getPoint(i)),
            leftIris: landmarks[468] ? getPoint(468) : null,
            rightIris: landmarks[473] ? getPoint(473) : null,
          })
        }
      }

      if (faceCount > 0 && result.faceLandmarks) {
        this.consecutiveNoFace = 0
        this.previousLandmarks = result.faceLandmarks
        this.status.faceDetected = true

        const blendshapes = result.faceBlendshapes?.[0]
        const transformMatrix = result.facialTransformationMatrixes?.[0]
        if (blendshapes) {
          this.evaluateBlendshapes(blendshapes, transformMatrix)
        }
      } else {
        this.consecutiveNoFace++
        if (this.consecutiveNoFace > 10) {
          this.status.faceDetected = false
        }
        this.status.faceCount = 0
        this.status.lookingAtScreen = false
        this.faceBoxes = []
        this.faceLandmarkPoints = []
      }

      if (faceCount > 1) {
        this.consecutiveMultipleFace++
      } else {
        this.consecutiveMultipleFace = Math.max(0, this.consecutiveMultipleFace - 1)
      }
    } catch (err) {
      console.warn('[Proctoring] Face detection error:', err)
    }
  }

  private objectDetectionInProgress = false

  private objectDetectionRetryTimer: number | null = null
  private readonly OBJECT_DETECTION_RETRY_INTERVAL = 10000
  private objectDetectionConsecutiveFailures = 0

  private async detectObjects(): Promise<void> {
    if (!this.videoElement || this.objectDetectionInProgress) return
    if (this.videoElement.readyState < 2 || this.videoElement.videoWidth === 0) return
    this.objectDetectionInProgress = true
    try {
      this.status.objectDetectionActive = true
      this.status.objectDetectionError = null
      const result = await detectSuspiciousObjects(this.videoElement, 0.3)
      this.phoneDetected = result.phone
      this.bookDetected = result.book
      this.objectDetectionConsecutiveFailures = 0

      // Update device detection status
      const detectedDevices: string[] = []
      if (result.phone) detectedDevices.push('Phone')
      if (result.book) detectedDevices.push('Book/Laptop/Tablet')
      for (const obj of result.suspicious) {
        const label = obj.label.toLowerCase()
        if (label !== 'cell phone' && label !== 'book' && label !== 'laptop' && label !== 'tablet') {
          if (!detectedDevices.includes(label)) detectedDevices.push(label)
        }
      }

      this.status.phoneDetected = result.phone
      this.status.bookDetected = result.book
      this.status.deviceDetected = result.phone || result.book || result.suspicious.length > 0
      this.status.lastDetectedDevices = detectedDevices

      // Temporal filtering: require multiple consecutive detections
      if (result.phone) {
        this.consecutivePhoneDetected++
      } else {
        this.consecutivePhoneDetected = Math.max(0, this.consecutivePhoneDetected - 1)
      }
      if (result.book) {
        this.consecutiveBookDetected++
      } else {
        this.consecutiveBookDetected = Math.max(0, this.consecutiveBookDetected - 1)
      }

      const vw = this.videoElement.videoWidth || 1
      const vh = this.videoElement.videoHeight || 1
      this.objectBoxes = result.suspicious.map(obj => ({
        label: obj.label,
        score: obj.score,
        x: obj.bbox[0] / vw,
        y: obj.bbox[1] / vh,
        width: obj.bbox[2] / vw,
        height: obj.bbox[3] / vh,
      }))

      if (this.objectDetectionRetryTimer !== null) {
        clearTimeout(this.objectDetectionRetryTimer)
        this.objectDetectionRetryTimer = null
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.status.objectDetectionActive = false
      this.status.objectDetectionError = msg
      this.objectDetectionConsecutiveFailures++
      console.warn(`[Proctoring] Object detection failed (${this.objectDetectionConsecutiveFailures}x):`, msg)

      if (this.objectDetectionRetryTimer !== null) {
        clearTimeout(this.objectDetectionRetryTimer)
        this.objectDetectionRetryTimer = null
      }

      if (msg.includes('previously failed') || msg.includes('backend not available') || msg.includes('Failed to load')) {
        const retryDelay = Math.min(
          this.OBJECT_DETECTION_RETRY_INTERVAL * this.objectDetectionConsecutiveFailures,
          60000
        )
        console.warn(`[ObjectDetection] Will retry in ${retryDelay / 1000}s`)
        this.objectDetectionRetryTimer = window.setTimeout(() => {
          this.objectDetectionRetryTimer = null
          resetObjectDetector()
          this.lastObjectDetectTime = 0
          this.objectDetectScheduled = false
          this.objectDetectionConsecutiveFailures = 0
        }, retryDelay)
      } else {
        this.objectDetectScheduled = false
      }
    } finally {
      this.objectDetectionInProgress = false
    }
  }

  private drawOverlay(): void {
    if (!this.overlayCanvas || !this.videoElement) return
    const canvas = this.overlayCanvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }

    ctx.clearRect(0, 0, rect.width, rect.height)

    const vw = rect.width
    const vh = rect.height

    // Draw face boxes
    if (this.faceBoxes.length > 0) {
      const isMulti = this.faceBoxes.length > 1
      for (const box of this.faceBoxes) {
        ctx.strokeStyle = isMulti ? '#ef4444' : '#22c55e'
        ctx.lineWidth = isMulti ? 3 : 2.5
        ctx.strokeRect(box.x * vw, box.y * vh, box.width * vw, box.height * vh)

        // Face count label
        ctx.fillStyle = isMulti ? '#ef4444' : '#22c55e'
        ctx.font = 'bold 13px monospace'
        ctx.fillText(
          isMulti ? `Face ${this.faceBoxes.indexOf(box) + 1}` : 'Face',
          box.x * vw + 4,
          box.y * vh - 6
        )
      }
    } else {
      // No face � red dashed border around full frame
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 6])
      ctx.strokeRect(8, 8, vw - 16, vh - 16)
      ctx.setLineDash([])

      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 13px monospace'
      ctx.fillText('NO FACE DETECTED', 14, 28)
    }

    // ── Draw face landmarks (gaze / nose / mouth) ──
    if (this.faceLandmarkPoints.length > 0) {
      const fp = this.faceLandmarkPoints[0]

      // Nose points (blue)
      ctx.fillStyle = '#3b82f6'
      for (const p of fp.nose) {
        ctx.beginPath()
        ctx.arc(p.x * vw, p.y * vh, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Mouth points (blue)
      ctx.fillStyle = '#3b82f6'
      for (const p of fp.mouth) {
        ctx.beginPath()
        ctx.arc(p.x * vw, p.y * vh, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Eye corners (lighter blue)
      ctx.fillStyle = '#60a5fa'
      for (const p of [...fp.leftEye, ...fp.rightEye]) {
        ctx.beginPath()
        ctx.arc(p.x * vw, p.y * vh, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Iris centers (pink) — shows gaze direction
      if (fp.leftIris) {
        ctx.fillStyle = '#ec4899'
        ctx.beginPath()
        ctx.arc(fp.leftIris.x * vw, fp.leftIris.y * vh, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#be185d'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      if (fp.rightIris) {
        ctx.fillStyle = '#ec4899'
        ctx.beginPath()
        ctx.arc(fp.rightIris.x * vw, fp.rightIris.y * vh, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#be185d'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }

    // Draw object boxes in red
    for (const obj of this.objectBoxes) {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2.5
      ctx.strokeRect(obj.x * vw, obj.y * vh, obj.width * vw, obj.height * vh)

      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 12px monospace'
      const label = `${obj.label} ${Math.round(obj.score * 100)}%`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)'
      ctx.fillRect(obj.x * vw, obj.y * vh - 18, tw + 8, 18)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, obj.x * vw + 4, obj.y * vh - 4)
    }
  }

  private checkHeadphoneDetection(): void {
    if (!this.status.faceDetected) {
      this.consecutiveHeadphone = Math.max(0, this.consecutiveHeadphone - 1)
      return
    }
    const quietThreshold = Math.max(this.ambientNoiseLevel + 2, 3)
    const audioPresentThreshold = Math.max(this.ambientNoiseLevel + 10, 15)
    if (this.status.audioLevel < quietThreshold) {
      if (!this.status.lookingAtScreen) {
        this.consecutiveHeadphone++
      } else {
        this.consecutiveHeadphone = Math.max(0, this.consecutiveHeadphone - 1)
      }
    } else {
      this.consecutiveHeadphone = Math.max(0, this.consecutiveHeadphone - 3)
    }
    if (this.consecutiveHeadphone > 0 && this.status.audioLevel >= audioPresentThreshold) {
      this.consecutiveHeadphone = Math.max(0, this.consecutiveHeadphone - 10)
    }
  }

  private checkDevTools(): void {
    const widthDiff = Math.abs(window.outerWidth - window.innerWidth)
    const heightDiff = Math.abs(window.outerHeight - window.innerHeight)
    const dockedThreshold = 160
    const isDocked = widthDiff > dockedThreshold || heightDiff > dockedThreshold
    if (isDocked) {
      this.devToolsOpen = true
    } else {
      this.devToolsOpen = false
    }
  }

  private evaluateBlendshapes(blendshapes: any, transformationMatrix?: any): void {
    const shapeMap: Record<string, number> = {}
    const cats = blendshapes.categories
    if (cats && Array.isArray(cats)) {
      for (const cat of cats) {
        shapeMap[cat.categoryName] = cat.score
      }
    }

    const lookLeft = Math.max(shapeMap.eyeLookOutLeft || 0, shapeMap.eyeLookInRight || 0)
    const lookRight = Math.max(shapeMap.eyeLookOutRight || 0, shapeMap.eyeLookInLeft || 0)
    const lookUp = Math.max(shapeMap.eyeLookUpLeft || 0, shapeMap.eyeLookUpRight || 0)
    const lookDown = Math.max(shapeMap.eyeLookDownLeft || 0, shapeMap.eyeLookDownRight || 0)

    let headDeviation = 0
    let headPitch = 0
    let headYaw = 0
    let headRoll = 0

    if (transformationMatrix?.data) {
      const m = transformationMatrix.data
      headYaw = Math.atan2(m[4], m[0])
      headPitch = Math.atan2(-m[8], Math.sqrt(m[9] * m[9] + m[10] * m[10]))
      headRoll = Math.atan2(m[9], m[10])
      headDeviation = Math.max(
        Math.abs(headPitch) / 0.5,
        Math.abs(headYaw) / 0.5,
        Math.abs(headRoll) / 0.5
      )
    } else {
      const headDown = shapeMap.headDown || 0
      const headUp = shapeMap.headUp || 0
      const headLeft = shapeMap.headLeft || 0
      const headRight = shapeMap.headRight || 0
      const headTilt = Math.max(shapeMap.headTiltLeft || 0, shapeMap.headTiltRight || 0)
      headDeviation = Math.max(headLeft, headRight, headDown, headUp, headTilt)
    }

    const gazeX = lookRight - lookLeft
    const gazeY = lookDown - lookUp
    const gazeMagnitude = Math.sqrt(gazeX * gazeX + gazeY * gazeY)

    const isLookingAtScreen =
      gazeMagnitude < this.LOOKING_AWAY_GAZE_THRESHOLD &&
      headDeviation < this.LOOKING_AWAY_HEAD_THRESHOLD

    if (isLookingAtScreen) {
      this.consecutiveLookingAway = Math.max(0, this.consecutiveLookingAway - 2)
      this.status.lookingAtScreen = true
    } else {
      this.consecutiveLookingAway++
      this.status.lookingAtScreen = this.consecutiveLookingAway < this.LOOKING_AWAY_GRACE_FRAMES
    }

    const attentionPenalty =
      gazeMagnitude * 40 + (headDeviation > 1 ? Math.min(headDeviation * 30, 60) : 0)
    this.status.attentionLevel = Math.max(0, Math.min(100, 100 - attentionPenalty))
  }

  private getAudioThreshold(): number {
    return Math.max(this.ambientNoiseLevel + this.AMBIENT_MARGIN, this.MIN_AUDIO_THRESHOLD)
  }

  private updateAmbientNoise(now: number): void {
    if (now - this.lastAmbientUpdate < this.AMBIENT_UPDATE_INTERVAL) return
    this.lastAmbientUpdate = now

    if (!this.ambientCalibrated) {
      this.ambientNoiseLevel =
        (this.ambientNoiseLevel * this.ambientSamplesCollected + this.status.audioLevel) /
        (this.ambientSamplesCollected + 1)
      this.ambientSamplesCollected++
      if (this.ambientSamplesCollected >= this.AMBIENT_CALIBRATION_SAMPLES) {
        this.ambientCalibrated = true
      }
      return
    }

    // Slow adaptation: only update when audio is near ambient (no active vocal/sound event)
    if (this.status.audioLevel < this.ambientNoiseLevel + 3) {
      this.ambientNoiseLevel =
        this.ambientNoiseLevel * this.AMBIENT_ADAPT_RATE +
        this.status.audioLevel * (1 - this.AMBIENT_ADAPT_RATE)
    }
  }

  private evaluateViolations(): void {
    const now = Date.now()
    const SAME_VIOLATION_COOLDOWN = 3000

    this.updateAmbientNoise(now)

    if (!this.status.faceDetected && this.consecutiveNoFace > 15) {
      if (now - this.lastNoFaceWarning > SAME_VIOLATION_COOLDOWN) {
        this.lastNoFaceWarning = now
        this.addViolation({
          type: 'NO_FACE',
          severity: this.consecutiveNoFace > 60 ? 'HIGH' : 'MEDIUM',
          message: 'Face not detected — please ensure you are visible to the camera',
          metadata: { attentionScore: this.status.attentionLevel },
        })
      }
    }

    if (this.status.faceCount > 1 && this.consecutiveMultipleFace > 5) {
      if (now - this.lastMultipleFaceWarning > SAME_VIOLATION_COOLDOWN) {
        this.lastMultipleFaceWarning = now
        this.addViolation({
          type: 'MULTIPLE_FACES',
          severity: 'HIGH',
          message: `${this.status.faceCount} faces detected — only one person should be visible`,
          metadata: { faceCount: this.status.faceCount },
        })
      }
    }

    if (!this.status.lookingAtScreen && this.consecutiveLookingAway > 60) {
      if (now - this.lastLookingAwayWarning > 6000) {
        this.lastLookingAwayWarning = now
        this.addViolation({
          type: 'FACE_NOT_LOOKING',
          severity: this.consecutiveLookingAway > 120 ? 'HIGH' : 'MEDIUM',
          message: 'You are looking away from the screen',
          metadata: { attentionScore: this.status.attentionLevel },
        })
      }
    }

    const audioThreshold = this.getAudioThreshold()
    if (this.status.audioLevel > audioThreshold) {
      this.consecutiveAudio++
      if (this.consecutiveAudio > 5 && now - this.lastAudioWarning > SAME_VIOLATION_COOLDOWN) {
        this.lastAudioWarning = now
        this.addViolation({
          type: 'AUDIO_DETECTED',
          severity: this.status.audioLevel > audioThreshold + 40 ? 'HIGH' : 'LOW',
          message: `Sustained audio detected (level: ${this.status.audioLevel})`,
          metadata: { audioLevel: this.status.audioLevel },
        })
      }
    } else {
      this.consecutiveAudio = Math.max(0, this.consecutiveAudio - 1)
    }

    if (this.consecutivePhoneDetected >= 2 && now - this.lastPhoneWarning > SAME_VIOLATION_COOLDOWN) {
      this.lastPhoneWarning = now
      this.addViolation({
        type: 'PHONE_DETECTED',
        severity: 'CRITICAL',
        message: 'Cell phone detected in camera view — please remove all electronic devices immediately',
      })
    }

    if (this.consecutiveBookDetected >= 2 && now - this.lastBookWarning > SAME_VIOLATION_COOLDOWN) {
      this.lastBookWarning = now
      this.addViolation({
        type: 'UNAUTHORIZED_DEVICE',
        severity: 'HIGH',
        message: this.consecutiveBookDetected > 5
          ? 'Electronic device or book detected on desk — exam may be terminated if not removed'
          : 'Book or laptop detected near exam area — please clear your desk',
      })
    }

    if (
      this.consecutiveHeadphone > 60 &&
      now - this.lastHeadphoneWarning > SAME_VIOLATION_COOLDOWN
    ) {
      this.lastHeadphoneWarning = now
      this.addViolation({
        type: 'HEADPHONE_DETECTED',
        severity: 'LOW',
        message: 'Possible headphones/earbuds detected',
        metadata: { audioLevel: this.status.audioLevel },
      })
      this.consecutiveHeadphone = Math.max(0, this.consecutiveHeadphone - 30)
    }

    const musicLow = Math.max(this.ambientNoiseLevel + 8, 10)
    const musicHigh = Math.max(this.ambientNoiseLevel + 40, 50)
    if (this.status.audioLevel >= musicLow && this.status.audioLevel <= musicHigh) {
      this.consecutiveMusic++
      if (this.consecutiveMusic > 15 && now - this.lastMusicWarning > SAME_VIOLATION_COOLDOWN) {
        this.lastMusicWarning = now
        this.addViolation({
          type: 'AUDIO_DETECTED',
          severity: 'LOW',
          message: `Sustained moderate audio — possible background music/playback (level: ${this.status.audioLevel})`,
          metadata: { audioLevel: this.status.audioLevel },
        })
        this.consecutiveMusic = Math.max(0, this.consecutiveMusic - 8)
      }
    } else {
      this.consecutiveMusic = Math.max(0, this.consecutiveMusic - 2)
    }

    if (this.devToolsOpen && now - this.lastDevToolsWarning > SAME_VIOLATION_COOLDOWN) {
      this.lastDevToolsWarning = now
      this.addViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        severity: 'HIGH',
        message: 'Developer tools window detected — close all developer tools immediately',
      })
    }

    if (
      this.status.brightness > 0 &&
      this.status.brightness < 45 &&
      now - this.lastBrightnessWarning > 10000
    ) {
      this.lastBrightnessWarning = now
      this.addViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        severity: 'LOW',
        message: 'Low lighting detected — improve room lighting for accurate proctoring',
        metadata: { brightnessLevel: this.status.brightness },
      })
    }

    if (
      !this.status.objectDetectionActive &&
      this.status.objectDetectionError &&
      now - this.lastObjectDetectTime > 15000
    ) {
      if (this.objectDetectionConsecutiveFailures > 3) {
        console.warn(`[Proctoring] Object detection unavailable for ${Math.round((now - this.lastObjectDetectTime) / 1000)}s. Face + audio monitoring still active.`)
      }
    }
  }

  private addViolation(base: {
    type: ProctoringViolation['type']
    severity: ProctoringViolation['severity']
    message: string
    metadata?: any
  }): void {
    const violation: ProctoringViolation = {
      ...base,
      timestamp: new Date(),
    }

    this.status.violations = [...this.status.violations, violation].slice(-50)
    this.lastViolationTime = Date.now()
    this.violationCount++

    const severityWeight =
      base.severity === 'CRITICAL'
        ? 15
        : base.severity === 'HIGH'
          ? 10
          : base.severity === 'MEDIUM'
            ? 5
            : 2
    this.status.suspiciousActivityScore = Math.min(
      100,
      this.status.suspiciousActivityScore + severityWeight
    )

    this.onViolation?.(violation)

    // Pause only for specific critical violations or when total violations reach threshold.
    const isCriticalPauseType = this.CRITICAL_PAUSE_TYPES.has(base.type)
    if (
      !this.status.isPaused &&
      (isCriticalPauseType || this.violationCount >= this.PAUSE_VIOLATION_THRESHOLD)
    ) {
      const pauseReason = isCriticalPauseType
        ? base.message
        : `Excessive violations (${this.violationCount}) detected. Contact your proctor.`
      this.pauseExam(pauseReason)
    }

    soundAlerts.playLowAlert()
  }

  private updateIntegrityScore(): void {
    const faceScore = this.status.faceDetected ? 40 : 0
    const attentionScore = this.status.lookingAtScreen ? 30 : this.status.attentionLevel * 0.3
    const violationPenalty = Math.min(30, this.status.suspiciousActivityScore * 0.3)
    const environmentScore = this.status.environmentScore * 0.1

    this.status.integrityScore = Math.max(
      0,
      Math.min(100, faceScore + attentionScore + environmentScore - violationPenalty)
    )
  }

  pauseExam(reason: string): void {
    if (this.status.isPaused && this.status.pauseReason === reason) return
    this.status.isPaused = true
    this.status.pauseReason = reason
    this.isDetectionPaused = true
    this.onPause?.(reason)
  }

  resumeExam(): void {
    this.status.isPaused = false
    this.status.pauseReason = undefined
    this.isDetectionPaused = false
    this.ambientNoiseLevel = 0
    this.ambientSamplesCollected = 0
    this.ambientCalibrated = false
    this.lastAmbientUpdate = 0
  }

  pauseMonitoring(): void {
    this.isDetectionPaused = true
    this.status.isPaused = true
  }

  resumeMonitoring(): void {
    this.isDetectionPaused = false
    this.status.isPaused = false
    this.status.pauseReason = undefined
    this.ambientNoiseLevel = 0
    this.ambientSamplesCollected = 0
    this.ambientCalibrated = false
    this.lastAmbientUpdate = 0
  }

  isMonitoringPaused(): boolean {
    return this.isDetectionPaused
  }

  recordTabSwitch(): void {
    this.status.tabSwitchCount++
    this.addViolation({
      type: 'TAB_SWITCH',
      severity: 'CRITICAL',
      message: 'Tab switch detected',
    })
  }

  recordWindowBlur(): void {
    this.status.windowBlurCount++
    this.addViolation({
      type: 'WINDOW_BLUR',
      severity: 'CRITICAL',
      message: 'Window focus lost',
    })
  }

  recordFullscreenExit(): void {
    this.status.fullscreenExitCount++
    this.addViolation({
      type: 'FULLSCREEN_EXIT',
      severity: 'CRITICAL',
      message: 'Fullscreen mode exited',
    })
  }

  recordWindowMinimize(): void {
    this.addViolation({
      type: 'WINDOW_MINIMIZED',
      severity: 'MEDIUM',
      message: 'Window minimized or resized',
    })
  }

  async captureReferenceFace(): Promise<string | null> {
    if (!this.videoElement) return null
    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.videoElement.videoWidth || 640
      canvas.height = this.videoElement.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(this.videoElement, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch {
      return null
    }
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  getBrightness(): number {
    if (!this.videoElement || this.videoElement.readyState < 2) return 0
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return 100
      canvas.width = 32
      canvas.height = 24
      ctx.drawImage(this.videoElement, 0, 0, 32, 24)
      const data = ctx.getImageData(0, 0, 32, 24).data
      let sum = 0
      for (let i = 0; i < data.length; i += 4) {
        sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
      }
      return Math.round(sum / (data.length / 4))
    } catch {
      return 100
    }
  }

  enableRecording(): void {
    if (!this.stream || this.mediaRecorder) return
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm;codecs=vp9' })
      this.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data)
          if (this.recordedChunks.length > 12) this.recordedChunks.shift()
        }
      }
      this.mediaRecorder.start(5000)
      this.status.sessionRecording = true
    } catch {
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' })
        this.mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) {
            this.recordedChunks.push(e.data)
            if (this.recordedChunks.length > 12) this.recordedChunks.shift()
          }
        }
        this.mediaRecorder.start(5000)
        this.status.sessionRecording = true
      } catch {
        /* noop */
      }
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    this.mediaRecorder = null
    this.status.sessionRecording = false
  }

  getAudioFrequencyData(): number[] {
    if (!this.audioAnalyser || !this.audioDataArray) return []
    this.audioAnalyser.getByteFrequencyData(this.audioDataArray)
    return Array.from(this.audioDataArray)
  }

  getAudioLevel(): number {
    return this.status.audioLevel
  }

  getStatus(): ProctoringStatus {
    return { ...this.status }
  }

  setOnViolation(cb: (v: ProctoringViolation) => void): void {
    this.onViolation = cb
  }
  setOnStatusChange(cb: (s: ProctoringStatus) => void): void {
    this.onStatusChange = cb
  }
  setOnPause(cb: (reason: string) => void): void {
    this.onPause = cb
  }
}

export default ProctoringEngine
