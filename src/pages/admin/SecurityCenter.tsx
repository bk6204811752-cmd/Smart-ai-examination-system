import { useState } from 'react'
import { 
  Shield, AlertTriangle, Activity, Server, 
  Lock, Download, Search,
  Clock, Users, FileText, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface AccessLog {
  id: string
  userId: string
  userName: string
  action: string
  ipAddress: string
  location: string
  timestamp: Date
  status: 'success' | 'failed' | 'blocked'
  device: string
}

interface SecurityEvent {
  id: string
  type: 'failed_login' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  user: string
  timestamp: Date
  resolved: boolean
}

interface SystemMetric {
  name: string
  value: number
  status: 'healthy' | 'warning' | 'critical'
  change: number
}

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'events' | 'diagnostics' | 'blocked'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState('7d')

  // Mock data
  const accessLogs: AccessLog[] = [
    {
      id: '1',
      userId: 'S001',
      userName: 'Rahul Sharma',
      action: 'Login',
      ipAddress: '192.168.1.101',
      location: 'Mumbai, India',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'success',
      device: 'Chrome 120, Windows 11'
    },
    {
      id: '2',
      userId: 'T001',
      userName: 'Dr. Priya Gupta',
      action: 'Grade Submission',
      ipAddress: '192.168.1.105',
      location: 'Delhi, India',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: 'success',
      device: 'Firefox 121, macOS'
    },
    {
      id: '3',
      userId: 'Unknown',
      userName: 'Unknown User',
      action: 'Failed Login',
      ipAddress: '45.76.123.89',
      location: 'Unknown',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      status: 'failed',
      device: 'Unknown'
    },
    {
      id: '4',
      userId: 'S003',
      userName: 'Anita Desai',
      action: 'Exam Submission',
      ipAddress: '192.168.1.112',
      location: 'Bangalore, India',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'success',
      device: 'Chrome 120, Android'
    },
    {
      id: '5',
      userId: 'Unknown',
      userName: 'Suspicious Activity',
      action: 'SQL Injection Attempt',
      ipAddress: '103.45.67.89',
      location: 'Unknown',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      status: 'blocked',
      device: 'cURL/7.88'
    }
  ]

  const securityEvents: SecurityEvent[] = [
    {
      id: '1',
      type: 'failed_login',
      severity: 'medium',
      description: '5 consecutive failed login attempts from IP 45.76.123.89',
      user: 'admin',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      resolved: false
    },
    {
      id: '2',
      type: 'suspicious_activity',
      severity: 'high',
      description: 'SQL injection attempt detected in exam submission form',
      user: 'Unknown',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      resolved: true
    },
    {
      id: '3',
      type: 'unauthorized_access',
      severity: 'critical',
      description: 'Attempt to access admin panel without proper credentials',
      user: 'S005',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      resolved: true
    }
  ]

  const systemMetrics: SystemMetric[] = [
    { name: 'CPU Usage', value: 45, status: 'healthy', change: -5 },
    { name: 'Memory Usage', value: 68, status: 'warning', change: 12 },
    { name: 'Database Connections', value: 23, status: 'healthy', change: 3 },
    { name: 'API Response Time', value: 156, status: 'healthy', change: -23 },
    { name: 'Active Sessions', value: 342, status: 'healthy', change: 45 },
    { name: 'Error Rate', value: 0.8, status: 'healthy', change: -0.3 }
  ]

  const activityData = [
    { time: '00:00', logins: 12, failures: 2 },
    { time: '04:00', logins: 5, failures: 0 },
    { time: '08:00', logins: 89, failures: 5 },
    { time: '12:00', logins: 234, failures: 12 },
    { time: '16:00', logins: 178, failures: 8 },
    { time: '20:00', logins: 145, failures: 6 },
    { time: '23:00', logins: 67, failures: 3 }
  ]

  const threatDistribution = [
    { name: 'Failed Logins', value: 45, color: '#ef4444' },
    { name: 'SQL Injection', value: 12, color: '#f97316' },
    { name: 'XSS Attempts', value: 8, color: '#eab308' },
    { name: 'DDoS', value: 3, color: '#3b82f6' }
  ]

  const performanceData = [
    { time: '1h ago', cpu: 42, memory: 65, db: 20 },
    { time: '45m ago', cpu: 48, memory: 68, db: 23 },
    { time: '30m ago', cpu: 45, memory: 70, db: 25 },
    { time: '15m ago', cpu: 43, memory: 67, db: 22 },
    { time: 'Now', cpu: 45, memory: 68, db: 23 }
  ]

  const blockedIPs = [
    { ip: '45.76.123.89', reason: 'Brute force attack', blocked: new Date(Date.now() - 2 * 60 * 60 * 1000), attempts: 47 },
    { ip: '103.45.67.89', reason: 'SQL injection attempts', blocked: new Date(Date.now() - 30 * 60 * 1000), attempts: 12 },
    { ip: '198.51.100.45', reason: 'XSS attempt', blocked: new Date(Date.now() - 24 * 60 * 60 * 1000), attempts: 8 }
  ]

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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
              <button className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition font-semibold">
                <Download className="w-4 h-4 inline mr-2" />
                Export Report
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
              { id: 'blocked', label: 'Blocked IPs', icon: Lock }
            ].map((tab) => {
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
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Access</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">2,847</h3>
                    <p className="text-sm text-green-600 mt-2">↑ 12% from yesterday</p>
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
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">47</h3>
                    <p className="text-sm text-red-600 mt-2">↑ 8 from yesterday</p>
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
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">342</h3>
                    <p className="text-sm text-green-600 mt-2">↑ 45 from yesterday</p>
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
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">3</h3>
                    <p className="text-sm text-orange-600 mt-2">↑ 1 from yesterday</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Activity Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4">Login Activity (24h)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="logins" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="failures" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Threat Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4">Threat Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={threatDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {threatDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Security Events */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">Recent Security Events</h3>
              <div className="space-y-3">
                {securityEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className={`flex items-center justify-between p-4 border rounded-lg ${getSeverityColor(event.severity)}`}>
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="w-5 h-5" />
                      <div>
                        <h4 className="font-semibold">{event.description}</h4>
                        <p className="text-sm opacity-80">User: {event.user} • {event.timestamp.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-semibold uppercase">{event.severity}</span>
                      {event.resolved ? (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Resolved</span>
                      ) : (
                        <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          Investigate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Access Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by user, IP, or action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select className="px-4 py-2 border border-gray-200 rounded-lg">
                  <option>All Status</option>
                  <option>Success</option>
                  <option>Failed</option>
                  <option>Blocked</option>
                </select>
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg">
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Device</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          {getStatusIcon(log.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{log.userName}</div>
                            <div className="text-sm text-gray-500">{log.userId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">{log.action}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{log.ipAddress}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.location}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.device}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.timestamp.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <button className="text-blue-600 hover:underline text-sm">Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Security Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {securityEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      event.severity === 'critical' ? 'bg-red-100' :
                      event.severity === 'high' ? 'bg-orange-100' :
                      event.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <AlertTriangle className={`w-6 h-6 ${
                        event.severity === 'critical' ? 'text-red-600' :
                        event.severity === 'high' ? 'text-orange-600' :
                        event.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold">{event.description}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(event.severity)}`}>
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
                          {event.timestamp.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <Shield className="w-4 h-4 mr-1" />
                          {event.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {event.resolved ? (
                      <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold text-sm">
                        ✓ Resolved
                      </span>
                    ) : (
                      <>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          Investigate
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            {/* System Metrics */}
            <div className="grid md:grid-cols-3 gap-6">
              {systemMetrics.map((metric) => (
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
                      {metric.value}{metric.name.includes('Usage') ? '%' : metric.name.includes('Time') ? 'ms' : ''}
                    </h3>
                    <span className={`text-sm mb-1 ${metric.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}{metric.name.includes('Usage') ? '%' : ''}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          metric.status === 'healthy' ? 'bg-green-600' :
                          metric.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${metric.name.includes('Usage') ? metric.value : Math.min(metric.value / 2, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">System Performance (Last Hour)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#ef4444" strokeWidth={2} name="Memory %" />
                  <Line type="monotone" dataKey="db" stroke="#10b981" strokeWidth={2} name="DB Connections" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Service Status */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">Service Status</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { name: 'Database', status: 'operational', latency: '12ms' },
                  { name: 'Authentication Service', status: 'operational', latency: '45ms' },
                  { name: 'File Storage', status: 'operational', latency: '89ms' },
                  { name: 'Email Service', status: 'degraded', latency: '234ms' },
                  { name: 'AI Proctoring', status: 'operational', latency: '156ms' },
                  { name: 'Notification Service', status: 'operational', latency: '67ms' }
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
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
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      service.status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
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
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  + Block New IP
                </button>
              </div>

              <div className="space-y-3">
                {blockedIPs.map((ip) => (
                  <div key={ip.ip} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <Lock className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{ip.ip}</h4>
                        <p className="text-sm text-gray-600">{ip.reason}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Blocked: {ip.blocked.toLocaleString()}</span>
                          <span>•</span>
                          <span>{ip.attempts} attempts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        View Logs
                      </button>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                        Unblock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-Block Rules */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">Auto-Block Rules</h3>
              <div className="space-y-3">
                {[
                  { rule: 'Failed login attempts', threshold: '5 attempts in 10 minutes', enabled: true },
                  { rule: 'SQL injection detection', threshold: 'Any attempt', enabled: true },
                  { rule: 'Suspicious user agent', threshold: 'Known bot patterns', enabled: true },
                  { rule: 'Rate limiting', threshold: '100 requests per minute', enabled: false }
                ].map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold">{rule.rule}</h4>
                      <p className="text-sm text-gray-600">Threshold: {rule.threshold}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={rule.enabled} className="sr-only peer" readOnly />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
