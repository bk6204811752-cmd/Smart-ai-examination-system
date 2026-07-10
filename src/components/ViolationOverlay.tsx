import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Shield, Maximize2, Eye, Mic, Monitor } from 'lucide-react'

export type ViolationOverlayType =
  | 'FULLSCREEN_EXIT'
  | 'TAB_SWITCH'
  | 'MULTIPLE_FACES'
  | 'NO_FACE'
  | 'AUDIO_DETECTED'
  | 'SCREEN_SHARE'
  | 'WINDOW_MINIMIZED'
  | 'CAMERA_BLOCKED'
  | 'SUSPICIOUS_BEHAVIOR'
  | 'IDENTITY_MISMATCH'
  | 'PHONE_DETECTED'
  | 'UNAUTHORIZED_DEVICE'

interface ViolationOverlayProps {
  type: ViolationOverlayType | null
  message?: string
  onDismiss?: () => void
  onForceFullscreen?: () => void
  autoCountdown?: number // seconds before auto-action
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

const violationConfig: Record<
  ViolationOverlayType,
  {
    icon: any
    title: string
    color: string
    bgColor: string
    borderColor: string
    glowColor: string
    requireAction?: boolean
    actionLabel?: string
  }
> = {
  FULLSCREEN_EXIT: {
    icon: Maximize2,
    title: 'FULLSCREEN REQUIRED',
    color: 'text-orange-400',
    bgColor: 'from-orange-950/95 via-orange-900/90 to-red-950/95',
    borderColor: 'border-orange-500',
    glowColor: 'shadow-orange-500/50',
    requireAction: true,
    actionLabel: 'Return to Fullscreen',
  },
  WINDOW_MINIMIZED: {
    icon: Maximize2,
    title: 'WINDOW MINIMIZED DETECTED',
    color: 'text-red-400',
    bgColor: 'from-red-950/95 via-red-900/90 to-rose-950/95',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/50',
    requireAction: true,
    actionLabel: 'Return to Exam',
  },
  TAB_SWITCH: {
    icon: Monitor,
    title: 'TAB SWITCH DETECTED',
    color: 'text-yellow-400',
    bgColor: 'from-yellow-950/95 via-amber-900/90 to-orange-950/95',
    borderColor: 'border-yellow-500',
    glowColor: 'shadow-yellow-500/50',
  },
  MULTIPLE_FACES: {
    icon: Eye,
    title: '🚨 MULTIPLE PEOPLE DETECTED',
    color: 'text-red-400',
    bgColor: 'from-red-950/98 via-red-900/95 to-rose-950/98',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/70',
    requireAction: false,
  },
  NO_FACE: {
    icon: Eye,
    title: 'FACE NOT VISIBLE',
    color: 'text-orange-400',
    bgColor: 'from-orange-950/95 via-orange-900/90 to-amber-950/95',
    borderColor: 'border-orange-500',
    glowColor: 'shadow-orange-500/50',
  },
  AUDIO_DETECTED: {
    icon: Mic,
    title: 'UNAUTHORIZED SOUND DETECTED',
    color: 'text-yellow-400',
    bgColor: 'from-yellow-950/95 via-amber-900/90 to-orange-950/95',
    borderColor: 'border-yellow-500',
    glowColor: 'shadow-yellow-500/50',
  },
  SCREEN_SHARE: {
    icon: Monitor,
    title: '🚨 SCREEN SHARING DETECTED',
    color: 'text-red-400',
    bgColor: 'from-red-950/98 via-red-900/95 to-rose-950/98',
    borderColor: 'border-red-600',
    glowColor: 'shadow-red-600/70',
    requireAction: true,
    actionLabel: 'Stop Screen Share',
  },
  CAMERA_BLOCKED: {
    icon: Eye,
    title: 'CAMERA BLOCKED',
    color: 'text-red-400',
    bgColor: 'from-red-950/95 via-red-900/90 to-rose-950/95',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/50',
    requireAction: true,
    actionLabel: 'Unblock Camera',
  },
  SUSPICIOUS_BEHAVIOR: {
    icon: AlertTriangle,
    title: 'SUSPICIOUS ACTIVITY DETECTED',
    color: 'text-orange-400',
    bgColor: 'from-orange-950/95 via-orange-900/90 to-red-950/95',
    borderColor: 'border-orange-500',
    glowColor: 'shadow-orange-500/50',
  },
  IDENTITY_MISMATCH: {
    icon: Shield,
    title: '🚨 IDENTITY VERIFICATION FAILED',
    color: 'text-red-400',
    bgColor: 'from-red-950/99 via-red-900/97 to-rose-950/99',
    borderColor: 'border-red-600',
    glowColor: 'shadow-red-600/80',
    requireAction: true,
    actionLabel: 'Contact Proctor',
  },
  PHONE_DETECTED: {
    icon: AlertTriangle,
    title: '🚨 MOBILE PHONE DETECTED',
    color: 'text-red-400',
    bgColor: 'from-red-950/98 via-red-900/95 to-rose-950/98',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/70',
    requireAction: false,
  },
  UNAUTHORIZED_DEVICE: {
    icon: AlertTriangle,
    title: '⚠️ UNAUTHORIZED OBJECT DETECTED',
    color: 'text-orange-400',
    bgColor: 'from-orange-950/95 via-orange-900/90 to-red-950/95',
    borderColor: 'border-orange-500',
    glowColor: 'shadow-orange-500/50',
  },
}

export default function ViolationOverlay({
  type,
  message,
  onDismiss,
  onForceFullscreen,
  autoCountdown = 10,
  severity = 'HIGH',
}: ViolationOverlayProps) {
  const [countdown, setCountdown] = useState(autoCountdown)
  const [pulseRed, setPulseRed] = useState(false)

  const config = type ? violationConfig[type] : null
  const Icon = config?.icon || AlertTriangle

  useEffect(() => {
    if (!type) return
    setCountdown(autoCountdown)
    setPulseRed(true)
    const t = setTimeout(() => setPulseRed(false), 600)
    return () => clearTimeout(t)
  }, [type, autoCountdown])

  // Auto-dismiss countdown for non-critical violations
  useEffect(() => {
    if (!type) return
    if (severity === 'CRITICAL' || config?.requireAction) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onDismiss?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [type, severity, config?.requireAction, onDismiss])

  const handleAction = useCallback(() => {
    if (type === 'FULLSCREEN_EXIT' || type === 'WINDOW_MINIMIZED') {
      onForceFullscreen?.()
    }
    onDismiss?.()
  }, [type, onForceFullscreen, onDismiss])

  return (
    <AnimatePresence>
      {type && config && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ pointerEvents: 'all' }}
        >
          {/* Red flash background */}
          <motion.div
            className="absolute inset-0"
            animate={pulseRed ? { opacity: [0, 0.4, 0] } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ backgroundColor: '#ef4444' }}
          />

          {/* Dark overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${config.bgColor}`} />

          {/* Animated border glow */}
          <motion.div
            className="absolute inset-0 border-4"
            style={{ borderColor: '#ef4444' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, y: -40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative z-10 max-w-lg w-full mx-4 bg-gray-900/95 border-2 ${config.borderColor} rounded-2xl p-8 shadow-2xl ${config.glowColor} shadow-2xl`}
          >
            {/* Icon */}
            <motion.div
              className={`w-20 h-20 mx-auto mb-6 rounded-full bg-red-950/80 border-2 ${config.borderColor} flex items-center justify-center`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icon className={`w-10 h-10 ${config.color}`} />
            </motion.div>

            {/* Warning Badge */}
            <div className="flex items-center justify-center mb-4">
              <span className="px-4 py-1 bg-red-600/30 border border-red-500/50 rounded-full text-red-400 text-xs font-bold tracking-widest uppercase">
                ⚠ EXAM VIOLATION RECORDED
              </span>
            </div>

            {/* Title */}
            <h2 className={`text-2xl font-black text-center ${config.color} mb-3 tracking-wide`}>
              {config.title}
            </h2>

            {/* Message */}
            <p className="text-gray-300 text-center text-sm mb-6 leading-relaxed">
              {message ||
                'This activity has been recorded and flagged for review. Your proctor has been notified.'}
            </p>

            {/* Violation details */}
            <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 mb-6 text-xs text-red-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-semibold">Violation Type:</span>
                <span>{type?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-semibold">Severity:</span>
                <span
                  className={
                    severity === 'CRITICAL'
                      ? 'text-red-400 font-bold'
                      : severity === 'HIGH'
                        ? 'text-orange-400'
                        : severity === 'MEDIUM'
                          ? 'text-yellow-400'
                          : 'text-gray-400'
                  }
                >
                  {severity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-semibold">Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Countdown & Action Buttons */}
            <div className="space-y-3">
              {config.requireAction ? (
                <button
                  onClick={handleAction}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all
                    bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600
                    shadow-lg shadow-red-900/50 active:scale-95`}
                >
                  {config.actionLabel || 'Acknowledge Violation'}
                </button>
              ) : (
                <div className="text-center">
                  <div className="text-gray-500 text-xs mb-2">Auto-dismissing in</div>
                  <div className={`text-3xl font-black ${config.color}`}>{countdown}s</div>
                  <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                    <motion.div
                      className="h-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: autoCountdown, ease: 'linear' }}
                    />
                  </div>
                </div>
              )}

              {onDismiss && !config.requireAction && (
                <button
                  onClick={onDismiss}
                  className="w-full py-2 px-6 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors text-sm border border-gray-700 hover:border-gray-500"
                >
                  Dismiss Now
                </button>
              )}
            </div>

            {/* Bottom warning */}
            <p className="text-center text-xs text-gray-600 mt-4">
              📹 All violations are recorded and sent to your proctor in real-time
            </p>
          </motion.div>

          {/* Scanline effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239,68,68,0.03) 2px, rgba(239,68,68,0.03) 4px)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
