import { FaceLandmarker, ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import { soundAlerts } from './soundAlerts'

export interface ProctoringViolation {
  type: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_NOT_LOOKING' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'AUDIO_DETECTED' | 'SUSPICIOUS_BEHAVIOR' | 'FACE_CHANGED' | 'COPY_PASTE' | 'MOUSE_LEFT_SCREEN' | 'RAPID_CLICKING' | 'PHONE_DETECTED' | 'HEADPHONE_DETECTED' | 'UNAUTHORIZED_DEVICE' | 'SCREEN_SHARE' | 'WINDOW_MINIMIZED' | 'PIP_DETECTED'
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
}

const MEDIAPIPE_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const FACE_LANDMARKER_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
const OBJECT_DETECTOR_MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.task'

class ProctoringEngine {
  private videoElement: HTMLVideoElement | null = null
  private audioContext: AudioContext | null = null
  private audioAnalyser: AnalyserNode | null = null
  private audioDataArray: Uint8Array<ArrayBuffer> | null = null
  private stream: MediaStream | null = null

  private faceLandmarker: FaceLandmarker | null = null
  private objectDetector: ObjectDetector | null = null
  private visionResolver: any = null
  private modelsLoaded = false
  private isMonitoring = false
  private animFrameId: number | null = null
  private frameCount = 0
  private previousLandmarks: any[] | null = null
  private lastObjectDetectTime = 0
  private readonly OBJECT_DETECT_INTERVAL = 3000
  private phoneDetected = false
  private bookDetected = false
  private consecutiveHeadphone = 0
  private lastPhoneWarning = 0
  private lastBookWarning = 0
  private lastDevToolsWarning = 0
  private lastScreenshotWarning = 0
  private devToolsOpen = false
  private referenceWindowWidth = 0
  private referenceWindowHeight = 0

  private consecutiveNoFace = 0
  private consecutiveMultipleFace = 0
  private consecutiveLookingAway = 0
  private consecutiveAudio = 0
  private lastNoFaceWarning = 0
  private lastMultipleFaceWarning = 0
  private lastLookingAwayWarning = 0
  private lastAudioWarning = 0
  private lastHeadphoneWarning = 0
  private lastStatusUpdate = 0
  private readonly STATUS_UPDATE_INTERVAL = 1000

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

  private MODEL_LOAD_TIMEOUT = 30000

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return

    try {
      this.visionResolver = await Promise.race([
        FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('MediaPipe WASM load timeout')), this.MODEL_LOAD_TIMEOUT)
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
          setTimeout(() => reject(new Error('FaceLandmarker model load timeout')), this.MODEL_LOAD_TIMEOUT)
        ),
      ])

      try {
        this.objectDetector = await ObjectDetector.createFromOptions(this.visionResolver, {
          baseOptions: {
            modelAssetPath: OBJECT_DETECTOR_MODEL,
            delegate: 'GPU',
          },
          scoreThreshold: 0.4,
          maxResults: 5,
          runningMode: 'IMAGE',
        })
      } catch (objErr) {
        console.warn('[Proctoring] Object detector init failed (non-fatal):', objErr)
      }

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
    this.setupAudioMonitoring(stream)
  }

  private setupAudioMonitoring(stream: MediaStream): void {
    try {
      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) return
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(stream)
      const analyser = this.audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      this.audioAnalyser = analyser
      this.audioDataArray = new Uint8Array(analyser.frequencyBinCount)
    } catch { }
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
    if (this.boundContextMenuHandler) document.removeEventListener('contextmenu', this.boundContextMenuHandler)
    if (this.boundKeyDownHandler) document.removeEventListener('keydown', this.boundKeyDownHandler)
    if (this.boundResizeHandler) document.removeEventListener('resize', this.boundResizeHandler)
    this.boundCopyHandler = null
    this.boundPasteHandler = null
    this.boundCutHandler = null
    this.boundContextMenuHandler = null
    this.boundKeyDownHandler = null
    this.boundResizeHandler = null
  }

  startMonitoring(): void {
    if (this.isMonitoring) return
    this.isMonitoring = true
    this.status.isActive = true
    this.frameCount = 0
    this.setupBlockingHandlers()
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
    this.objectDetector?.close()
    this.objectDetector = null
    this.modelsLoaded = false
    this.videoElement = null
    this.stream = null
    this.previousLandmarks = null
  }

  private processFrame = (): void => {
    if (!this.isMonitoring) return
    this.animFrameId = requestAnimationFrame(this.processFrame)
    this.frameCount++

    if (!this.videoElement || this.videoElement.readyState < 2) return
    if (this.videoElement.videoWidth === 0) return

    if (this.audioDataArray && this.audioAnalyser) {
      this.audioAnalyser.getByteFrequencyData(this.audioDataArray)
      const avg = this.audioDataArray.reduce((a, b) => a + b, 0) / this.audioDataArray.length
      this.status.audioLevel = Math.round(avg)
    }

    if (this.faceLandmarker && this.frameCount % 3 === 0) {
      this.detectFace()
    }

    this.status.brightness = this.getBrightness()

    if (this.objectDetector && this.frameCount % 60 === 0) {
      this.detectObjects()
    }

    this.checkHeadphoneDetection()
    this.checkDevTools()
    this.evaluateViolations()
    this.updateIntegrityScore()

    const now = Date.now()
    if (now - this.lastStatusUpdate > this.STATUS_UPDATE_INTERVAL) {
      this.lastStatusUpdate = now
      this.onStatusChange?.(this.status)
    }
  }

  private detectFace(): void {
    if (!this.videoElement || !this.faceLandmarker) return
    try {
      const timestamp = performance.now()
      const result = this.faceLandmarker.detectForVideo(this.videoElement, timestamp)

      const faceCount = result.faceLandmarks?.length || 0
      this.status.faceCount = faceCount
      this.status.faceDetected = faceCount > 0

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

  private detectObjects(): void {
    if (!this.videoElement || !this.objectDetector) return
    try {
      const result = this.objectDetector.detect(this.videoElement)
      this.phoneDetected = false
      this.bookDetected = false
      for (const detection of result.detections) {
        const cat = detection.categories[0]
        if (!cat) continue
        const label = cat.categoryName.toLowerCase()
        if (label === 'cell phone') this.phoneDetected = true
        if (label === 'book' || label === 'laptop') this.bookDetected = true
      }
    } catch (err) {
      console.warn('[Proctoring] Object detection error:', err)
    }
  }

  private checkHeadphoneDetection(): void {
    if (!this.status.faceDetected) {
      this.consecutiveHeadphone = Math.max(0, this.consecutiveHeadphone - 1)
      return
    }
    if (this.status.audioLevel < 5 && this.status.faceDetected) {
      this.consecutiveHeadphone++
    } else {
      this.consecutiveHeadphone = Math.max(0, this.consecutiveHeadphone - 1)
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

    const isLookingAtScreen = gazeMagnitude < 0.15 && headDeviation < 0.15
    this.status.lookingAtScreen = isLookingAtScreen

    const attentionPenalty = gazeMagnitude * 40 + (headDeviation > 1 ? Math.min(headDeviation * 30, 60) : 0)
    this.status.attentionLevel = Math.max(0, Math.min(100, 100 - attentionPenalty))

    if (!isLookingAtScreen) {
      this.consecutiveLookingAway++
    } else {
      this.consecutiveLookingAway = Math.max(0, this.consecutiveLookingAway - 1)
    }
  }

  private evaluateViolations(): void {
    const now = Date.now()
    const SAME_VIOLATION_COOLDOWN = 3000

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

    if (!this.status.lookingAtScreen && this.consecutiveLookingAway > 10) {
      if (now - this.lastLookingAwayWarning > SAME_VIOLATION_COOLDOWN) {
        this.lastLookingAwayWarning = now
        this.addViolation({
          type: 'FACE_NOT_LOOKING',
          severity: this.consecutiveLookingAway > 30 ? 'HIGH' : 'MEDIUM',
          message: 'You are looking away from the screen',
          metadata: { attentionScore: this.status.attentionLevel },
        })
      }
    }

    if (this.status.audioLevel > 30) {
      this.consecutiveAudio++
      if (this.consecutiveAudio > 20 && now - this.lastAudioWarning > SAME_VIOLATION_COOLDOWN) {
        this.lastAudioWarning = now
        this.addViolation({
          type: 'AUDIO_DETECTED',
          severity: this.status.audioLevel > 60 ? 'HIGH' : 'LOW',
          message: `Sustained audio detected (level: ${this.status.audioLevel})`,
          metadata: { audioLevel: this.status.audioLevel },
        })
      }
    } else {
      this.consecutiveAudio = Math.max(0, this.consecutiveAudio - 1)
    }

    if (this.phoneDetected && now - this.lastPhoneWarning > SAME_VIOLATION_COOLDOWN) {
      this.lastPhoneWarning = now
      this.addViolation({
        type: 'PHONE_DETECTED',
        severity: 'HIGH',
        message: 'Cell phone detected in camera view — please remove all electronic devices',
      })
    }

    if (this.bookDetected && now - this.lastBookWarning > SAME_VIOLATION_COOLDOWN) {
      this.lastBookWarning = now
      this.addViolation({
        type: 'UNAUTHORIZED_DEVICE',
        severity: 'MEDIUM',
        message: 'Book or laptop detected near exam area — please clear your desk',
      })
    }

    if (this.consecutiveHeadphone > 150 && now - this.lastHeadphoneWarning > SAME_VIOLATION_COOLDOWN) {
      this.lastHeadphoneWarning = now
      this.addViolation({
        type: 'HEADPHONE_DETECTED',
        severity: 'MEDIUM',
        message: 'Possible headphones detected — consistently low ambient audio while face is visible',
        metadata: { audioLevel: this.status.audioLevel },
      })
      this.consecutiveHeadphone = 0
    }

    if (this.devToolsOpen && now - this.lastDevToolsWarning > SAME_VIOLATION_COOLDOWN) {
      this.lastDevToolsWarning = now
      this.addViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        severity: 'HIGH',
        message: 'Developer tools window detected — close all developer tools immediately',
      })
    }
  }

  private addViolation(base: { type: ProctoringViolation['type']; severity: ProctoringViolation['severity']; message: string; metadata?: any }): void {
    const violation: ProctoringViolation = {
      ...base,
      timestamp: new Date(),
    }

    this.status.violations = [...this.status.violations, violation].slice(-50)

    let severityWeight = base.severity === 'CRITICAL' ? 15 : base.severity === 'HIGH' ? 10 : base.severity === 'MEDIUM' ? 5 : 2
    this.status.suspiciousActivityScore = Math.min(100, this.status.suspiciousActivityScore + severityWeight)

    this.onViolation?.(violation)

    if (this.status.suspiciousActivityScore > 80) {
      this.pauseExam('Excessive suspicious activity detected. Contact your proctor.')
    }

    soundAlerts.playLowAlert()
  }

  private updateIntegrityScore(): void {
    const faceScore = this.status.faceDetected ? 40 : 0
    const attentionScore = this.status.lookingAtScreen ? 30 : this.status.attentionLevel * 0.3
    const violationPenalty = Math.min(30, this.status.suspiciousActivityScore * 0.3)
    const environmentScore = this.status.environmentScore * 0.1

    this.status.integrityScore = Math.max(0, Math.min(100, faceScore + attentionScore + environmentScore - violationPenalty))
  }

  pauseExam(reason: string): void {
    this.status.isPaused = true
    this.status.pauseReason = reason
    this.onPause?.(reason)
  }

  resumeExam(): void {
    this.status.isPaused = false
    this.status.pauseReason = undefined
  }

  recordTabSwitch(): void {
    this.status.tabSwitchCount++
    this.addViolation({
      type: 'TAB_SWITCH',
      severity: 'HIGH',
      message: 'Tab switch detected',
    })
  }

  recordWindowBlur(): void {
    this.status.windowBlurCount++
    this.addViolation({
      type: 'WINDOW_BLUR',
      severity: 'MEDIUM',
      message: 'Window focus lost',
    })
  }

  recordFullscreenExit(): void {
    this.status.fullscreenExitCount++
    this.addViolation({
      type: 'FULLSCREEN_EXIT',
      severity: 'HIGH',
      message: 'Fullscreen mode exited',
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
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data)
      }
      this.mediaRecorder.start(5000)
      this.status.sessionRecording = true
    } catch {
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' })
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.recordedChunks.push(e.data)
        }
        this.mediaRecorder.start(5000)
        this.status.sessionRecording = true
      } catch { }
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    this.mediaRecorder = null
    this.status.sessionRecording = false
  }

  setOnViolation(cb: (v: ProctoringViolation) => void): void { this.onViolation = cb }
  setOnStatusChange(cb: (s: ProctoringStatus) => void): void { this.onStatusChange = cb }
  setOnPause(cb: (reason: string) => void): void { this.onPause = cb }
}

export default ProctoringEngine
