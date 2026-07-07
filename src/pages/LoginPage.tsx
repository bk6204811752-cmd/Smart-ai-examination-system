import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/globalStore'
import { authAPI } from '../lib/api'
import { toast } from 'sonner'
import {
  GraduationCap, Eye, EyeOff, Shield, Lock, Mail,
  Sparkles, ChevronRight, Brain, BarChart3
} from 'lucide-react'

const FEATURES = [
  { icon: Shield, text: 'AI-Powered Proctoring', desc: '99.7% face detection accuracy' },
  { icon: Brain, text: 'Adaptive Learning', desc: 'Personalized AI tutor support' },
  { icon: BarChart3, text: 'Deep Analytics', desc: 'Real-time performance insights' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errors: typeof fieldErrors = {}
    const normalizedEmail = email.trim()
    if (!normalizedEmail) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = 'Enter a valid email'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const data = await authAPI.login(email.trim().toLowerCase(), password)
      if (data.access_token) {
        login(data.user, data.access_token)
        toast.success(`Welcome back, ${data.user?.full_name || data.user?.name || 'User'}! 👋`)

        const role = data.user?.role
        if (role === 'admin') navigate('/admin/dashboard')
        else if (role === 'teacher') navigate('/teacher/dashboard')
        else navigate('/student/dashboard')
      }
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail || err?.message

      if (!err.response) {
        // Network error — backend not reachable
        const isDev = import.meta.env.DEV
        if (isDev) {
          toast.error('Cannot connect to server. Please ensure the backend is running on port 8000.')
        } else {
          toast.error('Server is starting up — please wait 30 seconds and try again. (Backend cold start)', { duration: 6000 })
        }
      } else if (status === 403 && detail?.toLowerCase().includes('pending')) {
        toast.error('Your account is pending admin approval. You will be notified once approved.', { duration: 6000 })
      } else if (status === 403 && detail?.toLowerCase().includes('unverified')) {
        toast.error('Please verify your email first. Check your inbox for the OTP.', { duration: 6000 })
      } else {
        toast.error(detail || 'Invalid credentials. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const demoAccounts = [
    { role: 'Student', email: 'student@pcmt.edu.in', password: 'Student@123', color: 'from-blue-500 to-cyan-500' },
    { role: 'Teacher', email: 'teacher@pcmt.edu.in', password: 'Teacher@123', color: 'from-purple-500 to-indigo-500' },
    { role: 'Admin', email: 'admin@pcmt.edu.in', password: 'Admin@123', color: 'from-emerald-500 to-teal-500' },
  ]

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ─── Left Panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden hero-gradient-pcmt flex-col justify-between p-12">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-20 -left-20 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute bottom-20 right-10 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl">PCMT</h1>
              <p className="text-blue-200 text-xs font-medium">Smart AI Exam System</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Welcome Back to the Future of Exams
            </h2>
            <p className="text-blue-100/70 text-base leading-relaxed mb-10">
              AI-powered, secure, and intelligent exam management for modern education.
            </p>

            <div className="space-y-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-4 glass rounded-2xl px-4 py-3"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{f.text}</p>
                    <p className="text-blue-200/70 text-xs">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted · NAAC A+ Accredited</span>
          </div>
        </div>
      </div>

      {/* ─── Right Panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-lg">PCMT</h1>
              <p className="text-gray-400 text-xs">Smart AI Exam System</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl shadow-xl shadow-gray-200/80 border border-gray-100 p-8"
          >
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-3 h-3" />
                Secure Login
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Sign In to Your Account</h2>
              <p className="text-gray-400 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  Register here
                </Link>
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })) }}
                    className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                      fieldErrors.email
                        ? 'border-red-300 bg-red-50 focus:border-red-400'
                        : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                    }`}
                    placeholder="your@pcmt.edu.in"
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })) }}
                    className={`w-full pl-10 pr-12 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                      fieldErrors.password
                        ? 'border-red-300 bg-red-50 focus:border-red-400'
                        : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                    }`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{fieldErrors.password}</p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded accent-blue-600"
                  />
                  <span className="text-sm text-gray-600 font-medium">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Quick Demo</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword(acc.password) }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-br ${acc.color} hover:opacity-90 transition-all shadow-sm active:scale-95`}
                  >
                    {acc.role}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">Click to auto-fill demo credentials</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
