import { WebSocketClient } from '../lib/websocket'

const MAX_AUDIO_QUEUE = 10
const MIN_BUFFER_BEFORE_PLAY = 2
const SEGMENT_DURATION_MS = 2000
const AUDIO_BITRATE = 48000
const GAP_THRESHOLD_SEC = 0.4

export class AudioStreamer {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private wsClient: WebSocketClient | null = null
  private examId: string = ''
  private studentId: string = ''
  private active: boolean = false
  private sequence: number = 0
  private segmentTimer: ReturnType<typeof setInterval> | null = null
  private retryCount = 0
  private readonly MAX_RETRIES = 5

  async start(
    stream: MediaStream,
    wsClient: WebSocketClient,
    examId: string,
    studentId: string
  ): Promise<void> {
    if (this.active) return
    this.stop()

    const mimeType = this.pickMimeType()
    if (!mimeType) {
      console.error('[AudioStreamer] No supported MIME type found')
      return
    }

    this.stream = stream
    this.wsClient = wsClient
    this.examId = examId
    this.studentId = studentId
    this.sequence = 0
    this.retryCount = 0

    await this.startSegment(mimeType)
  }

  private async startSegment(mimeType: string): Promise<void> {
    if (!this.stream || !this.active) return

    try {
      const audioTracks = this.stream.getAudioTracks()
      if (audioTracks.length === 0) {
        console.warn('[AudioStreamer] No audio tracks in stream')
        return
      }

      const audioOnlyStream = new MediaStream(audioTracks)
      this.mediaRecorder = new MediaRecorder(audioOnlyStream, {
        mimeType,
        audioBitsPerSecond: AUDIO_BITRATE,
      })

      let segmentBlob: Blob | null = null

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          segmentBlob = e.data
        }
      }

      this.mediaRecorder.onstop = () => {
        if (segmentBlob && segmentBlob.size > 0 && this.wsClient?.isConnected()) {
          this.sendChunk(segmentBlob)
          segmentBlob = null
        }

        if (this.active) {
          this.segmentTimer = setTimeout(() => {
            if (this.active && this.stream) {
              this.startSegment(mimeType)
            }
          }, 100)
        }
      }

      this.mediaRecorder.onerror = (e) => {
        console.error('[AudioStreamer] MediaRecorder error:', e)
        if (this.mediaRecorder?.state !== 'inactive') {
          try { this.mediaRecorder?.stop() } catch { /* ignore */ }
        }
      }

      this.mediaRecorder.start()
      this.active = true
      this.retryCount = 0

      this.segmentTimer = setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          try { this.mediaRecorder.stop() } catch { /* ignore */ }
        }
      }, SEGMENT_DURATION_MS)

      console.log('[AudioStreamer] Segment started', { mimeType, bitrate: AUDIO_BITRATE, durationMs: SEGMENT_DURATION_MS })
    } catch (err) {
      console.error('[AudioStreamer] Failed to start segment:', err)
      this.retryCount++
      if (this.retryCount < this.MAX_RETRIES && this.active) {
        setTimeout(() => {
          if (this.active && this.stream) {
            this.startSegment(mimeType)
          }
        }, 1000)
      } else {
        this.active = false
      }
    }
  }

  stop(): void {
    this.active = false
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer)
      this.segmentTimer = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop() } catch { /* ignore */ }
    }
    this.mediaRecorder = null
  }

  get isActive(): boolean { return this.active }

  private pickMimeType(): string | null {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return null
  }

  private sendChunk(blob: Blob): void {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      if (base64 && this.wsClient?.isConnected()) {
        this.wsClient.send({
          type: 'audio_chunk',
          exam_id: this.examId,
          student_id: this.studentId,
          data: base64,
          sequence: this.sequence++,
          mimeType: this.mediaRecorder?.mimeType || 'audio/webm',
        })
      }
    }
    reader.readAsDataURL(blob)
  }
}

export class TeacherAudioPlayer {
  private wsClient: WebSocketClient | null = null
  private studentId: string | null = null
  private audioCtx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private queue: AudioBuffer[] = []
  private playing = false
  private nextTime = 0
  private sources: AudioBufferSourceNode[] = []
  private boundHandler: ((data: any) => void) | null = null
  private chunksReceived = 0
  private chunksPlayed = 0
  private chunksDropped = 0
  private _volume = 0.8
  private resumeInterval: ReturnType<typeof setInterval> | null = null

  async start(wsClient: WebSocketClient, studentId: string): Promise<void> {
    this.stop()
    this.wsClient = wsClient
    this.studentId = studentId
    this.chunksReceived = 0
    this.chunksPlayed = 0
    this.chunksDropped = 0

    this.audioCtx = new AudioContext({ sampleRate: 48000 })
    this.gainNode = this.audioCtx.createGain()
    this.gainNode.gain.value = this._volume
    this.gainNode.connect(this.audioCtx.destination)

    if (this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume() } catch { /* ignore */ }
    }

    this.resumeInterval = setInterval(async () => {
      if (this.audioCtx?.state === 'suspended') {
        try { await this.audioCtx.resume() } catch { /* ignore */ }
      }
    }, 2000)

    this.queue = []
    this.playing = false
    this.nextTime = 0
    this.sources = []

    this.boundHandler = (data: any) => {
      if (!data.data || !this.audioCtx || data.student_id !== this.studentId) return
      this.chunksReceived++
      this.handleChunk(data.data)
    }

    wsClient.on('audio_chunk', this.boundHandler)
    console.log('[TeacherAudioPlayer] Started listening to student:', studentId)
  }

  stop(): void {
    this.studentId = null
    this.playing = false

    const srcs = this.sources.slice()
    this.sources = []
    for (const s of srcs) {
      try { s.stop() } catch { /* ignore */ }
    }
    this.queue = []

    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    if (this.resumeInterval) {
      clearInterval(this.resumeInterval)
      this.resumeInterval = null
    }
    if (this.wsClient && this.boundHandler) {
      this.wsClient.off('audio_chunk', this.boundHandler)
    }
    this.boundHandler = null
    this.wsClient = null
  }

  get active(): boolean { return this.studentId !== null }
  get currentStudentId(): string | null { return this.studentId }

  get volume(): number { return this._volume }
  set volume(val: number) {
    this._volume = Math.max(0, Math.min(1, val))
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(this._volume, this.audioCtx?.currentTime || 0, 0.05)
    }
  }

  get stats() {
    return {
      received: this.chunksReceived,
      played: this.chunksPlayed,
      dropped: this.chunksDropped,
      queueLength: this.queue.length,
    }
  }

  private async handleChunk(base64Data: string): Promise<void> {
    if (!this.audioCtx) return
    try {
      const bin = atob(base64Data)
      const buf = new ArrayBuffer(bin.length)
      const view = new Uint8Array(buf)
      for (let i = 0; i < bin.length; i++) {
        view[i] = bin.charCodeAt(i)
      }

      const audioBuffer = await this.audioCtx.decodeAudioData(buf)

      if (this.queue.length >= MAX_AUDIO_QUEUE) {
        this.queue.shift()
        this.chunksDropped++
      }
      this.queue.push(audioBuffer)

      if (this.queue.length >= MIN_BUFFER_BEFORE_PLAY && !this.playing) {
        this.drain()
      } else if (this.playing) {
        this.drain()
      }
    } catch (err) {
      this.chunksDropped++
      console.warn('[TeacherAudioPlayer] Decode error (chunk dropped):', err instanceof Error ? err.message : 'unknown')
    }
  }

  private drain(): void {
    if (!this.audioCtx || !this.gainNode || this.queue.length === 0) {
      this.playing = false
      return
    }

    this.playing = true
    const buf = this.queue.shift()!
    const src = this.audioCtx.createBufferSource()
    src.buffer = buf
    src.connect(this.gainNode)

    const now = this.audioCtx.currentTime
    let start = Math.max(now, this.nextTime)

    const gap = start - (this.nextTime || now)
    if (gap > GAP_THRESHOLD_SEC && this.nextTime > 0) {
      start = now + 0.02
    }

    const safeStart = Math.max(start, now)
    src.start(safeStart)
    this.nextTime = safeStart + buf.duration
    this.chunksPlayed++

    this.sources.push(src)
    src.onended = () => {
      const idx = this.sources.indexOf(src)
      if (idx > -1) this.sources.splice(idx, 1)
      if (this.playing) {
        this.drain()
      }
    }
  }
}
