import { useState } from 'react'
import {
  Settings,
  Shield,
  Sliders,
  AlertTriangle,
  Brain,
  Eye,
  Bell,
  Save,
  RotateCcw,
} from 'lucide-react'

interface ProctoringConfig {
  general: {
    enable_proctoring: boolean
    auto_start_camera: boolean
    require_calibration: boolean
    calibration_duration: number
    enable_audio_monitoring: boolean
    enable_screen_recording: boolean
  }
  ml_sensitivity: {
    face_detection_threshold: number
    emotion_detection_sensitivity: number
    gaze_tracking_precision: number
    multiple_faces_tolerance: number
    object_detection_confidence: number
    audio_anomaly_threshold: number
  }
  violation_rules: {
    max_face_absence_time: number
    max_multiple_faces_time: number
    max_suspicious_object_time: number
    max_tab_switch_count: number
    max_window_blur_count: number
    gaze_deviation_threshold: number
  }
  interventions: {
    enable_auto_warnings: boolean
    warning_threshold: number
    enable_auto_pause: boolean
    pause_threshold: number
    enable_auto_terminate: boolean
    termination_threshold: number
    notify_proctor_on_violation: boolean
  }
  risk_scoring: {
    face_absence_weight: number
    multiple_faces_weight: number
    suspicious_objects_weight: number
    tab_switch_weight: number
    emotion_anomaly_weight: number
    gaze_deviation_weight: number
  }
  whitelist: {
    allowed_objects: string[]
    allowed_background_noise: string[]
    trusted_applications: string[]
  }
  blacklist: {
    prohibited_objects: string[]
    prohibited_sounds: string[]
    blocked_applications: string[]
  }
}

const defaultConfig: ProctoringConfig = {
  general: {
    enable_proctoring: true,
    auto_start_camera: true,
    require_calibration: true,
    calibration_duration: 30,
    enable_audio_monitoring: true,
    enable_screen_recording: true,
  },
  ml_sensitivity: {
    face_detection_threshold: 0.85,
    emotion_detection_sensitivity: 0.75,
    gaze_tracking_precision: 0.8,
    multiple_faces_tolerance: 0.7,
    object_detection_confidence: 0.8,
    audio_anomaly_threshold: 0.75,
  },
  violation_rules: {
    max_face_absence_time: 10,
    max_multiple_faces_time: 5,
    max_suspicious_object_time: 15,
    max_tab_switch_count: 3,
    max_window_blur_count: 5,
    gaze_deviation_threshold: 45,
  },
  interventions: {
    enable_auto_warnings: true,
    warning_threshold: 40,
    enable_auto_pause: true,
    pause_threshold: 70,
    enable_auto_terminate: false,
    termination_threshold: 90,
    notify_proctor_on_violation: true,
  },
  risk_scoring: {
    face_absence_weight: 0.25,
    multiple_faces_weight: 0.3,
    suspicious_objects_weight: 0.2,
    tab_switch_weight: 0.1,
    emotion_anomaly_weight: 0.1,
    gaze_deviation_weight: 0.05,
  },
  whitelist: {
    allowed_objects: ['Calculator', 'Pen', 'Paper', 'Water Bottle'],
    allowed_background_noise: ['Air Conditioner', 'Fan', 'Ambient Noise'],
    trusted_applications: ['VS Code', 'PyCharm', 'Terminal'],
  },
  blacklist: {
    prohibited_objects: ['Phone', 'Tablet', 'Laptop', 'Book', 'Notes'],
    prohibited_sounds: ['Phone Ring', 'Conversation', 'Keyboard Typing'],
    blocked_applications: ['WhatsApp', 'Telegram', 'ChatGPT', 'Google'],
  },
}

export default function AdvancedProctoringSettings() {
  const [config, setConfig] = useState<ProctoringConfig>(defaultConfig)
  const [activeTab, setActiveTab] = useState<
    'general' | 'ml' | 'rules' | 'interventions' | 'scoring' | 'lists'
  >('general')
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleConfigChange = (section: keyof ProctoringConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleListAdd = (section: 'whitelist' | 'blacklist', field: string, value: string) => {
    if (!value.trim()) return

    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...((prev[section] as any)[field] as string[]), value],
      },
    }))
    setHasChanges(true)
  }

  const handleListRemove = (section: 'whitelist' | 'blacklist', field: string, index: number) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: ((prev[section] as any)[field] as string[]).filter((_, i) => i !== index),
      },
    }))
    setHasChanges(true)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Saving configuration:', config)
      setHasChanges(false)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setConfig(defaultConfig)
      setHasChanges(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Settings className="w-8 h-8" />
                Advanced Proctoring Configuration
              </h1>
              <p className="text-white/90 mt-2">
                Fine-tune AI models and configure violation detection rules
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={saveSettings}
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition ${
                  hasChanges && !saving
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6 p-2 flex gap-2 overflow-x-auto">
          {[
            { id: 'general', label: 'General', icon: Shield },
            { id: 'ml', label: 'ML Sensitivity', icon: Brain },
            { id: 'rules', label: 'Violation Rules', icon: AlertTriangle },
            { id: 'interventions', label: 'Auto Interventions', icon: Bell },
            { id: 'scoring', label: 'Risk Scoring', icon: Sliders },
            { id: 'lists', label: 'White/Blacklists', icon: Eye },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-600" />
                General Proctoring Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(config.general).map(([key, value]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    {typeof value === 'boolean' ? (
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-medium text-gray-700">
                          {key
                            .split('_')
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                        </span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={e => handleConfigChange('general', key, e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                      </label>
                    ) : (
                      <div>
                        <label className="block font-medium text-gray-700 mb-2">
                          {key
                            .split('_')
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                        </label>
                        <input
                          type="number"
                          value={value}
                          onChange={e =>
                            handleConfigChange('general', key, parseInt(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ML Sensitivity */}
          {activeTab === 'ml' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Machine Learning Sensitivity Thresholds
              </h2>
              <p className="text-sm text-gray-600">
                Adjust confidence thresholds for AI model predictions (0.0 - 1.0)
              </p>

              <div className="space-y-6">
                {Object.entries(config.ml_sensitivity).map(([key, value]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-medium text-gray-700">
                        {key
                          .split('_')
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')}
                      </label>
                      <span className="text-lg font-bold text-purple-600">{value.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={value}
                      onChange={e =>
                        handleConfigChange('ml_sensitivity', key, parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Less Sensitive</span>
                      <span>More Sensitive</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Violation Rules */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
                Violation Detection Rules
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(config.violation_rules).map(([key, value]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <label className="block font-medium text-gray-700 mb-2">
                      {key
                        .split('_')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                    </label>
                    <input
                      type="number"
                      value={value}
                      onChange={e =>
                        handleConfigChange('violation_rules', key, parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {key.includes('time')
                        ? 'seconds'
                        : key.includes('count')
                          ? 'occurrences'
                          : 'degrees'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto Interventions */}
          {activeTab === 'interventions' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-6 h-6 text-purple-600" />
                Automatic Intervention Settings
              </h2>

              <div className="space-y-4">
                {Object.entries(config.interventions).map(([key, value]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    {typeof value === 'boolean' ? (
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="font-medium text-gray-700 block">
                            {key
                              .split('_')
                              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {key.includes('warnings') && 'Send automatic warnings to students'}
                            {key.includes('pause') &&
                              'Automatically pause exam when violations occur'}
                            {key.includes('terminate') &&
                              'Automatically terminate exam on severe violations'}
                            {key.includes('notify') && 'Send real-time notifications to proctors'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={e => handleConfigChange('interventions', key, e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                      </label>
                    ) : (
                      <div>
                        <label className="block font-medium text-gray-700 mb-2">
                          {key
                            .split('_')
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={value}
                            onChange={e =>
                              handleConfigChange('interventions', key, parseInt(e.target.value))
                            }
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-lg font-bold text-purple-600 w-12">{value}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Scoring */}
          {activeTab === 'scoring' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sliders className="w-6 h-6 text-purple-600" />
                Risk Score Calculation Weights
              </h2>
              <p className="text-sm text-gray-600">
                Configure how each violation type contributes to the overall risk score (must sum to
                1.0)
              </p>

              <div className="space-y-4">
                {Object.entries(config.risk_scoring).map(([key, value]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium text-gray-700">
                        {key
                          .split('_')
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')}
                      </label>
                      <span className="text-lg font-bold text-purple-600">{value.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={value}
                      onChange={e =>
                        handleConfigChange('risk_scoring', key, parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="mt-2">
                      <div className="bg-purple-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full transition-all duration-300"
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Current Sum:</strong>{' '}
                  {Object.values(config.risk_scoring)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}
                  {Object.values(config.risk_scoring).reduce((a, b) => a + b, 0) !== 1.0 && (
                    <span className="text-red-600 ml-2">⚠️ Warning: Weights should sum to 1.0</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Whitelist/Blacklist */}
          {activeTab === 'lists' && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Eye className="w-6 h-6 text-purple-600" />
                Whitelist & Blacklist Management
              </h2>

              {/* Whitelist */}
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-4">
                  ✅ Whitelist (Allowed Items)
                </h3>
                <div className="space-y-4">
                  {Object.entries(config.whitelist).map(([key, items]) => (
                    <ListManager
                      key={key}
                      title={key
                        .split('_')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                      items={items}
                      onAdd={value => handleListAdd('whitelist', key, value)}
                      onRemove={index => handleListRemove('whitelist', key, index)}
                      color="green"
                    />
                  ))}
                </div>
              </div>

              {/* Blacklist */}
              <div>
                <h3 className="text-lg font-semibold text-red-700 mb-4">
                  ⛔ Blacklist (Prohibited Items)
                </h3>
                <div className="space-y-4">
                  {Object.entries(config.blacklist).map(([key, items]) => (
                    <ListManager
                      key={key}
                      title={key
                        .split('_')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                      items={items}
                      onAdd={value => handleListAdd('blacklist', key, value)}
                      onRemove={index => handleListRemove('blacklist', key, index)}
                      color="red"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// List Manager Component
function ListManager({
  title,
  items,
  onAdd,
  onRemove,
  color,
}: {
  title: string
  items: string[]
  onAdd: (value: string) => void
  onRemove: (index: number) => void
  color: 'green' | 'red'
}) {
  const [newItem, setNewItem] = useState('')

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim())
      setNewItem('')
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">{title}</h4>

      {/* Add New Item */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Add ${title.toLowerCase()}...`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={handleAdd}
          className={`px-4 py-2 ${
            color === 'green' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          } text-white rounded-lg transition`}
        >
          Add
        </button>
      </div>

      {/* Item List */}
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              color === 'green' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            <span className="text-sm">{item}</span>
            <button
              onClick={() => onRemove(index)}
              className="hover:bg-black/10 rounded-full p-0.5 transition"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
