import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { analyticsAPI, userAPI, communicationAPI } from '../../lib/api'
import Toast from '../../components/Toast'
import { 
  Users, BookOpen, FileText, Activity, LogOut, Shield, 
  TrendingUp, AlertTriangle, CheckCircle, Clock, Server,
  Database, Cpu, HardDrive, Wifi, Bell, Settings,
  BarChart3, PieChart, LineChart, Download, RefreshCw,
  Eye, Lock, UserCheck, Zap, Target, Award, Calendar,
  MapPin, Globe, Smartphone, Monitor, Send, Mail, 
  MessageSquare, Filter, Search, ArrowUp, ArrowDown, 
  Minus, ChevronRight, Trash2, Edit, MoreVertical, 
  PlayCircle, PauseCircle, XCircle, Cloud, CloudOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface UserStats {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive' | 'suspended'
  lastActive: string
  examsCompleted?: number
  examsCreated?: number
}

interface AnalyticsData {
  date: string
  users: number
  exams: number
  violations: number
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [systemHealth, setSystemHealth] = useState<any>({
    cpu: 45,
    memory: 62,
    storage: 38,
    network: 95
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([])
  const [liveUsers, setLiveUsers] = useState<UserStats[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('7d')
  const [showUserModal, setShowUserModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null)
  const [showCommunicationModal, setShowCommunicationModal] = useState(false)
  const [communicationType, setCommunicationType] = useState<'email' | 'push' | 'alert'>('email')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  })

  useEffect(() => {
    loadAllData()
    
    // Auto-refresh every 60 seconds (reduced from 30)
    const interval = setInterval(() => {
      refreshData()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [selectedPeriod])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load critical data first
      await Promise.all([
        loadStats(),
        loadLiveUsers()
      ])
      // Load non-critical data after
      await Promise.all([
        loadSystemHealth(),
        loadRecentActivity(),
        loadSecurityAlerts(),
        loadAnalyticsData()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      // Only refresh critical data on auto-refresh
      await Promise.all([
        loadStats(),
        loadLiveUsers()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await analyticsAPI.getDashboardAnalytics()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadSystemHealth = async () => {
    try {
      const health = await analyticsAPI.getSystemHealth()
      setSystemHealth(health)
    } catch (error) {
      console.error('Error loading system health:', error)
      // Set fallback data if endpoint fails
      setSystemHealth({
        status: 'healthy',
        database: { status: 'healthy', latency: 0, connected: true },
        api: { status: 'healthy', uptime: 99.9 },
        resources: { cpu_usage: 0, memory_usage: 0, disk_usage: 0 },
        metrics: { total_users: 0, total_exams: 0, active_sessions: 0 },
        timestamp: new Date().toISOString()
      })
    }
  }

  const loadRecentActivity = async () => {
    try {
      const activity = await analyticsAPI.getRecentActivity()
      setRecentActivity(activity)
    } catch (error) {
      console.error('Error loading recent activity:', error)
    }
  }

  const loadSecurityAlerts = async () => {
    try {
      const alerts = await analyticsAPI.getSecurityAlerts()
      setSecurityAlerts(alerts)
    } catch (error) {
      console.error('Error loading security alerts:', error)
    }
  }

  const loadLiveUsers = async () => {
    try {
      const users = await userAPI.getLiveUsers()
      const formattedUsers = users.map((user: any) => ({
        id: user._id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.is_active ? 'active' : 'inactive',
        lastActive: user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
        examsCompleted: user.exams_completed || 0,
        examsCreated: user.exams_created || 0
      }))
      setLiveUsers(formattedUsers)
    } catch (error) {
      console.error('Error loading live users:', error)
    }
  }

  const loadAnalyticsData = async () => {
    try {
      const data = await analyticsAPI.getAnalyticsTrend(selectedPeriod)
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error loading analytics data:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  const handleEditUser = (user: UserStats) => {
    setSelectedUser(user)
    showToast(`Editing user: ${user.name}`, 'info')
    // In production, this would open an edit modal
  }

  const handleDeleteUser = async (user: UserStats) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        await userAPI.deleteUser(user.id)
        await loadLiveUsers()
        showToast('User deleted successfully!', 'success')
      } catch (error) {
        console.error('Error deleting user:', error)
        showToast('Error deleting user. Please try again.', 'error')
      }
    }
  }

  const handleSuspendUser = async (user: UserStats) => {
    if (window.confirm(`Are you sure you want to suspend ${user.name}?`)) {
      try {
        await userAPI.suspendUser(user.id)
        await loadLiveUsers()
        showToast(`${user.name} has been suspended.`, 'warning')
      } catch (error) {
        console.error('Error suspending user:', error)
        showToast('Error suspending user. Please try again.', 'error')
      }
    }
  }

  const handleActivateUser = async (user: UserStats) => {
    if (window.confirm(`Are you sure you want to activate ${user.name}?`)) {
      try {
        await userAPI.activateUser(user.id)
        await loadLiveUsers()
        showToast(`${user.name} has been activated.`, 'success')
      } catch (error) {
        console.error('Error activating user:', error)
        showToast('Error activating user. Please try again.', 'error')
      }
    }
  }

  const handleExportCSV = () => {
    try {
      const csvData = filteredUsers.map(u => ({
        Name: u.name,
        Email: u.email,
        Role: u.role,
        Status: u.status,
        'Last Active': u.lastActive,
        'Exams Completed': u.examsCompleted || 0,
        'Exams Created': u.examsCreated || 0
      }))
      
      const headers = Object.keys(csvData[0]).join(',')
      const rows = csvData.map(row => Object.values(row).join(','))
      const csv = [headers, ...rows].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      showToast(`Exported ${filteredUsers.length} users to CSV!`, 'success')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      showToast('Error exporting CSV. Please try again.', 'error')
    }
  }

  const handleSendCommunication = (type: 'email' | 'push' | 'alert') => {
    setCommunicationType(type)
    setShowCommunicationModal(true)
    const typeNames = { email: 'Email Broadcast', push: 'Push Notification', alert: 'System Alert' }
    showToast(`Opening ${typeNames[type]} composer...`, 'info')
  }

  const handleRefreshData = async () => {
    await refreshData()
    showToast('Dashboard data refreshed successfully!', 'success')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student': return <Users className="w-4 h-4" />
      case 'teacher': return <UserCheck className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const filteredUsers = liveUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                PCMT Admin Control Center
              </h1>
              <p className="text-sm text-gray-600">System Administration & Monitoring</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/notifications" className="relative p-2 text-gray-600 hover:text-blue-600 transition" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </Link>
              <button 
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 hover:text-blue-600 transition"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="p-2 text-gray-600 hover:text-red-600 transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, Administrator! 👑
            </h2>
            <p className="text-gray-600">Monitor and manage your examination platform</p>
          </motion.div>

        {/* Security Alerts */}
        {securityAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-2">Security Alerts</h3>
                  <div className="space-y-2">
                    {securityAlerts.map((alert, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-amber-800">{alert.message}</span>
                        <span className="text-amber-600">{alert.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="w-12 h-12 text-blue-600" />
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">+12%</span>
            </div>
            <p className="text-gray-600 text-sm">Total Students</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.total_students || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active users this month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between mb-4">
              <UserCheck className="w-12 h-12 text-green-600" />
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">+8%</span>
            </div>
            <p className="text-gray-600 text-sm">Total Teachers</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.total_teachers || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Faculty members</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-12 h-12 text-purple-600" />
              <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">+25</span>
            </div>
            <p className="text-gray-600 text-sm">Total Exams</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.total_exams || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Assessments created</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-12 h-12 text-orange-600" />
              <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">+156</span>
            </div>
            <p className="text-gray-600 text-sm">Submissions</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.total_submissions || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total exam attempts</p>
          </motion.div>
        </div>

        {/* System Health & Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Server className="w-5 h-5 mr-2 text-blue-600" />
                System Health
              </h3>
              <button 
                onClick={handleRefreshData}
                disabled={refreshing}
                className={`p-2 hover:bg-gray-100 rounded-lg transition ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* CPU */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">CPU Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{systemHealth.cpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${systemHealth.cpu}%` }}
                  ></div>
                </div>
              </div>

              {/* Memory */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Memory Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{systemHealth.memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${systemHealth.memory}%` }}
                  ></div>
                </div>
              </div>

              {/* Storage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">Storage Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{systemHealth.storage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${systemHealth.storage}%` }}
                  ></div>
                </div>
              </div>

              {/* Network */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium">Network Status</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{systemHealth.network}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${systemHealth.network}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-600" />
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/approvals')}
                className="w-full p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition text-left group"
              >
                <div className="flex items-center space-x-3">
                  <UserCheck className="w-5 h-5 text-yellow-600 group-hover:scale-110 transition" />
                  <div>
                    <p className="font-semibold text-gray-900">User Approvals</p>
                    <p className="text-xs text-gray-600">Review pending registrations</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/users')}
                className="w-full p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition text-left group"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
                  <div>
                    <p className="font-semibold text-gray-900">Manage Users</p>
                    <p className="text-xs text-gray-600">Add, edit, remove users</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/security')}
                className="w-full p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg hover:from-red-100 hover:to-red-200 transition text-left group"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-red-600 group-hover:scale-110 transition" />
                  <div>
                    <p className="font-semibold text-gray-900">Security Center</p>
                    <p className="text-xs text-gray-600">Monitor security</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/webhooks')}
                className="w-full p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition text-left group"
              >
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-purple-600 group-hover:scale-110 transition" />
                  <div>
                    <p className="font-semibold text-gray-900">Webhooks</p>
                    <p className="text-xs text-gray-600">External integrations</p>
                  </div>
                </div>
              </button>

              <button
                className="w-full p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition text-left group"
              >
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-green-600 group-hover:scale-110 transition" />
                  <div>
                    <p className="font-semibold text-gray-900">Export Reports</p>
                    <p className="text-xs text-gray-600">Download analytics</p>
                  </div>
                </div>
              </button>

              <button
                className="w-full p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition text-left group"
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-yellow-600 group-hover:scale-110 transition" />
                  <div>
                    <p className="font-semibold text-gray-900">View Analytics</p>
                    <p className="text-xs text-gray-600">Detailed insights</p>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Recent Activity & Performance Metrics */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-600" />
              Recent Activity
            </h3>
            
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'alert' ? 'bg-red-500' :
                    activity.type === 'exam' ? 'bg-blue-500' :
                    activity.type === 'user' ? 'bg-green-500' :
                    'bg-gray-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">{activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition">
              View All Activity
            </button>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Performance Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">System Uptime</p>
                    <p className="text-xs text-gray-600">Last 30 days</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">99.8%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Active Users</p>
                    <p className="text-xs text-gray-600">Currently online</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600">234</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Avg Exam Score</p>
                    <p className="text-xs text-gray-600">This month</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-purple-600">78.5%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Avg Response Time</p>
                    <p className="text-xs text-gray-600">API performance</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-orange-600">145ms</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Analytics Chart & Live Users */}
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          {/* Analytics Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <LineChart className="w-5 h-5 mr-2 text-blue-600" />
                Platform Analytics
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedPeriod('7d')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                    selectedPeriod === '7d' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setSelectedPeriod('30d')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                    selectedPeriod === '30d' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setSelectedPeriod('90d')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                    selectedPeriod === '90d' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  90 Days
                </button>
              </div>
            </div>

            {/* Simple Bar Chart Visualization */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-xs font-medium">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Users</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Exams</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Violations</span>
                </div>
              </div>

              <div className="h-64 flex items-end justify-between space-x-1">
                {analyticsData.slice(-14).map((data, idx) => {
                  const maxValue = Math.max(...analyticsData.map(d => Math.max(d.users, d.exams * 5, d.violations * 20)))
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center space-y-1">
                      <div className="w-full flex flex-col items-center justify-end space-y-1 h-56">
                        <div 
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                          style={{ height: `${(data.users / maxValue) * 100}%` }}
                          title={`Users: ${data.users}`}
                        ></div>
                        <div 
                          className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                          style={{ height: `${((data.exams * 5) / maxValue) * 100}%` }}
                          title={`Exams: ${data.exams}`}
                        ></div>
                        <div 
                          className="w-full bg-red-500 rounded-t transition-all hover:bg-red-600"
                          style={{ height: `${((data.violations * 20) / maxValue) * 100}%` }}
                          title={`Violations: ${data.violations}`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-500 rotate-45 mt-2">{data.date}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.reduce((sum, d) => sum + d.users, 0)}
                </p>
                <p className="text-xs text-gray-600">Total User Sessions</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.reduce((sum, d) => sum + d.exams, 0)}
                </p>
                <p className="text-xs text-gray-600">Exams Conducted</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {analyticsData.reduce((sum, d) => sum + d.violations, 0)}
                </p>
                <p className="text-xs text-gray-600">Violations Detected</p>
              </div>
            </div>
          </motion.div>

          {/* Live Users Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-green-600" />
                Live Users
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  {liveUsers.filter(u => u.status === 'active').length} online
                </span>
              </h3>
              <button 
                onClick={() => setShowUserModal(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveUsers.slice(0, 5).map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      user.status === 'active' ? 'bg-green-500' :
                      user.status === 'inactive' ? 'bg-gray-400' :
                      'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(user.status)}`}>
                          {user.role}
                        </span>
                        <span className="text-xs text-gray-500">{user.lastActive}</span>
                      </div>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </motion.div>
              ))}
            </div>

            <button 
              onClick={() => setShowUserModal(true)}
              className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center justify-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Manage All Users</span>
            </button>
          </motion.div>
        </div>

        {/* Device & Browser Analytics */}
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          {/* Device Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Monitor className="w-5 h-5 mr-2 text-purple-600" />
              Device Analytics
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Monitor className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Desktop</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">65%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Mobile</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">28%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Monitor className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Tablet</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '7%' }}></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">7%</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Browser Distribution</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-gray-700">Chrome</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">52%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-700">Firefox</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">23%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Safari</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">18%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Others</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">7%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Geographic Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-red-600" />
              Geographic Distribution
            </h3>

            <div className="space-y-4">
              {[
                { country: 'India', sessions: 2847, percent: 45, color: 'bg-blue-600' },
                { country: 'United States', sessions: 1623, percent: 26, color: 'bg-green-600' },
                { country: 'United Kingdom', sessions: 892, percent: 14, color: 'bg-purple-600' },
                { country: 'Canada', sessions: 534, percent: 9, color: 'bg-orange-600' },
                { country: 'Others', sessions: 378, percent: 6, color: 'bg-gray-600' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{item.country}</span>
                    <span className="text-sm text-gray-600">{item.sessions.toLocaleString()} sessions</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${item.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">98</p>
                  <p className="text-xs text-gray-600">Countries</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">6.2K</p>
                  <p className="text-xs text-gray-600">Total Sessions</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Communication & Notifications Center */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-8 bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Send className="w-5 h-5 mr-2 text-indigo-600" />
            Quick Communication
          </h3>

          <div className="grid lg:grid-cols-3 gap-4">
            <button 
              onClick={() => handleSendCommunication('email')}
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Mail className="w-6 h-6 text-blue-600 group-hover:scale-110 transition" />
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </div>
              <p className="font-semibold text-gray-900">Send Email Broadcast</p>
              <p className="text-xs text-gray-600 mt-1">Send announcements to all users</p>
            </button>

            <button 
              onClick={() => handleSendCommunication('push')}
              className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-6 h-6 text-green-600 group-hover:scale-110 transition" />
                <ChevronRight className="w-4 h-4 text-green-600" />
              </div>
              <p className="font-semibold text-gray-900">Push Notification</p>
              <p className="text-xs text-gray-600 mt-1">Send instant notifications</p>
            </button>

            <button 
              onClick={() => handleSendCommunication('alert')}
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Bell className="w-6 h-6 text-purple-600 group-hover:scale-110 transition" />
                <ChevronRight className="w-4 h-4 text-purple-600" />
              </div>
              <p className="font-semibold text-gray-900">System Alerts</p>
              <p className="text-xs text-gray-600 mt-1">Configure alert settings</p>
            </button>
          </div>
        </motion.div>
        </main>
      )}

      {/* User Management Modal */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="mt-4 flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          user.status === 'active' ? 'bg-green-500' :
                          user.status === 'inactive' ? 'bg-gray-400' :
                          'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(user.status)}`}>
                              {user.role}
                            </span>
                            <span className="text-xs text-gray-500">Last active: {user.lastActive}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {user.role === 'student' && (
                          <span className="text-sm text-gray-600">
                            {user.examsCompleted} exams
                          </span>
                        )}
                        {user.role === 'teacher' && (
                          <span className="text-sm text-gray-600">
                            {user.examsCreated} created
                          </span>
                        )}
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition" 
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition" 
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                        {user.status === 'active' ? (
                          <button 
                            onClick={() => handleSuspendUser(user)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition" 
                            title="Suspend"
                          >
                            <PauseCircle className="w-4 h-4 text-orange-600" />
                          </button>
                        ) : user.status === 'suspended' ? (
                          <button 
                            onClick={() => handleActivateUser(user)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition" 
                            title="Activate"
                          >
                            <PlayCircle className="w-4 h-4 text-green-600" />
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredUsers.length} of {liveUsers.length} users
                  </p>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={handleExportCSV}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                    <button 
                      onClick={() => setShowUserModal(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  )
}
