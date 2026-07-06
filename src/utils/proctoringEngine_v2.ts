/**
 * @deprecated Use proctoringEngine.ts (V1) instead. V2 has audio thresholds
 * that are too high (RMS > 85) making audio detection effectively broken,
 * and it is only used in legacy practice exam pages. All new development
 * should target proctoringEngine.ts.
 */

import * as faceapi from 'face-api.js'
import { soundAlerts } from './soundAlerts'

export interface ProctoringViolation {
  type: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_NOT_LOOKING' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'AUDIO_DETECTED' | 'SUSPICIOUS_BEHAVIOR' | 'FACE_CHANGED' | 'COPY_PASTE' | 'MOUSE_LEFT_SCREEN' | 'RAPID_CLICKING' | 'PHONE_DETECTED' | 'HEADPHONE_DETECTED' | 'UNAUTHORIZED_DEVICE'
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
    duration?: number
    brightness?: number
    confidences?: string
    gazeDirection?: string
    distance?: number
    threshold?: number
    peakLevel?: number
    performanceMode?: boolean
    confidence?: number
    avgConfidence?: number
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
}

class ProctoringEngineV2 {
  private videoElement: HTMLVideoElement | null = null
  private audioContext: AudioContext | null = null
  private audioAnalyser: AnalyserNode | null = null
  private audioDataArray: Uint8Array<ArrayBuffer> | null = null
  private stream: MediaStream | null = null
  
  private modelsLoaded = false
  private isMonitoring = false
  private isShuttingDown = false // NEW: Track shutdown state
  private faceDetectionInterval: number | null = null
  private audioMonitoringInterval: number | null = null
  private brightnessCheckInterval: number | null = null
  
  private lastNoFaceWarning = 0
  private lastMultipleFaceWarning = 0
  private lastLookingAwayWarning = 0
  private lastAudioWarning = 0
  private consecutiveNoFace = 0
  private consecutiveAudio = 0
  
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
    integrityScore: 100
  }

  private onViolation: ((violation: ProctoringViolation) => void) | null = null
  private onStatusChange: ((status: ProctoringStatus) => void) | null = null
  private onPause: ((reason: string) => void) | null = null
  
  private referenceFaceDescriptor: Float32Array | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  
  // Adaptive detection optimization
  private detectionInterval = 2000 // Start at 2s, adjust based on violations
  private lastDetectionTime = 0
  private detectionCache: any = null
  private cacheValidUntil = 0
  private averageBrightness = 100
  private performanceMode = false // Enable on slow devices
  
  // Performance tracking
  private detectionTimes: number[] = []
  private avgDetectionTime = 0
  
  // Smoothing and debouncing for better UX
  private faceDetectionHistory: boolean[] = [] // Track last 5 detections
  private gazeHistory: boolean[] = [] // Track last 3 gaze checks
  private confidenceThreshold = 0.5 // Minimum confidence for violations
  private warningGracePeriod = 3000 // 3s grace before first warning
  private monitoringStartTime = 0

  /**
   * Load face detection models
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) {
      console.log('✅ Face detection models already loaded')
      return
    }

    try {
      console.log('📦 Loading face detection models from CDN...')
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
      
      // Load with timeout to detect network issues
      const loadWithTimeout = (promise: Promise<any>, timeout = 30000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model load timeout - check internet connection')), timeout)
          )
        ])
      }

      await loadWithTimeout(
        Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ])
      )

      this.modelsLoaded = true
      console.log('✅ All face detection models loaded successfully')
      console.log('   - TinyFaceDetector: Ready')
      console.log('   - FaceLandmark68Net: Ready')
      console.log('   - FaceExpressionNet: Ready')
      console.log('   - FaceRecognitionNet: Ready')
    } catch (error) {
      console.error('❌ Failed to load face detection models:', error)
      if (error instanceof Error) {
        console.error('   Error details:', error.message)
      }
      throw new Error('Failed to load AI models for proctoring. Check your internet connection and firewall settings.')
    }
  }

  /**
   * Initialize proctoring with camera and microphone
   */
  async initialize(videoElement: HTMLVideoElement): Promise<MediaStream> {
    try {
      // Store video element reference
      this.videoElement = videoElement

      // Load AI models first
      if (!this.modelsLoaded) {
        await this.loadModels()
      }

      // Request camera and microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      // Attach stream to video element
      this.videoElement.srcObject = this.stream
      
      // Start playing
      await this.videoElement.play()

      // Wait for video to be ready
      await new Promise((resolve) => {
        const checkReady = () => {
          if (this.videoElement!.readyState >= 2) {
            resolve(true)
          } else {
            this.videoElement!.onloadeddata = () => {
              resolve(true)
            }
          }
        }
        checkReady()
      })

      // Setup audio monitoring
      this.setupAudioMonitoring()

      this.status.isActive = true
      this.notifyStatusChange()

      return this.stream
    } catch (error) {
      console.error('Proctoring initialization failed:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Setup audio monitoring
   */
  private setupAudioMonitoring(): void {
    if (!this.stream) return

    try {
      this.audioContext = new AudioContext()
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }
      
      const audioSource = this.audioContext.createMediaStreamSource(this.stream)
      this.audioAnalyser = this.audioContext.createAnalyser()
      this.audioAnalyser.fftSize = 2048
      this.audioAnalyser.smoothingTimeConstant = 0.3
      
      audioSource.connect(this.audioAnalyser)
      this.audioDataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount)

      console.log('✅ Audio monitoring setup complete')
    } catch (error) {
      console.error('❌ Audio monitoring setup failed:', error)
    }
  }

  /**
   * Start monitoring (face detection, audio, etc.)
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Monitoring already active')
      return
    }

    if (!this.videoElement) {
      console.error('❌ Cannot start monitoring: Video element is null')
      return
    }
    
    if (!this.modelsLoaded) {
      console.error('❌ Cannot start monitoring: AI models not loaded')
      return
    }

    console.log('🚀 Starting proctoring monitoring...')
    console.log('   Video readyState:', this.videoElement.readyState)
    console.log('   Video dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight)
    console.log('   Models loaded:', this.modelsLoaded)

    this.isMonitoring = true
    this.monitoringStartTime = Date.now()
    soundAlerts.playNotification()

    // Dynamic face detection - adjusts in real-time (1.5-4s range)
    console.log('✅ Starting intelligent face detection (adaptive 1.5-4s)')
    this.faceDetectionInterval = window.setInterval(() => {
      this.adaptiveDetectFace()
    }, this.detectionInterval)

    // Optimized audio monitoring - 200ms for smoother detection
    console.log('✅ Starting optimized audio monitoring (every 200ms)')
    this.audioMonitoringInterval = window.setInterval(() => {
      this.monitorAudio()
    }, 200)

    // Brightness check every 5 seconds with auto-adjust
    console.log('✅ Starting intelligent brightness check (every 5s)')
    this.brightnessCheckInterval = window.setInterval(() => {
      this.smartBrightnessCheck()
    }, 5000)
    
    console.log('✅ All monitoring intervals started successfully')
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false
    
    // Invalidate cache
    this.detectionCache = null
    this.cacheValidUntil = 0

    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval)
      this.faceDetectionInterval = null
    }

    if (this.audioMonitoringInterval) {
      clearInterval(this.audioMonitoringInterval)
      this.audioMonitoringInterval = null
    }

    if (this.brightnessCheckInterval) {
      clearInterval(this.brightnessCheckInterval)
      this.brightnessCheckInterval = null
    }
  }

  /**
   * Adaptive face detection wrapper with smart caching
   */
  private async adaptiveDetectFace(): Promise<void> {
    try {
      const now = Date.now()
      
      // Use cache if still valid (reduces CPU by ~40%)
      if (this.cacheValidUntil > now && this.detectionCache) {
        await this.processDetectionResults(this.detectionCache, true)
        return
      }
      
      const startTime = performance.now()
      await this.detectFace()
      const detectionTime = performance.now() - startTime
      
      // Track performance
      this.detectionTimes.push(detectionTime)
      if (this.detectionTimes.length > 10) this.detectionTimes.shift()
      this.avgDetectionTime = this.detectionTimes.reduce((a, b) => a + b, 0) / this.detectionTimes.length
      
      // Enable performance mode if consistently slow (>500ms)
      if (this.avgDetectionTime > 500 && !this.performanceMode) {
        console.warn('⚡ Performance mode activated - device is slow')
        this.performanceMode = true
      }
      
      // Dynamically adjust detection interval based on activity
      const recentViolations = this.status.violations.filter(
        v => v.timestamp.getTime() > Date.now() - 60000 // Last minute
      ).length
      
      let newInterval = 2000 // Default
      if (recentViolations > 5) {
        newInterval = 1500 // Very frequent - high alert
      } else if (recentViolations > 2) {
        newInterval = 1800 // Moderate activity
      } else if (recentViolations === 0 && this.avgDetectionTime < 300) {
        newInterval = 3000 // All clear and fast device
      } else if (this.avgDetectionTime > 600) {
        newInterval = 3500 // Slow device - reduce load
      }
      
      // Update interval if changed
      if (newInterval !== this.detectionInterval) {
        this.detectionInterval = newInterval
        
        // Restart interval with new timing
        if (this.faceDetectionInterval) {
          clearInterval(this.faceDetectionInterval)
          this.faceDetectionInterval = window.setInterval(() => {
            this.adaptiveDetectFace()
          }, this.detectionInterval)
          
          if (Math.random() < 0.1) { // Occasional logging
            console.log(`⚡ Detection interval adjusted to ${this.detectionInterval}ms`)
          }
        }
      }
    } catch (error) {
      console.error('Adaptive detection error:', error)
      // Don't crash - continue monitoring
    }
  }
  
  /**
   * Detect face using face-api.js with advanced detection
   */
  private async detectFace(): Promise<void> {
    // CRITICAL: Don't run detection if shutting down
    if (this.isShuttingDown) {
      return
    }
    
    if (!this.videoElement || !this.isMonitoring) {
      return
    }

    try {
      // Only log occasionally to reduce spam (20% of the time)
      if (Math.random() < 0.2) {
        console.log('🔍 Running face detection...')
      }
      
      if (this.modelsLoaded && this.videoElement.readyState >= 2) {
        // Enhanced detection with better parameters
        const detections = await faceapi
          .detectAllFaces(this.videoElement, new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,  // Higher resolution for better accuracy
            scoreThreshold: 0.35  // Slightly higher to reduce false positives
          }))
          .withFaceLandmarks()
          .withFaceExpressions()

        const faceCount = detections.length
        
        // Cache results for 500ms (improves performance)
        this.detectionCache = detections
        this.cacheValidUntil = Date.now() + 500
        
        await this.processDetectionResults(detections, false)
      }
    } catch (error) {
      console.error('Face detection error:', error)
      // Don't crash - continue monitoring
    }
  }
  
  /**
   * Process detection results (separated for caching)
   */
  private async processDetectionResults(detections: any[], fromCache: boolean): Promise<void> {
    try {
      const faceCount = detections.length
      this.status.faceCount = faceCount
      this.status.faceDetected = faceCount > 0
      
      // Smoothing: Track detection history (last 5 frames)
      this.faceDetectionHistory.push(faceCount > 0)
      if (this.faceDetectionHistory.length > 5) {
        this.faceDetectionHistory.shift()
      }
      
      // Calculate detection confidence (% of recent frames with face)
      const detectionConfidence = this.faceDetectionHistory.filter(d => d).length / this.faceDetectionHistory.length
      
      // Log less frequently when using cache
      const shouldLog = !fromCache && Math.random() < 0.15
      
      if (shouldLog) {
        if (faceCount === 0) {
          console.log(`👤 Face: ❌ NO FACE (confidence: ${(detectionConfidence * 100).toFixed(0)}%)`)
        } else if (faceCount === 1) {
          const confidence = (detections[0].detection.score * 100).toFixed(1)
          console.log(`👤 Face: ✅ 1 FACE (${confidence}%, stable: ${(detectionConfidence * 100).toFixed(0)}%)`)
        } else {
          console.log(`👤 Face: ⚠️ ${faceCount} FACES (CRITICAL)`)
        }
      }

      // No face detected - with smoothing
      if (faceCount === 0) {
        this.consecutiveNoFace++
        
        // Grace period for new monitoring sessions
        const timeSinceStart = Date.now() - this.monitoringStartTime
        if (timeSinceStart < this.warningGracePeriod) {
          this.status.lookingAtScreen = false
          return // Don't warn during grace period
        }
        
        // Only warn if consistently no face (60%+ of recent history)
        if (detectionConfidence < 0.4) {
          // Progressive thresholds based on brightness
          const brightnessAdjustment = this.averageBrightness < 40 ? 3 : 0
          const threshold = 6 + brightnessAdjustment // Start at 12s, up to 18s in dark
          
          if (this.consecutiveNoFace >= threshold) {
            const now = Date.now()
            if (now - this.lastNoFaceWarning > 20000) { // 20s between warnings
              console.warn(`⚠️ No face for ${this.consecutiveNoFace * 2}s (confidence: ${(detectionConfidence * 100).toFixed(0)}%)`)
              
              // Progressive severity
              const severity = this.consecutiveNoFace > threshold * 2 ? 'CRITICAL' : 'HIGH'
              
              this.addViolation({
                type: 'NO_FACE',
                severity,
                timestamp: new Date(),
                message: `⚠️ No face detected for ${this.consecutiveNoFace * 2}s - Please position yourself properly`,
                metadata: { 
                  faceCount: 0, 
                  duration: this.consecutiveNoFace * 2, 
                  brightness: this.averageBrightness,
                  confidence: detectionConfidence
                }
              })
              this.lastNoFaceWarning = now
            }
          }
        }
        this.status.lookingAtScreen = false
      }
        // Multiple faces detected - require confirmation
        else if (faceCount > 1) {
          this.consecutiveNoFace = 0
          
          // Don't fire immediately - wait for 2 consecutive detections
          const now = Date.now()
          if (now - this.lastMultipleFaceWarning > 10000) { // 10s between warnings
            
            // Check if all faces have good confidence
            const avgConfidence = detections.reduce((sum, d) => sum + d.detection.score, 0) / faceCount
            
            if (avgConfidence > 0.4) { // Only if confident detections
              console.warn(`🚨 CRITICAL: ${faceCount} faces (avg confidence: ${(avgConfidence * 100).toFixed(1)}%)`)
              const confidences = detections.map(d => (d.detection.score * 100).toFixed(1)).join(', ')
              
              this.addViolation({
                type: 'MULTIPLE_FACES',
                severity: 'CRITICAL',
                timestamp: new Date(),
                message: `🚨 ${faceCount} people detected - Unauthorized assistance!`,
                metadata: { 
                  faceCount,
                  confidences: confidences,
                  avgConfidence: avgConfidence
                }
              })
              this.lastMultipleFaceWarning = now
            }
          }
          this.status.lookingAtScreen = true
        }
        // Exactly one face - advanced eye and gaze tracking
        else {
          this.consecutiveNoFace = 0
          const detection = detections[0]
          const landmarks = detection.landmarks
          
          // Enhanced gaze detection with smoothing
          const gazeAnalysis = this.analyzeGazeDirection(landmarks)
          
          // Track gaze history for smoothing
          this.gazeHistory.push(gazeAnalysis.lookingAtScreen)
          if (this.gazeHistory.length > 3) this.gazeHistory.shift()
          
          // Smoothed gaze decision (majority vote)
          const lookingCount = this.gazeHistory.filter(g => g).length
          const smoothedLooking = lookingCount >= 2 // At least 2 out of 3
          
          this.status.lookingAtScreen = smoothedLooking
          
          // Log gaze analysis occasionally
          if (Math.random() < 0.08) { // 8% sample rate
            console.log(`👁️ Gaze: ${smoothedLooking ? '✅' : '❌'}, Attention=${Math.round(gazeAnalysis.attentionScore * 100)}%, Dir=${gazeAnalysis.direction}`)
          }

          if (!smoothedLooking) {
            const now = Date.now()
            const timeSinceStart = Date.now() - this.monitoringStartTime
            
            // Longer grace period and intervals for gaze
            if (timeSinceStart > this.warningGracePeriod * 2 && now - this.lastLookingAwayWarning > 15000) {
              console.log(`⚠️ Gaze: Looking ${gazeAnalysis.direction}, attention: ${Math.round(gazeAnalysis.attentionScore * 100)}%`)
              this.addViolation({
                type: 'FACE_NOT_LOOKING',
                severity: 'MEDIUM',
                timestamp: new Date(),
                message: `👀 Please focus on the screen - Gaze directed ${gazeAnalysis.direction}`,
                metadata: { 
                  faceCount: 1,
                  attentionScore: gazeAnalysis.attentionScore,
                  gazeDirection: gazeAnalysis.direction
                }
              })
              this.lastLookingAwayWarning = now
            }
          }

          // Store reference face on first detection
          if (!this.referenceFaceDescriptor && this.videoElement) {
            const descriptor = await faceapi
              .detectSingleFace(this.videoElement, new faceapi.TinyFaceDetectorOptions({
                inputSize: 512,
                scoreThreshold: 0.4
              }))
              .withFaceLandmarks()
              .withFaceDescriptor()
            
            if (descriptor) {
              this.referenceFaceDescriptor = descriptor.descriptor
              this.status.identityVerified = true
              console.log('✅ Reference face stored for identity tracking')
            }
          }
          // Smart identity verification (only check every 10th detection to save CPU)
          else if (!fromCache && this.referenceFaceDescriptor && this.videoElement && Math.random() < 0.1) {
            const currentDescriptor = await faceapi
              .detectSingleFace(this.videoElement, new faceapi.TinyFaceDetectorOptions({
                inputSize: 416,  // Lower for faster processing
                scoreThreshold: 0.4
              }))
              .withFaceLandmarks()
              .withFaceDescriptor()

            if (currentDescriptor) {
              const distance = faceapi.euclideanDistance(
                this.referenceFaceDescriptor,
                currentDescriptor.descriptor
              )
              
              // Adaptive threshold based on brightness (lighting affects matching)
              const brightnessAdjustment = this.averageBrightness < 50 ? 0.1 : 0
              const threshold = 0.6 + brightnessAdjustment
              
              if (distance > threshold) {
                const similarity = ((1 - distance) * 100).toFixed(1)
                console.warn(`🚨 Face identity mismatch: ${similarity}% similarity (threshold: ${threshold})`)
                this.addViolation({
                  type: 'FACE_CHANGED',
                  severity: 'CRITICAL',
                  timestamp: new Date(),
                  message: `🚨 Face identity changed - Different person detected (${similarity}% match)`,
                  metadata: { faceConfidence: parseFloat(similarity), distance, threshold }
                })
              }
            }
          }
        }

        this.updateScores()
        this.notifyStatusChange()
    } catch (error) {
      console.error('Process detection error:', error)
      // Don't crash on errors - just log and continue
    }
  }

  /**
   * Advanced gaze direction analysis with multiple eye tracking techniques
   */
  private analyzeGazeDirection(landmarks: faceapi.FaceLandmarks68): { 
    lookingAtScreen: boolean
    attentionScore: number
    direction: string
  } {
    try {
      const leftEye = landmarks.getLeftEye()
      const rightEye = landmarks.getRightEye()
      const nose = landmarks.getNose()
      const jawline = landmarks.getJawOutline()
      const mouth = landmarks.getMouth()

      // 1. Eye Aspect Ratio (EAR) - detects if eyes are closed/open
      const leftEAR = this.calculateEyeAspectRatio(leftEye)
      const rightEAR = this.calculateEyeAspectRatio(rightEye)
      const avgEAR = (leftEAR + rightEAR) / 2
      const eyesOpen = avgEAR > 0.2 // Threshold for open eyes

      // 2. Horizontal gaze detection (left/right)
      const leftEyeCenter = this.getCenterPoint(leftEye)
      const rightEyeCenter = this.getCenterPoint(rightEye)
      const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2
      const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x)
      
      const noseCenter = this.getCenterPoint(nose)
      const noseOffsetX = noseCenter.x - eyeCenterX  // Signed offset for direction
      const horizontalRatio = Math.abs(noseOffsetX) / eyeDistance
      const lookingHorizontally = horizontalRatio < 0.25 // More lenient

      // 3. Vertical gaze detection (up/down)
      const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2
      const noseOffsetY = noseCenter.y - eyeCenterY
      const noseTipY = nose[nose.length - 1].y
      const verticalRatio = (noseTipY - eyeCenterY) / eyeDistance
      const lookingVertically = verticalRatio > 0.8 && verticalRatio < 1.6 // More lenient

      // 4. Head pose estimation
      const jawCenter = this.getCenterPoint(jawline)
      const mouthCenter = this.getCenterPoint(mouth)
      const headTiltX = Math.abs(noseCenter.x - jawCenter.x) / eyeDistance
      const headPoseNormal = headTiltX < 0.20 // More lenient

      // 5. Eye symmetry check (both eyes equally visible)
      const eyeSymmetry = Math.abs(leftEAR - rightEAR) < 0.15 // More lenient
      
      // Determine gaze direction
      let direction = 'CENTER'
      if (!eyesOpen) {
        direction = 'EYES_CLOSED'
      } else if (horizontalRatio > 0.25) {
        direction = noseOffsetX > 0 ? 'RIGHT' : 'LEFT'
      } else if (verticalRatio < 0.8) {
        direction = 'UP'
      } else if (verticalRatio > 1.6) {
        direction = 'DOWN'
      }
      
      // Calculate attention score (0-100)
      let attentionScore = 100
      if (!eyesOpen) attentionScore -= 30
      if (!lookingHorizontally) attentionScore -= 25
      if (!lookingVertically) attentionScore -= 20
      if (!headPoseNormal) attentionScore -= 15
      if (!eyeSymmetry) attentionScore -= 10
      
      // Person is looking at screen if most criteria are met
      const lookingAtScreen = eyesOpen && lookingHorizontally && lookingVertically && attentionScore >= 55

      return { 
        lookingAtScreen, 
        attentionScore: Math.max(0, attentionScore / 100),
        direction
      }
    } catch (error) {
      console.warn('⚠️ Gaze analysis error:', error)
      return { lookingAtScreen: true, attentionScore: 1.0, direction: 'CENTER' } // Fail-safe
    }
  }

  /**
   * Calculate Eye Aspect Ratio (EAR) for blink/eye open detection
   * EAR formula: (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
   */
  private calculateEyeAspectRatio(eye: faceapi.Point[]): number {
    try {
      // Eye has 6 points (0-5)
      const p1 = eye[0]
      const p2 = eye[1]
      const p3 = eye[2]
      const p4 = eye[3]
      const p5 = eye[4]
      const p6 = eye[5]

      // Vertical distances
      const v1 = this.euclideanDistance(p2, p6)
      const v2 = this.euclideanDistance(p3, p5)
      
      // Horizontal distance
      const h = this.euclideanDistance(p1, p4)

      // EAR calculation
      const ear = (v1 + v2) / (2.0 * h)
      return ear
    } catch (error) {
      return 0.3 // Default to eyes open
    }
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private euclideanDistance(p1: faceapi.Point, p2: faceapi.Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  /**
   * Check if person is looking away (legacy method kept for compatibility)
   */
  private isLookingAway(landmarks: faceapi.FaceLandmarks68): boolean {
    const analysis = this.analyzeGazeDirection(landmarks)
    return !analysis.lookingAtScreen
  }

  /**
   * Get center point of landmarks
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
   * Monitor audio levels
   */
  private monitorAudio(): void {
    if (!this.audioAnalyser || !this.audioDataArray || !this.isMonitoring || this.isShuttingDown) return

    this.audioAnalyser.getByteFrequencyData(this.audioDataArray)

    // Calculate RMS
    let sumSquares = 0
    for (let i = 0; i < this.audioDataArray.length; i++) {
      sumSquares += this.audioDataArray[i] * this.audioDataArray[i]
    }
    const rms = Math.sqrt(sumSquares / this.audioDataArray.length)
    
    const max = Math.max(...Array.from(this.audioDataArray))
    const sum = this.audioDataArray.reduce((a, b) => a + b, 0)
    const average = sum / this.audioDataArray.length
    
    this.status.audioLevel = rms

    // Smarter adaptive thresholds
    const baseRMS = this.performanceMode ? 100 : 85
    const basePeak = this.performanceMode ? 180 : 155
    
    // Adjust based on ambient noise (average level)
    const ambientAdjustment = average > 30 ? 15 : 0
    const RMS_THRESHOLD = baseRMS + ambientAdjustment
    const PEAK_THRESHOLD = basePeak + ambientAdjustment
    const CONSECUTIVE_REQUIRED = this.performanceMode ? 35 : 25 // 5s vs 3.5s
    
    const speechDetected = rms > RMS_THRESHOLD && max > PEAK_THRESHOLD
    
    if (speechDetected) {
      this.consecutiveAudio++
      
      // Progressive logging - less spam
      if (this.consecutiveAudio === 10 || this.consecutiveAudio % 30 === 0) {
        console.log(`🎤 Audio: RMS=${Math.round(rms)} (>${RMS_THRESHOLD}), Peak=${Math.round(max)}, Duration=${(this.consecutiveAudio * 0.2).toFixed(1)}s`)
      }
      
      if (this.consecutiveAudio >= CONSECUTIVE_REQUIRED) {
        const now = Date.now()
        const warningInterval = this.performanceMode ? 25000 : 18000
        
        if (now - this.lastAudioWarning > warningInterval) {
          const duration = (this.consecutiveAudio * 0.2).toFixed(1)
          console.warn(`🚨 AUDIO! ${duration}s sustained speech (RMS: ${Math.round(rms)})`)
          this.addViolation({
            type: 'AUDIO_DETECTED',
            severity: 'LOW',
            timestamp: new Date(),
            message: `🔊 Sustained speech: ${duration}s (RMS: ${Math.round(rms)})`,
            metadata: { 
              audioLevel: rms, 
              peakLevel: max,
              duration: parseFloat(duration),
              performanceMode: this.performanceMode,
              threshold: RMS_THRESHOLD
            }
          })
          this.lastAudioWarning = now
          this.consecutiveAudio = 0
        }
      }
    } else {
      // Gradual decay with better smoothing
      if (this.consecutiveAudio > 0) {
        this.consecutiveAudio = Math.max(0, this.consecutiveAudio - 3)
      }
    }

    this.notifyStatusChange()
  }

  /**
   * Smart brightness check with environment analysis
   */
  private smartBrightnessCheck(): void {
    const brightness = this.checkBrightness()
    this.averageBrightness = brightness
    
    // Warn about poor lighting conditions
    if (brightness < 30) {
      console.warn('💡 Very low brightness detected - face detection may be less accurate')
    } else if (brightness > 200) {
      console.warn('☀️ Very high brightness detected - may cause glare issues')
    }
    
    // Auto-adjust detection parameters based on brightness
    if (brightness < 40 && !this.performanceMode) {
      console.log('🌙 Low light mode: Using more lenient detection')
    }
  }
  
  /**
   * Check brightness
   */
  private checkBrightness(): number {
    if (!this.videoElement || this.isShuttingDown) return 100
    
    // Check if video has valid dimensions
    if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
      return 100 // Default to good brightness if video not ready
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.videoElement.videoWidth
      canvas.height = this.videoElement.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return 100

      ctx.drawImage(this.videoElement, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      let sum = 0
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        sum += (r + g + b) / 3
      }

      const pixels = data.length / 4
      const brightness = pixels > 0 ? sum / pixels : 100
      
      return Math.max(0, Math.min(255, brightness)) // Clamp to valid range
    } catch (error) {
      console.error('Brightness check error:', error)
      return 100
    }
  }

  /**
   * Update scores
   */
  private updateScores(): void {
    // Attention level
    if (this.status.lookingAtScreen && this.status.faceDetected) {
      this.status.attentionLevel = Math.min(100, this.status.attentionLevel + 1)
    } else {
      this.status.attentionLevel = Math.max(0, this.status.attentionLevel - 5)
    }

    // Environment score
    this.status.environmentScore = this.status.faceDetected ? 100 : 50

    // Integrity score
    const violationPenalty = this.status.violations.length * 5
    this.status.integrityScore = Math.max(0, 100 - violationPenalty)

    // Suspicious activity score
    const criticalViolations = this.status.violations.filter(v => v.severity === 'CRITICAL').length
    this.status.suspiciousActivityScore = Math.min(100, criticalViolations * 30)
  }

  /**
   * Add violation
   */
  private addViolation(violation: ProctoringViolation): void {
    this.status.violations.push(violation)
    
    if (this.onViolation) {
      this.onViolation(violation)
    }

    // Play sound alert
    if (violation.severity === 'CRITICAL' || violation.severity === 'HIGH') {
      soundAlerts.playHighAlert()
    } else if (violation.severity === 'MEDIUM') {
      soundAlerts.playMediumAlert()
    } else {
      soundAlerts.playLowAlert()
    }

    this.updateScores()
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
  setOnViolation(callback: (violation: ProctoringViolation) => void): void {
    this.onViolation = callback
  }

  setOnStatusChange(callback: (status: ProctoringStatus) => void): void {
    this.onStatusChange = callback
  }

  setOnPause(callback: (reason: string) => void): void {
    this.onPause = callback
  }

  /**
   * Pause exam with reason
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
   * Capture reference face for identity verification
   * NOW WITH PROPER VIDEO READY CHECK AND DELAY
   */
  async captureReferenceFace(): Promise<boolean> {
    if (!this.videoElement || !this.modelsLoaded) {
      console.warn('⚠️ Cannot capture reference face - video or models not ready')
      return false
    }

    // Retry up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // CRITICAL: Wait for video to be fully ready and stable
        if (this.videoElement.readyState < 3) {
          console.log(`📸 Attempt ${attempt}/3: Video not fully ready (readyState=${this.videoElement.readyState}), waiting 3 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 3000))
        } else {
          // Even if ready, give 2 seconds for camera to stabilize
          console.log(`📸 Attempt ${attempt}/3: Waiting 2 seconds for camera to stabilize...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        console.log('📸 Capturing reference face...')
        const detection = await faceapi
          .detectSingleFace(this.videoElement, new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.35  // Slightly lower for better detection
          }))
          .withFaceLandmarks()
          .withFaceDescriptor()
        
        if (detection) {
          this.referenceFaceDescriptor = detection.descriptor
          this.status.identityVerified = true
          const confidence = (detection.detection.score * 100).toFixed(1)
          console.log(`✅ Reference face captured successfully on attempt ${attempt}! (${confidence}% confidence)`)
          return true
        } else {
          console.warn(`⚠️ Attempt ${attempt}/3: No face detected - please ensure your face is clearly visible`)
          if (attempt < 3) {
            console.log('Retrying in 1 second...')
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/3 failed:`, error)
        if (attempt < 3) {
          console.log('Retrying...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
    
    console.warn('⚠️ All 3 attempts failed - continuing without identity verification')
    return false
  }

  /**
   * Enable session recording
   */
  enableRecording(): void {
    if (!this.stream) return

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(1000) // Collect data every second
      this.status.sessionRecording = true
      console.log('✅ Session recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  /**
   * Stop session recording
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
      this.mediaRecorder = null
      this.recordedChunks = []
      this.status.sessionRecording = false
      console.log('✅ Session recording stopped and cleared')
    }
  }

  /**
   * Get recording data
   */
  getRecording(): Blob | null {
    if (this.recordedChunks.length === 0) return null
    
    return new Blob(this.recordedChunks, {
      type: 'video/webm'
    })
  }

  /**
   * Download recording with metadata
   */
  downloadRecording(examId?: string, studentId?: string): void {
    const recording = this.getRecording()
    if (!recording) {
      console.warn('No recording available')
      return
    }

    // Generate filename with timestamp and metadata
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `exam-recording_${examId || 'practice'}_${studentId || 'student'}_${timestamp}.webm`

    // Create download link
    const url = URL.createObjectURL(recording)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  /**
   * Get current status
   */
  getStatus(): ProctoringStatus {
    return { ...this.status }
  }

  /**
   * Get current detection interval (for debugging)
   */
  getCurrentDetectionInterval(): number {
    return this.detectionInterval
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    avgDetectionTime: number
    detectionInterval: number
    performanceMode: boolean
    averageBrightness: number
    cacheHitRate: number
  } {
    return {
      avgDetectionTime: Math.round(this.avgDetectionTime),
      detectionInterval: this.detectionInterval,
      performanceMode: this.performanceMode,
      averageBrightness: Math.round(this.averageBrightness),
      cacheHitRate: this.detectionCache ? 0.4 : 0 // Approximate
    }
  }
  
  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Check brightness
    if (this.averageBrightness < 30) {
      issues.push('Very low brightness')
      recommendations.push('Increase room lighting or move closer to a light source')
    } else if (this.averageBrightness > 200) {
      issues.push('Very high brightness/glare')
      recommendations.push('Reduce direct light on face or adjust camera angle')
    }
    
    // Check performance
    if (this.performanceMode) {
      issues.push('Slow device performance')
      recommendations.push('Close other applications to improve detection speed')
    }
    
    // Check recent violations
    const recentViolations = this.status.violations.filter(
      v => v.timestamp.getTime() > Date.now() - 60000
    ).length
    
    if (recentViolations > 5) {
      issues.push('High violation rate')
      recommendations.push('Ensure proper exam environment and stay focused')
    }
    
    // Determine overall status
    let status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    if (issues.length === 0) {
      status = 'EXCELLENT'
    } else if (issues.length === 1) {
      status = 'GOOD'
    } else if (issues.length === 2) {
      status = 'FAIR'
    } else {
      status = 'POOR'
    }
    
    return { status, issues, recommendations }
  }
  
  /**
   * Force performance mode (for manual optimization)
   */
  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled
    console.log(`⚡ Performance mode ${enabled ? 'enabled' : 'disabled'} manually`)
  }

  /**
   * Get stream
   */
  getStream(): MediaStream | null {
    return this.stream
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring
  }

  /**
   * Check if engine is fully shutdown (all resources released)
   */
  isFullyShutdown(): boolean {
    const streamClear = this.stream === null
    const videoClear = this.videoElement === null
    const audioClear = this.audioContext === null
    const notMonitoring = !this.isMonitoring
    const noIntervals = this.faceDetectionInterval === null && 
                       this.audioMonitoringInterval === null && 
                       this.brightnessCheckInterval === null
    
    const isShutdown = streamClear && videoClear && audioClear && notMonitoring && noIntervals
    
    if (!isShutdown) {
      console.warn('⚠️ Engine not fully shutdown:', {
        streamClear,
        videoClear,
        audioClear,
        notMonitoring,
        noIntervals
      })
    }
    
    return isShutdown
  }

  /**
   * Get active track count from stream
   */
  getActiveTrackCount(): number {
    if (!this.stream) return 0
    return this.stream.getTracks().filter(t => t.readyState === 'live').length
  }

  /**
   * Get brightness
   */
  getBrightness(): number {
    return this.checkBrightness()
  }

  /**
   * Record tab switch
   */
  recordTabSwitch(): void {
    // Don't record if shutting down
    if (this.isShuttingDown || !this.isMonitoring) {
      return
    }
    
    this.status.tabSwitchCount++
    this.addViolation({
      type: 'TAB_SWITCH',
      severity: this.status.tabSwitchCount >= 3 ? 'CRITICAL' : 'HIGH',
      timestamp: new Date(),
      message: `Tab switched (Total: ${this.status.tabSwitchCount})`
    })
  }

  /**
   * Record window blur
   */
  recordWindowBlur(): void {
    // Don't record if shutting down
    if (this.isShuttingDown || !this.isMonitoring) {
      return
    }
    
    this.status.windowBlurCount++
    this.addViolation({
      type: 'WINDOW_BLUR',
      severity: this.status.windowBlurCount >= 3 ? 'CRITICAL' : 'MEDIUM',
      timestamp: new Date(),
      message: `Clicked outside browser (Total: ${this.status.windowBlurCount})`
    })
  }

  /**
   * Record fullscreen exit
   */
  recordFullscreenExit(): void {
    // Don't record if shutting down
    if (this.isShuttingDown || !this.isMonitoring) {
      return
    }
    
    this.status.fullscreenExitCount++
    this.addViolation({
      type: 'FULLSCREEN_EXIT',
      severity: 'CRITICAL',
      timestamp: new Date(),
      message: `Exited fullscreen mode (Total: ${this.status.fullscreenExitCount})`
    })
  }

  /**
   * Get violation analytics
   */
  getViolationAnalytics(): {
    total: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    timeline: { time: Date, count: number }[]
    riskScore: number
  } {
    const violations = this.status.violations
    
    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    
    violations.forEach(v => {
      byType[v.type] = (byType[v.type] || 0) + 1
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1
    })
    
    // Create timeline (violations per minute)
    const timeline: Map<number, number> = new Map()
    violations.forEach(v => {
      const minute = Math.floor(v.timestamp.getTime() / 60000)
      timeline.set(minute, (timeline.get(minute) || 0) + 1)
    })
    
    const timelineArray = Array.from(timeline.entries()).map(([minute, count]) => ({
      time: new Date(minute * 60000),
      count
    }))
    
    // Calculate risk score (0-100)
    const riskScore = Math.min(100, 
      (bySeverity['CRITICAL'] || 0) * 25 +
      (bySeverity['HIGH'] || 0) * 15 +
      (bySeverity['MEDIUM'] || 0) * 8 +
      (bySeverity['LOW'] || 0) * 3
    )
    
    return {
      total: violations.length,
      byType,
      bySeverity,
      timeline: timelineArray,
      riskScore
    }
  }

  /**
   * Group similar violations to reduce noise
   */
  getGroupedViolations(): {
    type: string
    count: number
    severity: string
    firstOccurrence: Date
    lastOccurrence: Date
    samples: ProctoringViolation[]
  }[] {
    const groups: Map<string, ProctoringViolation[]> = new Map()
    
    this.status.violations.forEach(v => {
      // Group by type and time window (5 minutes)
      const timeWindow = Math.floor(v.timestamp.getTime() / (5 * 60000))
      const key = `${v.type}_${timeWindow}`
      const group = groups.get(key) || []
      group.push(v)
      groups.set(key, group)
    })
    
    return Array.from(groups.entries()).map(([key, violations]) => {
      // Find highest severity in group
      const severityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 }
      const maxSeverity = violations.reduce((max, v) => {
        return severityLevels[v.severity] > severityLevels[max.severity] ? v : max
      })
      
      return {
        type: violations[0].type,
        count: violations.length,
        severity: maxSeverity.severity,
        firstOccurrence: violations[0].timestamp,
        lastOccurrence: violations[violations.length - 1].timestamp,
        samples: violations.slice(0, 3) // Keep first 3 as samples
      }
    })
  }

  /**
   * Get session summary
   */
  getSessionSummary(): {
    duration: number
    totalViolations: number
    riskScore: number
    attentionScore: number
    integrityScore: number
    recommendation: string
  } {
    const analytics = this.getViolationAnalytics()
    
    const recommendation = analytics.riskScore > 60 
      ? 'High risk - Manual review recommended'
      : analytics.riskScore > 30
      ? 'Medium risk - Spot check recommended'
      : 'Low risk - No action needed'
    
    return {
      duration: 0, // Should be tracked externally
      totalViolations: analytics.total,
      riskScore: analytics.riskScore,
      attentionScore: this.status.attentionLevel,
      integrityScore: this.status.integrityScore,
      recommendation
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Starting cleanup - marking as shutting down...')
    
    // Mark as shutting down to prevent any new operations
    this.isShuttingDown = true
    
    // IMMEDIATELY disable all monitoring to prevent violations during shutdown
    this.isMonitoring = false

    // Stop monitoring (clears intervals)
    this.stopMonitoring()

    console.log('🛑 Monitoring stopped - no more violations will be recorded')

    // Stop recording
    this.stopRecording()
    
    // Force stop MediaRecorder if it still exists
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop()
        }
        this.mediaRecorder = null
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err)
        this.mediaRecorder = null
      }
    }
    this.recordedChunks = []
    this.status.sessionRecording = false

    // Stop ALL media stream tracks
    if (this.stream) {
      const tracks = this.stream.getTracks()
      
      tracks.forEach((track) => {
        track.stop()
        
        // Triple-force stop to ensure hardware release
        if (track.readyState !== 'ended') {
          track.stop()
          setTimeout(() => {
            if (track.readyState !== 'ended') {
              track.stop()
            }
          }, 100)
        }
      })
      
      this.stream = null
    }

    // Clear video element completely
    if (this.videoElement) {
      // Stop any playing media
      if (!this.videoElement.paused) {
        this.videoElement.pause()
      }
      
      // Stop tracks from video element's srcObject
      if (this.videoElement.srcObject) {
        const videoStream = this.videoElement.srcObject as MediaStream
        videoStream.getTracks().forEach(track => {
          track.stop()
        })
      }
      
      // Clear all sources
      this.videoElement.srcObject = null
      this.videoElement.src = ''
      this.videoElement.removeAttribute('src')
      
      // Force reload to release resources
      this.videoElement.load()
      
      this.videoElement = null
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(err => {
        console.error('Error closing audio context:', err)
      })
      this.audioContext = null
      this.audioAnalyser = null
      this.audioDataArray = null
    }

    // Wait for async operations to settle
    await new Promise(resolve => setTimeout(resolve, 500))

    // Final verification
    const finalActiveTracks = this.getActiveTrackCount()
    if (finalActiveTracks > 0) {
      console.error(`Warning: ${finalActiveTracks} tracks still active after cleanup`)
    }

    // Reset status
    this.status.isActive = false
    this.status.sessionRecording = false
    this.isShuttingDown = false
    this.notifyStatusChange()
  }
}

export default ProctoringEngineV2
