/**
 * Sound Alert System
 * Provides audio feedback for proctoring violations
 */

class SoundAlertSystem {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    // Initialize on user interaction to avoid browser autoplay restrictions
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  /**
   * Enable or disable sound alerts
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  /**
   * Play a warning beep sound
   */
  private playBeep(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.enabled || !this.audioContext) return

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
    } catch (error) {
      console.error('Failed to play sound alert:', error)
    }
  }

  /**
   * Play alert for LOW severity violations
   */
  playLowAlert() {
    this.playBeep(400, 0.2, 0.2)
  }

  /**
   * Play alert for MEDIUM severity violations
   */
  playMediumAlert() {
    this.playBeep(600, 0.3, 0.3)
    setTimeout(() => this.playBeep(600, 0.3, 0.3), 150)
  }

  /**
   * Play alert for HIGH severity violations
   */
  playHighAlert() {
    this.playBeep(800, 0.4, 0.4)
    setTimeout(() => this.playBeep(800, 0.4, 0.4), 150)
    setTimeout(() => this.playBeep(800, 0.4, 0.4), 300)
  }

  /**
   * Play alert for CRITICAL severity violations
   */
  playCriticalAlert() {
    // Urgent alarm pattern
    this.playBeep(1000, 0.2, 0.5)
    setTimeout(() => this.playBeep(1200, 0.2, 0.5), 100)
    setTimeout(() => this.playBeep(1000, 0.2, 0.5), 200)
    setTimeout(() => this.playBeep(1200, 0.2, 0.5), 300)
    setTimeout(() => this.playBeep(1400, 0.4, 0.5), 400)
  }

  /**
   * Play alert based on severity level
   */
  playViolationAlert(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') {
    switch (severity) {
      case 'LOW':
        this.playLowAlert()
        break
      case 'MEDIUM':
        this.playMediumAlert()
        break
      case 'HIGH':
        this.playHighAlert()
        break
      case 'CRITICAL':
        this.playCriticalAlert()
        break
    }
  }

  /**
   * Play a notification sound (less intrusive)
   */
  playNotification() {
    this.playBeep(523, 0.15, 0.2) // C5 note
    setTimeout(() => this.playBeep(659, 0.15, 0.2), 100) // E5 note
  }

  /**
   * Play exam pause alert
   */
  playPauseAlert() {
    this.playBeep(800, 0.3, 0.4)
    setTimeout(() => this.playBeep(600, 0.5, 0.4), 200)
  }

  /**
   * Play exam resume alert
   */
  playResumeAlert() {
    this.playBeep(600, 0.2, 0.3)
    setTimeout(() => this.playBeep(800, 0.3, 0.3), 150)
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Export singleton instance
export const soundAlerts = new SoundAlertSystem()
