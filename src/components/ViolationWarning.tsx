import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Camera, Mic, Eye, Monitor, Sun } from 'lucide-react'
import { ProctoringViolation } from '../utils/proctoringEngine'

interface ViolationWarningProps {
  violation: ProctoringViolation
  onDismiss: () => void
}

export default function ViolationWarning({ violation, onDismiss }: ViolationWarningProps) {
  const getSeverityColor = () => {
    switch (violation.severity) {
      case 'CRITICAL': return 'bg-red-600'
      case 'HIGH': return 'bg-orange-600'
      case 'MEDIUM': return 'bg-yellow-600'
      case 'LOW': return 'bg-blue-600'
      default: return 'bg-gray-600'
    }
  }

  const getIcon = () => {
    switch (violation.type) {
      case 'NO_FACE':
      case 'MULTIPLE_FACES':
      case 'FACE_NOT_LOOKING':
        return <Camera className="w-6 h-6" />
      case 'AUDIO_DETECTED':
        return <Mic className="w-6 h-6" />
      case 'TAB_SWITCH':
      case 'WINDOW_BLUR':
      case 'FULLSCREEN_EXIT':
        return <Monitor className="w-6 h-6" />
      default:
        return <Eye className="w-6 h-6" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed top-4 right-4 ${getSeverityColor()} text-white rounded-xl shadow-2xl p-4 max-w-md z-50 border-4 border-white`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 bg-white/20 p-2 rounded-lg">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-lg">
              {violation.severity === 'CRITICAL' && '🚨 CRITICAL WARNING'}
              {violation.severity === 'HIGH' && '⚠️ HIGH WARNING'}
              {violation.severity === 'MEDIUM' && '⚡ WARNING'}
              {violation.severity === 'LOW' && 'ℹ️ Notice'}
            </h3>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm opacity-90">{violation.message}</p>
          
          {/* Show metadata if available */}
          {violation.metadata && (
            <div className="mt-2 text-xs opacity-75 space-y-1">
              {violation.metadata.faceCount !== undefined && (
                <div>Faces detected: {violation.metadata.faceCount}</div>
              )}
              {violation.metadata.faceConfidence !== undefined && (
                <div>Confidence: {violation.metadata.faceConfidence}%</div>
              )}
              {violation.metadata.audioLevel !== undefined && (
                <div>Audio level: {Math.round(violation.metadata.audioLevel)}</div>
              )}
              {violation.metadata.keystrokes && (
                <div>Keys: {violation.metadata.keystrokes.join(', ')}</div>
              )}
            </div>
          )}
          
          <p className="text-xs opacity-70 mt-1">
            {violation.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
      {violation.severity === 'CRITICAL' && (
        <div className="mt-3 pt-3 border-t border-white/20 text-sm">
          <strong>⚠️ Your exam may be auto-paused if violations continue!</strong>
        </div>
      )}
    </motion.div>
  )
}

interface ProctoringStatusBarProps {
  faceDetected: boolean
  faceCount: number
  lookingAtScreen: boolean
  audioLevel: number
  isFullscreen: boolean
  brightness: number
  attentionLevel?: number
  integrityScore?: number
}

export function ProctoringStatusBar({
  faceDetected,
  faceCount,
  lookingAtScreen,
  audioLevel,
  isFullscreen,
  brightness,
  attentionLevel = 100,
  integrityScore = 100
}: ProctoringStatusBarProps) {
  
  const getBrightnessColor = () => {
    if (brightness < 30) return 'text-red-400'
    if (brightness < 50) return 'text-orange-400'
    if (brightness < 70) return 'text-yellow-400'
    return 'text-green-400'
  }
  
  const getBrightnessStatus = () => {
    if (brightness < 30) return '🚨 TOO DARK!'
    if (brightness < 50) return '⚠️ Very Dim'
    if (brightness < 70) return '💡 Low Light'
    return '✓ Good'
  }
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white rounded-full px-6 py-3 shadow-2xl z-40 border-2 border-white/20">
      <div className="flex items-center space-x-6 text-sm">
        {/* Face Detection */}
        <div className="flex items-center space-x-2">
          <Camera className={`w-4 h-4 ${faceDetected && faceCount === 1 ? 'text-green-400' : 'text-red-400'}`} />
          <span className={faceDetected && faceCount === 1 ? 'text-green-400' : 'text-red-400'}>
            {!faceDetected && 'No Face'}
            {faceDetected && faceCount === 1 && 'Face ✓'}
            {faceDetected && faceCount > 1 && `${faceCount} Faces!`}
          </span>
        </div>

        {/* Eye Tracking */}
        <div className="flex items-center space-x-2">
          <Eye className={`w-4 h-4 ${lookingAtScreen ? 'text-green-400' : 'text-yellow-400'}`} />
          <span className={lookingAtScreen ? 'text-green-400' : 'text-yellow-400'}>
            {lookingAtScreen ? 'Looking ✓' : 'Looking Away'}
          </span>
        </div>

        {/* Audio Level */}
        <div className="flex items-center space-x-2">
          <Mic className={`w-4 h-4 ${audioLevel > 15 ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`} />
          <div className="flex flex-col">
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${audioLevel > 15 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${Math.min(audioLevel * 4, 100)}%` }}
              />
            </div>
            {audioLevel > 15 && (
              <span className="text-xs text-yellow-400 mt-0.5">🔊 {Math.round(audioLevel)}</span>
            )}
          </div>
        </div>

        {/* Brightness Level */}
        <div className="flex items-center space-x-2">
          <Sun className={`w-4 h-4 ${getBrightnessColor()} ${brightness < 30 ? 'animate-pulse' : ''}`} />
          <div className="flex flex-col">
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  brightness < 30 ? 'bg-red-400' :
                  brightness < 50 ? 'bg-orange-400' :
                  brightness < 70 ? 'bg-yellow-400' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min((brightness / 255) * 100, 100)}%` }}
              />
            </div>
            <span className={`text-xs ${getBrightnessColor()} mt-0.5`}>
              {getBrightnessStatus()}
            </span>
          </div>
        </div>

        {/* Fullscreen */}
        <div className="flex items-center space-x-2">
          <Monitor className={`w-4 h-4 ${isFullscreen ? 'text-green-400' : 'text-red-400'}`} />
          <span className={isFullscreen ? 'text-green-400' : 'text-red-400'}>
            {isFullscreen ? 'Fullscreen ✓' : 'Exit Fullscreen!'}
          </span>
        </div>

        {/* Integrity Score */}
        {integrityScore !== undefined && (
          <div className="flex items-center space-x-2 border-l border-gray-700 pl-4">
            <div className="flex flex-col items-center">
              <span className={`text-xs font-semibold ${
                integrityScore >= 80 ? 'text-green-400' :
                integrityScore >= 60 ? 'text-yellow-400' :
                integrityScore >= 40 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {Math.round(integrityScore)}%
              </span>
              <span className="text-xs text-gray-400">Integrity</span>
            </div>
          </div>
        )}

        {/* Attention Level */}
        {attentionLevel !== undefined && (
          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-center">
              <span className={`text-xs font-semibold ${
                attentionLevel >= 80 ? 'text-green-400' :
                attentionLevel >= 60 ? 'text-yellow-400' :
                attentionLevel >= 40 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {Math.round(attentionLevel)}%
              </span>
              <span className="text-xs text-gray-400">Attention</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ViolationSummaryProps {
  violations: ProctoringViolation[]
}

export function ViolationSummary({ violations }: ViolationSummaryProps) {
  const criticalCount = violations.filter(v => v.severity === 'CRITICAL').length
  const highCount = violations.filter(v => v.severity === 'HIGH').length
  const mediumCount = violations.filter(v => v.severity === 'MEDIUM').length

  if (violations.length === 0) return null

  return (
    <div className="fixed top-20 left-4 bg-white rounded-xl shadow-xl p-4 max-w-xs z-40 border-2 border-gray-200">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
        Violation Summary
      </h3>
      <div className="space-y-2 text-sm">
        {criticalCount > 0 && (
          <div className="flex justify-between items-center text-red-600">
            <span className="font-semibold">Critical:</span>
            <span className="bg-red-100 px-2 py-1 rounded-full font-bold">{criticalCount}</span>
          </div>
        )}
        {highCount > 0 && (
          <div className="flex justify-between items-center text-orange-600">
            <span className="font-semibold">High:</span>
            <span className="bg-orange-100 px-2 py-1 rounded-full font-bold">{highCount}</span>
          </div>
        )}
        {mediumCount > 0 && (
          <div className="flex justify-between items-center text-yellow-600">
            <span className="font-semibold">Medium:</span>
            <span className="bg-yellow-100 px-2 py-1 rounded-full font-bold">{mediumCount}</span>
          </div>
        )}
      </div>
      {criticalCount >= 3 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-red-600 font-bold">
            ⚠️ Too many critical violations! Exam may be terminated.
          </p>
        </div>
      )}
    </div>
  )
}
