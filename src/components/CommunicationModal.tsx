import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { XCircle, Send, Users, Mail, MessageSquare, Bell, Search, Loader2, CheckCircle } from 'lucide-react'
import { communicationAPI, userAPI } from '../lib/api'

interface UserSummary {
  _id: string
  full_name: string
  email: string
  role: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  mode: 'email' | 'push' | 'alert'
  onToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

type RecipientGroup = 'all' | 'students' | 'teachers' | 'custom'

const MODE_CONFIG = {
  email: { icon: Mail, title: 'Send Email Broadcast', gradient: 'from-blue-500 to-blue-600' },
  push: { icon: MessageSquare, title: 'Send Push Notification', gradient: 'from-green-500 to-green-600' },
  alert: { icon: Bell, title: 'Send System Alert', gradient: 'from-purple-500 to-purple-600' },
}

export default function CommunicationModal({ isOpen, onClose, mode, onToast }: Props) {
  const cfg = MODE_CONFIG[mode]
  const [users, setUsers] = useState<UserSummary[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')

  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState('medium')

  useEffect(() => {
    if (!isOpen) return
    setSent(false)
    setSending(false)
    setSubject('')
    setTitle('')
    setMessage('')
    setSeverity('medium')
    setRecipientGroup('all')
    setSelectedUserIds([])
    setUserSearch('')

    const fetchUsers = async () => {
      try {
        const data = await userAPI.getLiveUsers()
        setUsers(Array.isArray(data) ? data : [])
      } catch {
        setUsers([])
      }
    }
    fetchUsers()
  }, [isOpen, mode])

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const resolveRecipients = useCallback((): string[] => {
    switch (recipientGroup) {
      case 'all':
        return users.map(u => u._id)
      case 'students':
        return users.filter(u => u.role === 'student').map(u => u._id)
      case 'teachers':
        return users.filter(u => u.role === 'teacher' || u.role === 'admin').map(u => u._id)
      case 'custom':
        return selectedUserIds
    }
  }, [recipientGroup, users, selectedUserIds])

  const handleSend = async () => {
    const recipients = resolveRecipients()
    if (recipients.length === 0) {
      onToast('No recipients selected', 'error')
      return
    }
    if (mode === 'email' && !subject.trim()) {
      onToast('Subject is required', 'error')
      return
    }
    if (!message.trim()) {
      onToast('Message is required', 'error')
      return
    }
    if (mode !== 'email' && !title.trim()) {
      onToast('Title is required', 'error')
      return
    }

    setSending(true)
    try {
      if (mode === 'email') {
        await communicationAPI.sendEmailBroadcast({ subject, message, recipients })
      } else if (mode === 'push') {
        await communicationAPI.sendPushNotification({ title, message, recipients })
      } else {
        await communicationAPI.sendSystemAlert({ message, severity, recipients })
      }
      setSent(true)
      onToast(
        `${cfg.title} sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`,
        'success'
      )
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to send'
      onToast(msg, 'error')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${cfg.gradient} p-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <cfg.icon className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">{cfg.title}</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition">
              <XCircle className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sent Successfully!</h3>
            <p className="text-gray-600 mb-6">
              Your {mode === 'email' ? 'email' : mode === 'push' ? 'notification' : 'alert'} has been sent.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Recipients
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'students', 'teachers', 'custom'] as RecipientGroup[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setRecipientGroup(g)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                      recipientGroup === g
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {g === 'all' ? 'All Users' : g === 'students' ? 'Students' : g === 'teachers' ? 'Teachers' : 'Custom'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {recipientGroup === 'custom'
                  ? `${selectedUserIds.length} user(s) selected`
                  : `${resolveRecipients().length} recipient(s)`}
              </p>
            </div>

            {/* Custom user selector */}
            {recipientGroup === 'custom' && (
              <div>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 text-center">No users found</p>
                  ) : (
                    filteredUsers.map(u => (
                      <label
                        key={u._id}
                        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u._id)}
                          onChange={() => toggleUser(u._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email} · {u.role}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Subject (email only) */}
            {mode === 'email' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Title (push/alert) */}
            {mode !== 'email' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={
                    mode === 'push' ? 'Notification title...' : 'Alert title...'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Severity (alert only) */}
            {mode === 'alert' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Severity</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverity(s)}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition ${
                        severity === s
                          ? s === 'high'
                            ? 'bg-red-600 text-white'
                            : s === 'medium'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Message *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{message.length} characters</p>
            </div>
          </div>
        )}

        {/* Footer */}
        {!sent && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Will be sent to <strong>{resolveRecipients().length}</strong> recipient{resolveRecipients().length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
