import { useEffect, useRef } from 'react'

interface AudioWaveformProps {
  audioLevel: number // 0-100
  isActive: boolean
  color?: string
  height?: number
  barCount?: number
  label?: string
}

export default function AudioWaveform({
  audioLevel,
  isActive,
  color = '#10b981',
  height = 40,
  barCount = 24,
  label
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const historyRef = useRef<number[]>(Array(barCount).fill(0))
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      timeRef.current += 0.1

      // Shift history
      historyRef.current.shift()

      // Add noise + audio level
      const noise = isActive ? (Math.random() * audioLevel * 0.3) : 0
      const wave = isActive ? (Math.sin(timeRef.current * 3) * audioLevel * 0.2 + audioLevel) : 0
      historyRef.current.push(Math.min(100, wave + noise))

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width - (barCount - 1) * 2) / barCount
      const centerY = canvas.height / 2

      historyRef.current.forEach((level, i) => {
        const normalizedLevel = level / 100
        const barHeight = Math.max(2, normalizedLevel * (canvas.height - 4))
        const x = i * (barWidth + 2)
        const y = centerY - barHeight / 2

        // Color based on level
        let barColor = color
        if (level > 70) barColor = '#ef4444' // Red for high
        else if (level > 40) barColor = '#f59e0b' // Yellow for medium

        // Gradient fill
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
        gradient.addColorStop(0, barColor + 'cc')
        gradient.addColorStop(1, barColor + '44')

        ctx.fillStyle = isActive ? gradient : '#374151'
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [audioLevel, isActive, color, barCount])

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={barCount * 6}
        height={height}
        className="rounded"
        style={{ imageRendering: 'pixelated' }}
      />
      {label && (
        <span className="text-xs text-gray-500">{label}</span>
      )}
    </div>
  )
}

// Static bar-chart style waveform for teacher monitoring cards
interface MiniWaveformProps {
  audioLevel: number
  isActive: boolean
}

export function MiniWaveform({ audioLevel, isActive }: MiniWaveformProps) {
  const bars = Array.from({ length: 5 }, (_, i) => {
    const phase = (i / 5) * Math.PI
    const level = isActive ? Math.abs(Math.sin(Date.now() / 300 + phase)) * audioLevel / 100 : 0
    return Math.max(0.1, level)
  })

  return (
    <div className="flex items-center gap-0.5 h-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full transition-all duration-150"
          style={{
            height: `${h * 100}%`,
            backgroundColor: audioLevel > 60 ? '#ef4444' : audioLevel > 30 ? '#f59e0b' : '#10b981',
            opacity: isActive ? 1 : 0.3
          }}
        />
      ))}
    </div>
  )
}
