import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../lib/api'
import { toast } from 'sonner'
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, User, BookOpen,
  ChevronRight, Sparkles, Shield, CheckCircle, Building,
  ArrowLeft, Camera, BarChart3
} from 'lucide-react'

const PROGRAMS = ['BCA', 'BBA', 'B.Tech', 'MBA', 'MCA', 'B.Sc', 'M.Sc', 'Other']
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]
const DEPARTMENTS = ['Computer Science', 'Business Administration', 'Engineering', 'Medical Technology', 'Science', 'Arts', 'Commerce']

const BENEFITS = [
  { icon: Camera, text: 'AI Proctored Exams', desc: 'Real-time facial recognition monitoring' },
  { icon: BarChart3, text: 'Performance Analytics', desc: 'Track your progress with AI insights' },
  { icon: Shield, text: 'Secure Platform', desc: 'ISO 27001 compliant exam environment' },
]

const STEPS = ['Account', 'Academic', 'Review']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [step, setStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student' as 'student' | 'teacher',
    program: 'BCA',
    semester: 1,
    department: 'Computer Science',
  })

  const update = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateStep0 = () => {
    const e: Record<string, string> = {}
    if (!formData.full_name.trim()) e.full_name = 'Full name is required'
    if (!formData.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email address'
    if (!formData.password) e.password = 'Password is required'
    else if (formData.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password'
    else if (confirmPassword !== formData.password) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (formData.role === 'teacher' && !formData.department) {
      e.department = 'Please select your department'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return
    if (step === 1 && !validateStep1()) return
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const response = await authAPI.register(formData)

      if (response.pending) {
        toast.success('🎉 Registration successful! Awaiting admin approval.', {
          duration: 6000,
          description: 'You will be notified once your account is activated.',
        })
        setTimeout(() => navigate('/login'), 3000)
      } else {
        login(response.user, response.access_token)
        toast.success('✅ Welcome to PCMT! Your account is ready.')
        navigate('/student/dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.')
      setStep(0)
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const strength = passwordStrength(formData.password)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'][strength]

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ─── Left Panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden hero-gradient-pcmt flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 7, repeat: Infinity }}
            className="absolute bottom-10 -left-20 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl"
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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Join the Future of Academic Excellence
            </h2>
            <p className="text-blue-100/70 text-base leading-relaxed mb-10">
              Create your PCMT account and access AI-powered exams, analytics, and adaptive learning tools.
            </p>

            <div className="space-y-4">
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={b.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-4 glass rounded-2xl px-4 py-3"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <b.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{b.text}</p>
                    <p className="text-blue-200/70 text-xs">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Step progress on left side */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-green-400 text-white' :
                  i === step ? 'bg-white text-blue-700' :
                  'bg-white/20 text-white/50'
                }`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-white' : 'text-white/50'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/20" />}
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* ─── Right Panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile header */}
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
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-3xl shadow-xl shadow-gray-200/80 border border-gray-100 p-8"
          >
            {/* Header */}
            <div className="mb-6">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-medium mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                <Sparkles className="w-3 h-3" />
                {STEPS[step]}
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">
                {step === 0 ? 'Create Your Account' :
                 step === 1 ? 'Academic Details' :
                 'Review & Submit'}
              </h2>
              <p className="text-gray-400 text-sm">
                {step === 0
                  ? <>Already have an account? <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">Sign in</Link></>
                  : step === 1
                  ? 'Tell us about your academic background'
                  : 'Review your information before submitting'}
              </p>
            </div>

            {/* ── Step 0: Account Info ──────────────────────────── */}
            {step === 0 && (
              <div className="space-y-4">
                {/* Role toggle */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  {(['student', 'teacher'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => update('role', r)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                        formData.role === r
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {r === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
                    </button>
                  ))}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={e => update('full_name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                        errors.full_name
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                      }`}
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </div>
                  {errors.full_name && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.full_name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => update('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                        errors.email
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                      }`}
                      placeholder="your@pcmt.edu.in"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => update('password', e.target.value)}
                      className={`w-full pl-10 pr-12 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                        errors.password
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                      }`}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength */}
                  {formData.password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${
                        strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : strength === 3 ? 'text-blue-500' : 'text-green-500'
                      }`}>{strengthLabel}</span>
                    </div>
                  )}
                  {errors.password && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })) }}
                      className={`w-full pl-10 pr-12 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                        errors.confirmPassword
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : confirmPassword && confirmPassword === formData.password
                          ? 'border-green-400 bg-green-50 focus:border-green-500'
                          : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                      }`}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* ── Step 1: Academic Details ───────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                {formData.role === 'student' ? (
                  <>
                    {/* Program */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Program</label>
                      <div className="grid grid-cols-4 gap-2">
                        {PROGRAMS.map(prog => (
                          <button
                            key={prog}
                            type="button"
                            onClick={() => update('program', prog)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                              formData.program === prog
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            {prog}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Semester */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Current Semester</label>
                      <div className="grid grid-cols-8 gap-1.5">
                        {SEMESTERS.map(sem => (
                          <button
                            key={sem}
                            type="button"
                            onClick={() => update('semester', sem)}
                            className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                              formData.semester === sem
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                          >
                            {sem}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Department for teachers */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                      <div className="space-y-2">
                        {DEPARTMENTS.map(dept => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => update('department', dept)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all ${
                              formData.department === dept
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            <Building className="w-4 h-4 shrink-0" />
                            {dept}
                          </button>
                        ))}
                      </div>
                      {errors.department && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.department}</p>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 2: Review ────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-3">
                  {[
                    { label: 'Full Name', value: formData.full_name, icon: User },
                    { label: 'Email', value: formData.email, icon: Mail },
                    { label: 'Role', value: formData.role.charAt(0).toUpperCase() + formData.role.slice(1), icon: BookOpen },
                    { label: formData.role === 'student' ? 'Program' : 'Department', value: formData.role === 'student' ? `${formData.program} — Semester ${formData.semester}` : formData.department, icon: Building },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Your account requires <strong>admin approval</strong> before you can log in. You'll be notified once activated.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6">
              {step < 2 ? (
                <motion.button
                  type="button"
                  onClick={handleNext}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create My Account
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
