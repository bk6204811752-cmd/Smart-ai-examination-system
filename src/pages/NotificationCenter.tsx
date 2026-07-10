import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/globalStore'
import { notificationsAPI, userAPI } from '../lib/api'
import { toast } from 'sonner'
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Trophy,
  X,
  Filter,
  Settings,
  MessageSquare,
  Clock,
  Trash2,
  Eye,
  Send,
} from 'lucide-react'

interface Notification {
  _id: string
  type:
    | 'exam'
    | 'grade'
    | 'security'
    | 'announcement'
    | 'achievement'
    | 'reminder'
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
  title: string
  message: string
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent'
  read: boolean
  timestamp?: Date
  created_at?: string
  action_url?: string
  actionUrl?: string
  actionText?: string
  metadata?: any
}

export default function NotificationCenterPage() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'exam' | 'grade' | 'security'>('all')
  const [, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0,
    exams: 0,
    grades: 0,
    security: 0,
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNotification, setNewNotification] = useState({
    type: 'announcement',
    title: '',
    message: '',
    priority: 'medium',
    targetRole: 'all',
    targetUsers: [],
  })

  useEffect(() => {
    loadNotifications()
    loadStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadNotifications(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterNotifications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, notifications])

  const loadNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await notificationsAPI.getNotifications(false, 100)

      // Transform backend format to frontend format
      const transformedNotifications = data.map((n: any) => ({
        ...n,
        timestamp: new Date(n.created_at),
        actionUrl: n.action_url,
      }))

      setNotifications(transformedNotifications)
      setFilteredNotifications(transformedNotifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await notificationsAPI.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load notification stats:', error)
    }
  }

  const filterNotifications = () => {
    let filtered = [...notifications]

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter)
    }

    setFilteredNotifications(filtered)
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead([id])
      setNotifications(notifications.map(n => (n._id === id ? { ...n, read: true } : n)))
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
    } catch (error) {
      toast.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      setStats(prev => ({ ...prev, unread: 0 }))
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationsAPI.deleteNotification(id)
      setNotifications(notifications.filter(n => n._id !== id))
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        unread: prev.unread - (notifications.find(n => n._id === id)?.read ? 0 : 1),
      }))
      toast.success('Notification deleted')
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return <Calendar className="w-5 h-5" />
      case 'violation':
        return <AlertTriangle className="w-5 h-5" />
      case 'system':
        return <Settings className="w-5 h-5" />
      case 'message':
        return <MessageSquare className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return dateObj.toLocaleDateString()
  }

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') return 'bg-red-100 text-red-600 border-red-200'

    switch (type) {
      case 'exam':
        return 'bg-blue-100 text-blue-600 border-blue-200'
      case 'grade':
        return 'bg-green-100 text-green-600 border-green-200'
      case 'security':
        return 'bg-orange-100 text-orange-600 border-orange-200'
      case 'announcement':
        return 'bg-purple-100 text-purple-600 border-purple-200'
      case 'achievement':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200'
      case 'reminder':
        return 'bg-cyan-100 text-cyan-600 border-cyan-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const handleSendNotification = async () => {
    try {
      let userIDs: string[] = []
      if (newNotification.targetRole === 'all') {
        const allUsers = await userAPI.getUsers()
        userIDs = allUsers.map((u: any) => u._id)
      } else {
        const allUsers = await userAPI.getUsers()
        userIDs = allUsers
          .filter((u: any) => u.role === newNotification.targetRole)
          .map((u: any) => u._id)
      }
      await notificationsAPI.sendNotification({
        user_ids: userIDs,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        priority: newNotification.priority,
        channels: ['push'],
      })
      toast.success('Notification sent successfully')
      setShowCreateModal(false)
      setNewNotification({
        type: 'announcement',
        title: '',
        message: '',
        priority: 'medium',
        targetRole: 'all',
        targetUsers: [],
      })
      loadNotifications()
    } catch (error) {
      toast.error('Failed to send notification')
    }
  }

  // Calculate stats from notifications
  useEffect(() => {
    setStats({
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      today: notifications.filter(n => {
        if (!n.timestamp) return false
        const notifDate = new Date(n.timestamp)
        const today = new Date()
        return notifDate.toDateString() === today.toDateString()
      }).length,
      exams: notifications.filter(n => n.type === 'exam').length,
      grades: notifications.filter(n => n.type === 'grade').length,
      security: notifications.filter(n => n.type === 'security' && !n.read).length,
    })
  }, [notifications])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-500 rounded-xl flex items-center justify-center relative">
                <Bell className="w-6 h-6 text-white" />
                {stats.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.unread}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">Notification Center</h1>
                <p className="text-sm text-gray-600">{stats.unread} unread notifications</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <Send className="w-4 h-4 inline mr-2" />
                  Send Notification
                </button>
              )}
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Mark All Read
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <Bell className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <Eye className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Unread</p>
            <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <Calendar className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Exams</p>
            <p className="text-2xl font-bold text-green-600">{stats.exams}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <Trophy className="w-8 h-8 text-yellow-600 mb-2" />
            <p className="text-sm text-gray-600">Grades</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.grades}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
            <p className="text-sm text-gray-600">Security</p>
            <p className="text-2xl font-bold text-red-600">{stats.security}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
            {(['all', 'unread', 'exam', 'grade', 'security'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">You're all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification._id}
                className={`bg-white rounded-xl shadow-sm p-5 transition-all ${
                  !notification.read ? 'border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${getNotificationColor(
                      notification.type,
                      notification.priority
                    )}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{notification.title}</h3>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                      )}
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {notification.timestamp ? formatDate(notification.timestamp) : 'Unknown'}
                        </span>
                        {notification.priority === 'high' && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded">
                            High Priority
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {notification.actionUrl && notification.actionText && (
                          <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                            {notification.actionText}
                          </button>
                        )}
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="p-2 text-gray-400 hover:text-green-600 transition"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Notification Modal (Admin Only) */}
      {showCreateModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Send Notification</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newNotification.type}
                      onChange={e =>
                        setNewNotification({ ...newNotification, type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="exam">Exam</option>
                      <option value="grade">Grade</option>
                      <option value="security">Security</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={newNotification.priority}
                      onChange={e =>
                        setNewNotification({ ...newNotification, priority: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <select
                    value={newNotification.targetRole}
                    onChange={e =>
                      setNewNotification({ ...newNotification, targetRole: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Users</option>
                    <option value="student">Students Only</option>
                    <option value="teacher">Teachers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={e =>
                      setNewNotification({ ...newNotification, title: e.target.value })
                    }
                    placeholder="Notification title..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={newNotification.message}
                    onChange={e =>
                      setNewNotification({ ...newNotification, message: e.target.value })
                    }
                    placeholder="Notification message..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendNotification}
                    disabled={!newNotification.title || !newNotification.message}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 inline mr-2" />
                    Send Notification
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
