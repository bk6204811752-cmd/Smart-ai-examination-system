import { logger } from '../lib/logger'

// Enhanced video streaming with adaptive quality and reconnection
export class AdaptiveVideoStreaming {
  private quality: number = 0.6
  private frameRate: number = 500 // milliseconds (2 FPS)
  private consecutiveFailures: number = 0
  private lastSuccessfulFrame: number = Date.now()
  private bandwidth: 'high' | 'medium' | 'low' = 'high'

  /**
   * Adapt video quality based on connection performance
   */
  adaptQuality(success: boolean) {
    if (success) {
      this.consecutiveFailures = 0
      this.lastSuccessfulFrame = Date.now()
      
      // Gradually increase quality if connection is stable
      if (this.bandwidth === 'high' && this.quality < 0.8) {
        this.quality += 0.05
        console.log(`📈 Increased video quality to ${Math.round(this.quality * 100)}%`)
      }
    } else {
      this.consecutiveFailures++
      
      // Degrade quality after failures
      if (this.consecutiveFailures >= 3) {
        this.quality = Math.max(0.3, this.quality - 0.1)
        this.bandwidth = this.quality > 0.5 ? 'medium' : 'low'
        console.warn(`📉 Reduced video quality to ${Math.round(this.quality * 100)}% due to connection issues`)
      }
      
      // Increase frame interval if many failures
      if (this.consecutiveFailures >= 5) {
        this.frameRate = Math.min(4000, this.frameRate + 500)
        logger.warn('Reduced frame rate', { fps: 1000/this.frameRate })
      }
    }
  }

  /**
   * Check if we should attempt reconnection
   */
  shouldReconnect(): boolean {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulFrame
    return timeSinceLastSuccess > 10000 // 10 seconds without successful frame
  }

  getQuality(): number {
    return this.quality
  }

  getFrameRate(): number {
    return this.frameRate
  }

  getBandwidth(): string {
    return this.bandwidth
  }

  reset() {
    this.quality = 0.6
    this.frameRate = 2000
    this.consecutiveFailures = 0
    this.bandwidth = 'high'
  }
}
