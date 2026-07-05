import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { 
  Settings as SettingsIcon, User, Bell, Shield, Palette, 
  Mail, Monitor, Calendar, Award, Save, Eye, EyeOff,
  Globe, Lock, Camera, Mic, Video, Check
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('general')
  const [showPassword, setShowPassword] = useState(false)
  const [settings, setSettings] = useState({
    // General
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    language: 'en',
    timezone: 'Asia/Kolkata',
    
    // Notifications
    emailNotifications: true,
    examReminders: true,
    gradeAlerts: true,
    systemUpdates: false,
    marketingEmails: false,
    
    // Proctoring
    cameraEnabled: true,
    microphoneEnabled: true,
    screenShare: false,
    tabSwitchDetection: true,
    copyPasteBlock: true,
    strictMode: false,
    
    // Grading
    passingScore: 40,
    gradingScale: 'percentage',
    showAnswers: true,
    allowReview: true,
    
    // Appearance
    theme: 'light',
    colorScheme: 'blue',
    fontSize: 'medium',
    reducedMotion: false,
    
    // Privacy
    profileVisibility: 'students',
    showEmail: false,
    showPhone: false,
    dataSharing: true
  })

  const handleSave = () => {
    console.log('Saving settings:', settings)
    // API call to save settings
  }

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'proctoring', label: 'Proctoring', icon: Monitor },
    { id: 'grading', label: 'Grading', icon: Award },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center">
                <SettingsIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-600">Manage your account preferences</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-6">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-6">
              
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">General Settings</h2>
                    <p className="text-gray-600 text-sm mb-6">Update your personal information and preferences</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={settings.fullName}
                        onChange={(e) => setSettings({...settings, fullName: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => setSettings({...settings, email: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={settings.phone}
                        onChange={(e) => setSettings({...settings, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select
                        value={settings.language}
                        onChange={(e) => setSettings({...settings, language: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="bn">Bengali</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                        <option value="America/New_York">EST (America/New_York)</option>
                        <option value="Europe/London">GMT (Europe/London)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <h3 className="font-semibold mb-4">Change Password</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Preferences</h2>
                    <p className="text-gray-600 text-sm mb-6">Choose how you want to be notified</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email', icon: Mail },
                      { key: 'examReminders', label: 'Exam Reminders', desc: 'Get reminded about upcoming exams', icon: Bell },
                      { key: 'gradeAlerts', label: 'Grade Alerts', desc: 'Notification when results are published', icon: Award },
                      { key: 'systemUpdates', label: 'System Updates', desc: 'Updates about new features and changes', icon: Globe },
                      { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Promotional and marketing content', icon: Mail }
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.label}</h4>
                              <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings[item.key as keyof typeof settings] as boolean}
                              onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Proctoring Settings */}
              {activeTab === 'proctoring' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Proctoring Settings</h2>
                    <p className="text-gray-600 text-sm mb-6">Configure exam monitoring preferences</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'cameraEnabled', label: 'Camera Monitoring', desc: 'Enable webcam during exams', icon: Camera },
                      { key: 'microphoneEnabled', label: 'Microphone Monitoring', desc: 'Enable audio recording', icon: Mic },
                      { key: 'screenShare', label: 'Screen Sharing', desc: 'Share screen during exam', icon: Monitor },
                      { key: 'tabSwitchDetection', label: 'Tab Switch Detection', desc: 'Flag when student switches tabs', icon: Video },
                      { key: 'copyPasteBlock', label: 'Block Copy-Paste', desc: 'Prevent copy-paste operations', icon: Lock },
                      { key: 'strictMode', label: 'Strict Mode', desc: 'Maximum security with all checks', icon: Shield }
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.label}</h4>
                              <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings[item.key as keyof typeof settings] as boolean}
                              onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Grading Scale */}
              {activeTab === 'grading' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Grading Configuration</h2>
                    <p className="text-gray-600 text-sm mb-6">Customize grading rules and display</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
                      <input
                        type="number"
                        value={settings.passingScore}
                        onChange={(e) => setSettings({...settings, passingScore: parseInt(e.target.value)})}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grading Scale</label>
                      <select
                        value={settings.gradingScale}
                        onChange={(e) => setSettings({...settings, gradingScale: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="percentage">Percentage (0-100)</option>
                        <option value="gpa">GPA (0-10)</option>
                        <option value="letter">Letter Grade (A-F)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-gray-900">Show Correct Answers</h4>
                        <p className="text-sm text-gray-600">Display correct answers after submission</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showAnswers}
                          onChange={(e) => setSettings({...settings, showAnswers: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-gray-900">Allow Review</h4>
                        <p className="text-sm text-gray-600">Let students review their submissions</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allowReview}
                          onChange={(e) => setSettings({...settings, allowReview: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Grading Scale Preview</h4>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-bold text-green-600">A+</div>
                        <div className="text-gray-600">90-100</div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-bold text-green-500">A</div>
                        <div className="text-gray-600">80-89</div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-bold text-blue-600">B</div>
                        <div className="text-gray-600">70-79</div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-bold text-yellow-600">C</div>
                        <div className="text-gray-600">60-69</div>
                      </div>
                      <div className="bg-white p-2 rounded text-center">
                        <div className="font-bold text-orange-600">D</div>
                        <div className="text-gray-600">50-59</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Appearance</h2>
                    <p className="text-gray-600 text-sm mb-6">Customize the look and feel</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['light', 'dark', 'auto'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setSettings({...settings, theme})}
                          className={`p-4 border-2 rounded-lg transition ${
                            settings.theme === theme
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium capitalize">{theme}</div>
                          {settings.theme === theme && <Check className="w-4 h-4 text-blue-600 mt-1" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Color Scheme</label>
                    <div className="flex space-x-3">
                      {[
                        { name: 'blue', color: 'bg-blue-600' },
                        { name: 'purple', color: 'bg-purple-600' },
                        { name: 'green', color: 'bg-green-600' },
                        { name: 'red', color: 'bg-red-600' },
                        { name: 'orange', color: 'bg-orange-600' }
                      ].map((scheme) => (
                        <button
                          key={scheme.name}
                          onClick={() => setSettings({...settings, colorScheme: scheme.name})}
                          className={`w-12 h-12 rounded-lg ${scheme.color} ${
                            settings.colorScheme === scheme.name ? 'ring-4 ring-offset-2 ring-gray-300' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Font Size</label>
                    <select
                      value={settings.fontSize}
                      onChange={(e) => setSettings({...settings, fontSize: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-900">Reduced Motion</h4>
                      <p className="text-sm text-gray-600">Minimize animations and transitions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.reducedMotion}
                        onChange={(e) => setSettings({...settings, reducedMotion: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Privacy & Security */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy & Security</h2>
                    <p className="text-gray-600 text-sm mb-6">Control your privacy and data</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Profile Visibility</label>
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => setSettings({...settings, profileVisibility: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="public">Public</option>
                      <option value="students">Students Only</option>
                      <option value="teachers">Teachers Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-gray-900">Show Email</h4>
                        <p className="text-sm text-gray-600">Display email on profile</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showEmail}
                          onChange={(e) => setSettings({...settings, showEmail: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-gray-900">Show Phone</h4>
                        <p className="text-sm text-gray-600">Display phone number on profile</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showPhone}
                          onChange={(e) => setSettings({...settings, showPhone: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-gray-900">Data Sharing</h4>
                        <p className="text-sm text-gray-600">Share anonymous usage data</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.dataSharing}
                          onChange={(e) => setSettings({...settings, dataSharing: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">Account Actions</h4>
                    <div className="space-y-2">
                      <button className="text-sm text-blue-600 hover:underline block">
                        Download My Data
                      </button>
                      <button className="text-sm text-red-600 hover:underline block">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Calendar */}
              {activeTab === 'calendar' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Academic Calendar</h2>
                    <p className="text-gray-600 text-sm mb-6">Configure semester dates and holidays</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                      <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option>2024-2025</option>
                        <option>2025-2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Semester</label>
                      <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option>Semester 1 (July-Nov)</option>
                        <option>Semester 2 (Dec-Apr)</option>
                        <option>Summer (May-Jun)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-4">Important Dates</h4>
                    <div className="space-y-3">
                      {[
                        { event: 'Semester Start', date: 'July 15, 2024' },
                        { event: 'Mid-Term Exams', date: 'September 20-25, 2024' },
                        { event: 'Semester End', date: 'November 30, 2024' },
                        { event: 'Final Exams', date: 'December 1-15, 2024' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{item.event}</span>
                          <span className="text-sm text-gray-600">{item.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
