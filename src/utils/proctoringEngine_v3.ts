/**
 * Enhanced AI Proctoring Engine V3 - Ultra Advanced
 * Cutting-edge AI detection with behavioral analysis and pattern recognition
 */

import * as faceapi from 'face-api.js'
import { soundAlerts } from './soundAlerts'

// Enhanced violation types with more specific detections
export type ViolationType = 
  | 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_NOT_LOOKING' | 'TAB_SWITCH' | 'WINDOW_BLUR' 
  | 'FULLSCREEN_EXIT' | 'AUDIO_DETECTED' | 'SUSPICIOUS_BEHAVIOR' | 'FACE_CHANGED' 
  | 'COPY_PASTE' | 'MOUSE_LEFT_SCREEN' | 'RAPID_CLICKING' | 'PHONE_DETECTED' 
  | 'HEADPHONE_DETECTED' | 'UNAUTHORIZED_DEVICE' | 'EYE_TRACKING_ANOMALY'
  | 'HAND_GESTURE_DETECTED' | 'OBJECT_IN_HAND' | 'BACKGROUND_MOVEMENT'
  | 'LIGHTING_CHANGE' | 'PERSON_LEFT_FRAME' | 'SCREEN_REFLECTION'
  | 'MOUTH_MOVEMENT' | 'HEAD_POSITION_ANOMALY' | 'RAPID_HEAD_MOVEMENT'
  | 'PROLONGED_LOOK_AWAY' | 'SUSPICIOUS_EYE_PATTERN' | 'UNUSUAL_POSTURE'

export interface EnhancedProctoringViolation {
  type: ViolationType
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: Date
  message: string
  evidence?: string
  metadata?: {
    audioLevel?: number
    faceCount?: number
    faceConfidence?: number
    brightnessLevel?: number
    attentionScore?: number
    gazeDirection?: { x: number; y: number }
    eyeAspectRatio?: number
    mouthAspectRatio?: number
    headPose?: { pitch: number; yaw: number; roll: number }
    emotionalState?: string
    handDetected?: boolean
    objectDetected?: boolean
    backgroundMotion?: number
  }
}

export interface BehavioralPattern {
  type: 'NORMAL' | 'SUSPICIOUS' | 'CHEATING_LIKELY'
  confidence: number
  indicators: string[]
  timeline: Date[]
  riskScore: number
}

export interface AdvancedProctoringStatus {
  isActive: boolean
  faceDetected: boolean
  faceCount: number
  lookingAtScreen: boolean
  audioLevel: number
  violations: EnhancedProctoringViolation[]
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
  
  // Advanced metrics
  eyeTrackingQuality: number
  headStability: number
  behavioralPattern: BehavioralPattern
  emotionalStability: number
  focusConsistency: number
  anomalyDetectionScore: number
  mlPredictedCheatingProbability: number
}

export interface EyeGazeData {
  leftEye: { x: number; y: number; isOpen: boolean }
  rightEye: { x: number; y: number; isOpen: boolean }
  gazeDirection: { x: number; y: number; angle: number }
  attentionScore: number
  blinkRate: number
  gazeStability: number
}

export interface HeadPoseData {
  pitch: number  // up/down tilt
  yaw: number    // left/right rotation
  roll: number   // side tilt
  stability: number
  rapidMovement: boolean
}

class EnhancedProctoringEngine {
  private videoElement: HTMLVideoElement | null = null
  private audioContext: AudioContext | null = null
  private audioAnalyser: AnalyserNode | null = null
  private audioDataArray: Uint8Array<ArrayBuffer> | null = null
  private stream: MediaStream | null = null
  
  private modelsLoaded = false
  private isMonitoring = false
  private isShuttingDown = false
  
  // Enhanced intervals
  private faceDetectionInterval: number | null = null
  private audioMonitoringInterval: number | null = null
  private brightnessCheckInterval: number | null = null
  private eyeTrackingInterval: number | null = null
  private behaviorAnalysisInterval: number | null = null
  
  // Tracking data
  private lastNoFaceWarning = 0
  private lastMultipleFaceWarning = 0
  private lastLookingAwayWarning = 0
  private lastAudioWarning = 0
  private consecutiveNoFace = 0
  private consecutiveAudio = 0
  private consecutiveLookAway = 0
  
  // Behavioral tracking
  private gazeHistory: EyeGazeData[] = []
  private headPoseHistory: HeadPoseData[] = []
  private blinkHistory: { timestamp: Date; duration: number }[] = []
  private audioActivityHistory: number[] = []
  private brightnessHistory: number[] = []
  
  // ML-based tracking
  private suspiciousPatterns: BehavioralPattern[] = []
  private anomalyScores: number[] = []
  
  private status: AdvancedProctoringStatus = {
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
    eyeTrackingQuality: 100,
    headStability: 100,
    behavioralPattern: {
      type: 'NORMAL',
      confidence: 100,
      indicators: [],
      timeline: [],
      riskScore: 0
    },
    emotionalStability: 100,
    focusConsistency: 100,
    anomalyDetectionScore: 0,
    mlPredictedCheatingProbability: 0
  }

  private onViolation: ((violation: EnhancedProctoringViolation) => void) | null = null
  private onStatusChange: ((status: AdvancedProctoringStatus) => void) | null = null
  private onPause: ((reason: string) => void) | null = null
  private onAnomalyDetected: ((anomaly: BehavioralPattern) => void) | null = null
  
  private referenceFaceDescriptor: Float32Array | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  
  // Canvas for computer vision processing
  private canvasElement: HTMLCanvasElement | null = null
  private canvasContext: CanvasRenderingContext2D | null = null

  /**
   * Load face detection models
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) {
      console.log('✅ AI models already loaded')
      return
    }

    try {
      console.log('📦 Loading advanced AI models...')
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
      
      const loadWithTimeout = (promise: Promise<any>, timeout = 30000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model load timeout')), timeout)
          )
        ])
      }

      await loadWithTimeout(
        Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ])
      )

      this.modelsLoaded = true
      console.log('✅ All AI models loaded successfully')
      console.log('   ✓ Face Detection')
      console.log('   ✓ Facial Landmarks')
      console.log('   ✓ Expression Recognition')
      console.log('   ✓ Face Recognition')
      console.log('   ✓ Age/Gender Detection')
    } catch (error) {
      console.error('❌ Failed to load AI models:', error)
      throw new Error('Failed to initialize AI proctoring system')
    }
  }

  /**
   * Initialize proctoring
   */
  async initialize(videoElement: HTMLVideoElement): Promise<MediaStream> {
    try {
      this.videoElement = videoElement

      if (!this.modelsLoaded) {
        await this.loadModels()
      }

      // Request high-quality camera and microphone
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 1280, ideal: 1920, max: 3840 },
          height: { min: 720, ideal: 1080, max: 2160 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      })

      this.videoElement.srcObject = this.stream
      await this.videoElement.play()

      await new Promise((resolve) => {
        const checkReady = () => {
          if (this.videoElement!.readyState >= 2) {
            resolve(true)
          } else {
            this.videoElement!.onloadeddata = () => resolve(true)
          }
        }
        checkReady()
      })

      // Setup canvas for computer vision
      this.canvasElement = document.createElement('canvas')
      this.canvasElement.width = this.videoElement.videoWidth
      this.canvasElement.height = this.videoElement.videoHeight
      this.canvasContext = this.canvasElement.getContext('2d')

      this.setupAudioMonitoring()
      this.status.isActive = true
      this.notifyStatusChange()

      console.log('✅ Enhanced AI proctoring initialized')
      return this.stream
    } catch (error) {
      console.error('Initialization failed:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Setup audio monitoring with advanced analysis
   */
  private setupAudioMonitoring(): void {
    if (!this.stream) return

    try {
      this.audioContext = new AudioContext({ sampleRate: 48000 })
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }
      
      const audioSource = this.audioContext.createMediaStreamSource(this.stream)
      this.audioAnalyser = this.audioContext.createAnalyser()
      this.audioAnalyser.fftSize = 4096 // Higher resolution
      this.audioAnalyser.smoothingTimeConstant = 0.2
      this.audioAnalyser.minDecibels = -90
      this.audioAnalyser.maxDecibels = -10
      
      audioSource.connect(this.audioAnalyser)
      this.audioDataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount)

      console.log('✅ Advanced audio analysis ready')
    } catch (error) {
      console.error('❌ Audio setup failed:', error)
    }
  }

  /**
   * Start enhanced monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return

    if (!this.videoElement || !this.modelsLoaded) {
      console.error('❌ Cannot start: Missing requirements')
      return
    }

    this.isMonitoring = true
    soundAlerts.playNotification()

    // High-frequency face detection (1.5s)
    this.faceDetectionInterval = window.setInterval(() => {
      this.advancedFaceDetection()
    }, 1500)

    // Audio monitoring (50ms for real-time detection)
    this.audioMonitoringInterval = window.setInterval(() => {
      this.advancedAudioAnalysis()
    }, 50)

    // Brightness and environment check (3s)
    this.brightnessCheckInterval = window.setInterval(() => {
      this.environmentAnalysis()
    }, 3000)

    // Eye tracking analysis (500ms)
    this.eyeTrackingInterval = window.setInterval(() => {
      this.eyeTrackingAnalysis()
    }, 500)

    // Behavioral pattern analysis (10s)
    this.behaviorAnalysisInterval = window.setInterval(() => {
      this.analyzeBehavioralPatterns()
    }, 10000)

    console.log('🚀 Enhanced AI monitoring started')
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false

    const intervals = [
      this.faceDetectionInterval,
      this.audioMonitoringInterval,
      this.brightnessCheckInterval,
      this.eyeTrackingInterval,
      this.behaviorAnalysisInterval
    ]

    intervals.forEach(interval => {
      if (interval) clearInterval(interval)
    })

    this.faceDetectionInterval = null
    this.audioMonitoringInterval = null
    this.brightnessCheckInterval = null
    this.eyeTrackingInterval = null
    this.behaviorAnalysisInterval = null
  }

  /**
   * Advanced face detection with deep analysis
   */
  private async advancedFaceDetection(): Promise<void> {
    if (this.isShuttingDown || !this.videoElement || !this.isMonitoring) return

    try {
      if (this.modelsLoaded && this.videoElement.readyState >= 2) {
        const detections = await faceapi
          .detectAllFaces(this.videoElement, new faceapi.TinyFaceDetectorOptions({
            inputSize: 608, // Maximum accuracy
            scoreThreshold: 0.5
          }))
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender()

        const faceCount = detections.length
        this.status.faceCount = faceCount
        this.status.faceDetected = faceCount > 0

        if (faceCount === 0) {
          await this.handleNoFace()
        } else if (faceCount > 1) {
          await this.handleMultipleFaces(faceCount)
        } else {
          await this.handleSingleFace(detections[0])
        }

        this.updateAdvancedScores()
        this.notifyStatusChange()
      }
    } catch (error) {
      console.error('Face detection error:', error)
    }
  }

  /**
   * Handle no face detected
   */
  private async handleNoFace(): Promise<void> {
    this.consecutiveNoFace++
    this.consecutiveLookAway = 0
    
    if (this.consecutiveNoFace >= 3) { // 4.5 seconds
      const now = Date.now()
      if (now - this.lastNoFaceWarning > 8000) {
        this.addViolation({
          type: 'NO_FACE',
          severity: this.consecutiveNoFace >= 6 ? 'CRITICAL' : 'HIGH',
          timestamp: new Date(),
          message: `⚠️ No face detected for ${(this.consecutiveNoFace * 1.5).toFixed(1)}s`,
          metadata: { faceCount: 0, attentionScore: 0 }
        })
        this.lastNoFaceWarning = now
      }
    }
    
    // Check if person left frame entirely
    if (this.consecutiveNoFace >= 10) {
      this.addViolation({
        type: 'PERSON_LEFT_FRAME',
        severity: 'CRITICAL',
        timestamp: new Date(),
        message: '🚨 Person left frame - Exam integrity compromised'
      })
    }
    
    this.status.lookingAtScreen = false
  }

  /**
   * Handle multiple faces
   */
  private async handleMultipleFaces(count: number): Promise<void> {
    this.consecutiveNoFace = 0
    
    const now = Date.now()
    if (now - this.lastMultipleFaceWarning > 8000) {
      this.addViolation({
        type: 'MULTIPLE_FACES',
        severity: 'CRITICAL',
        timestamp: new Date(),
        message: `🚨 ${count} people detected - Unauthorized assistance`,
        metadata: { faceCount: count }
      })
      this.lastMultipleFaceWarning = now
    }
  }

  /**
   * Handle single face with deep analysis
   */
  private async handleSingleFace(detection: any): Promise<void> {
    this.consecutiveNoFace = 0
    const landmarks = detection.landmarks
    const expressions = detection.expressions
    const age = detection.age
    const gender = detection.gender

    // Advanced gaze analysis
    const gazeData = this.analyzeAdvancedGaze(landmarks)
    this.gazeHistory.push(gazeData)
    if (this.gazeHistory.length > 100) this.gazeHistory.shift()

    // Head pose estimation
    const headPose = this.estimateHeadPose(landmarks)
    this.headPoseHistory.push(headPose)
    if (this.headPoseHistory.length > 50) this.headPoseHistory.shift()

    // Emotional state analysis
    const emotionalState = this.analyzeEmotionalState(expressions)
    
    // Detect suspicious behaviors
    await this.detectSuspiciousBehaviors(gazeData, headPose, emotionalState)

    // Update looking status
    this.status.lookingAtScreen = gazeData.attentionScore >= 60

    if (!this.status.lookingAtScreen) {
      this.consecutiveLookAway++
      
      if (this.consecutiveLookAway >= 4) { // 6 seconds
        const now = Date.now()
        if (now - this.lastLookingAwayWarning > 10000) {
          this.addViolation({
            type: this.consecutiveLookAway >= 8 ? 'PROLONGED_LOOK_AWAY' : 'FACE_NOT_LOOKING',
            severity: this.consecutiveLookAway >= 8 ? 'HIGH' : 'MEDIUM',
            timestamp: new Date(),
            message: `👀 Looking away for ${(this.consecutiveLookAway * 1.5).toFixed(1)}s`,
            metadata: { 
              attentionScore: gazeData.attentionScore,
              gazeDirection: gazeData.gazeDirection
            }
          })
          this.lastLookingAwayWarning = now
        }
      }
    } else {
      this.consecutiveLookAway = 0
    }

    // Identity verification
    await this.verifyIdentity(detection)
  }

  /**
   * Analyze advanced gaze with eye tracking
   */
  private analyzeAdvancedGaze(landmarks: faceapi.FaceLandmarks68): EyeGazeData {
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    const nose = landmarks.getNose()

    // Calculate Eye Aspect Ratio for both eyes
    const leftEAR = this.calculateEyeAspectRatio(leftEye)
    const rightEAR = this.calculateEyeAspectRatio(rightEye)
    const avgEAR = (leftEAR + rightEAR) / 2

    // Blink detection
    const blinking = avgEAR < 0.18
    if (blinking) {
      this.blinkHistory.push({ timestamp: new Date(), duration: 150 })
      if (this.blinkHistory.length > 50) this.blinkHistory.shift()
    }

    // Eye centers
    const leftEyeCenter = this.getCenterPoint(leftEye)
    const rightEyeCenter = this.getCenterPoint(rightEye)
    const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2
    const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2

    // Gaze direction calculation
    const noseCenter = this.getCenterPoint(nose)
    const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x)
    
    const gazeX = (noseCenter.x - eyeCenterX) / eyeDistance
    const gazeY = (noseCenter.y - eyeCenterY) / eyeDistance
    const gazeAngle = Math.atan2(gazeY, gazeX) * (180 / Math.PI)

    // Attention score calculation
    const horizontalFocus = Math.abs(gazeX) < 0.15
    const verticalFocus = Math.abs(gazeY) < 0.2
    const eyesOpen = avgEAR > 0.2
    
    let attentionScore = 100
    if (!eyesOpen) attentionScore -= 40
    if (!horizontalFocus) attentionScore -= 30
    if (!verticalFocus) attentionScore -= 20
    if (Math.abs(leftEAR - rightEAR) > 0.1) attentionScore -= 10

    // Gaze stability (low variance = stable gaze)
    const recentGazes = this.gazeHistory.slice(-10)
    const gazeStability = recentGazes.length > 0 
      ? 100 - (this.calculateVariance(recentGazes.map(g => g.gazeDirection.x)) * 100)
      : 100

    // Blink rate (normal: 15-20 per minute)
    const recentBlinks = this.blinkHistory.filter(b => 
      Date.now() - b.timestamp.getTime() < 60000
    )
    const blinkRate = recentBlinks.length

    return {
      leftEye: { x: leftEyeCenter.x, y: leftEyeCenter.y, isOpen: leftEAR > 0.2 },
      rightEye: { x: rightEyeCenter.x, y: rightEyeCenter.y, isOpen: rightEAR > 0.2 },
      gazeDirection: { x: gazeX, y: gazeY, angle: gazeAngle },
      attentionScore: Math.max(0, attentionScore),
      blinkRate,
      gazeStability: Math.max(0, Math.min(100, gazeStability))
    }
  }

  /**
   * Estimate head pose (pitch, yaw, roll)
   */
  private estimateHeadPose(landmarks: faceapi.FaceLandmarks68): HeadPoseData {
    const nose = landmarks.getNose()
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    const jawline = landmarks.getJawOutline()
    const mouth = landmarks.getMouth()

    const noseCenter = this.getCenterPoint(nose)
    const leftEyeCenter = this.getCenterPoint(leftEye)
    const rightEyeCenter = this.getCenterPoint(rightEye)
    const jawCenter = this.getCenterPoint(jawline)
    const mouthCenter = this.getCenterPoint(mouth)

    const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x)
    const faceHeight = Math.abs(noseCenter.y - jawCenter.y)

    // Yaw (left/right rotation)
    const yaw = ((noseCenter.x - ((leftEyeCenter.x + rightEyeCenter.x) / 2)) / eyeDistance) * 90
    
    // Pitch (up/down tilt)
    const pitch = ((noseCenter.y - ((leftEyeCenter.y + rightEyeCenter.y) / 2)) / faceHeight) * 60
    
    // Roll (side tilt)
    const roll = Math.atan2(
      rightEyeCenter.y - leftEyeCenter.y,
      rightEyeCenter.x - leftEyeCenter.x
    ) * (180 / Math.PI)

    // Stability calculation
    const recentPoses = this.headPoseHistory.slice(-10)
    const stability = recentPoses.length > 0
      ? 100 - (
          this.calculateVariance(recentPoses.map(p => p.pitch)) +
          this.calculateVariance(recentPoses.map(p => p.yaw)) +
          this.calculateVariance(recentPoses.map(p => p.roll))
        ) * 10
      : 100

    // Rapid movement detection
    const rapidMovement = recentPoses.length >= 2 &&
      Math.abs(pitch - recentPoses[recentPoses.length - 1].pitch) > 15 ||
      Math.abs(yaw - recentPoses[recentPoses.length - 1].yaw) > 15

    return {
      pitch,
      yaw,
      roll,
      stability: Math.max(0, Math.min(100, stability)),
      rapidMovement
    }
  }

  /**
   * Analyze emotional state from expressions
   */
  private analyzeEmotionalState(expressions: any): string {
    const expressionArray = [
      { name: 'neutral', value: expressions.neutral },
      { name: 'happy', value: expressions.happy },
      { name: 'sad', value: expressions.sad },
      { name: 'angry', value: expressions.angry },
      { name: 'fearful', value: expressions.fearful },
      { name: 'disgusted', value: expressions.disgusted },
      { name: 'surprised', value: expressions.surprised }
    ]

    const dominant = expressionArray.reduce((max, exp) => 
      exp.value > max.value ? exp : max
    )

    // Track emotional stability
    const emotionalVariety = expressionArray.filter(e => e.value > 0.2).length
    this.status.emotionalStability = emotionalVariety <= 2 ? 100 : 100 - (emotionalVariety * 15)

    return dominant.name
  }

  /**
   * Detect suspicious behaviors using AI
   */
  private async detectSuspiciousBehaviors(
    gazeData: EyeGazeData,
    headPose: HeadPoseData,
    emotionalState: string
  ): Promise<void> {
    const suspiciousIndicators: string[] = []

    // 1. Rapid eye movements (reading from notes)
    if (gazeData.gazeStability < 40) {
      suspiciousIndicators.push('Rapid eye movements detected')
      this.addViolation({
        type: 'SUSPICIOUS_EYE_PATTERN',
        severity: 'MEDIUM',
        timestamp: new Date(),
        message: '👁️ Suspicious eye movement pattern detected',
        metadata: { attentionScore: gazeData.gazeStability }
      })
    }

    // 2. Abnormal blink rate (stress/concentration on external source)
    if (gazeData.blinkRate > 30 || gazeData.blinkRate < 5) {
      suspiciousIndicators.push(`Abnormal blink rate: ${gazeData.blinkRate}/min`)
    }

    // 3. Extreme head pose (looking at phone/notes)
    if (Math.abs(headPose.pitch) > 25 || Math.abs(headPose.yaw) > 30) {
      suspiciousIndicators.push('Unusual head position')
      this.addViolation({
        type: 'HEAD_POSITION_ANOMALY',
        severity: 'MEDIUM',
        timestamp: new Date(),
        message: '📐 Abnormal head position detected',
        metadata: { 
          headPose: {
            pitch: headPose.pitch,
            yaw: headPose.yaw,
            roll: headPose.roll
          }
        }
      })
    }

    // 4. Rapid head movements (checking surroundings)
    if (headPose.rapidMovement) {
      suspiciousIndicators.push('Rapid head movements')
      this.addViolation({
        type: 'RAPID_HEAD_MOVEMENT',
        severity: 'LOW',
        timestamp: new Date(),
        message: '🔄 Rapid head movement detected'
      })
    }

    // 5. Prolonged look away pattern
    const recentGazes = this.gazeHistory.slice(-20)
    const lookAwayCount = recentGazes.filter(g => g.attentionScore < 60).length
    if (lookAwayCount > 15) {
      suspiciousIndicators.push('Frequent looking away')
    }

    // Update suspicious activity score
    if (suspiciousIndicators.length > 0) {
      this.status.suspiciousActivityScore = Math.min(100, 
        this.status.suspiciousActivityScore + suspiciousIndicators.length * 10
      )
    } else {
      this.status.suspiciousActivityScore = Math.max(0,
        this.status.suspiciousActivityScore - 5
      )
    }
  }

  /**
   * Advanced audio analysis with speech and pattern detection
   */
  private advancedAudioAnalysis(): void {
    if (!this.audioAnalyser || !this.audioDataArray || !this.isMonitoring || this.isShuttingDown) return

    this.audioAnalyser.getByteFrequencyData(this.audioDataArray)

    // Enhanced audio metrics
    const timeData = new Uint8Array(this.audioAnalyser.fftSize)
    this.audioAnalyser.getByteTimeDomainData(timeData)

    // RMS calculation
    let sumSquares = 0
    for (let i = 0; i < this.audioDataArray.length; i++) {
      sumSquares += this.audioDataArray[i] * this.audioDataArray[i]
    }
    const rms = Math.sqrt(sumSquares / this.audioDataArray.length)

    // Spectral analysis
    const lowFreq = this.audioDataArray.slice(0, 85).reduce((a, b) => a + b, 0) / 85
    const midFreq = this.audioDataArray.slice(85, 170).reduce((a, b) => a + b, 0) / 85
    const highFreq = this.audioDataArray.slice(170, 255).reduce((a, b) => a + b, 0) / 85

    // Speech detection (human voice: 85-255 Hz dominant)
    const speechLikelihood = (midFreq + highFreq) / (lowFreq + 1)
    const isSpeech = speechLikelihood > 1.5 && rms > 20

    this.status.audioLevel = rms
    this.audioActivityHistory.push(rms)
    if (this.audioActivityHistory.length > 100) this.audioActivityHistory.shift()

    if (isSpeech) {
      this.consecutiveAudio++
      
      if (this.consecutiveAudio >= 4) { // 200ms of speech
        const now = Date.now()
        if (now - this.lastAudioWarning > 8000) {
          this.addViolation({
            type: 'AUDIO_DETECTED',
            severity: this.consecutiveAudio >= 10 ? 'HIGH' : 'MEDIUM',
            timestamp: new Date(),
            message: `🔊 Speech detected (${Math.round(rms)} dB) - Remain silent`,
            metadata: { 
              audioLevel: rms,
              attentionScore: speechLikelihood * 50
            }
          })
          this.lastAudioWarning = now
        }
      }
    } else {
      this.consecutiveAudio = Math.max(0, this.consecutiveAudio - 1)
    }
  }

  /**
   * Environment analysis (brightness, background)
   */
  private environmentAnalysis(): void {
    if (!this.videoElement || !this.canvasContext || this.isShuttingDown) return

    try {
      this.canvasContext.drawImage(
        this.videoElement, 
        0, 0, 
        this.canvasElement!.width, 
        this.canvasElement!.height
      )
      
      const imageData = this.canvasContext.getImageData(
        0, 0, 
        this.canvasElement!.width, 
        this.canvasElement!.height
      )
      
      const brightness = this.calculateBrightness(imageData)
      this.brightnessHistory.push(brightness)
      if (this.brightnessHistory.length > 20) this.brightnessHistory.shift()

      // Detect sudden lighting changes
      if (this.brightnessHistory.length >= 2) {
        const lastBrightness = this.brightnessHistory[this.brightnessHistory.length - 2]
        const brightnessDelta = Math.abs(brightness - lastBrightness)
        
        if (brightnessDelta > 50) {
          this.addViolation({
            type: 'LIGHTING_CHANGE',
            severity: 'LOW',
            timestamp: new Date(),
            message: '💡 Sudden lighting change detected',
            metadata: { brightnessLevel: brightness }
          })
        }
      }

      // Detect background movement (requires more complex CV)
      const backgroundMotion = this.detectBackgroundMotion(imageData)
      if (backgroundMotion > 30) {
        this.addViolation({
          type: 'BACKGROUND_MOVEMENT',
          severity: 'MEDIUM',
          timestamp: new Date(),
          message: '🚶 Background movement detected',
          metadata: { backgroundMotion }
        })
      }

      // Update environment score
      this.status.environmentScore = brightness > 50 && brightness < 200 ? 100 : 70
    } catch (error) {
      console.error('Environment analysis error:', error)
    }
  }

  /**
   * Calculate brightness from image data
   */
  private calculateBrightness(imageData: ImageData): number {
    const data = imageData.data
    let sum = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      sum += (r + g + b) / 3
    }
    
    return sum / (data.length / 4)
  }

  /**
   * Detect background motion (simplified)
   */
  private detectBackgroundMotion(imageData: ImageData): number {
    // Simplified motion detection
    // In production, use optical flow or frame differencing
    return 0
  }

  /**
   * Eye tracking quality analysis
   */
  private eyeTrackingAnalysis(): void {
    if (this.gazeHistory.length < 10) return

    const recentGazes = this.gazeHistory.slice(-20)
    
    // Calculate gaze stability
    const xVariance = this.calculateVariance(recentGazes.map(g => g.gazeDirection.x))
    const yVariance = this.calculateVariance(recentGazes.map(g => g.gazeDirection.y))
    const overallStability = 100 - ((xVariance + yVariance) * 100)
    
    this.status.eyeTrackingQuality = Math.max(0, Math.min(100, overallStability))
    
    // Head stability
    if (this.headPoseHistory.length >= 10) {
      const avgStability = this.headPoseHistory.slice(-10)
        .reduce((sum, pose) => sum + pose.stability, 0) / 10
      this.status.headStability = avgStability
    }
    
    // Focus consistency
    const focusedCount = recentGazes.filter(g => g.attentionScore >= 70).length
    this.status.focusConsistency = (focusedCount / recentGazes.length) * 100
  }

  /**
   * Analyze behavioral patterns using ML-like approach
   */
  private analyzeBehavioralPatterns(): void {
    const indicators: string[] = []
    let riskScore = 0

    // 1. Analyze gaze patterns
    if (this.gazeHistory.length >= 50) {
      const lowAttentionCount = this.gazeHistory.filter(g => g.attentionScore < 50).length
      const lowAttentionRatio = lowAttentionCount / this.gazeHistory.length
      
      if (lowAttentionRatio > 0.4) {
        indicators.push('Frequent inattention')
        riskScore += 25
      }
    }

    // 2. Analyze audio patterns
    if (this.audioActivityHistory.length >= 50) {
      const highAudioCount = this.audioActivityHistory.filter(a => a > 20).length
      const audioRatio = highAudioCount / this.audioActivityHistory.length
      
      if (audioRatio > 0.3) {
        indicators.push('Frequent audio activity')
        riskScore += 30
      }
    }

    // 3. Analyze violation frequency
    const recentViolations = this.status.violations.filter(v => 
      Date.now() - v.timestamp.getTime() < 300000 // Last 5 minutes
    )
    
    if (recentViolations.length > 10) {
      indicators.push('High violation frequency')
      riskScore += 35
    }

    // 4. Critical violations
    const criticalCount = recentViolations.filter(v => v.severity === 'CRITICAL').length
    if (criticalCount > 0) {
      indicators.push(`${criticalCount} critical violations`)
      riskScore += criticalCount * 20
    }

    // Determine pattern type
    let patternType: 'NORMAL' | 'SUSPICIOUS' | 'CHEATING_LIKELY' = 'NORMAL'
    let confidence = 100 - riskScore

    if (riskScore > 60) {
      patternType = 'CHEATING_LIKELY'
      confidence = riskScore
    } else if (riskScore > 30) {
      patternType = 'SUSPICIOUS'
      confidence = riskScore
    }

    const pattern: BehavioralPattern = {
      type: patternType,
      confidence,
      indicators,
      timeline: recentViolations.map(v => v.timestamp),
      riskScore: Math.min(100, riskScore)
    }

    this.status.behavioralPattern = pattern
    this.status.anomalyDetectionScore = riskScore

    // ML-based cheating probability (simplified)
    this.status.mlPredictedCheatingProbability = Math.min(100,
      riskScore * 0.6 +
      (100 - this.status.focusConsistency) * 0.2 +
      (this.status.suspiciousActivityScore) * 0.2
    )

    if (patternType !== 'NORMAL' && this.onAnomalyDetected) {
      this.onAnomalyDetected(pattern)
    }

    // Store pattern
    this.suspiciousPatterns.push(pattern)
    if (this.suspiciousPatterns.length > 50) this.suspiciousPatterns.shift()
  }

  /**
   * Verify identity with reference face
   */
  private async verifyIdentity(detection: any): Promise<void> {
    if (!this.referenceFaceDescriptor) {
      // Capture reference on first detection
      this.referenceFaceDescriptor = detection.descriptor
      this.status.identityVerified = true
      return
    }

    const currentDescriptor = detection.descriptor
    if (!currentDescriptor) return

    const distance = faceapi.euclideanDistance(
      this.referenceFaceDescriptor,
      currentDescriptor
    )

    // Threshold: 0.6 indicates different person
    if (distance > 0.6) {
      this.addViolation({
        type: 'FACE_CHANGED',
        severity: 'CRITICAL',
        timestamp: new Date(),
        message: '🚨 Identity verification failed - Different person detected',
        metadata: { faceConfidence: (1 - distance) * 100 }
      })
      this.status.identityVerified = false
    } else {
      this.status.identityVerified = true
    }
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(arr: number[]): number {
    if (arr.length === 0) return 0
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length
    const squaredDiffs = arr.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / arr.length
  }

  /**
   * Calculate Eye Aspect Ratio
   */
  private calculateEyeAspectRatio(eye: faceapi.Point[]): number {
    try {
      const p1 = eye[0], p2 = eye[1], p3 = eye[2]
      const p4 = eye[3], p5 = eye[4], p6 = eye[5]

      const v1 = this.euclideanDistance(p2, p6)
      const v2 = this.euclideanDistance(p3, p5)
      const h = this.euclideanDistance(p1, p4)

      return (v1 + v2) / (2.0 * h)
    } catch (error) {
      return 0.3
    }
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(p1: faceapi.Point, p2: faceapi.Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  /**
   * Get center point
   */
  private getCenterPoint(points: faceapi.Point[]): { x: number; y: number } {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 })

    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    }
  }

  /**
   * Update advanced scores
   */
  private updateAdvancedScores(): void {
    // Attention level
    if (this.status.lookingAtScreen && this.status.faceDetected) {
      this.status.attentionLevel = Math.min(100, this.status.attentionLevel + 2)
    } else {
      this.status.attentionLevel = Math.max(0, this.status.attentionLevel - 3)
    }

    // Integrity score
    const violationPenalty = this.status.violations.length * 3
    const criticalPenalty = this.status.violations.filter(v => v.severity === 'CRITICAL').length * 10
    this.status.integrityScore = Math.max(0, 100 - violationPenalty - criticalPenalty)
  }

  /**
   * Add violation
   */
  private addViolation(violation: EnhancedProctoringViolation): void {
    this.status.violations.push(violation)
    
    if (this.onViolation) {
      this.onViolation(violation)
    }

    // Play appropriate alert
    switch (violation.severity) {
      case 'CRITICAL':
        soundAlerts.playHighAlert()
        break
      case 'HIGH':
        soundAlerts.playHighAlert()
        break
      case 'MEDIUM':
        soundAlerts.playMediumAlert()
        break
      case 'LOW':
        soundAlerts.playLowAlert()
        break
    }

    this.updateAdvancedScores()
    this.notifyStatusChange()
  }

  /**
   * Notify status change
   */
  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange({ ...this.status })
    }
  }

  /**
   * Set callbacks
   */
  setOnViolation(callback: (violation: EnhancedProctoringViolation) => void): void {
    this.onViolation = callback
  }

  setOnStatusChange(callback: (status: AdvancedProctoringStatus) => void): void {
    this.onStatusChange = callback
  }

  setOnPause(callback: (reason: string) => void): void {
    this.onPause = callback
  }

  setOnAnomalyDetected(callback: (anomaly: BehavioralPattern) => void): void {
    this.onAnomalyDetected = callback
  }

  /**
   * Pause exam
   */
  pauseExam(reason: string): void {
    this.status.isPaused = true
    this.status.pauseReason = reason
    
    if (this.onPause) {
      this.onPause(reason)
    }
    
    this.notifyStatusChange()
  }

  /**
   * Resume exam
   */
  resumeExam(): void {
    this.status.isPaused = false
    this.status.pauseReason = undefined
    this.notifyStatusChange()
  }

  /**
   * Enable session recording
   */
  enableRecording(): void {
    if (!this.stream) return

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(1000)
      this.status.sessionRecording = true
      console.log('✅ HD recording started')
    } catch (error) {
      console.error('Recording failed:', error)
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
      this.mediaRecorder = null
      this.status.sessionRecording = false
    }
  }

  /**
   * Get recording
   */
  getRecording(): Blob | null {
    if (this.recordedChunks.length === 0) return null
    return new Blob(this.recordedChunks, { type: 'video/webm' })
  }

  /**
   * Get status
   */
  getStatus(): AdvancedProctoringStatus {
    return { ...this.status }
  }

  /**
   * Get comprehensive analytics
   */
  getComprehensiveAnalytics() {
    return {
      violations: {
        total: this.status.violations.length,
        byType: this.groupViolationsByType(),
        bySeverity: this.groupViolationsBySeverity(),
        timeline: this.getViolationTimeline()
      },
      behavioral: {
        pattern: this.status.behavioralPattern,
        anomalyScore: this.status.anomalyDetectionScore,
        cheatingProbability: this.status.mlPredictedCheatingProbability
      },
      attention: {
        level: this.status.attentionLevel,
        consistency: this.status.focusConsistency,
        gazeQuality: this.status.eyeTrackingQuality
      },
      environment: {
        score: this.status.environmentScore,
        headStability: this.status.headStability,
        emotionalStability: this.status.emotionalStability
      },
      integrity: {
        score: this.status.integrityScore,
        identityVerified: this.status.identityVerified,
        riskLevel: this.calculateRiskLevel()
      }
    }
  }

  /**
   * Group violations by type
   */
  private groupViolationsByType(): Record<string, number> {
    const groups: Record<string, number> = {}
    this.status.violations.forEach(v => {
      groups[v.type] = (groups[v.type] || 0) + 1
    })
    return groups
  }

  /**
   * Group violations by severity
   */
  private groupViolationsBySeverity(): Record<string, number> {
    const groups: Record<string, number> = {}
    this.status.violations.forEach(v => {
      groups[v.severity] = (groups[v.severity] || 0) + 1
    })
    return groups
  }

  /**
   * Get violation timeline
   */
  private getViolationTimeline() {
    return this.status.violations.map(v => ({
      type: v.type,
      severity: v.severity,
      timestamp: v.timestamp,
      message: v.message
    }))
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const score = this.status.mlPredictedCheatingProbability
    
    if (score >= 75) return 'CRITICAL'
    if (score >= 50) return 'HIGH'
    if (score >= 25) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Record tab switch
   */
  recordTabSwitch(): void {
    this.status.tabSwitchCount++
    this.addViolation({
      type: 'TAB_SWITCH',
      severity: this.status.tabSwitchCount >= 5 ? 'CRITICAL' : 'HIGH',
      timestamp: new Date(),
      message: `🔄 Tab switched (#${this.status.tabSwitchCount})`
    })
  }

  /**
   * Record window blur
   */
  recordWindowBlur(): void {
    this.status.windowBlurCount++
    this.addViolation({
      type: 'WINDOW_BLUR',
      severity: this.status.windowBlurCount >= 5 ? 'CRITICAL' : 'MEDIUM',
      timestamp: new Date(),
      message: `👆 Clicked outside (#${this.status.windowBlurCount})`
    })
  }

  /**
   * Record fullscreen exit
   */
  recordFullscreenExit(): void {
    this.status.fullscreenExitCount++
    this.addViolation({
      type: 'FULLSCREEN_EXIT',
      severity: 'CRITICAL',
      timestamp: new Date(),
      message: `⛔ Exited fullscreen (#${this.status.fullscreenExitCount})`
    })
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.isShuttingDown = true
    this.stopMonitoring()
    this.stopRecording()

    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop()
        }
      } catch (err) {
        console.error('MediaRecorder stop error:', err)
      }
      this.mediaRecorder = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop()
        if (track.readyState !== 'ended') {
          setTimeout(() => track.stop(), 100)
        }
      })
      this.stream = null
    }

    if (this.videoElement) {
      if (!this.videoElement.paused) this.videoElement.pause()
      if (this.videoElement.srcObject) {
        const stream = this.videoElement.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
      this.videoElement.srcObject = null
      this.videoElement.src = ''
      this.videoElement.load()
      this.videoElement = null
    }

    if (this.audioContext) {
      await this.audioContext.close().catch(console.error)
      this.audioContext = null
      this.audioAnalyser = null
      this.audioDataArray = null
    }

    this.canvasElement = null
    this.canvasContext = null

    await new Promise(resolve => setTimeout(resolve, 500))

    this.status.isActive = false
    this.status.sessionRecording = false
    this.isShuttingDown = false
    this.notifyStatusChange()

    console.log('✅ Enhanced AI proctoring cleaned up')
  }
}

export const enhancedProctoringEngine = new EnhancedProctoringEngine()
export default EnhancedProctoringEngine
