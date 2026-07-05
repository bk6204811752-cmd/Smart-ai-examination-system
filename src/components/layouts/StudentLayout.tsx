import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, BookOpen, BarChart3, Bot, BookMarked, Trophy, Bell,
  Settings, LogOut, GraduationCap, User, Zap, Menu, X,
  Play, Sparkles, Target, Activity, ChevronRight
} from 'lucide-react'

const navItems = [
  { icon: Home,       label: 'Dashboard',      to: '/student/dashboard' },
  { icon: BookOpen,   label: 'Upcoming Exams', to: '/student/dashboard#exams' },
  { icon: BarChart3,  label: 'My Results',     to: '/student/results' },
  { icon: Bot,        label: 'AI Tutor',       to: '/student/ai-tutor' },
  { icon: BookMarked, label: 'Study Materials', to: '/student/materials' },
  { icon: Play,       label: 'Practice Tests', to: '/practice' },
  { icon: Trophy,     label: 'Achievements',   to: '/student/gamification' },
  { icon: Sparkles,   label: 'Learning Path',  to: '/student/learning-path' },
  { icon: Bell,       label: 'Notifications',  to: '/notifications' },
  { icon: Settings,   label: 'Settings',       to: '/settings' },
]

interface StudentLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export default function StudentLayout({ children, title, subtitle }: StudentLayoutProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const isActive = (to: string) => {
    const path = to.split('#')[0]
    if (path === '/student/dashboard') return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const SidebarContent = () => (
    <>
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
      <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Desktop Sidebar — fixed, always visible */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 shadow-sm flex-col z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
              className="lg:hidden fixed left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col z-50"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-black text-gray-900">PCMT Student</span>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <SidebarContent />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:ml-64 flex flex-col min-h-screen">

        {/* Top header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-gray-900 text-sm">PCMT</span>
              </div>

              {/* Desktop title */}
              {title && (
                <div className="hidden lg:block">
                  <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
                  {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Link>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <button onClick={handleLogout} className="hidden lg:flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-30 flex justify-around py-2 px-2">
        {[
          { icon: Home,      label: 'Home',    to: '/student/dashboard' },
          { icon: BookOpen,  label: 'Exams',   to: '/student/dashboard' },
          { icon: BarChart3, label: 'Results', to: '/student/results' },
          { icon: Bot,       label: 'AI Tutor', to: '/student/ai-tutor' },
          { icon: User,      label: 'Profile', to: '/settings' },
        ].map(item => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
