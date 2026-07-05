import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, AlertTriangle, X } from 'lucide-react'

interface ExamTimerWarningProps {
  isOpen: boolean
  minutesLeft: number
  onDismiss: () => void
}

export default function ExamTimerWarning({ isOpen, minutesLeft, onDismiss }: ExamTimerWarningProps) {
  const isCritical = minutesLeft <= 1
  const dismissBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => dismissBtnRef.current?.focus(), 100)
      // Auto-dismiss after 8 seconds
      const t = setTimeout(onDismiss, 8000)
      return () => clearTimeout(t)
    }
  }, [isOpen, onDismiss])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Red screen flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.25, 0] }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 bg-red-600 pointer-events-none z-[60]"
          />

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[61]"
            onClick={onDismiss}
          />

          {/* Warning Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[62] w-full max-w-sm px-4"
          >
            <div className={`rounded-2xl shadow-2xl overflow-hidden ${isCritical ? 'border-2 border-red-500' : 'border-2 border-amber-400'}`}>
              {/* Header */}
              <div className={`${isCritical ? 'bg-red-600' : 'bg-amber-500'} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
                  >
                    {isCritical ? (
                      <AlertTriangle className="w-6 h-6 text-white" />
                    ) : (
                      <Clock className="w-6 h-6 text-white" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight">
                      {isCritical ? '⚠️ LAST MINUTE!' : '⏰ Time Warning'}
                    </h3>
                    <p className="text-white/80 text-xs">
                      {isCritical ? 'Submit your exam immediately!' : `Only ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} remaining`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onDismiss}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="bg-white px-5 py-4">
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  {isCritical
                    ? 'You have less than 1 minute left! Please submit your exam now to avoid automatic submission.'
                    : `You have ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} left. Please review your answers and submit soon.`}
                </p>

                {/* Countdown visual */}
                <div className={`flex items-center gap-2 ${isCritical ? 'text-red-600' : 'text-amber-600'} mb-4`}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isCritical ? 'Less than 1 minute remaining' : `${minutesLeft} minutes remaining`}
                  </span>
                </div>

                <button
                  ref={dismissBtnRef}
                  onClick={onDismiss}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    isCritical
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                  }`}
                >
                  {isCritical ? 'Got it — Submitting Now' : 'Understood, Continue'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
