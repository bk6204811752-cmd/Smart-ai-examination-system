import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/globalStore'
import { webhooksAPI } from '../../lib/api'
import {
  Webhook,
  Plus,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  ArrowLeft,
  Eye,
  Copy,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface Webhook {
  _id: string
  name: string
  url: string
  events: string[]
  active: boolean
  created_at: string
  last_triggered?: string
  trigger_count: number
  failure_count: number
}

interface WebhookLog {
  _id: string
  event: string
  status_code?: number
  success: boolean
  error?: string
  timestamp: string
}

export default function WebhookManagement() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    active: true,
  })

  const availableEvents = [
    { value: 'exam.created', label: 'Exam Created', description: 'When a new exam is scheduled' },
    { value: 'exam.started', label: 'Exam Started', description: 'When an exam begins' },
    {
      value: 'exam.submitted',
      label: 'Exam Submitted',
      description: 'When a student submits an exam',
    },
    { value: 'exam.ended', label: 'Exam Ended', description: 'When an exam concludes' },
    {
      value: 'violation.detected',
      label: 'Violation Detected',
      description: 'When proctoring violation occurs',
    },
    { value: 'webhook.test', label: 'Test Event', description: 'Test webhook delivery' },
  ]

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard')
      return
    }
    loadWebhooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate])

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      const data = await webhooksAPI.getWebhooks()
      setWebhooks(data)
    } catch (error) {
      toast.error('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await webhooksAPI.registerWebhook({
        ...newWebhook,
        secret: newWebhook.secret || generateSecret(),
      })
      toast.success('Webhook registered successfully')
      setShowCreateModal(false)
      setNewWebhook({ name: '', url: '', events: [], secret: '', active: true })
      loadWebhooks()
    } catch (error) {
      toast.error('Failed to create webhook')
    }
  }

  const handleToggleActive = async (webhookId: string, active: boolean) => {
    try {
      await webhooksAPI.updateWebhook(webhookId, { active: !active })
      setWebhooks(prev => prev.map(w => (w._id === webhookId ? { ...w, active: !active } : w)))
      toast.success(`Webhook ${!active ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error('Failed to update webhook')
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return
    }

    try {
      await webhooksAPI.deleteWebhook(webhookId)
      setWebhooks(prev => prev.filter(w => w._id !== webhookId))
      toast.success('Webhook deleted')
    } catch (error) {
      toast.error('Failed to delete webhook')
    }
  }

  const handleTestWebhook = async (webhookId: string) => {
    try {
      await webhooksAPI.testWebhook(webhookId)
      toast.success('Test webhook sent! Check your endpoint.')
    } catch (error) {
      toast.error('Failed to send test webhook')
    }
  }

  const handleViewLogs = async (webhook: Webhook) => {
    try {
      setSelectedWebhook(webhook)
      const logsData = await webhooksAPI.getWebhookLogs(webhook._id)
      setLogs(logsData)
      setShowLogsModal(true)
    } catch (error) {
      toast.error('Failed to load webhook logs')
    }
  }

  const generateSecret = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  const copySecret = () => {
    if (newWebhook.secret) {
      navigator.clipboard.writeText(newWebhook.secret)
      toast.success('Secret copied to clipboard')
    }
  }

  const toggleEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Webhook className="w-8 h-8 mr-3 text-purple-600" />
                  Webhook Management
                </h1>
                <p className="text-gray-600 mt-1">Manage external integrations and webhooks</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Webhook</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Webhooks</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{webhooks.length}</p>
              </div>
              <Webhook className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {webhooks.filter(w => w.active).length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Triggers</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {webhooks.reduce((sum, w) => sum + w.trigger_count, 0)}
                </p>
              </div>
              <Activity className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failures</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {webhooks.reduce((sum, w) => sum + w.failure_count, 0)}
                </p>
              </div>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </div>
        </div>

        {/* Webhooks List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Registered Webhooks</h2>
          </div>

          {webhooks.length === 0 ? (
            <div className="p-12 text-center">
              <Webhook className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No webhooks yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first webhook integration
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Create Webhook
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {webhooks.map(webhook => (
                <div key={webhook._id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            webhook.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {webhook.active ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
                        <Globe className="w-4 h-4" />
                        <code className="bg-gray-100 px-2 py-1 rounded">{webhook.url}</code>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {webhook.events.map(event => (
                          <span
                            key={event}
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                          >
                            {event}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-500">Triggered</p>
                          <p className="font-semibold text-gray-900">
                            {webhook.trigger_count} times
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Failures</p>
                          <p
                            className={`font-semibold ${
                              webhook.failure_count > 0 ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            {webhook.failure_count}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Last Triggered</p>
                          <p className="font-semibold text-gray-900">
                            {webhook.last_triggered
                              ? new Date(webhook.last_triggered).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleTestWebhook(webhook._id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Test webhook"
                      >
                        <TestTube className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewLogs(webhook)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="View logs"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(webhook._id, webhook.active)}
                        className={`p-2 rounded-lg transition ${
                          webhook.active
                            ? 'text-gray-600 hover:bg-gray-100'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={webhook.active ? 'Disable' : 'Enable'}
                      >
                        {webhook.active ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete webhook"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Create New Webhook</h2>
              <p className="text-gray-600 mt-1">Configure a new webhook integration</p>
            </div>

            <form onSubmit={handleCreateWebhook} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook Name *
                </label>
                <input
                  type="text"
                  value={newWebhook.name}
                  onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  placeholder="Slack Integration"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL *
                </label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://hooks.slack.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events to Subscribe *
                </label>
                <div className="space-y-2">
                  {availableEvents.map(event => (
                    <label
                      key={event.value}
                      className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{event.label}</p>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newWebhook.secret}
                    onChange={e => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                    placeholder="Auto-generated if left empty"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setNewWebhook({ ...newWebhook, secret: generateSecret() })}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Generate
                  </button>
                  {newWebhook.secret && (
                    <button
                      type="button"
                      onClick={copySecret}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Used for HMAC signature verification</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={newWebhook.active}
                  onChange={e => setNewWebhook({ ...newWebhook, active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Enable webhook immediately
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewWebhook({ name: '', url: '', events: [], secret: '', active: true })
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Create Webhook
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && selectedWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Webhook Logs</h2>
                  <p className="text-gray-600 mt-1">{selectedWebhook.name}</p>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No delivery logs yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map(log => (
                    <div
                      key={log._id}
                      className={`p-4 rounded-lg border-2 ${
                        log.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {log.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="font-medium">{log.event}</span>
                          {log.status_code && (
                            <span className="px-2 py-1 bg-white rounded text-sm">
                              Status: {log.status_code}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {log.error && (
                        <div className="mt-2 p-2 bg-white rounded text-sm text-red-600">
                          {log.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
