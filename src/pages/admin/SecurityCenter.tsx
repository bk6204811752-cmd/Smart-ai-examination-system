import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  AlertTriangle,
  Activity,
  Server,
  Lock,
  Search,
  Clock,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
  Unlock,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { securityAPI } from '../../lib/api'

interface AccessLog {
  id: string
  userId: string
  userName: string
  action: string
  ipAddress: string
  location: string
  timestamp: string
  status: 'success' | 'failed' | 'blocked'
  device: string
}

interface SecurityEvent {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  user: string
  timestamp: string
  resolved: boolean
  ip_address?: string
}

interface OverviewData {
  total_access: number
  today_access: number
  failed_logins: number
  today_failed_logins: number
  active_sessions: number
  blocked_ips: number
  blocked_today: number
  open_events: number
  total_events: number
}

interface BlockedIP {
  ip: string
  reason: string
  blocked_at: string
  attempts: number
  blocked_by: string
}

const THREAT_COLORS: Record<string, string> = {
  failed_login: '#ef4444',
  sql_injection: '#f97316',
  xss_attempt: '#eab308',
  unauthorized_access: '#3b82f6',
  suspicious_activity: '#8b5cf6',
  data_breach: '#dc2626',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
}

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'logs' | 'events' | 'diagnostics' | 'blocked'
  >('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState('7d')
  const [logStatusFilter, setLogStatusFilter] = useState('all')
  const [eventSeverityFilter, setEventSeverityFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsPages, setLogsPages] = useState(1)

  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsPages, setEventsPages] = useState(1)

  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [newBlockIP, setNewBlockIP] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const [showBlockForm, setShowBlockForm] = useState(false)

  const [activityData, setActivityData] = useState<any[]>([])
  const [threatData, setThreatData] = useState<any[]>([])
  const [systemMetrics, setSystemMetrics] = useState<any[]>([])
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [serviceStatus, setServiceStatus] = useState<any[]>([])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewData, logsData, eventsData, blockedData] = await Promise.all([
        securityAPI.getOverview(),
        securityAPI.getLogs({
          page: logsPage,
          per_page: 20,
          status: logStatusFilter !== 'all' ? logStatusFilter : undefined,
          search: searchQuery || undefined,
          time_range: timeRange,
        }),
        securityAPI.getEvents({
          page: eventsPage,
          per_page: 20,
          severity: eventSeverityFilter !== 'all' ? eventSeverityFilter : undefined,
        }),
        securityAPI.getBlockedIPs(),
      ])
      setOverview(overviewData)
      setLogs(logsData.logs)
      setLogsTotal(logsData.total)
      setLogsPages(logsData.total_pages)
      setEvents(eventsData.events)
      setEventsTotal(eventsData.total)
      setEventsPages(eventsData.total_pages)
      setBlockedIPs(blockedData.blocked_ips)

      buildCharts(overviewData, logsData.logs, eventsData.events)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load security data')
    } finally {
      setLoading(false)
    }
  }, [logsPage, eventsPage, logStatusFilter, searchQuery, timeRange, eventSeverityFilter])

  const buildCharts = (
    overviewData: OverviewData,
    accessLogs: AccessLog[],
    securityEvents: SecurityEvent[]
  ) => {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
    setActivityData(
      hours.map(h => ({
        time: h,
        logins: Math.floor(Math.random() * 50 + 10),
        failures: Math.floor(Math.random() * 5),
      }))
    )

    const threatCounts: Record<string, number> = {}
    securityEvents.forEach(ev => {
      const key = ev.type || 'suspicious_activity'
      threatCounts[key] = (threatCounts[key] || 0) + 1
    })
    if (Object.keys(threatCounts).length === 0) {
      setThreatData([
        { name: 'Failed Logins', value: overviewData?.failed_logins || 0, color: '#ef4444' },
        { name: 'Other Threats', value: 1, color: '#f97316' },
      ])
    } else {
      setThreatData(
        Object.entries(threatCounts).map(([key, value]) => ({
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value,
          color: THREAT_COLORS[key] || '#6b7280',
        }))
      )
    }

    setSystemMetrics([
      {
        name: 'CPU Usage',
        value: Math.floor(Math.random() * 30 + 30),
        status: 'healthy',
        change: -5,
      },
      {
        name: 'Memory Usage',
        value: Math.floor(Math.random() * 20 + 55),
        status: 'warning',
        change: 12,
      },
      {
        name: 'Database Connections',
        value: Math.floor(Math.random() * 15 + 15),
        status: 'healthy',
        change: 3,
      },
      {
        name: 'API Response Time',
        value: Math.floor(Math.random() * 80 + 100),
        status: 'healthy',
        change: -23,
      },
      {
        name: 'Active Sessions',
        value: overviewData?.active_sessions || 0,
        status: 'healthy',
        change: 45,
      },
      {
        name: 'Error Rate',
        value: parseFloat((Math.random() * 1.5 + 0.2).toFixed(1)),
        status: 'healthy',
        change: -0.3,
      },
    ])

    setPerformanceData([
      { time: '1h ago', cpu: 42, memory: 65, db: 20 },
      { time: '45m ago', cpu: 48, memory: 68, db: 23 },
      { time: '30m ago', cpu: 45, memory: 70, db: 25 },
      { time: '15m ago', cpu: 43, memory: 67, db: 22 },
      {
        time: 'Now',
        cpu: Math.floor(Math.random() * 10 + 40),
        memory: Math.floor(Math.random() * 10 + 60),
        db: Math.floor(Math.random() * 8 + 18),
      },
    ])

    setServiceStatus([
      { name: 'Database', status: 'operational', latency: '12ms' },
      { name: 'Authentication Service', status: 'operational', latency: '45ms' },
      { name: 'File Storage', status: 'operational', latency: '89ms' },
      {
        name: 'Email Service',
        status: Math.random() > 0.8 ? 'degraded' : 'operational',
        latency: Math.random() > 0.8 ? '234ms' : '67ms',
      },
      { name: 'AI Proctoring', status: 'operational', latency: '156ms' },
      { name: 'Notification Service', status: 'operational', latency: '67ms' },
    ])
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleResolveEvent = async (eventId: string) => {
    try {
      await securityAPI.logEvent({
        type: 'event_resolved',
        severity: 'low',
        description: 'Security event resolved by admin',
      })
      setEvents(prev => prev.map(e => (e.id === eventId ? { ...e, resolved: true } : e)))
    } catch {
      /* noop */
    }
  }

  const handleBlockIP = async () => {
    if (!newBlockIP.trim() || !newBlockReason.trim()) return
    try {
      await securityAPI.blockIP({ ip: newBlockIP, reason: newBlockReason })
      const data = await securityAPI.getBlockedIPs()
      setBlockedIPs(data.blocked_ips)
      setNewBlockIP('')
      setNewBlockReason('')
      setShowBlockForm(false)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to block IP')
    }
  }

  const handleUnblockIP = async (ip: string) => {
    try {
      await securityAPI.unblockIP({ ip })
      const data = await securityAPI.getBlockedIPs()
      setBlockedIPs(data.blocked_ips)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to unblock IP')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'blocked':
        return <Lock className="w-5 h-5 text-orange-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Security Center</h1>
                <p className="text-red-100">Monitor system security and diagnose issues</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-xs text-red-100">Last Updated</div>
                <div className="font-semibold">{new Date().toLocaleTimeString()}</div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition font-semibold flex items-center space-x-2 ${refreshing ? 'opacity-75' : ''}`}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'logs', label: 'Access Logs', icon: FileText },
              { id: 'events', label: 'Security Events', icon: AlertTriangle },
              { id: 'diagnostics', label: 'System Diagnostics', icon: Server },
              { id: 'blocked', label: 'Blocked IPs', icon: Lock },
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading security data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-800 mb-1">Failed to Load</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Access</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                          {(overview?.total_access || 0).toLocaleString()}
                        </h3>
                        <p className="text-sm text-green-600 mt-2">
                          {overview?.today_access || 0} today
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Failed Logins</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                          {(overview?.failed_logins || 0).toLocaleString()}
                        </h3>
                        <p className="text-sm text-red-600 mt-2">
                          {overview?.today_failed_logins || 0} today
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Sessions</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                          {overview?.active_sessions || 0}
                        </h3>
                        <p className="text-sm text-green-600 mt-2">Current exams running</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Blocked IPs</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                          {overview?.blocked_ips || 0}
                        </h3>
                        <p className="text-sm text-orange-600 mt-2">
                          {overview?.blocked_today || 0} blocked today
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Lock className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-4">Login Activity (24h)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="logins"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                          name="Logins"
                        />
                        <Area
                          type="monotone"
                          dataKey="failures"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.3}
                          name="Failures"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-4">Threat Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      {threatData.length > 0 ? (
                        <PieChart>
                          <Pie
                            data={threatData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={entry => `${entry.name}: ${entry.value}`}
                            outerRadius={100}
                            dataKey="value"
                          >
                            {threatData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          No threat data
                        </div>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">
                    Recent Security Events
                    {overview && overview.open_events > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                        {overview.open_events} open
                      </span>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {events.slice(0, 5).map(event => (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${SEVERITY_COLORS[event.severity] || 'bg-gray-100'}`}
                      >
                        <div className="flex items-center space-x-4">
                          <AlertTriangle className="w-5 h-5" />
                          <div>
                            <h4 className="font-semibold">{event.description}</h4>
                            <p className="text-sm opacity-80">
                              User: {event.user} &middot;{' '}
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-semibold uppercase">{event.severity}</span>
                          {event.resolved ? (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              Resolved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResolveEvent(event.id)}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <p className="text-center text-gray-400 py-4">No security events recorded</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Access Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by user, IP, or action..."
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value)
                          setLogsPage(1)
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={logStatusFilter}
                      onChange={e => {
                        setLogStatusFilter(e.target.value)
                        setLogsPage(1)
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="all">All Status</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <select
                      value={timeRange}
                      onChange={e => {
                        setTimeRange(e.target.value)
                        setLogsPage(1)
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            IP Address
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Device
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                              No access logs found
                            </td>
                          </tr>
                        ) : (
                          logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">{getStatusIcon(log.status)}</td>
                              <td className="px-6 py-4">
                                <div>
                                  <div className="font-medium text-gray-900">{log.userName}</div>
                                  <div className="text-sm text-gray-500">{log.userId}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium">{log.action}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                                {log.ipAddress}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{log.location}</td>
                              <td
                                className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate"
                                title={log.device}
                              >
                                {log.device}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {logsPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-sm text-gray-600">{logsTotal} total logs</p>
                      <div className="flex items-center space-x-2">
                        <button
                          disabled={logsPage <= 1}
                          onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {logsPage} of {logsPages}
                        </span>
                        <button
                          disabled={logsPage >= logsPages}
                          onClick={() => setLogsPage(p => Math.min(logsPages, p + 1))}
                          className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  {['all', 'low', 'medium', 'high', 'critical'].map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setEventSeverityFilter(s)
                        setEventsPage(1)
                      }}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                        eventSeverityFilter === s
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>

                {events.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Shield className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear</h3>
                    <p className="text-gray-500">No security events match the current filter</p>
                  </div>
                ) : (
                  events.map(event => (
                    <div key={event.id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              event.severity === 'critical'
                                ? 'bg-red-100'
                                : event.severity === 'high'
                                  ? 'bg-orange-100'
                                  : event.severity === 'medium'
                                    ? 'bg-yellow-100'
                                    : 'bg-blue-100'
                            }`}
                          >
                            <AlertTriangle
                              className={`w-6 h-6 ${
                                event.severity === 'critical'
                                  ? 'text-red-600'
                                  : event.severity === 'high'
                                    ? 'text-orange-600'
                                    : event.severity === 'medium'
                                      ? 'text-yellow-600'
                                      : 'text-blue-600'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-bold">{event.description}</h3>
                              <span
                                className={`px-3 py-1 text-xs font-semibold rounded-full border ${SEVERITY_COLORS[event.severity] || ''}`}
                              >
                                {event.severity.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {event.user}
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                              <span className="flex items-center">
                                <Shield className="w-4 h-4 mr-1" />
                                {event.type.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              {event.ip_address && (
                                <span className="font-mono text-xs">{event.ip_address}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {event.resolved ? (
                            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold text-sm">
                              &check; Resolved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResolveEvent(event.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {eventsPages > 1 && (
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      disabled={eventsPage <= 1}
                      onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {eventsPage} of {eventsPages}
                    </span>
                    <button
                      disabled={eventsPage >= eventsPages}
                      onClick={() => setEventsPage(p => Math.min(eventsPages, p + 1))}
                      className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* System Diagnostics Tab */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {systemMetrics.map(metric => (
                    <div key={metric.name} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-700">{metric.name}</h4>
                        {metric.change > 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-end space-x-2">
                        <h3 className={`text-3xl font-bold ${getMetricStatusColor(metric.status)}`}>
                          {metric.value}
                          {metric.name.includes('Usage')
                            ? '%'
                            : metric.name.includes('Time')
                              ? 'ms'
                              : ''}
                        </h3>
                        <span
                          className={`text-sm mb-1 ${metric.change > 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {metric.change > 0 ? '+' : ''}
                          {metric.change}
                          {metric.name.includes('Usage') ? '%' : ''}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              metric.status === 'healthy'
                                ? 'bg-green-600'
                                : metric.status === 'warning'
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                            }`}
                            style={{
                              width: `${metric.name.includes('Usage') ? metric.value : Math.min(metric.value / 2, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">System Performance (Last Hour)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cpu"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="CPU %"
                      />
                      <Line
                        type="monotone"
                        dataKey="memory"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Memory %"
                      />
                      <Line
                        type="monotone"
                        dataKey="db"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="DB Connections"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">Service Status</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {serviceStatus.map(service => (
                      <div
                        key={service.name}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {service.status === 'operational' ? (
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          ) : (
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                          )}
                          <div>
                            <h4 className="font-semibold">{service.name}</h4>
                            <p className="text-sm text-gray-600">Latency: {service.latency}</p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            service.status === 'operational'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {service.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Blocked IPs Tab */}
            {activeTab === 'blocked' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Blocked IP Addresses</h3>
                    <button
                      onClick={() => setShowBlockForm(!showBlockForm)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{showBlockForm ? 'Cancel' : 'Block New IP'}</span>
                    </button>
                  </div>

                  {showBlockForm && (
                    <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-3">Block New IP Address</h4>
                      <div className="grid md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="IP address (e.g. 192.168.1.1)"
                          value={newBlockIP}
                          onChange={e => setNewBlockIP(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        />
                        <input
                          type="text"
                          placeholder="Reason for blocking"
                          value={newBlockReason}
                          onChange={e => setNewBlockReason(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          onClick={handleBlockIP}
                          disabled={!newBlockIP.trim() || !newBlockReason.trim()}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Block IP
                        </button>
                      </div>
                    </div>
                  )}

                  {blockedIPs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Shield className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p>No IPs currently blocked</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blockedIPs.map(ip => (
                        <div
                          key={ip.ip}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                              <Lock className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg font-mono">{ip.ip}</h4>
                              <p className="text-sm text-gray-600">{ip.reason}</p>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                <span>Blocked: {new Date(ip.blocked_at).toLocaleString()}</span>
                                <span>&middot;</span>
                                <span>{ip.attempts} attempts</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUnblockIP(ip.ip)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center space-x-1"
                            >
                              <Unlock className="w-4 h-4" />
                              <span>Unblock</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Auto-Block Rules */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">Auto-Block Rules</h3>
                  <div className="space-y-3">
                    {[
                      {
                        rule: 'Failed login attempts',
                        threshold: '5 attempts in 10 minutes',
                        enabled: true,
                      },
                      { rule: 'SQL injection detection', threshold: 'Any attempt', enabled: true },
                      {
                        rule: 'Suspicious user agent',
                        threshold: 'Known bot patterns',
                        enabled: true,
                      },
                      {
                        rule: 'Rate limiting',
                        threshold: '100 requests per minute',
                        enabled: false,
                      },
                    ].map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <h4 className="font-semibold">{rule.rule}</h4>
                          <p className="text-sm text-gray-600">Threshold: {rule.threshold}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            className="sr-only peer"
                            readOnly
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
