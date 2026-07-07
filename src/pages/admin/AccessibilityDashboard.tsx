import { useState } from 'react'
import {
  Eye,
  Ear,
  MousePointer,
  Keyboard,
  Type,
  Contrast,
  Volume2,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface AccessibilitySettings {
  screenReader: boolean
  highContrast: boolean
  largeText: boolean
  keyboardNavigation: boolean
  audioDescriptions: boolean
  extendedTime: boolean
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  fontSize: number
  speechRate: number
  reducedMotion: boolean
}

interface WCAGCompliance {
  level: 'A' | 'AA' | 'AAA'
  score: number
  issues: {
    category: string
    severity: 'critical' | 'serious' | 'moderate' | 'minor'
    description: string
    impact: string
    recommendation: string
  }[]
}

export default function AccessibilityDashboard() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    screenReader: false,
    highContrast: false,
    largeText: false,
    keyboardNavigation: true,
    audioDescriptions: false,
    extendedTime: false,
    colorBlindMode: 'none',
    fontSize: 16,
    speechRate: 1.0,
    reducedMotion: false,
  })

  const [compliance] = useState<WCAGCompliance>({
    level: 'AA',
    score: 87,
    issues: [
      {
        category: 'Color Contrast',
        severity: 'serious',
        description: '3 elements have insufficient color contrast ratio',
        impact: 'Users with low vision may struggle to read text',
        recommendation: 'Increase contrast ratio to at least 4.5:1 for normal text',
      },
      {
        category: 'Keyboard Navigation',
        severity: 'moderate',
        description: 'Some interactive elements missing focus indicators',
        impact: 'Keyboard users cannot see which element is focused',
        recommendation: 'Add visible focus outlines to all interactive elements',
      },
      {
        category: 'Alt Text',
        severity: 'minor',
        description: '2 images missing alternative text',
        impact: 'Screen reader users cannot understand image content',
        recommendation: 'Add descriptive alt attributes to all images',
      },
    ],
  })

  const [activeUsers] = useState({
    screenReader: 12,
    highContrast: 8,
    largeText: 15,
    keyboardOnly: 23,
    extendedTime: 18,
  })

  const applySettings = (newSettings: Partial<AccessibilitySettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)

    // Apply settings to document
    if (updated.highContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }

    if (updated.reducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }

    document.documentElement.style.fontSize = `${updated.fontSize}px`

    toast.success('Accessibility settings updated')
  }

  const testScreenReader = () => {
    const announcement = new SpeechSynthesisUtterance(
      'Testing screen reader functionality. This is a test announcement.'
    )
    announcement.rate = settings.speechRate
    window.speechSynthesis.speak(announcement)
    toast.success('Screen reader test initiated')
  }

  const runComplianceCheck = () => {
    toast.success('Running WCAG compliance check...')
    setTimeout(() => {
      toast.success('Compliance check completed')
    }, 2000)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'serious':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'minor':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Eye className="w-10 h-10" />
                Accessibility Dashboard
              </h1>
              <p className="text-white/90">
                WCAG 2.1 Compliance & Accessibility Settings Management
              </p>
            </div>
            <button
              onClick={runComplianceCheck}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Run Compliance Check
            </button>
          </div>
        </div>

        {/* WCAG Compliance Score */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                WCAG {compliance.level} Compliance
              </h2>
              <p className="text-gray-600">Web Content Accessibility Guidelines 2.1</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600">{compliance.score}%</div>
              <div className="text-sm text-gray-600 mt-1">Overall Score</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div
              className={`p-4 rounded-lg border-2 ${compliance.level === 'A' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">Level A</div>
                <div className="text-sm text-gray-600">Basic Accessibility</div>
                {compliance.score >= 60 && (
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mt-2" />
                )}
              </div>
            </div>
            <div
              className={`p-4 rounded-lg border-2 ${compliance.level === 'AA' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">Level AA</div>
                <div className="text-sm text-gray-600">Enhanced Accessibility</div>
                {compliance.score >= 80 && (
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mt-2" />
                )}
              </div>
            </div>
            <div
              className={`p-4 rounded-lg border-2 ${compliance.level === 'AAA' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">Level AAA</div>
                <div className="text-sm text-gray-600">Advanced Accessibility</div>
                {compliance.score >= 95 && (
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mt-2" />
                )}
              </div>
            </div>
          </div>

          {/* Issues */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 mb-3">Identified Issues</h3>
            {compliance.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <div className="font-bold">{issue.category}</div>
                      <div className="text-sm opacity-90">{issue.description}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-white/50 rounded">
                    {issue.severity.toUpperCase()}
                  </span>
                </div>
                <div className="ml-8 space-y-1 text-sm">
                  <div>
                    <strong>Impact:</strong> {issue.impact}
                  </div>
                  <div>
                    <strong>Recommendation:</strong> {issue.recommendation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Users with Accessibility Features */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Active Users with Accessibility Features
          </h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activeUsers.screenReader}</div>
              <div className="text-xs text-gray-600">Screen Reader</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Contrast className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activeUsers.highContrast}</div>
              <div className="text-xs text-gray-600">High Contrast</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Type className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activeUsers.largeText}</div>
              <div className="text-xs text-gray-600">Large Text</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Keyboard className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activeUsers.keyboardOnly}</div>
              <div className="text-xs text-gray-600">Keyboard Only</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <Clock className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activeUsers.extendedTime}</div>
              <div className="text-xs text-gray-600">Extended Time</div>
            </div>
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visual Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Visual Settings
            </h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Contrast className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">High Contrast Mode</div>
                    <div className="text-xs text-gray-600">
                      Enhanced visibility for low vision users
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={e => applySettings({ highContrast: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Type className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Large Text</div>
                    <div className="text-xs text-gray-600">
                      Increase text size for better readability
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.largeText}
                  onChange={e => applySettings({ largeText: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block mb-2">
                  <div className="font-medium text-gray-900 mb-1">Font Size</div>
                  <div className="text-xs text-gray-600 mb-2">Current: {settings.fontSize}px</div>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={settings.fontSize}
                    onChange={e => applySettings({ fontSize: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </label>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block mb-2">
                  <div className="font-medium text-gray-900 mb-1">Color Blind Mode</div>
                  <select
                    value={settings.colorBlindMode}
                    onChange={e => applySettings({ colorBlindMode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="protanopia">Protanopia (Red-Blind)</option>
                    <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                    <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <MousePointer className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Reduced Motion</div>
                    <div className="text-xs text-gray-600">Minimize animations and transitions</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={e => applySettings({ reducedMotion: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Audio & Navigation Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Ear className="w-5 h-5 text-green-600" />
              Audio & Navigation Settings
            </h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Screen Reader Support</div>
                    <div className="text-xs text-gray-600">Enable text-to-speech announcements</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.screenReader}
                  onChange={e => applySettings({ screenReader: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              {settings.screenReader && (
                <div className="ml-8 space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="block mb-2">
                      <div className="font-medium text-gray-900 mb-1">Speech Rate</div>
                      <div className="text-xs text-gray-600 mb-2">
                        {settings.speechRate.toFixed(1)}x
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.speechRate}
                        onChange={e => applySettings({ speechRate: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </label>
                  </div>
                  <button
                    onClick={testScreenReader}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all"
                  >
                    Test Screen Reader
                  </button>
                </div>
              )}

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Ear className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Audio Descriptions</div>
                    <div className="text-xs text-gray-600">
                      Narrate visual content for blind users
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.audioDescriptions}
                  onChange={e => applySettings({ audioDescriptions: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Enhanced Keyboard Navigation</div>
                    <div className="text-xs text-gray-600">
                      Full keyboard accessibility with shortcuts
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.keyboardNavigation}
                  onChange={e => applySettings({ keyboardNavigation: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Extended Time</div>
                    <div className="text-xs text-gray-600">1.5x time allowance for exams</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.extendedTime}
                  onChange={e => applySettings({ extendedTime: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-purple-600" />
            Keyboard Shortcuts Reference
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { keys: 'Alt + 1', action: 'Navigate to Dashboard' },
              { keys: 'Alt + 2', action: 'Navigate to Exams' },
              { keys: 'Alt + 3', action: 'Navigate to Settings' },
              { keys: 'Tab', action: 'Move to next element' },
              { keys: 'Shift + Tab', action: 'Move to previous element' },
              { keys: 'Enter / Space', action: 'Activate button/link' },
              { keys: 'Esc', action: 'Close modal/dialog' },
              { keys: 'Ctrl + K', action: 'Open search' },
              { keys: '?', action: 'Show keyboard shortcuts' },
            ].map((shortcut, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-gray-300">
                  {shortcut.keys}
                </span>
                <span className="text-sm text-gray-600 ml-3">{shortcut.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
