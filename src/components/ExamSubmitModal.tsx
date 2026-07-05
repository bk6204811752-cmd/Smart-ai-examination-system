import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, Flag, Clock, Shield, AlertTriangle,
  Send, ArrowLeft, TrendingUp
} from 'lucide-react'

interface ExamSubmitModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  examTitle: string
  totalQuestions: number
  answeredCount: number
  flaggedCount: number
  timeTaken: number // in seconds
  violationCount: number
  trustScore: number
  submitting?: boolean
}

export default function ExamSubmitModal({
  isOpen,
  onConfirm,
  onCancel,
  examTitle,
  totalQuestions,
  answeredCount,
  flaggedCount,
  timeTaken,
  violationCount,
  trustScore,
  submitting = false,
}: ExamSubmitModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const unansweredCount = totalQuestions - answeredCount

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, submitting, onCancel])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const completionRate = Math.round((answeredCount / Math.max(totalQuestions, 1)) * 100)
  const trustColor = trustScore >= 80 ? 'text-green-600' : trustScore >= 60 ? 'text-yellow-600' : 'text-red-600'
  const trustBg = trustScore >= 80 ? 'bg-green-50 border-green-200' : trustScore >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

  const stats = [
    {
      icon: CheckCircle2,
      label: 'Answered',
      value: answeredCount,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
    {
      icon: XCircle,
      label: 'Unanswered',
      value: unansweredCount,
      color: unansweredCount > 0 ? 'text-red-600' : 'text-gray-400',
      bg: unansweredCount > 0 ? 'bg-red-50' : 'bg-gray-50',
      border: unansweredCount > 0 ? 'border-red-100' : 'border-gray-100',
    },
    {
      icon: Flag,
      label: 'Flagged',
      value: flaggedCount,
      color: flaggedCount > 0 ? 'text-amber-600' : 'text-gray-400',
      bg: flaggedCount > 0 ? 'bg-amber-50' : 'bg-gray-50',
      border: flaggedCount > 0 ? 'border-amber-100' : 'border-gray-100',
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={!submitting ? onCancel : undefined}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 id="submit-modal-title" className="text-lg font-bold leading-tight">
                      Submit Exam?
                    </h2>
                    <p className="text-blue-100 text-xs truncate max-w-[240px]">{examTitle}</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="px-6 pt-5">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Completion Rate</span>
                  <span className="font-semibold text-gray-700">{completionRate}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${completionRate >= 80 ? 'bg-green-500' : completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="px-6 pt-4 grid grid-cols-3 gap-3">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`${stat.bg} ${stat.border} border rounded-xl p-3 text-center`}
                  >
                    <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Time + Trust Score Row */}
              <div className="px-6 pt-3 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">Time Taken</div>
                    <div className="text-sm font-bold text-gray-700">{formatTime(timeTaken)}</div>
                  </div>
                </div>
                <div className={`${trustBg} border rounded-xl p-3 flex items-center gap-2`}>
                  <Shield className={`w-4 h-4 ${trustColor} shrink-0`} />
                  <div>
                    <div className="text-xs text-gray-400">Trust Score</div>
                    <div className={`text-sm font-bold ${trustColor}`}>{trustScore}%</div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              <div className="px-6 pt-3 space-y-2">
                {unansweredCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      You have <strong>{unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}</strong>. You can still go back.
                    </p>
                  </motion.div>
                )}
                {violationCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      <strong>{violationCount} proctoring violation{violationCount !== 1 ? 's' : ''}</strong> detected during this exam.
                    </p>
                  </motion.div>
                )}
                {flaggedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"
                  >
                    <Flag className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-700">
                      <strong>{flaggedCount} flagged question{flaggedCount !== 1 ? 's' : ''}</strong> will be submitted as-is.
                    </p>
                  </motion.div>
                )}
                {unansweredCount === 0 && violationCount === 0 && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-xs text-green-700 font-medium">
                      All questions answered! Great job.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-5 flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Review Answers
                </button>
                <button
                  ref={confirmBtnRef}
                  onClick={onConfirm}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Final
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
