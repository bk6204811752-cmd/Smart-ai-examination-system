import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { examAPI, resultsAPI } from '../../lib/api'
import { motion } from 'framer-motion'
import {
  BookOpen, Calendar, Award, TrendingUp, Clock, LogOut,
  Bot, Bell, Sparkles, GraduationCap, Target,
  Activity, CheckCircle, BarChart3, Zap,
  Trophy, Star, TrendingDown, ArrowRight, Play,
  BookMarked, Shield, ChevronUp, ChevronDown, Minus,
  User, Settings, Home
} from 'lucide-react'

interface ExamResult {
  _id?: string
  exam_id: string
  exam_title: string
  percentage: number
  score: number
  total: number
  total_points?: number
  passed?: boolean
  date: string
  violations?: number
}

interface UpcomingExam {
  _id: string
  title: string
  subject: string
  duration: number
  total_questions: number
  scheduled_date?: string
  difficulty?: string
  exam_type?: string
}

// Mini SVG Sparkline chart
function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 100)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 80, h = 32
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
    </svg>
  )
}

// Circular progress ring
function ProgressRing({ value, size = 56, stroke = 5, color = '#3b82f6' }: {
  value: number; size?: number; stroke?: number; color?: string
}) {
  const r = (size - stroke * 2) / 2
  const circumference = r * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="11" fontWeight="700">
        {Math.round(value)}%
      </text>
    </svg>
  )
}

export default function StudentDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [exams, setExams] = useState<UpcomingExam[]>([])
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'results'>('overview')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [examsData, resultsData] = await Promise.all([
        examAPI.getExams(user?.program),
        resultsAPI.getResults()
      ])
      setExams(examsData)
      setResults(resultsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  // Computed stats
  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length : 0
  const passRate = results.length > 0
    ? (results.filter(r => r.percentage >= 60).length / results.length) * 100 : 0
  const totalViolations = results.reduce((sum, r) => sum + (r.violations || 0), 0)
  const recentScores = results.slice(-6).map(r => r.percentage)
  const trend = recentScores.length >= 2
    ? recentScores[recentScores.length - 1] > recentScores[0] ? 'up'
      : recentScores[recentScores.length - 1] < recentScores[0] ? 'down' : 'flat'
    : 'flat'

  const statCards = [
    {
      label: 'Exams Taken', value: results.length, suffix: '',
      sparkData: results.slice(-6).map((_, i) => i + 1),
      color: '#3b82f6', bg: 'from-blue-50 to-blue-100/50', border: 'border-blue-200/60',
      icon: BookOpen, iconColor: 'text-blue-600', sub: `${exams.length} upcoming`,
      trend: 'up',
    },
    {
      label: 'Avg Score', value: avgScore.toFixed(1), suffix: '%',
      sparkData: recentScores,
      color: avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444',
      bg: avgScore >= 80 ? 'from-green-50 to-green-100/50' : 'from-amber-50 to-amber-100/50',
      border: avgScore >= 80 ? 'border-green-200/60' : 'border-amber-200/60',
      icon: Award, iconColor: avgScore >= 80 ? 'text-green-600' : 'text-amber-600',
      sub: trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : '→ Stable',
      trend,
    },
    {
      label: 'Pass Rate', value: passRate.toFixed(0), suffix: '%',
      sparkData: [passRate * 0.7, passRate * 0.85, passRate * 0.9, passRate],
      color: passRate >= 80 ? '#10b981' : '#f59e0b',
      bg: 'from-purple-50 to-purple-100/50', border: 'border-purple-200/60',
      icon: Target, iconColor: 'text-purple-600',
      sub: `${results.filter(r => r.percentage >= 60).length} of ${results.length} passed`,
      trend: passRate >= 80 ? 'up' : 'flat',
    },
    {
      label: 'Integrity', value: totalViolations === 0 ? '100' : Math.max(0, 100 - totalViolations * 10).toString(), suffix: '%',
      sparkData: [95, 97, 98, totalViolations === 0 ? 100 : 90],
      color: totalViolations === 0 ? '#10b981' : '#ef4444',
      bg: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-200/60',
      icon: Shield, iconColor: totalViolations === 0 ? 'text-emerald-600' : 'text-red-600',
      sub: totalViolations === 0 ? '✓ No violations' : `${totalViolations} flag(s)`,
      trend: totalViolations === 0 ? 'up' : 'down',
    },
  ]

  const quickActions = [
    { title: 'Practice Tests', desc: 'Mock exams with AI proctoring', icon: Play, link: '/practice', from: 'from-blue-500', to: 'to-cyan-500' },
    { title: 'AI Tutor', desc: 'Ask anything, get instant help', icon: Bot, link: '/student/ai-tutor', from: 'from-purple-500', to: 'to-violet-500' },
    { title: 'Study Materials', desc: 'Notes, videos & PDFs', icon: BookMarked, link: '/student/materials', from: 'from-green-500', to: 'to-emerald-500' },
    { title: 'My Results', desc: 'View all exam results', icon: BarChart3, link: '/student/results', from: 'from-orange-500', to: 'to-red-400' },
    { title: 'Learning Path', desc: 'AI-curated study plan', icon: Sparkles, link: '/student/learning-path', from: 'from-indigo-500', to: 'to-blue-500' },
    { title: 'Achievements', desc: 'Badges & leaderboard', icon: Trophy, link: '/student/gamification', from: 'from-amber-500', to: 'to-yellow-400' },
  ]

  const badges = [
    { emoji: '🏆', title: 'Top Performer', desc: 'Score 90%+', earned: avgScore >= 90, color: 'yellow' },
    { emoji: '🔥', title: 'On Fire', desc: 'Study streak', earned: results.length >= 5, color: 'red' },
    { emoji: '⚡', title: 'Speed Runner', desc: 'Fast finisher', earned: results.length >= 3, color: 'blue' },
    { emoji: '🛡️', title: 'Clean Slate', desc: 'No violations', earned: totalViolations === 0 && results.length > 0, color: 'green' },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Sidebar (desktop) ──────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 shadow-sm flex-col z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-base">PCMT</h1>
            <p className="text-xs text-gray-400">Student Portal</p>
          </div>
        </div>

        {/* User card */}
        <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.program} · Sem {user?.semester}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 mt-4 space-y-1">
          {[
            { icon: Home, label: 'Dashboard', active: true },
            { icon: BookOpen, label: 'Upcoming Exams', to: '#exams' },
            { icon: BarChart3, label: 'My Results', to: '/student/results' },
            { icon: Bot, label: 'AI Tutor', to: '/student/ai-tutor' },
            { icon: BookMarked, label: 'Study Materials', to: '/student/materials' },
            { icon: Trophy, label: 'Achievements', to: '/student/gamification' },
            { icon: Bell, label: 'Notifications', to: '/notifications' },
            { icon: Settings, label: 'Settings', to: '/settings' },
          ].map(item => (
            <Link
              key={item.label}
              to={item.to || '#'}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
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

      {/* ── Main content ───────────────────────────────── */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-gray-900">PCMT</span>
            </div>

            {/* Desktop greeting */}
            <div className="hidden lg:block">
              <h1 className="font-bold text-gray-900">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Link>
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm lg:hidden">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <button onClick={handleLogout} className="hidden lg:flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

          {/* ── STAT CARDS ────────────────────────────────── */}
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
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  {card.trend === 'up' ? (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                      <ChevronUp className="w-3 h-3" />
                    </span>
                  ) : card.trend === 'down' ? (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                      <ChevronDown className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      <Minus className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black text-gray-900 mb-0.5">
                  {loading ? '—' : `${card.value}${card.suffix}`}
                </p>
                <p className="text-xs font-semibold text-gray-500 mb-2">{card.label}</p>
                <p className="text-xs text-gray-400">{card.sub}</p>
                {/* Sparkline */}
                <div className="absolute bottom-2 right-2 opacity-60">
                  <Sparkline data={card.sparkData.length > 1 ? card.sparkData : [0, 50, 100]} color={card.color} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── MAIN GRID ─────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">

            {/* Upcoming Exams (2/3 width) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Upcoming Exams
                  </h3>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">
                    {exams.length} scheduled
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {loading ? (
                    <div className="p-6 space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="skeleton h-16 rounded-xl" />
                      ))}
                    </div>
                  ) : exams.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                      <p className="text-gray-400 font-medium">No upcoming exams scheduled</p>
                      <p className="text-gray-300 text-sm mt-1">Check back later or contact your teacher</p>
                    </div>
                  ) : (
                    exams.slice(0, 5).map((exam) => (
                      <div key={exam._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-blue-200">
                          {exam.title.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{exam.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{exam.duration} min
                            </span>
                            <span className="text-xs text-gray-400">{exam.total_questions} questions</span>
                            {exam.difficulty && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                exam.difficulty === 'hard' ? 'bg-red-100 text-red-600'
                                : exam.difficulty === 'medium' ? 'bg-amber-100 text-amber-600'
                                : 'bg-green-100 text-green-600'
                              }`}>{exam.difficulty}</span>
                            )}
                          </div>
                        </div>
                        <Link
                          to={`/exam/${exam._id}/verify`}
                          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-200"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </Link>
                        <Link
                          to={`/exam/${exam._id}/verify`}
                          className="lg:hidden shrink-0 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
                        >
                          Start
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Progress ring card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Overall Progress
                </h4>
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={avgScore}
                    size={72}
                    stroke={6}
                    color={avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444'}
                  />
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-xs text-gray-400">Average Score</p>
                      <p className="font-bold text-gray-900">{avgScore.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Trend</p>
                      <p className={`font-bold text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                        {trend === 'up' ? '📈 Improving' : trend === 'down' ? '📉 Declining' : '➡️ Stable'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score bars */}
                <div className="mt-4 space-y-2">
                  {[
                    { label: 'Pass Rate', value: passRate, color: '#10b981' },
                    { label: 'Avg Score', value: avgScore, color: '#3b82f6' },
                    { label: 'Integrity', value: Math.max(0, 100 - totalViolations * 10), color: '#8b5cf6' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-semibold text-gray-700">{item.value.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Achievements
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {badges.map(badge => (
                    <div
                      key={badge.title}
                      className={`rounded-xl p-3 text-center transition-all ${
                        badge.earned
                          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200'
                          : 'bg-gray-50 border border-gray-100 opacity-40 grayscale'
                      }`}
                    >
                      <div className="text-2xl mb-1">{badge.emoji}</div>
                      <p className="text-xs font-bold text-gray-800">{badge.title}</p>
                      <p className="text-xs text-gray-400">{badge.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── QUICK ACTIONS ─────────────────────────────── */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action, i) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <Link
                    to={action.link}
                    className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group text-center"
                  >
                    <div className={`w-11 h-11 bg-gradient-to-br ${action.from} ${action.to} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-bold text-gray-800">{action.title}</p>
                    <p className="text-xs text-gray-400 leading-tight">{action.desc}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── RECENT RESULTS ────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" />
                Recent Results
              </h3>
              <Link to="/student/results" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center">
                  <Award className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 font-medium">No results yet</p>
                  <p className="text-gray-300 text-sm mt-1">Take your first exam to see results here</p>
                </div>
              ) : (
                results.slice(0, 5).map((result) => (
                  <div key={result._id || result.exam_id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      (result.percentage || 0) >= 80 ? 'bg-green-100 text-green-700' :
                      (result.percentage || 0) >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(result.percentage || 0)}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{result.exam_title || `Exam ${result.exam_id?.slice(-6)}`}</p>
                      <p className="text-xs text-gray-400">{result.score || 0}/{result.total_points || result.total || 100} marks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        result.passed || (result.percentage >= 60)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.passed || result.percentage >= 60 ? 'PASS' : 'FAIL'}
                      </span>
                      {result._id && (
                        <Link to={`/results/${result._id}`} className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                          Details
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-40 flex justify-around py-2 px-4">
        {[
          { icon: Home, label: 'Home', to: '/student/dashboard' },
          { icon: BookOpen, label: 'Exams', to: '/student/dashboard' },
          { icon: BarChart3, label: 'Results', to: '/student/results' },
          { icon: Bot, label: 'AI Tutor', to: '/student/ai-tutor' },
          { icon: User, label: 'Profile', to: '/settings' },
        ].map(item => (
          <Link key={item.label} to={item.to} className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-400 hover:text-blue-600 transition-colors">
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>

    </div>
  )
}
