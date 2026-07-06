import { RefObject } from 'react'
import { motion } from 'framer-motion'
import { Camera, Shield, AlertTriangle, Mic } from 'lucide-react'

interface ViolationEntry {
  evidence?: string
  description?: string
  flag_type?: string
  type?: string
  severity: string
  timestamp?: string
}

interface ProctoringRightPanelProps {
  videoRef: RefObject<HTMLVideoElement>
  proctoringActive: boolean
  cameraReady: boolean
  trustScore: number
  proctoringStatus?: {
    faceDetected?: boolean
    lookingAtScreen?: boolean
    faceCount?: number
    audioLevel?: number
    isActive?: boolean
    integrityScore?: number
  } | null
  tabSwitches: number
  flags: ViolationEntry[]
  mode?: 'live' | 'practice'  // 'live' = red LIVE badge, 'practice' = green PRACTICE badge
}

export default function ProctoringRightPanel({
  videoRef,
  proctoringActive,
  cameraReady,
  trustScore,
  proctoringStatus,
  tabSwitches,
  flags,
  mode = 'live',
}: ProctoringRightPanelProps) {
  const audioLevel = proctoringStatus?.audioLevel ?? 0
  const isLoud = audioLevel > 30

  return (
    <div className="space-y-3 h-full">

      {/* ── Camera Live Feed ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-lg">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${proctoringActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs font-semibold text-gray-300">
              {proctoringActive ? 'Camera Active' : 'Initializing...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              mode === 'live'
                ? 'bg-red-500/90 text-white'
                : 'bg-emerald-500/90 text-white'
            }`}>
              {mode === 'live' ? '🔴 LIVE' : '🟢 PRACTICE'}
            </span>
            <Camera className="w-3.5 h-3.5 text-gray-500" />
          </div>
        </div>
        <div className="relative aspect-video bg-gray-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-600 mx-auto mb-1" />
                <p className="text-gray-500 text-xs">Initializing...</p>
              </div>
            </div>
          )}
          {/* Face not detected overlay */}
          {proctoringStatus?.faceDetected === false && cameraReady && (
            <div className="absolute top-2 left-2 right-2 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg text-center animate-pulse">
              ⚠️ Face Not Detected
            </div>
          )}
          {/* Multiple faces */}
          {(proctoringStatus?.faceCount ?? 1) > 1 && cameraReady && (
            <div className="absolute bottom-2 left-2 right-2 bg-orange-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg text-center">
              ⚠️ Multiple Faces ({proctoringStatus?.faceCount})
            </div>
          )}
        </div>
      </div>

      {/* ── Trust Score ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Shield className={`w-4 h-4 ${trustScore >= 70 ? 'text-emerald-500' : trustScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`} />
            <span className="text-xs font-bold text-gray-700">Trust Score</span>
          </div>
          <span className={`text-lg font-black ${trustScore >= 70 ? 'text-emerald-600' : trustScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {trustScore}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              trustScore >= 70
                ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                : trustScore >= 50
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                  : 'bg-gradient-to-r from-red-400 to-red-600'
            }`}
            animate={{ width: `${trustScore}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>Low</span>
          <span className={`font-semibold ${
            trustScore >= 70 ? 'text-emerald-600' : trustScore >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {trustScore >= 80 ? 'Excellent' : trustScore >= 60 ? 'Good' : trustScore >= 40 ? 'Warning' : 'Critical'}
          </span>
          <span>High</span>
        </div>
      </div>

      {/* ── Audio Monitor (Animated wave) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Mic className={`w-4 h-4 ${isLoud ? 'text-orange-500' : 'text-gray-400'}`} />
            <span className="text-xs font-bold text-gray-700">Audio Monitor</span>
          </div>
          <div className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
            isLoud
              ? 'bg-orange-50 text-orange-600 border-orange-200'
              : 'bg-green-50 text-green-600 border-green-200'
          }`}>
            {isLoud ? '🔊 Loud' : '🔇 Quiet'}
          </div>
        </div>
        {/* Live waveform bars driven by actual audio level */}
        <div className="flex items-end gap-1 h-10 justify-center">
          {Array.from({ length: 12 }).map((_, i) => {
            const barHeight = proctoringActive
              ? Math.min(100, 15 + (audioLevel / 2.55) * (0.5 + (i % 3) * 0.25))
              : 15
            return (
              <motion.div
                key={i}
                className={`w-2 rounded-full ${
                  proctoringActive
                    ? isLoud
                      ? 'bg-orange-400'
                      : 'bg-blue-400'
                    : 'bg-gray-200'
                }`}
                animate={{ height: `${barHeight}%` }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ minHeight: '4px' }}
              />
            )
          })}
        </div>
      </div>

      {/* ── AI Status ── */}
      {proctoringStatus && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <span className="text-xs font-bold text-gray-700 block mb-2">🤖 AI Monitor Status</span>
          {[
            {
              label: 'Face Detected',
              value: proctoringStatus.faceDetected ? 'Yes ✓' : 'No ✗',
              ok: !!proctoringStatus.faceDetected,
            },
            {
              label: 'Looking at Screen',
              value: proctoringStatus.lookingAtScreen ? 'Yes ✓' : 'No ✗',
              ok: !!proctoringStatus.lookingAtScreen,
            },
            {
              label: 'Face Count',
              value: String(proctoringStatus.faceCount ?? 1),
              ok: (proctoringStatus.faceCount ?? 1) === 1,
            },
            {
              label: 'Tab Switches',
              value: String(tabSwitches),
              ok: tabSwitches === 0,
            },
            ...(proctoringStatus.integrityScore !== undefined ? [{
              label: 'Integrity',
              value: `${Math.round(proctoringStatus.integrityScore)}%`,
              ok: proctoringStatus.integrityScore >= 70,
            }] : []),
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{label}</span>
              <span className={`font-bold ${ok ? 'text-emerald-600' : 'text-red-500'}`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Violations Log ── */}
      {flags.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Violations
            </h3>
            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
              {flags.length}
            </span>
          </div>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {flags.slice(-6).reverse().map((flag, idx) => (
              <li key={idx} className="text-xs text-red-700 flex items-start gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                  flag.severity === 'critical' || flag.severity === 'CRITICAL' ? 'bg-red-600' :
                  flag.severity === 'high' || flag.severity === 'HIGH' ? 'bg-orange-500' :
                  flag.severity === 'medium' || flag.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-400'
                }`} />
                <span className="leading-tight">
                  {flag.evidence || flag.description || flag.flag_type || flag.type || 'Violation'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
