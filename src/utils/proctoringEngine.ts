/**
 * Enhanced Proctoring Engine
 * Continuous monitoring with face detection, audio analysis, and behavior tracking
 */

import * as faceapi from 'face-api.js'
import { soundAlerts } from './soundAlerts'

export interface ProctoringViolation {
  type: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_NOT_LOOKING' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'AUDIO_DETECTED' | 'SUSPICIOUS_BEHAVIOR' | 'FACE_CHANGED' | 'COPY_PASTE' | 'MOUSE_LEFT_SCREEN' | 'RAPID_CLICKING' | 'PHONE_DETECTED' | 'HEADPHONE_DETECTED' | 'UNAUTHORIZED_DEVICE' | 'SCREEN_SHARE' | 'WINDOW_MINIMIZED' | 'PIP_DETECTED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: Date
  message: string
  evidence?: string // Base64 screenshot
  metadata?: {
    audioLevel?: number
    faceCount?: number
    faceConfidence?: number
    keystrokes?: string[]
    mousePosition?: { x: number; y: number }
    brightnessLevel?: number
    attentionScore?: number
    distance?: number
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
  suspiciousActivityScore: number // 0-100 score
  attentionLevel: number // 0-100 score based on eye tracking
  environmentScore: number // 0-100 score based on lighting, noise, etc.
  integrityScore: number // Overall score 0-100
}

class ProctoringEngine {
  private videoElement: HTMLVideoElement | null = null
  private audioContext: AudioContext | null = null
  private audioAnalyser: AnalyserNode | null = null
  private audioDataArray: Uint8Array<ArrayBuffer> | null = null
  private stream: MediaStream | null = null
  
  private modelsLoaded = false
  private isMonitoring = false
  private faceDetectionInterval: number | null = null
  private audioMonitoringInterval: number | null = null
  
  // Debouncing for violations
  private lastNoFaceWarning = 0
  private lastMultipleFaceWarning = 0
  private lastLookingAwayWarning = 0
  private lastAudioWarning = 0
  private consecutiveNoFace = 0
  private consecutiveMultipleFace = 0
  private consecutiveLookingAway = 0
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
  
  // Advanced monitoring
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private referenceFaceDescriptor: Float32Array | null = null
  private mouseTrackingInterval: number | null = null
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private suspiciousMouseCount = 0
  private copyPasteAttempts = 0

  // Screen share & window detection
  private screenShareCheckInterval: number | null = null
  private windowSizeCheckInterval: number | null = null
  private windowBlurHandler: (() => void) | null = null
  private pipHandler: (() => void) | null = null
  private lastClickTime: number | null = null
  private clickCount = 0
  
  // Advanced metrics
  private eyeMovementHistory: Array<{x: number, y: number, timestamp: number}> = []
  private headPoseHistory: Array<{yaw: number, pitch: number, roll: number, timestamp: number}> = []
  private attentionMetrics = {
    totalLookingTime: 0,
    totalLookingAwayTime: 0,
    lastStateChange: Date.now()
  }
  private environmentMetrics = {
    brightnessHistory: [] as number[],
    noiseLevel: 0,
    lastEnvironmentCheck: Date.now()
  }

  /**
   * Load face-api.js models
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) {
      console.log('✅ Face detection models already loaded')
      return
    }

    const CDNS = [
      'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
      'https://unpkg.com/@vladmandic/face-api/model/'
    ]

    for (const MODEL_URL of CDNS) {
      try {
        console.log('🔄 Loading face models from:', MODEL_URL)

        const loadPromise = Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Model loading timeout')), 25000)
        )
        await Promise.race([loadPromise, timeoutPromise])
        this.modelsLoaded = true
        console.log('✅ Face detection models loaded from:', MODEL_URL)
        return
      } catch (error) {
        console.warn('⚠️ CDN failed:', MODEL_URL, '->', error instanceof Error ? error.message : String(error))
      }
    }

    // All CDNs failed
    console.error('❌ All CDNs failed to load face detection models')
    console.warn('⚠️ Will use basic camera monitoring without AI face detection')
    this.modelsLoaded = false
  }

  /**
   * Initialize camera and microphone streams.
   * @param videoElement - The <video> element to attach the stream to
   * @param existingStream - (optional) Reuse a stream already obtained by PreExamVerification.
   *                         If not provided, a fresh getUserMedia() call is made.
   */
  async initialize(videoElement: HTMLVideoElement, existingStream?: MediaStream): Promise<void> {
    this.videoElement = videoElement

    console.log('🎥 Initializing proctoring engine...')
    console.log('Video element received:', {
      tagName: videoElement.tagName,
      isConnected: videoElement.isConnected,
      readyState: videoElement.readyState,
      src: videoElement.src || 'none',
      srcObject: videoElement.srcObject ? 'exists' : 'null'
    })

    try {
      // Load models first if not already loaded
      if (!this.modelsLoaded) {
        console.log('📦 Loading face detection models...')
        await this.loadModels()
      }

      if (existingStream && existingStream.active) {
        // ✅ Reuse the stream from PreExamVerification — no second getUserMedia needed
        console.log('♻️ Reusing pre-exam stream (no new permission prompt)')
        this.stream = existingStream
      } else {
        // Request camera and microphone access fresh
        console.log('📹 Requesting camera and microphone access...')
        console.log('Navigator.mediaDevices available:', !!navigator.mediaDevices)
        
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: false,  // Disable to get raw audio
            noiseSuppression: false,  // Disable to detect all sounds
            autoGainControl: false    // Disable to get true volume levels
          }
        })
        console.log('✅ Camera and microphone access granted')
      }

      console.log('Stream details:', {
        id: this.stream.id,
        active: this.stream.active,
        videoTracks: this.stream.getVideoTracks().length,
        audioTracks: this.stream.getAudioTracks().length
      })

      // Setup video
      if (this.videoElement) {
        console.log('📺 Setting video srcObject...')
        
        // Clear any existing srcObject first to prevent AbortError
        if (this.videoElement.srcObject && this.videoElement.srcObject !== this.stream) {
          const oldStream = this.videoElement.srcObject as MediaStream
          if (oldStream !== this.stream) {
            oldStream.getTracks().forEach(track => track.stop())
          }
          this.videoElement.srcObject = null
        }
        
        this.videoElement.srcObject = this.stream
        this.videoElement.muted = true
        this.videoElement.playsInline = true
        
        try { await this.videoElement.play() } catch { /* non-fatal */ }

        // Short wait for video to stabilize (non-blocking feel — UI already shows camera)
        await new Promise(resolve => setTimeout(resolve, 300))

        // Only check lighting if this is a fresh stream (not reused from pre-exam)
        if (!existingStream) {
          console.log('🔆 Checking lighting...')
          const brightnessOk = this.performLightingCheck(true)
          if (!brightnessOk) {
            throw new Error('INSUFFICIENT_LIGHTING')
          }
          console.log('✅ Lighting check passed')
        } else {
          console.log('⏭️ Skipping lighting check (pre-exam already verified)')
        }
      }

      // Setup audio monitoring
      console.log('🔊 Setting up audio monitoring...')
      this.setupAudioMonitoring()

      // Install screen share interceptor (prevents getDisplayMedia)
      console.log('🖥️ Installing screen share interceptor...')
      this.installScreenShareInterceptor()

      // Start window size / taskbar / PiP / blur monitoring
      console.log('📐 Starting window size monitoring...')
      this.startWindowSizeMonitoring()

      this.status.isActive = true
      this.notifyStatusChange()

      console.log('✅ Proctoring initialized successfully')
      console.log('='.repeat(50))
    } catch (error) {
      console.error('❌ Proctoring initialization failed:', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'N/A'
      })
      
      // Clean up on error
      this.cleanup()
      
      // Preserve specific error types
      if (error instanceof Error && error.message === 'INSUFFICIENT_LIGHTING') {
        throw new Error('Room lighting is insufficient for face detection. Please turn on lights and try again.')
      }
      
      // Re-throw the original error to preserve error type (NotAllowedError, NotFoundError, etc.)
      throw error
    }
  }

  /**
   * Setup audio monitoring for sound detection
   */
  private setupAudioMonitoring(): void {
    if (!this.stream) {
      console.error('❌ No media stream available for audio monitoring')
      return
    }

    try {
      console.log('🔊 Setting up audio monitoring...')
      this.audioContext = new AudioContext()
      console.log('🎧 AudioContext created, state:', this.audioContext.state)
      
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('🔄 AudioContext suspended, attempting to resume...')
        this.audioContext.resume().then(() => {
          console.log('✅ Audio context resumed, state:', this.audioContext?.state)
        }).catch(err => {
          console.error('❌ Failed to resume audio context:', err)
        })
      }
      
      const audioSource = this.audioContext.createMediaStreamSource(this.stream)
      this.audioAnalyser = this.audioContext.createAnalyser()
      this.audioAnalyser.fftSize = 2048 // Increased for better frequency resolution
      this.audioAnalyser.smoothingTimeConstant = 0.3 // Faster response to audio changes
      
      audioSource.connect(this.audioAnalyser)
      
      const bufferLength = this.audioAnalyser.frequencyBinCount
      this.audioDataArray = new Uint8Array(bufferLength)

      console.log('✅ Audio monitoring initialized')
      console.log('   - FFT Size:', this.audioAnalyser.fftSize)
      console.log('   - Buffer Length:', bufferLength)
      console.log('   - Sample Rate:', this.audioContext.sampleRate)
      console.log('   - Audio Context State:', this.audioContext.state)
      console.log('   - Audio Tracks:', this.stream.getAudioTracks().length)
      
      // Log audio track details
      this.stream.getAudioTracks().forEach((track, index) => {
        console.log(`   - Audio Track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        })
      })
      
      // Test audio immediately
      console.log('🧪 Testing audio monitoring in 1 second...')
      setTimeout(() => {
        this.testAudioMonitoring()
      }, 1000)
    } catch (error) {
      console.error('❌ Audio monitoring setup failed:', error)
      console.error('Error details:', error instanceof Error ? error.stack : String(error))
    }
  }

  /**
   * Test audio monitoring to verify it's working
   */
  private testAudioMonitoring(): void {
    if (!this.audioAnalyser || !this.audioDataArray) {
      console.error('❌ Audio monitoring not initialized')
      return
    }

    this.audioAnalyser.getByteFrequencyData(this.audioDataArray)
    const sum = this.audioDataArray.reduce((a, b) => a + b, 0)
    const average = sum / this.audioDataArray.length
    
    console.log('🧪 Audio Test:', {
      average: Math.round(average),
      min: Math.min(...Array.from(this.audioDataArray)),
      max: Math.max(...Array.from(this.audioDataArray)),
      status: average > 0 ? '✅ Working' : '⚠️ May need to make sound'
    })
    
    if (average === 0) {
      console.warn('⚠️ Audio appears silent - microphone may not be working properly')
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Monitoring already active')
      return
    }
    this.isMonitoring = true

    console.log('🚀 Starting proctoring monitoring...')
    console.log('📹 Models loaded:', this.modelsLoaded)
    console.log('🎥 Video element:', this.videoElement ? 'Ready' : 'Not available')
    console.log('🎤 Audio context:', this.audioContext ? 'Ready' : 'Not available')
    console.log('🔊 Audio analyser:', this.audioAnalyser ? 'Ready' : 'Not available')

    // Play notification sound for exam start
    soundAlerts.playNotification()

    // Face detection every 2 seconds
    this.faceDetectionInterval = window.setInterval(() => {
      this.detectFace()
    }, 2000)
    console.log('✅ Face detection interval started (every 2s)')
    console.log('👁️ Watch console for face detection logs starting in 2 seconds...')
    console.log('⏱️ Interval ID:', this.faceDetectionInterval)
    
    // Run first detection immediately to verify it works
    console.log('🔍 Running immediate test detection...')
    setTimeout(() => this.detectFace(), 100)

    // Audio monitoring every 100ms for ultra-responsive detection
    this.audioMonitoringInterval = window.setInterval(() => {
      this.monitorAudio()
    }, 100)
    console.log('✅ Audio monitoring interval started (every 100ms - 10 times per second)')
    console.log('🎯 Audio will be logged continuously in console')
    console.log('⏱️ Audio interval ID:', this.audioMonitoringInterval)
    
    // Test audio immediately
    console.log('🔊 Running immediate audio test...')
    setTimeout(() => this.monitorAudio(), 100)

    // Check lighting immediately and frequently
    this.performLightingCheck(false) // Initial check without alert (already shown at init)
    
    // Check brightness every 5 seconds and auto-pause if too dark
    // darkConsecutiveCount tracks consecutive dark frames to avoid false alarms from brief shadows
    let darkConsecutiveCount = 0
    const DARK_THRESHOLD = 20    // Hard pause threshold (lowered from 25 — less aggressive)
    const DARK_WARN_THRESHOLD = 30 // Warning threshold
    const MAX_DARK_FRAMES = 4    // Pause after 4 consecutive dark readings (~20 seconds)
    
    setInterval(() => {
      const brightness = this.checkBrightness()
      
      if (brightness < DARK_THRESHOLD && !this.status.isPaused) {
        darkConsecutiveCount++
        console.warn(`🌑 Dark frame #${darkConsecutiveCount}: brightness=${Math.round(brightness)}/255`)
        
        // Auto-pause after consecutive dark frames
        if (darkConsecutiveCount >= MAX_DARK_FRAMES) {
          console.error(`🚨 EXAM AUTO-PAUSED: Persistent darkness (${Math.round(brightness)}/255) for ${darkConsecutiveCount * 5}s`)
          
          this.pauseExam(
            `🚨 EXAM AUTO-PAUSED: Room lighting is too low (${Math.round(brightness)}/255)\n\n` +
            `Minimum required: 25/255\n\n` +
            `This may indicate a cheating attempt.\n\n` +
            `✅ Turn on your room lights immediately\n` +
            `✅ Face a light source\n\n` +
            `Contact proctor if this is a technical issue.`
          )
          
          this.addViolation({
            type: 'SUSPICIOUS_BEHAVIOR',
            severity: 'CRITICAL',
            timestamp: new Date(),
            message: `🚨 EXAM AUTO-PAUSED: Persistent darkness — brightness ${Math.round(brightness)}/255 for ${darkConsecutiveCount * 5}s`
          })
          darkConsecutiveCount = 0
        }
      } else if (brightness >= DARK_WARN_THRESHOLD) {
        darkConsecutiveCount = 0 // Reset when light is good again
      }
      
      // Regular lighting check with warnings
      this.performLightingCheck(false)
    }, 5000)

    // Start keyboard monitoring
    this.startKeyboardMonitoring()

    // Start mouse tracking
    this.startMouseTracking()

    // Start session recording if enabled
    if (this.status.sessionRecording) {
      this.startSessionRecording()
    }

    console.log('🎥 Continuous monitoring started')
  }

  /**
   * Start keyboard monitoring for suspicious activity
   */
  private startKeyboardMonitoring(): void {
    document.addEventListener('keydown', this.handleKeyDown)
    console.log('⌨️ Keyboard monitoring started')
  }

  /**
   * Start mouse tracking for suspicious movements
   */
  private startMouseTracking(): void {
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('click', this.handleMouseClick)
    console.log('🖱️ Mouse tracking started')
  }



  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false

    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval)
      this.faceDetectionInterval = null
    }

    if (this.audioMonitoringInterval) {
      clearInterval(this.audioMonitoringInterval)
      this.audioMonitoringInterval = null
    }

    console.log('⏹️ Monitoring stopped')
  }

  /**
   * Check if monitoring is currently active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring
  }

  /**
   * Detect faces in video stream
   */
  private async detectFace(): Promise<void> {
    console.log('🔍 detectFace() called - Video element:', !!this.videoElement, 'isMonitoring:', this.isMonitoring)
    
    if (!this.videoElement || !this.isMonitoring) {
      console.warn('⚠️ Face detection skipped:', { 
        videoElement: !!this.videoElement, 
        isMonitoring: this.isMonitoring 
      })
      return
    }
    
    console.log('📹 Video element state:', {
      readyState: this.videoElement.readyState,
      videoWidth: this.videoElement.videoWidth,
      videoHeight: this.videoElement.videoHeight,
      paused: this.videoElement.paused,
      currentTime: this.videoElement.currentTime
    })

    try {
      if (this.modelsLoaded) {
        console.log('🤖 Running face-api.js detection...')
        // Use face-api.js for advanced detection
        // scoreThreshold 0.5 prevents shadow/object false positives in dark rooms
        const detections = await faceapi.detectAllFaces(
          this.videoElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,  // Reduced from 416 — much faster on low-end devices, sufficient for face detection
            scoreThreshold: 0.3 // Lowered from 0.5 — laptop webcams naturally produce 0.25-0.45 confidence
          })
        ).withFaceLandmarks().withFaceExpressions()
        
        console.log('🔎 Detection complete. Faces found:', detections.length)
        
        // Log detailed detection info
        if (detections.length > 0) {
          detections.forEach((detection, index) => {
            console.log(`  Face ${index + 1}: confidence=${(detection.detection.score * 100).toFixed(1)}%, box=`, detection.detection.box)
          })
        }

        const faceCount = detections.length
        const now = Date.now()

        // Always log face detection results
        if (faceCount === 0) {
          console.log('👤 Face detection: ❌ NO FACE DETECTED')
        } else if (faceCount === 1) {
          const confidence = (detections[0].detection.score * 100).toFixed(1)
          console.log(`👤 Face detection: ✅ 1 FACE DETECTED (confidence: ${confidence}%)`)
        } else {
          console.log(`👤 Face detection: ⚠️ ${faceCount} FACES DETECTED`)
        }

        // No face detected
        if (faceCount === 0) {
          this.consecutiveNoFace++
          this.consecutiveMultipleFace = 0
          
          // Only warn after 3 consecutive detections (6 seconds) to avoid false positives
          if (this.consecutiveNoFace >= 3 && this.status.faceDetected) {
            // Check if it's a lighting issue
            const brightness = this.checkBrightness()
            let warningMessage = 'No face detected in camera - please ensure your face is visible'
            
            if (brightness < 30) {
              warningMessage = `🚨 No face detected - Room TOO DARK (${Math.round(brightness)}/255)! Turn on lights immediately!`
            } else if (brightness < 50) {
              warningMessage = `⚠️ No face detected - Room very dim (${Math.round(brightness)}/255). Please improve lighting!`
            }
            
            // Debounce: only warn every 10 seconds
            if (now - this.lastNoFaceWarning > 10000) {
              this.addViolation({
                type: 'NO_FACE',
                severity: brightness < 30 ? 'CRITICAL' : 'HIGH',
                timestamp: new Date(),
                message: warningMessage
              })
              this.lastNoFaceWarning = now
            }
          }
          this.status.faceDetected = false
          this.status.faceCount = 0
        }
        // Multiple faces detected
        else if (faceCount > 1) {
          this.consecutiveMultipleFace++
          this.consecutiveNoFace = 0
          
          // Require 2 consecutive detections (4 seconds) to reduce false positives
          // e.g., picture frame or poster briefly entering frame
          if (this.consecutiveMultipleFace >= 2) {
            // Debounce: only warn every 8 seconds
            if (now - this.lastMultipleFaceWarning > 8000) {
              this.addViolation({
                type: 'MULTIPLE_FACES',
                severity: 'CRITICAL',
                timestamp: new Date(),
                message: `🚨 CRITICAL: ${faceCount} faces detected in camera — Only ONE person allowed during exam!`,
                metadata: {
                  faceCount
                }
              })
              this.lastMultipleFaceWarning = now
              
              // Play critical alert sound
              soundAlerts.playCriticalAlert()
            }
          }
          this.status.faceDetected = true
          this.status.faceCount = faceCount
        }
        // Single face - check if looking at screen
        else {
          this.consecutiveNoFace = 0
          this.consecutiveMultipleFace = 0
          this.status.faceDetected = true
          this.status.faceCount = 1

          // Get detection confidence
          const detection = detections[0]
          const confidence = detection.detection.score

          // Analyze head pose/direction with improved algorithm
          const landmarks = detection.landmarks
          if (landmarks) {
            const lookingAway = this.isLookingAway(landmarks)
            
            // Check for phone usage
            const phoneDetected = this.detectPhoneUsage(landmarks)
            if (phoneDetected) {
              this.addViolation({
                type: 'PHONE_DETECTED',
                severity: 'CRITICAL',
                timestamp: new Date(),
                message: '📱 Possible phone or unauthorized device detected near face'
              })
            }
            
            // Analyze and store head pose
            const headPose = this.analyzeHeadPose(landmarks)
            this.headPoseHistory.push({ ...headPose, timestamp: Date.now() })
            if (this.headPoseHistory.length > 30) {
              this.headPoseHistory.shift()
            }
            
            if (lookingAway) {
              this.consecutiveLookingAway++
              
              console.log('👁️ Eye tracking: ⚠️ LOOKING AWAY DETECTED', {
                consecutive: this.consecutiveLookingAway,
                confidence: (confidence * 100).toFixed(1) + '%'
              })
              
              // Only warn after 3 consecutive detections (6 seconds) and if confidence is good
              if (this.consecutiveLookingAway >= 3 && confidence > 0.5) {
                // Debounce: only warn every 12 seconds
                if (now - this.lastLookingAwayWarning > 12000) {
                  this.addViolation({
                    type: 'FACE_NOT_LOOKING',
                    severity: 'MEDIUM',
                    timestamp: new Date(),
                    message: 'Looking away from screen detected - please keep eyes on exam'
                  })
                  this.lastLookingAwayWarning = now
                }
              }
              this.status.lookingAtScreen = false
            } else {
              this.consecutiveLookingAway = 0
              this.status.lookingAtScreen = true
              console.log('👁️ Eye tracking: ✅ LOOKING AT SCREEN', {
                confidence: (confidence * 100).toFixed(1) + '%'
              })
            }
            
            // Update attention level based on current state
            this.updateAttentionLevel()
          }

          // Verify identity continuously (if reference face exists)
          if (this.referenceFaceDescriptor) {
            await this.verifyIdentity()
          }
        }
      } else {
        // AI models NOT loaded — use brightness-based heuristic
        // NEVER assume face detected; only mark as unknown
        console.log('📹 Using basic video monitoring (AI models not loaded — no face claim)')
        const brightness = this.checkBrightness()
        if (this.videoElement.readyState >= 2 && brightness > 30) {
          // Video is playing and room is lit — we cannot confirm face but don't flag
          this.status.faceDetected = false // Do not claim face detected without AI
          this.status.faceCount = 0
          console.log(`⚠️ AI unavailable — brightness=${Math.round(brightness)}/255 — face status UNKNOWN`)
        } else {
          this.status.faceDetected = false
          this.status.faceCount = 0
          if (brightness <= 30) {
            console.warn(`🌑 Too dark for face detection — brightness: ${Math.round(brightness)}/255`)
          } else {
            console.log('⚠️ Video not ready, readyState:', this.videoElement.readyState)
          }
        }
      }

      // Update environment and integrity scores every detection cycle
      this.updateEnvironmentScore()
      this.updateIntegrityScore()

      this.notifyStatusChange()
    } catch (error) {
      console.warn('❌ Face detection error:', error)
    }
  }

  /**
   * Check if person is looking away based on facial landmarks
   * Improved algorithm with multiple checks for better accuracy
   */
  private isLookingAway(landmarks: faceapi.FaceLandmarks68): boolean {
    try {
      // Get facial feature positions
      const leftEye = landmarks.getLeftEye()
      const rightEye = landmarks.getRightEye()
      const nose = landmarks.getNose()
      const jawline = landmarks.getJawOutline()

      // Calculate center points
      const leftEyeCenter = this.getCenterPoint(leftEye)
      const rightEyeCenter = this.getCenterPoint(rightEye)
      const noseCenter = this.getCenterPoint(nose)
      const faceCenter = this.getCenterPoint(jawline)

      // Method 1: Nose offset from eye center line
      const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x)
      const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2
      const noseOffsetX = Math.abs(noseCenter.x - eyeCenterX)
      const horizontalRatio = noseOffsetX / eyeDistance

      // Method 2: Vertical alignment check (looking up/down)
      const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2
      const noseOffsetY = noseCenter.y - eyeCenterY
      const expectedNoseOffset = eyeDistance * 0.6 // Typical nose is below eyes
      const verticalDeviation = Math.abs(noseOffsetY - expectedNoseOffset) / eyeDistance

      // Method 3: Face rotation check using jawline
      const leftJaw = jawline[0]
      const rightJaw = jawline[jawline.length - 1]
      const jawWidth = Math.abs(rightJaw.x - leftJaw.x)
      const jawCenterX = (leftJaw.x + rightJaw.x) / 2
      const faceRotation = Math.abs(jawCenterX - eyeCenterX) / jawWidth

      // Combine checks - looking away if any threshold exceeded
      const isLookingLeft = horizontalRatio > 0.25 && noseCenter.x < eyeCenterX
      const isLookingRight = horizontalRatio > 0.25 && noseCenter.x > eyeCenterX
      const isLookingUpOrDown = verticalDeviation > 0.4
      const isFaceRotated = faceRotation > 0.3

      return isLookingLeft || isLookingRight || isLookingUpOrDown || isFaceRotated
    } catch (error) {
      console.warn('Eye tracking error:', error)
      return false // Don't penalize on error
    }
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
   * Detect potential phone usage or objects near face
   * Uses hand position estimation from landmarks
   */
  private detectPhoneUsage(landmarks: faceapi.FaceLandmarks68): boolean {
    try {
      const jawline = landmarks.getJawOutline()
      const mouth = landmarks.getMouth()
      const nose = landmarks.getNose()
      
      // Calculate face dimensions
      const leftJaw = jawline[0]
      const rightJaw = jawline[jawline.length - 1]
      const faceWidth = Math.abs(rightJaw.x - leftJaw.x)
      const topJaw = jawline[8] // Chin point
      const noseTop = nose[0]
      const faceHeight = Math.abs(topJaw.y - noseTop.y) * 2
      
      // Phone detection logic:
      // 1. Abnormal face width/height ratio (phone covering part of face)
      // 2. Mouth covered (unusual lower face visibility)
      // 3. Asymmetric jaw (object blocking one side)
      
      const aspectRatio = faceWidth / faceHeight
      const isAbnormalRatio = aspectRatio < 0.5 || aspectRatio > 1.5
      
      // Check for asymmetry (phone on one side)
      const leftSideWidth = Math.abs(jawline[4].x - leftJaw.x)
      const rightSideWidth = Math.abs(rightJaw.x - jawline[12].x)
      const asymmetry = Math.abs(leftSideWidth - rightSideWidth) / faceWidth
      const isAsymmetric = asymmetry > 0.3
      
      return isAbnormalRatio || isAsymmetric
    } catch (error) {
      return false
    }
  }

  /**
   * Analyze head pose for suspicious movements
   */
  private analyzeHeadPose(landmarks: faceapi.FaceLandmarks68): { yaw: number; pitch: number; roll: number } {
    try {
      const nose = landmarks.getNose()
      const leftEye = landmarks.getLeftEye()
      const rightEye = landmarks.getRightEye()
      const jawline = landmarks.getJawOutline()
      
      // Calculate approximate Euler angles
      const leftEyeCenter = this.getCenterPoint(leftEye)
      const rightEyeCenter = this.getCenterPoint(rightEye)
      const noseCenter = this.getCenterPoint(nose)
      
      // Yaw (left-right rotation)
      const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x)
      const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2
      const noseOffsetX = noseCenter.x - eyeCenterX
      const yaw = (noseOffsetX / eyeDistance) * 90 // Approximate degrees
      
      // Pitch (up-down rotation)
      const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2
      const noseOffsetY = noseCenter.y - eyeCenterY
      const pitch = (noseOffsetY / eyeDistance) * 60 // Approximate degrees
      
      // Roll (tilt)
      const eyeAngle = Math.atan2(
        rightEyeCenter.y - leftEyeCenter.y,
        rightEyeCenter.x - leftEyeCenter.x
      )
      const roll = eyeAngle * (180 / Math.PI) // Convert to degrees
      
      return { yaw, pitch, roll }
    } catch (error) {
      return { yaw: 0, pitch: 0, roll: 0 }
    }
  }

  /**
   * Monitor audio levels for conversation detection
   * Enhanced algorithm with multiple detection methods
   */
  private monitorAudio(): void {
    if (!this.audioAnalyser || !this.audioDataArray || !this.isMonitoring) return

    this.audioAnalyser.getByteFrequencyData(this.audioDataArray)

    // Calculate RMS (Root Mean Square) for more accurate audio level
    let sumSquares = 0
    for (let i = 0; i < this.audioDataArray.length; i++) {
      sumSquares += this.audioDataArray[i] * this.audioDataArray[i]
    }
    const rms = Math.sqrt(sumSquares / this.audioDataArray.length)
    
    // Get peak audio level
    const max = Math.max(...Array.from(this.audioDataArray))
    
    // Calculate average for backwards compatibility
    const sum = this.audioDataArray.reduce((a, b) => a + b, 0)
    const average = sum / this.audioDataArray.length
    
    // Analyze frequency bands (with better resolution due to larger FFT)
    // Human voice frequencies: 85-255 Hz (fundamental), with harmonics up to 4000 Hz
    const dataLength = this.audioDataArray.length
    const veryLowFreq = this.audioDataArray.slice(0, Math.floor(dataLength * 0.05)).reduce((a, b) => a + b, 0) / Math.floor(dataLength * 0.05) // 0-5%
    const lowFreq = this.audioDataArray.slice(Math.floor(dataLength * 0.05), Math.floor(dataLength * 0.15)).reduce((a, b) => a + b, 0) / Math.floor(dataLength * 0.1) // 5-15%
    const midFreq = this.audioDataArray.slice(Math.floor(dataLength * 0.15), Math.floor(dataLength * 0.35)).reduce((a, b) => a + b, 0) / Math.floor(dataLength * 0.2) // 15-35%
    const highFreq = this.audioDataArray.slice(Math.floor(dataLength * 0.35), Math.floor(dataLength * 0.6)).reduce((a, b) => a + b, 0) / Math.floor(dataLength * 0.25) // 35-60%
    
    this.status.audioLevel = rms // Use RMS instead of average

    // SENSITIVE thresholds - catches even quiet speech
    const SIMPLE_THRESHOLD = 10   // Average level - more sensitive
    const RMS_THRESHOLD = 12      // RMS level - catches even quiet speech
    const PEAK_THRESHOLD = 25     // Peak level - catches conversations
    const VOICE_FREQUENCY_MIN = 5 // Mid-frequency minimum for voice detection
    
    // Method 1: Simple threshold check
    const simpleDetection = average > SIMPLE_THRESHOLD
    
    // Method 2: RMS-based detection (more accurate for voice)
    const rmsDetection = rms > RMS_THRESHOLD
    
    // Method 3: Peak detection (catches loud sounds)
    const peakDetection = max > PEAK_THRESHOLD
    
    // Method 4: Frequency pattern analysis (voice has mid-frequency dominance)
    const voicePattern = (midFreq > veryLowFreq * 1.3) && (midFreq > VOICE_FREQUENCY_MIN)
    
    // Method 5: Energy distribution (voice has spread across low-mid-high)
    const energySpread = (lowFreq > 8) && (midFreq > 10) && (highFreq > 5)
    
    // Combine methods: Require MULTIPLE indicators to reduce false positives
    const strongSignal = rmsDetection && peakDetection
    const voiceSignal = (average > 10) && voicePattern && energySpread
    const audioDetected = strongSignal || voiceSignal
    
    // Only log when audio is detected or above baseline (reduce console spam)
    if (audioDetected || rms > 10) {
      console.log(`🎤 Audio: Avg=${Math.round(average)}, RMS=${Math.round(rms)}, Peak=${Math.round(max)}, Mid=${Math.round(midFreq)}, Detected=${audioDetected}`)
    }
    
    if (audioDetected) {
      this.consecutiveAudio++
      
      console.log(`🔊 AUDIO DETECTED! Consecutive count: ${this.consecutiveAudio}`)
      
      // Trigger warning after 2 consecutive detections (200ms) to avoid false positives
      if (this.consecutiveAudio >= 2) {
        const now = Date.now()
        
        // Debounce: only warn every 8 seconds (reasonable frequency)
        if (now - this.lastAudioWarning > 8000) {
          console.log(`⚠️ TRIGGERING AUDIO VIOLATION!`)
          this.addViolation({
            type: 'AUDIO_DETECTED',
            severity: 'MEDIUM',
            timestamp: new Date(),
            message: `🔊 Speech/Voice detected (RMS: ${Math.round(rms)}, Peak: ${Math.round(max)}) - Please remain silent`,
            metadata: {
              audioLevel: rms
            }
          })
          this.lastAudioWarning = now
          this.consecutiveAudio = 0 // Reset after warning
          console.log(`⚠️ AUDIO VIOLATION ADDED - Avg: ${Math.round(average)}, RMS: ${Math.round(rms)}, Peak: ${max}`)
        } else {
          console.log(`⏳ Audio detected but debounced (${Math.round((8000 - (now - this.lastAudioWarning))/1000)}s remaining)`)
        }
      }
    } else {
      this.consecutiveAudio = 0
    }

    this.notifyStatusChange()
  }

  /**
   * Record tab switch violation
   */
  recordTabSwitch(): void {
    this.status.tabSwitchCount++
    this.addViolation({
      type: 'TAB_SWITCH',
      severity: this.status.tabSwitchCount >= 3 ? 'CRITICAL' : 'HIGH',
      timestamp: new Date(),
      message: `Tab switched (Total: ${this.status.tabSwitchCount})`
    })
  }

  /**
   * Record window blur (clicking outside browser)
   */
  recordWindowBlur(): void {
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
    this.status.fullscreenExitCount++
    this.addViolation({
      type: 'FULLSCREEN_EXIT',
      severity: 'HIGH',
      timestamp: new Date(),
      message: `Exited fullscreen mode (Total: ${this.status.fullscreenExitCount})`
    })
  }

  /**
   * Capture screenshot from video stream
   */
  private async captureScreenshot(): Promise<string | null> {
    if (!this.videoElement) return null
    
    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.videoElement.videoWidth
      canvas.height = this.videoElement.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return null
      
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.7)
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      return null
    }
  }

  /**
   * Check video brightness to detect low light conditions
   */
  private checkBrightness(): number {
    if (!this.videoElement) return 100

    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.videoElement.videoWidth
      canvas.height = this.videoElement.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return 100
      
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let sum = 0
      for (let i = 0; i < data.length; i += 4) {
        // Calculate perceived brightness
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        sum += brightness
      }
      
      const averageBrightness = sum / (data.length / 4)
      return averageBrightness
    } catch (error) {
      console.warn('Brightness check failed:', error)
      return 100
    }
  }

  /**
   * Perform comprehensive lighting check and alert user if too dark
   * Returns true if lighting is acceptable, false if too dark to continue
   * Note: Made more lenient to support virtual cameras and various lighting conditions
   */
  private performLightingCheck(showAlert: boolean = false): boolean {
    const brightness = this.checkBrightness()
    
    console.log(`💡 Room brightness: ${Math.round(brightness)}/255`)
    
    // HARD BLOCK: No video signal at all
    if (brightness === 0) {
      const message = `❌ No video signal! Camera feed is completely black.\n\n✅ Check camera is not covered\n✅ Try refreshing the page`
      console.error(message)
      if (showAlert) alert(message)
      return false // Block exam start
    }
    
    // HARD BLOCK: Room too dark for reliable face detection (< 30)
    // This is the FIX for "exam starting in dark room" bug
    if (brightness < 30) {
      const message = `🌑 Room is too dark for face detection (${Math.round(brightness)}/255)\n\nMinimum required: 30/255\n\nPlease:\n✅ Turn on room lights\n✅ Face a window or light source\n✅ Avoid backlighting`
      console.error(`🚨 BLOCKING EXAM START: Lighting too low (${Math.round(brightness)}/255 < 30)`)
      if (showAlert) {
        setTimeout(() => alert(message), 500)
      }
      return false // BLOCK — cannot verify identity in darkness
    }
    
    // WARNING: Very dim room (30–50) — allow but warn
    if (brightness < 50) {
      console.warn(`⚠️ Dim lighting (${Math.round(brightness)}/255) — face detection may be less accurate`)
      this.addViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        severity: 'MEDIUM',
        timestamp: new Date(),
        message: `💡 Dim lighting detected (${Math.round(brightness)}/255) — improve lighting for better accuracy`
      })
      return true // Allow but logged
    }
    
    // WARNING: Low light (50–70)
    if (brightness < 70) {
      console.warn(`⚠️ Low lighting (${Math.round(brightness)}/255)`)
      return true // Acceptable
    }
    
    // Good lighting
    console.log(`✅ Good lighting (${Math.round(brightness)}/255)`)
    return true
  }

  /**
   * PUBLIC: Verify environment before exam start
   * Returns { ok: boolean, reason: string, brightness: number }
   * This is the GATE that prevents exam from starting in dark rooms
   */
  async verifyEnvironmentBeforeStart(): Promise<{ ok: boolean; reason: string; brightness: number; faceDetected: boolean }> {
    const brightness = this.checkBrightness()
    
    if (brightness === 0) {
      return { ok: false, reason: 'Camera shows no video — check camera is working and not covered', brightness, faceDetected: false }
    }
    
    if (brightness < 30) {
      return {
        ok: false,
        reason: `Room is too dark (${Math.round(brightness)}/255). Turn on lights to at least 30/255 brightness before starting.`,
        brightness,
        faceDetected: false
      }
    }
    
    // Check for face detection if models loaded
    let faceDetected = false
    if (this.modelsLoaded && this.videoElement) {
      try {
        const detection = await faceapi.detectSingleFace(
          this.videoElement,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        )
        faceDetected = !!detection
      } catch {
        faceDetected = false
      }
    } else {
      // Models not loaded — cannot confirm face, but don't block if lit
      faceDetected = brightness >= 50
    }
    
    if (!faceDetected && brightness >= 30) {
      return {
        ok: false,
        reason: 'No face detected. Position your face clearly in front of the camera.',
        brightness,
        faceDetected: false
      }
    }
    
    return { ok: true, reason: 'Environment verified', brightness, faceDetected: true }
  }

  /**
   * Add a violation with optional evidence capture
   */
  private async addViolation(violation: ProctoringViolation): Promise<void> {
    console.log('🚨 VIOLATION ADDED:', {
      type: violation.type,
      severity: violation.severity,
      message: violation.message,
      metadata: violation.metadata
    })
    
    // Play sound alert based on severity
    soundAlerts.playViolationAlert(violation.severity)
    
    // Capture screenshot for critical/high severity violations
    if (violation.severity === 'CRITICAL' || violation.severity === 'HIGH') {
      violation.evidence = await this.captureScreenshot() || undefined
    }

    this.status.violations.push(violation)
    
    // Update suspicious activity score
    this.updateSuspiciousScore(violation.severity)
    
    // Check if auto-pause is needed
    if (violation.severity === 'CRITICAL' && this.shouldAutoPause()) {
      await this.pauseExam(`Critical violation: ${violation.message}`)
    }
    
    // Notify callback - CRITICAL for teacher monitoring!
    if (this.onViolation) {
      console.log('📡 Calling violation callback to send to teacher...')
      this.onViolation(violation)
    } else {
      console.warn('⚠️ NO VIOLATION CALLBACK SET! Teacher will not be notified!')
    }

    this.notifyStatusChange()
  }

  /**
   * Update suspicious activity score based on violation severity
   */
  private updateSuspiciousScore(severity: ProctoringViolation['severity']): void {
    const scoreIncrements = {
      CRITICAL: 25,
      HIGH: 15,
      MEDIUM: 8,
      LOW: 3
    }
    
    this.status.suspiciousActivityScore = Math.min(
      100,
      this.status.suspiciousActivityScore + scoreIncrements[severity]
    )
  }

  /**
   * Check if exam should be auto-paused
   */
  private shouldAutoPause(): boolean {
    // Auto-pause if suspicious score exceeds 60 or more than 3 critical violations
    const criticalViolations = this.status.violations.filter(v => v.severity === 'CRITICAL').length
    return this.status.suspiciousActivityScore > 60 || criticalViolations >= 3
  }

  /**
   * Update attention level based on eye tracking history
   */
  private updateAttentionLevel(): void {
    const now = Date.now()
    
    // Update time tracking
    if (this.status.lookingAtScreen) {
      this.attentionMetrics.totalLookingTime += now - this.attentionMetrics.lastStateChange
    } else {
      this.attentionMetrics.totalLookingAwayTime += now - this.attentionMetrics.lastStateChange
    }
    this.attentionMetrics.lastStateChange = now
    
    // Calculate attention percentage
    const totalTime = this.attentionMetrics.totalLookingTime + this.attentionMetrics.totalLookingAwayTime
    if (totalTime > 0) {
      this.status.attentionLevel = Math.round((this.attentionMetrics.totalLookingTime / totalTime) * 100)
    }
  }

  /**
   * Update environment score based on lighting and noise
   */
  private updateEnvironmentScore(): void {
    const brightness = this.checkBrightness()
    this.environmentMetrics.brightnessHistory.push(brightness)
    
    // Keep only last 20 readings (2 minutes of data)
    if (this.environmentMetrics.brightnessHistory.length > 20) {
      this.environmentMetrics.brightnessHistory.shift()
    }
    
    // Calculate average brightness
    const avgBrightness = this.environmentMetrics.brightnessHistory.reduce((a, b) => a + b, 0) / 
                         this.environmentMetrics.brightnessHistory.length
    
    // Score: 100 if brightness >= 70, scaled down to 0 at brightness 30
    let brightnessScore = 100
    if (avgBrightness < 70) {
      brightnessScore = Math.max(0, ((avgBrightness - 30) / 40) * 100)
    }
    
    // Noise score based on audio level (inverse - lower is better)
    const noiseScore = Math.max(0, 100 - (this.status.audioLevel * 2))
    
    // Combined environment score (70% brightness, 30% noise)
    this.status.environmentScore = Math.round((brightnessScore * 0.7) + (noiseScore * 0.3))
  }

  /**
   * Calculate overall integrity score
   */
  private updateIntegrityScore(): void {
    // Integrity formula:
    // 40% - No violations (100 - suspiciousActivityScore)
    // 30% - Attention level
    // 20% - Environment quality
    // 10% - Identity verification
    
    const violationScore = Math.max(0, 100 - this.status.suspiciousActivityScore)
    const identityScore = this.status.identityVerified ? 100 : 0
    
    this.status.integrityScore = Math.round(
      (violationScore * 0.4) +
      (this.status.attentionLevel * 0.3) +
      (this.status.environmentScore * 0.2) +
      (identityScore * 0.1)
    )
  }

  /**
   * Pause exam due to violations
   */
  private async pauseExam(reason: string): Promise<void> {
    if (this.status.isPaused) return
    
    // Play pause alert sound
    soundAlerts.playPauseAlert()
    
    this.status.isPaused = true
    this.status.pauseReason = reason
    
    // Stop all monitoring temporarily
    this.pauseMonitoring()
    
    if (this.onPause) {
      this.onPause(reason)
    }
    
    this.notifyStatusChange()
  }

  /**
   * Pause monitoring activities
   */
  private pauseMonitoring(): void {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval)
      this.faceDetectionInterval = null
    }
    if (this.audioMonitoringInterval) {
      clearInterval(this.audioMonitoringInterval)
      this.audioMonitoringInterval = null
    }
  }

  /**
   * Resume exam after pause
   */
  resumeExam(): void {
    if (!this.status.isPaused) return
    
    // Play resume alert sound
    soundAlerts.playResumeAlert()
    
    this.status.isPaused = false
    this.status.pauseReason = undefined
    
    // Resume monitoring
    if (this.status.isActive) {
      this.startMonitoring()
    }
    
    this.notifyStatusChange()
  }

  /**
   * Start session recording for audit trail
   */
  private async startSessionRecording(): Promise<void> {
    if (!this.stream || this.mediaRecorder) return

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(1000) // Collect data every second
      this.status.sessionRecording = true
      console.log('🎬 Session recording started')
    } catch (error) {
      console.warn('⚠️ Session recording failed:', error)
    }
  }

  /**
   * Stop session recording
   */
  private stopSessionRecording(): void {
    if (!this.mediaRecorder) return

    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    
    // Clear recorded chunks to free memory
    this.recordedChunks = []
    this.mediaRecorder = null
    this.status.sessionRecording = false
    console.log('⏹️ Session recording stopped and cleaned up')
  }

  /**
   * Download recorded session
   */
  downloadRecording(): void {
    if (this.recordedChunks.length === 0) {
      console.warn('No recording available')
      return
    }

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam-session-${new Date().toISOString()}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Capture reference face for identity verification
   */
  async captureReferenceFace(): Promise<boolean> {
    if (!this.videoElement || !this.modelsLoaded) return false

    try {
      const detection = await faceapi.detectSingleFace(
        this.videoElement,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor()

      if (detection && detection.descriptor) {
        this.referenceFaceDescriptor = detection.descriptor as Float32Array
        this.status.identityVerified = true
        console.log('✅ Reference face captured for identity verification')
        return true
      }

      return false
    } catch (error) {
      console.error('Reference face capture failed:', error)
      return false
    }
  }

  /**
   * Verify current face matches reference
   */
  private async verifyIdentity(): Promise<void> {
    if (!this.referenceFaceDescriptor || !this.videoElement || !this.modelsLoaded) return

    try {
      const detection = await faceapi.detectSingleFace(
        this.videoElement,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor()

      if (detection && detection.descriptor) {
        const distance = faceapi.euclideanDistance(
          this.referenceFaceDescriptor,
          detection.descriptor as Float32Array
        )

        // If distance > 0.5, likely different person (stricter threshold)
        if (distance > 0.5) {
          this.status.identityVerified = false
          const similarity = Math.round((1 - distance) * 100)
          this.addViolation({
            type: 'FACE_CHANGED',
            severity: 'CRITICAL',
            timestamp: new Date(),
            message: `🚨 CRITICAL: Face identity verification FAILED! Different person detected (${similarity}% match)`,
            metadata: {
              faceConfidence: similarity,
              distance: distance
            }
          })
          
          // Play critical alert sound
          soundAlerts.playCriticalAlert()
          
          // Pause exam automatically
          this.pauseExam('Identity verification failed - different person detected')
        } else {
          this.status.identityVerified = true
        }
      }
    } catch (error) {
      console.warn('Identity verification error:', error)
    }
  }

  /**
   * Set pause callback
   */
  setOnPause(callback: (reason: string) => void): void {
    this.onPause = callback
  }

  /**
   * Enable session recording
   */
  enableRecording(): void {
    if (this.isMonitoring && !this.status.sessionRecording) {
      this.startSessionRecording()
    }
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
   * Set violation callback
   */
  setOnViolation(callback: (violation: ProctoringViolation) => void): void {
    this.onViolation = callback
  }

  /**
   * Set status change callback
   */
  setOnStatusChange(callback: (status: ProctoringStatus) => void): void {
    this.onStatusChange = callback
  }

  /**
   * Get current status
   */
  getStatus(): ProctoringStatus {
    return { ...this.status }
  }

  /**
   * Get violation count by severity
   */
  getViolationCountBySeverity(): Record<string, number> {
    return this.status.violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Get current brightness level
   */
  getBrightness(): number {
    return this.checkBrightness()
  }

  /**
   * Get the media stream
   */
  getStream(): MediaStream | null {
    return this.stream
  }

  /**
   * Get system diagnostics for debugging
   */
  getDiagnostics(): {
    isMonitoring: boolean
    modelsLoaded: boolean
    videoReady: boolean
    audioReady: boolean
    currentAudioLevel: number
    faceDetected: boolean
    faceCount: number
    violationsCount: number
    integrityScore: number
    attentionLevel: number
  } {
    return {
      isMonitoring: this.isMonitoring,
      modelsLoaded: this.modelsLoaded,
      videoReady: (this.videoElement?.readyState ?? 0) >= 2,
      audioReady: this.audioContext?.state === 'running' || false,
      currentAudioLevel: this.status.audioLevel,
      faceDetected: this.status.faceDetected,
      faceCount: this.status.faceCount,
      violationsCount: this.status.violations.length,
      integrityScore: this.status.integrityScore,
      attentionLevel: this.status.attentionLevel
    }
  }

  /**
   * Generate comprehensive proctoring report
   */
  generateReport(): {
    summary: {
      totalViolations: number
      criticalViolations: number
      highViolations: number
      mediumViolations: number
      lowViolations: number
      integrityScore: number
      attentionLevel: number
      environmentScore: number
      suspiciousActivityScore: number
    }
    timeline: Array<{
      timestamp: Date
      type: string
      severity: string
      message: string
    }>
    recommendations: string[]
    verdict: 'CLEAN' | 'SUSPICIOUS' | 'FLAGGED' | 'CRITICAL'
  } {
    const violations = this.status.violations
    const violationCounts = this.getViolationCountBySeverity()
    
    // Determine verdict
    let verdict: 'CLEAN' | 'SUSPICIOUS' | 'FLAGGED' | 'CRITICAL' = 'CLEAN'
    if (violationCounts['CRITICAL'] >= 3 || this.status.suspiciousActivityScore > 80) {
      verdict = 'CRITICAL'
    } else if (violationCounts['CRITICAL'] >= 1 || this.status.suspiciousActivityScore > 50) {
      verdict = 'FLAGGED'
    } else if (violations.length > 5 || this.status.suspiciousActivityScore > 25) {
      verdict = 'SUSPICIOUS'
    }
    
    // Generate recommendations
    const recommendations: string[] = []
    if (this.status.attentionLevel < 70) {
      recommendations.push('Student showed decreased attention - frequent looking away detected')
    }
    if (this.status.environmentScore < 60) {
      recommendations.push('Poor environment conditions - insufficient lighting or excessive noise')
    }
    if (violationCounts['MULTIPLE_FACES']) {
      recommendations.push('Multiple faces detected - possible unauthorized assistance')
    }
    if (violationCounts['TAB_SWITCH'] > 3) {
      recommendations.push('Excessive tab switching - possible external resource usage')
    }
    if (violationCounts['AUDIO_DETECTED'] > 2) {
      recommendations.push('Multiple audio violations - possible conversation or assistance')
    }
    if (violationCounts['FACE_CHANGED']) {
      recommendations.push('Identity verification failed - different person may have been detected')
    }
    if (this.status.integrityScore < 60) {
      recommendations.push('Low integrity score - manual review recommended')
    }
    
    return {
      summary: {
        totalViolations: violations.length,
        criticalViolations: violationCounts['CRITICAL'] || 0,
        highViolations: violationCounts['HIGH'] || 0,
        mediumViolations: violationCounts['MEDIUM'] || 0,
        lowViolations: violationCounts['LOW'] || 0,
        integrityScore: this.status.integrityScore,
        attentionLevel: this.status.attentionLevel,
        environmentScore: this.status.environmentScore,
        suspiciousActivityScore: this.status.suspiciousActivityScore
      },
      timeline: violations.map(v => ({
        timestamp: v.timestamp,
        type: v.type,
        severity: v.severity,
        message: v.message
      })),
      recommendations,
      verdict
    }
  }

  /**
   * Export report as JSON
   */
  exportReportJSON(): string {
    const report = this.generateReport()
    return JSON.stringify(report, null, 2)
  }

  /**
   * Intercept navigator.mediaDevices.getDisplayMedia to detect screen sharing
   * Must be called before monitoring starts
   */
  installScreenShareInterceptor(): void {
    if (!(navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)) return

    const original = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
    const self = this

    navigator.mediaDevices.getDisplayMedia = async function (...args: any[]): Promise<MediaStream> {
      const stream = await original(...args)

      // Mark globally so ExamPage can also detect
      ;(window as any).__screenShareStream = stream

      self.addViolation({
        type: 'SCREEN_SHARE',
        severity: 'CRITICAL',
        timestamp: new Date(),
        message: 'Screen sharing initiated during exam — critical violation',
      })

      // Stop the stream immediately
      stream.getTracks().forEach(t => t.stop())
      ;(window as any).__screenShareStream = null

      return stream
    }
  }

  /**
   * Start window-size / taskbar detection polling
   */
  startWindowSizeMonitoring(): void {
    if (this.windowSizeCheckInterval) return

    this.windowSizeCheckInterval = window.setInterval(() => {
      if (!this.isMonitoring) return
      if (!document.fullscreenElement) return

      const ratio = window.outerHeight / window.screen.height
      if (ratio < 0.95) {
        this.addViolation({
          type: 'WINDOW_MINIMIZED',
          severity: 'HIGH',
          timestamp: new Date(),
          message: `Exam window resized or minimized (window ratio: ${(ratio * 100).toFixed(0)}%)`,
        })
        // Re-request fullscreen
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }, 2000)

    // PiP detection
    this.pipHandler = () => {
      this.addViolation({
        type: 'PIP_DETECTED',
        severity: 'HIGH',
        timestamp: new Date(),
        message: 'Picture-in-Picture mode activated during exam',
      })
    }
    document.addEventListener('enterpictureinpicture', this.pipHandler as EventListener)

    // Window blur (user alt-tabbed)
    this.windowBlurHandler = () => {
      if (!this.isMonitoring) return
      this.addViolation({
        type: 'WINDOW_BLUR',
        severity: 'MEDIUM',
        timestamp: new Date(),
        message: 'Browser window lost focus — possible Alt+Tab or external app switch',
      })
    }
    window.addEventListener('blur', this.windowBlurHandler)
  }

  stopWindowSizeMonitoring(): void {
    if (this.windowSizeCheckInterval) {
      clearInterval(this.windowSizeCheckInterval)
      this.windowSizeCheckInterval = null
    }
    if (this.pipHandler) {
      document.removeEventListener('enterpictureinpicture', this.pipHandler as EventListener)
      this.pipHandler = null
    }
    if (this.windowBlurHandler) {
      window.removeEventListener('blur', this.windowBlurHandler)
      this.windowBlurHandler = null
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log('🧹 Starting cleanup...')
    
    this.stopMonitoring()
    this.stopWindowSizeMonitoring()

    // Stop session recording
    if (this.status.sessionRecording) {
      this.stopSessionRecording()
    }

    if (this.stream) {
      console.log('🛑 Stopping media stream tracks...')
      this.stream.getTracks().forEach(track => {
        console.log(`  Stopping ${track.kind} track:`, track.label)
        track.stop()
      })
      this.stream = null
    }

    // Clear video element
    if (this.videoElement && this.videoElement.srcObject) {
      console.log('📺 Clearing video srcObject...')
      this.videoElement.srcObject = null
    }

    if (this.audioContext) {
      console.log('🔊 Closing audio context...')
      this.audioContext.close()
      this.audioContext = null
    }

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('click', this.handleMouseClick)

    // Cleanup sound alerts
    soundAlerts.destroy()

    this.status.isActive = false
    this.notifyStatusChange()

    console.log('✅ Proctoring cleaned up successfully')
  }

  // Store event handlers for cleanup
  private handleKeyDown = (e: KeyboardEvent) => this.onKeyDown(e)
  private handleMouseMove = (e: MouseEvent) => this.onMouseMove(e)
  private handleMouseClick = (e: MouseEvent) => this.onClick(e)

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.isMonitoring) return

    // Detect copy-paste attempts
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
      this.copyPasteAttempts++
      this.addViolation({
        type: 'COPY_PASTE',
        severity: 'HIGH',
        timestamp: new Date(),
        message: `Copy-paste attempt detected (${e.key.toUpperCase()})`,
        metadata: {
          keystrokes: [`Ctrl+${e.key.toUpperCase()}`]
        }
      })
    }

    // Detect Alt+Tab (window switching)
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault()
      this.addViolation({
        type: 'TAB_SWITCH',
        severity: 'CRITICAL',
        timestamp: new Date(),
        message: 'Alt+Tab detected - attempting to switch windows'
      })
    }

    // Detect F11 (fullscreen toggle)
    if (e.key === 'F11') {
      e.preventDefault()
    }

    // Detect Ctrl+Shift+I (DevTools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      this.addViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        severity: 'CRITICAL',
        timestamp: new Date(),
        message: 'Attempted to open Developer Tools'
      })
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isMonitoring) return

    const currentPos = { x: e.clientX, y: e.clientY }
    
    // Check if mouse left screen bounds
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    
    if (e.clientX < 0 || e.clientX > screenWidth || e.clientY < 0 || e.clientY > screenHeight) {
      this.suspiciousMouseCount++
      if (this.suspiciousMouseCount > 5) {
        this.addViolation({
          type: 'MOUSE_LEFT_SCREEN',
          severity: 'MEDIUM',
          timestamp: new Date(),
          message: 'Mouse left screen boundaries multiple times',
          metadata: {
            mousePosition: currentPos
          }
        })
        this.suspiciousMouseCount = 0
      }
    }

    this.lastMousePosition = currentPos
  }

  private onClick(e: MouseEvent): void {
    if (!this.isMonitoring) return

    // Detect rapid clicking (potential bot)
    const now = Date.now()
    if (!this.lastClickTime) {
      this.lastClickTime = now
      this.clickCount = 1
    } else {
      const timeDiff = now - this.lastClickTime
      if (timeDiff < 100) { // Less than 100ms between clicks
        this.clickCount++
        if (this.clickCount >= 5) {
          this.addViolation({
            type: 'RAPID_CLICKING',
            severity: 'MEDIUM',
            timestamp: new Date(),
            message: 'Rapid clicking detected - potential automated activity'
          })
          this.clickCount = 0
        }
      } else {
        this.clickCount = 1
      }
      this.lastClickTime = now
    }
  }
}

export default ProctoringEngine
