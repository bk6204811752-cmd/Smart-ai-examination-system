import { motion } from 'framer-motion'
import { Camera, Shield, Eye, EyeOff, AlertTriangle, Mic, Loader2 } from 'lucide-react'
import type { ProctoringStatus } from '../utils/proctoringEngine'

interface ProctoringHUDProps {
  proctoringActive: boolean
  cameraReady: boolean          // stream is attached to video element
  proctoringStatus: ProctoringStatus | null
  trustScore: number
  violationCount: number
  videoRef: React.RefObject<HTMLVideoElement>
  onStartCamera: () => void
  examLoaded: boolean
  isLoading: boolean
}

export default function ProctoringHUD({
  proctoringActive,
  cameraReady,
  proctoringStatus,
  trustScore,
  violationCount,
  videoRef,
  onStartCamera,
  examLoaded,
  isLoading,
}: ProctoringHUDProps) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (trustScore / 100) * circumference
  const trustColor = trustScore >= 80 ? '#10b981' : trustScore >= 60 ? '#f59e0b' : '#ef4444'
  const trustLabel = trustScore >= 80 ? 'High' : trustScore >= 60 ? 'Medium' : 'Low'

  const statusItems = [
    {
      label: 'Face',
      active: proctoringStatus?.faceDetected,
      icon: proctoringStatus?.faceDetected ? Eye : EyeOff,
      okText: 'Detected',
      failText: 'Not Found',
    },
    {
      label: 'Focus',
      active: proctoringStatus?.lookingAtScreen,
      icon: Eye,
      okText: 'Focused',
      failText: 'Looking Away',
    },
    {
      label: 'Audio',
      active: true,
      icon: Mic,
      okText: 'Monitoring',
      failText: 'Error',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Camera Preview */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-blue-500" />
          Proctoring Monitor
        </h3>

        <div className="relative rounded-xl overflow-hidden bg-gray-900">
          {/* Video element — always rendered so videoRef is always attached */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-xl"
            style={{ minHeight: '160px', maxHeight: '180px', objectFit: 'cover' }}
          />

          {/* LIVE badge — camera active + AI proctoring running */}
          {proctoringActive && cameraReady && (
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <div className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
              {proctoringStatus?.sessionRecording && (
                <div className="bg-red-800 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  REC
                </div>
              )}
            </div>
          )}

          {/* Camera ready but AI still loading */}
          {cameraReady && !proctoringActive && (
            <div className="absolute top-2 left-2">
              <div className="bg-blue-700/90 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Monitoring...
              </div>
            </div>
          )}

          {/* Start Camera button — ONLY when camera is NOT ready at all */}
          {!cameraReady && examLoaded && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-3">
              <Camera className="w-8 h-8 text-gray-400" />
              <button
                onClick={onStartCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/40"
              >
                <Camera className="w-4 h-4" />
                Start Camera
              </button>
            </div>
          )}

          {/* Loading state */}
          {!cameraReady && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          )}

          {/* Face status ring */}
          {proctoringActive && proctoringStatus && (
            <div className={`absolute inset-0 rounded-xl pointer-events-none border-2 transition-colors duration-500 ${
              proctoringStatus.faceDetected
                ? proctoringStatus.lookingAtScreen
                  ? 'border-green-400/60'
                  : 'border-yellow-400/60'
                : 'border-red-500/80'
            }`} />
          )}
        </div>

        {/* AI status items */}
        {proctoringActive && proctoringStatus && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {statusItems.map(item => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  item.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <item.icon className="w-3 h-3" />
                {item.active ? item.okText : item.failText}
              </span>
            ))}
          </div>
        )}

        {/* Camera required warning */}
        {!cameraReady && examLoaded && !isLoading && (
          <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Camera required for this exam
          </p>
        )}

        {/* Camera ready, monitoring basic */}
        {cameraReady && !proctoringActive && (
          <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1">
            <Camera className="w-3.5 h-3.5" />
            Camera active — monitoring
          </p>
        )}
      </div>

      {/* Trust Score Gauge */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          Trust Score
        </h3>

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <svg width="90" height="90" viewBox="0 0 90 90" className="trust-gauge-svg">
              <circle cx="45" cy="45" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <motion.circle
                cx="45" cy="45" r={radius}
                fill="none"
                stroke={trustColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                transform="rotate(-90 45 45)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black" style={{ color: trustColor }}>{trustScore}</span>
              <span className="text-xs font-medium text-gray-400">/ 100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm font-bold mb-0.5" style={{ color: trustColor }}>
              {trustLabel} Trust
            </div>
            <div className="text-xs text-gray-500 leading-relaxed">
              {trustScore >= 80
                ? 'Excellent integrity. Keep it up!'
                : trustScore >= 60
                ? 'Minor issues detected. Stay focused.'
                : 'Multiple violations detected.'}
            </div>
            {violationCount > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {violationCount} violation{violationCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
