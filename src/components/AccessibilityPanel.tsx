import { useState, useEffect } from 'react'
import { accessibilityManager } from '../lib/accessibilityManager'
import { Eye, Type, Zap, Palette, CheckCircle } from 'lucide-react'

export default function AccessibilityPanel() {
  const [preferences, setPreferences] = useState(accessibilityManager.getPreferences())
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    // Initialize on mount
    accessibilityManager.init()
    accessibilityManager.addSkipLink()
  }, [])

  const handleToggleHighContrast = () => {
    accessibilityManager.toggleHighContrast()
    setPreferences(accessibilityManager.getPreferences())
  }

  const handleToggleLargeText = () => {
    accessibilityManager.toggleLargeText()
    setPreferences(accessibilityManager.getPreferences())
  }

  const handleToggleReducedMotion = () => {
    accessibilityManager.toggleReducedMotion()
    setPreferences(accessibilityManager.getPreferences())
  }

  const handleColorBlindMode = (mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') => {
    accessibilityManager.setColorBlindMode(mode)
    setPreferences(accessibilityManager.getPreferences())
  }

  return (
    <>
      {/* Accessibility toggle button - fixed position */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all"
        aria-label="Accessibility options"
        title="Accessibility options"
      >
        <Eye className="w-6 h-6" />
      </button>

      {/* Accessibility panel */}
      {showPanel && (
        <div 
          className="fixed bottom-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-80 border border-gray-200 dark:border-gray-700"
          role="dialog"
          aria-label="Accessibility settings"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Accessibility
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close accessibility panel"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Eye className="w-4 h-4" />
                <span className="text-sm">High Contrast</span>
              </label>
              <button
                onClick={handleToggleHighContrast}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.highContrast ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label={`High contrast ${preferences.highContrast ? 'enabled' : 'disabled'}`}
                role="switch"
                aria-checked={preferences.highContrast}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Large Text */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Type className="w-4 h-4" />
                <span className="text-sm">Large Text</span>
              </label>
              <button
                onClick={handleToggleLargeText}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.largeText ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label={`Large text ${preferences.largeText ? 'enabled' : 'disabled'}`}
                role="switch"
                aria-checked={preferences.largeText}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.largeText ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Reduced Motion</span>
              </label>
              <button
                onClick={handleToggleReducedMotion}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.reducedMotion ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label={`Reduced motion ${preferences.reducedMotion ? 'enabled' : 'disabled'}`}
                role="switch"
                aria-checked={preferences.reducedMotion}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Color Blind Mode */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Palette className="w-4 h-4" />
                <span>Color Blind Mode</span>
              </label>
              <select
                value={preferences.colorBlindMode}
                onChange={(e) => handleColorBlindMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Color blind mode selection"
              >
                <option value="none">None</option>
                <option value="protanopia">Protanopia (Red-blind)</option>
                <option value="deuteranopia">Deuteranopia (Green-blind)</option>
                <option value="tritanopia">Tritanopia (Blue-blind)</option>
              </select>
            </div>

            {/* Status indicator */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Accessibility features active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
