import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { examAPI } from '../../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusCircle, Users, BarChart3, Monitor, LogOut, BookOpen,
  TrendingUp, AlertTriangle, Clock, Award, Zap, Eye, Bell,
  Settings, Calendar, Brain, Sparkles, GraduationCap, Shield,
  ChevronRight, Play, Pause, MoreVertical, Activity, Target,
  Home, FileText, CheckCircle, Radio, ArrowUpRight, ArrowRight,
  UserCheck, Edit, Trash2, Search, Filter, Wifi, WifiOff, X
} from 'lucide-react'
import { WebSocketClient } from '../../lib/websocket'

interface ExamData {
  _id: string
  title: string
  subject: string
  total_questions: number
  duration: number
  created_by: string
  scheduled_date?: string
  status?: string
  active_students?: number
  enrolled_students?: number
  completion_rate?: number
  avg_score?: number
  difficulty?: string
  violations?: number
}

interface LiveAlert {
  id: string
  student_id: string
  type: string
  severity: string
  message: string
  exam_id: string
  timestamp: string
}

// Mini bar chart
function MiniBarChart({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            background: color,
            opacity: 0.4 + (i / data.length) * 0.6,
          }}
        />
      ))}
    </div>
  )
}

// Status badge
function StatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() || 'draft'
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    active:    { label: 'Active',    cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500 animate-pulse' },
    completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
    scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
    draft:     { label: 'Draft',     cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
    paused:    { label: 'Paused',    cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  }
  const config = map[s] || map.draft
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH:     'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    LOW:      'bg-blue-100 text-blue-700 border-blue-200',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${map[severity] || map.LOW}`}>
      {severity}
    </span>
  )
}

export default function TeacherDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [myExams, setMyExams] = useState<ExamData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Live WebSocket data
  const [liveStudentCount, setLiveStudentCount] = useState(0)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const wsRef = useRef<WebSocketClient | null>(null)
  const alertSoundRef = useRef<AudioContext | null>(null)

  useEffect(() => { loadExams() }, [])

  // Connect WebSocket for live dashboard data
  useEffect(() => {
    if (!user) return
    const ws = new WebSocketClient()
    wsRef.current = ws
    const userId = (user as any)._id || user.email || 'teacher'
    ws.connect({ userId, role: 'teacher', examId: 'dashboard' })
    setWsStatus('connecting')

    ws.onStatusChange((s) => {
      setWsStatus(s === 'connected' ? 'connected' : s === 'connecting' ? 'connecting' : 'disconnected')
    })

    ws.on('student_joined', (data: any) => {
      setLiveStudentCount(prev => prev + 1)
      addActivity({ type: 'exam_started', student: data.student_id, exam: data.exam_id, time: 'just now', icon: Play, color: 'text-blue-500', score: null })
    })

    ws.on('student_disconnected', (data: any) => {
      setLiveStudentCount(prev => Math.max(0, prev - 1))
    })

    ws.on('student_heartbeat', () => {
      setLiveStudentCount(prev => Math.max(prev, 1))
    })

    ws.on('ai_violation', (data: any) => {
      const v = data.violation || {}
      const alert: LiveAlert = {
        id: `${Date.now()}-${Math.random()}`,
        student_id: data.student_id,
        type: v.type || 'UNKNOWN',
        severity: v.severity || 'LOW',
        message: v.message || 'Violation detected',
        exam_id: data.exam_id,
        timestamp: new Date().toLocaleTimeString(),
      }
      setLiveAlerts(prev => [alert, ...prev].slice(0, 20))
      addActivity({ type: 'violation', student: data.student_id, exam: data.exam_id, time: 'just now', icon: AlertTriangle, color: v.severity === 'CRITICAL' ? 'text-red-500' : 'text-amber-500', score: null })
      if (v.severity === 'CRITICAL' || v.severity === 'HIGH') playAlertSound()
    })

    ws.on('connection_established', () => {
      ws.send({ type: 'request_streams', exam_id: 'dashboard' })
    })

    return () => { ws.disconnect(); wsRef.current = null }
  }, [user])

  const playAlertSound = () => {
    try {
      const ctx = alertSoundRef.current || (alertSoundRef.current = new AudioContext())
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  const addActivity = (act: any) => {
    setRecentActivity(prev => [act, ...prev].slice(0, 8))
  }

  const loadExams = async () => {
    try {
      const examsData = await examAPI.getExams()
      const mine = examsData.filter((e: any) =>
        e.created_by === user?.email ||
        e.created_by === (user as any)?._id ||
        e.email === user?.email
      )
      setMyExams(mine)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const activeExams   = myExams.filter(e => e.status === 'active').length
  const totalStudents = myExams.reduce((s, e) => s + (e.enrolled_students || 0), 0)
  const avgCompletion = myExams.length > 0
    ? myExams.reduce((s, e) => s + (e.completion_rate || 0), 0) / myExams.length : 0
  const totalViolations = myExams.reduce((s, e) => s + (e.violations || 0), 0)

  const filteredExams = myExams.filter(e => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q || e.title.toLowerCase().includes(q) || (e.subject || '').toLowerCase().includes(q)
    const matchesFilter = filterStatus === 'all' || e.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const statCards = [
    {
      label: 'My Exams', value: myExams.length, icon: BookOpen,
      color: '#3b82f6', bg: 'from-blue-50 to-blue-100/40', border: 'border-blue-200/60',
      iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
      sub: `${activeExams} currently active`,
      chart: [3, 5, 4, 7, 6, myExams.length || 8],
    },
    {
      label: 'Live Students', value: liveStudentCount, icon: Radio,
      color: '#10b981', bg: 'from-green-50 to-emerald-100/40', border: 'border-green-200/60',
      iconBg: 'bg-green-100', iconColor: 'text-green-600',
      sub: wsStatus === 'connected' ? 'Real-time count' : 'Connecting...',
      chart: [0, 0, 0, 0, 0, liveStudentCount],
    },
    {
      label: 'Total Students', value: totalStudents || '—', icon: Users,
      color: '#8b5cf6', bg: 'from-purple-50 to-violet-100/40', border: 'border-purple-200/60',
      iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
      sub: `Across ${myExams.length} exams`,
      chart: [80, 95, 110, 115, 120, totalStudents || 128],
    },
    {
      label: 'Alerts Today', value: liveAlerts.length, icon: AlertTriangle,
      color: '#f59e0b', bg: 'from-amber-50 to-yellow-100/40', border: 'border-amber-200/60',
      iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
      sub: totalViolations > 0 ? `${totalViolations} historical violations` : 'No history yet',
      chart: [0, 1, 0, 2, 1, liveAlerts.length],
    },
  ]

  const tools = [
    { title: 'Create Exam', desc: 'Build a new exam with AI', icon: PlusCircle, link: '/teacher/create-exam', from: 'from-blue-500', to: 'to-cyan-500', hot: true },
    { title: 'Live Monitor', desc: 'Watch students in real-time', icon: Monitor, link: '/teacher/live-monitoring', from: 'from-green-500', to: 'to-emerald-500', hot: liveStudentCount > 0 },
    { title: 'AI Generator', desc: 'Auto-generate questions', icon: Brain, link: '/teacher/ai-generator', from: 'from-purple-500', to: 'to-violet-500', hot: false },
    { title: 'Analytics', desc: 'Deep performance insights', icon: BarChart3, link: '/teacher/analytics', from: 'from-orange-500', to: 'to-red-400', hot: false },
    { title: 'Question Bank', desc: 'Manage question library', icon: FileText, link: '/teacher/question-bank', from: 'from-teal-500', to: 'to-cyan-500', hot: false },
    { title: 'Plagiarism', desc: 'AI similarity detection', icon: Shield, link: '/teacher/plagiarism', from: 'from-pink-500', to: 'to-rose-500', hot: false },
    { title: 'Reports', desc: 'Export detailed reports', icon: Award, link: '/teacher/reports', from: 'from-indigo-500', to: 'to-blue-500', hot: false },
    { title: 'Templates', desc: 'Reusable exam templates', icon: Sparkles, link: '/teacher/templates', from: 'from-amber-500', to: 'to-yellow-400', hot: false },
  ]

  const navItems = [
    { icon: Home, label: 'Dashboard', to: '/teacher/dashboard' },
    { icon: BookOpen, label: 'My Exams', to: '/teacher/dashboard' },
    { icon: Monitor, label: 'Live Monitor', to: '/teacher/live-monitoring', badge: liveStudentCount > 0 ? liveStudentCount : null },
    { icon: BarChart3, label: 'Analytics', to: '/teacher/analytics' },
    { icon: Brain, label: 'AI Generator', to: '/teacher/ai-generator' },
    { icon: FileText, label: 'Question Bank', to: '/teacher/question-bank' },
    { icon: Shield, label: 'Plagiarism', to: '/teacher/plagiarism' },
    { icon: Award, label: 'Reports', to: '/teacher/reports' },
    { icon: Bell, label: 'Notifications', to: '/notifications' },
    { icon: Settings, label: 'Settings', to: '/settings' },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 shadow-sm flex-col z-40">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-base">PCMT</h1>
            <p className="text-xs text-gray-400">Teacher Portal</p>
          </div>
        </div>

        {/* Teacher profile */}
        <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{user?.full_name || 'Teacher'}</p>
              <p className="text-xs text-gray-500">{(user as any)?.department || 'Faculty'}</p>
            </div>
          </div>
          {/* WS Status */}
          <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${wsStatus === 'connected' ? 'text-green-600' : wsStatus === 'connecting' ? 'text-amber-500' : 'text-gray-400'}`}>
            {wsStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsStatus === 'connected' ? 'Live Feed Active' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </div>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/teacher/dashboard' && location.pathname.startsWith(item.to))
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {(item as any).badge && (
                  <span className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────── */}
      <div className="lg:ml-64">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="hidden lg:block">
              <h1 className="font-bold text-gray-900 flex items-center gap-2">
                Teacher Dashboard
                {liveStudentCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {liveStudentCount} students live
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-gray-900">PCMT</span>
            </div>
            <div className="flex items-center gap-3">
              {liveStudentCount > 0 && (
                <Link
                  to="/teacher/live-monitoring"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-all shadow-sm shadow-green-200"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  Live Monitor
                </Link>
              )}
              <Link
                to="/teacher/create-exam"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Exam</span>
              </Link>
              <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <Bell className="w-5 h-5" />
                {liveAlerts.some(a => a.severity === 'CRITICAL') && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
              <button onClick={handleLogout} className="hidden lg:flex p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Live Violation Alert Banner */}
        <AnimatePresence>
          {liveAlerts.length > 0 && liveAlerts[0].severity === 'CRITICAL' && (
            <motion.div
              key={liveAlerts[0].id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-600 text-white px-6 py-3 flex items-center gap-3"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
              <p className="text-sm font-semibold flex-1">
                🚨 CRITICAL: Student <strong>{liveAlerts[0].student_id}</strong> — {liveAlerts[0].message}
              </p>
              <Link to="/teacher/live-monitoring" className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all shrink-0">
                View Now →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

          {/* ── STAT CARDS ──────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`bg-gradient-to-br ${card.bg} border ${card.border} rounded-2xl p-4 relative overflow-hidden`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-400 bg-white/70 px-2 py-0.5 rounded-full">
                    <ArrowUpRight className="w-3 h-3 inline" />
                  </span>
                </div>
                <p className="text-2xl font-black text-gray-900 mb-0.5">
                  {loading ? '—' : card.value}
                </p>
                <p className="text-xs font-semibold text-gray-500 mb-2">{card.label}</p>
                <p className="text-xs text-gray-400">{card.sub}</p>
                <div className="absolute bottom-2 right-2 opacity-50">
                  <MiniBarChart data={card.chart} color={card.color} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── TOOLS GRID ──────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Teaching Tools
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {tools.map((tool, i) => (
                <motion.div
                  key={tool.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                >
                  <Link
                    to={tool.link}
                    className="bg-white border border-gray-100 rounded-2xl p-3.5 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group text-center relative"
                  >
                    {tool.hot && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        !
                      </span>
                    )}
                    <div className={`w-10 h-10 bg-gradient-to-br ${tool.from} ${tool.to} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                      <tool.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">{tool.title}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── MAIN GRID ───────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* My Exams (2/3) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    My Exams
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative hidden sm:block">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 w-32"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="draft">Draft</option>
                    </select>
                    <Link
                      to="/teacher/create-exam"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      New
                    </Link>
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {loading ? (
                    <div className="p-6 space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                    </div>
                  ) : filteredExams.length === 0 ? (
                    <div className="py-14 text-center">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                      <p className="text-gray-400 font-medium">
                        {myExams.length === 0 ? 'No exams created yet' : 'No matching exams'}
                      </p>
                      <Link
                        to="/teacher/create-exam"
                        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create Your First Exam
                      </Link>
                    </div>
                  ) : (
                    filteredExams.slice(0, 6).map((exam) => (
                      <div key={exam._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${
                          exam.status === 'active' ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-200' :
                          exam.status === 'completed' ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-blue-200'
                        }`}>
                          {exam.status === 'active' ? <Radio className="w-4 h-4 animate-pulse" /> : exam.title.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{exam.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">{exam.total_questions} Q</span>
                            <span className="text-gray-200">•</span>
                            <span className="text-xs text-gray-400">{exam.duration}min</span>
                            {exam.difficulty && (
                              <>
                                <span className="text-gray-200">•</span>
                                <span className={`text-xs font-medium ${
                                  exam.difficulty === 'hard' ? 'text-red-500' :
                                  exam.difficulty === 'medium' ? 'text-amber-500' : 'text-green-500'
                                }`}>{exam.difficulty}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={exam.status} />
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Link
                              to={`/teacher/live-monitoring?exam=${exam._id}`}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              to={`/teacher/analytics?exam=${exam._id}`}
                              className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-all"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {filteredExams.length > 6 && (
                  <div className="px-6 py-3 border-t border-gray-50 text-center">
                    <button className="text-xs text-blue-600 font-semibold hover:text-blue-700">
                      View all {filteredExams.length} exams <ArrowRight className="w-3 h-3 inline" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-4">

              {/* Live Violations Feed */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-500" />
                    Live Alerts
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${wsStatus === 'connected' ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      {wsStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>
                </div>

                {liveAlerts.length === 0 && recentActivity.length === 0 ? (
                  <div className="py-10 text-center">
                    <Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-xs text-gray-400 font-medium">No alerts yet</p>
                    <p className="text-xs text-gray-300 mt-1">Violations will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {liveAlerts.slice(0, 6).map(alert => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 px-5 py-3"
                      >
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'CRITICAL' ? 'text-red-500' : alert.severity === 'HIGH' ? 'text-orange-500' : 'text-amber-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-gray-800 truncate">{alert.type.replace(/_/g, ' ')}</p>
                            <SeverityBadge severity={alert.severity} />
                          </div>
                          <p className="text-xs text-gray-400 truncate">{alert.student_id}</p>
                        </div>
                        <p className="text-xs text-gray-300 shrink-0">{alert.timestamp}</p>
                      </motion.div>
                    ))}
                    {recentActivity.slice(0, 4).map((act, i) => (
                      <div key={i} className="flex items-start gap-3 px-5 py-3">
                        <act.icon className={`w-4 h-4 mt-0.5 shrink-0 ${act.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{act.student || 'Student'}</p>
                          <p className="text-xs text-gray-400 truncate">{act.exam}</p>
                        </div>
                        <p className="text-xs text-gray-300 shrink-0">{act.time}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-5 py-3 border-t border-gray-50">
                  <Link
                    to="/teacher/live-monitoring"
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Open Live Monitor
                  </Link>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
                <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Summary
                </h4>
                <div className="space-y-3">
                  {[
                    { label: 'Exams Conducted', value: myExams.filter(e => e.status === 'completed').length || '—' },
                    { label: 'Students Enrolled', value: totalStudents || '—' },
                    { label: 'Avg Completion', value: avgCompletion > 0 ? `${avgCompletion.toFixed(0)}%` : '—' },
                    { label: 'Violations Logged', value: liveAlerts.length },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-blue-200 text-xs">{item.label}</span>
                      <span className="font-bold text-white text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-blue-500/40">
                  <Link
                    to="/teacher/analytics"
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Full Analytics Report
                  </Link>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-40 flex justify-around py-2 px-4">
        {[
          { icon: Home, label: 'Home', to: '/teacher/dashboard' },
          { icon: BookOpen, label: 'Exams', to: '/teacher/dashboard' },
          { icon: Monitor, label: 'Monitor', to: '/teacher/live-monitoring' },
          { icon: BarChart3, label: 'Analytics', to: '/teacher/analytics' },
          { icon: Settings, label: 'Settings', to: '/settings' },
        ].map(item => (
          <Link key={item.label} to={item.to} className="flex flex-col items-center gap-0.5 py-1 px-2 text-gray-400 hover:text-blue-600 transition-colors">
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>

    </div>
  )
}
