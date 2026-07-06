import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authAPI } from '../lib/api'
import { toast } from 'sonner'
import {
  GraduationCap, Mail, Lock, Eye, EyeOff,
  ArrowLeft, Sparkles, KeyRound, CheckCircle, Smartphone
} from 'lucide-react'

const OTP_COUNTDOWN = 60

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  // Step 0: enter email
  // Step 1: enter OTP
  // Step 2: enter new password

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpResendTimer, setOtpResendTimer] = useState(0)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [pwdErrors, setPwdErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})
  const [isResetting, setIsResetting] = useState(false)

  // OTP countdown
  const startCountdown = () => {
    setOtpResendTimer(OTP_COUNTDOWN)
    const interval = setInterval(() => {
      setOtpResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Step 0: Send reset OTP
  const handleSendOTP = async () => {
    setEmailError('')
    if (!email.trim()) { setEmailError('Email is required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Enter a valid email address'); return }

    setIsSending(true)
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase())
      toast.success('📧 OTP sent!', {
        description: 'Check your email for the password reset OTP.',
        duration: 5000,
      })
      setStep(1)
      startCountdown()
      setTimeout(() => otpRefs.current[0]?.focus(), 200)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send reset OTP. Please try again.'
      toast.error(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleResendOTP = async () => {
    if (otpResendTimer > 0) return
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase())
      toast.success('OTP resent to your email')
      startCountdown()
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to resend OTP')
    }
  }

  // Step 1: Verify OTP (just validate locally to move to step 2; actual reset validates on server)
  const handleVerifyOTP = () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP')
      return
    }
    setStep(2)
  }

  // Step 2: Reset password
  const handleResetPassword = async () => {
    const errors: typeof pwdErrors = {}
    if (!newPassword) errors.newPassword = 'New password is required'
    else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters'
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
    else if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match'
    setPwdErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsResetting(true)
    try {
      await authAPI.resetPassword(email.trim().toLowerCase(), otp.join(''), newPassword)
      toast.success('🎉 Password reset successfully!', {
        description: 'You can now log in with your new password.',
        duration: 6000,
      })
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Password reset failed. Please try again.'
      toast.error(msg)
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('expired')) {
        // OTP invalid — go back to OTP entry
        setStep(1)
        setOtp(['', '', '', '', '', ''])
      }
    } finally {
      setIsResetting(false)
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
  const strength = passwordStrength(newPassword)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'][strength]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-xl">PCMT</h1>
            <p className="text-gray-400 text-xs">Smart AI Exam System</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-xl shadow-gray-200/80 border border-gray-100 p-8"
          >
            {/* Header */}
            <div className="mb-6">
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-medium mb-5 transition-colors w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>

              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                <Sparkles className="w-3 h-3" />
                {step === 0 ? 'Reset Password' : step === 1 ? 'Verify OTP' : 'New Password'}
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < step ? 'bg-green-500 text-white' :
                      i === step ? 'bg-indigo-600 text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < 2 && <div className={`w-8 h-0.5 rounded transition-all ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>

              <h2 className="text-2xl font-black text-gray-900 mb-1">
                {step === 0 ? 'Forgot Your Password?' :
                 step === 1 ? 'Enter the OTP' :
                 'Set New Password'}
              </h2>
              <p className="text-gray-400 text-sm">
                {step === 0 ? "Enter your registered email and we'll send an OTP." :
                 step === 1 ? `OTP sent to ${email}` :
                 'Choose a strong new password.'}
              </p>
            </div>

            {/* ── Step 0: Email ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                      className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                        emailError
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : 'border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white'
                      }`}
                      placeholder="your@pcmt.edu.in"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {emailError && <p className="mt-1.5 text-xs text-red-500 font-medium">{emailError}</p>}
                </div>

                <motion.button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isSending}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Send Reset OTP
                    </>
                  )}
                </motion.button>
              </div>
            )}

            {/* ── Step 1: OTP ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-indigo-600" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Enter the 6-digit code sent to<br />
                    <span className="font-semibold text-gray-700">{email}</span>
                  </p>
                </div>

                {/* OTP boxes */}
                <div className="flex items-center justify-center gap-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all ${
                        digit
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-indigo-400'
                      }`}
                    />
                  ))}
                </div>

                {/* Resend */}
                <div className="text-center">
                  {otpResendTimer > 0 ? (
                    <p className="text-sm text-gray-400">
                      Resend code in <span className="font-semibold text-gray-600">{otpResendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <motion.button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={otp.join('').length !== 6}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Continue
                </motion.button>
              </div>
            )}

            {/* ── Step 2: New Password ── */}
            {step === 2 && (
              <div className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="new-password"
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setPwdErrors(p => ({ ...p, newPassword: '' })) }}
                      className={`w-full pl-10 pr-12 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                        pwdErrors.newPassword
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : 'border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white'
                      }`}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength meter */}
                  {newPassword && (
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
                  {pwdErrors.newPassword && <p className="mt-1.5 text-xs text-red-500 font-medium">{pwdErrors.newPassword}</p>}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="confirm-password"
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setPwdErrors(p => ({ ...p, confirmPassword: '' })) }}
                      className={`w-full pl-10 pr-12 py-3.5 border-2 rounded-xl text-sm transition-all outline-none ${
                        pwdErrors.confirmPassword
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : confirmPassword && confirmPassword === newPassword
                          ? 'border-green-400 bg-green-50 focus:border-green-500'
                          : 'border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white'
                      }`}
                      placeholder="Repeat your new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwdErrors.confirmPassword && <p className="mt-1.5 text-xs text-red-500 font-medium">{pwdErrors.confirmPassword}</p>}
                </div>

                {/* Password rules hint */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Password requirements:</p>
                  <ul className="text-xs text-gray-400 space-y-0.5">
                    {[
                      ['At least 8 characters', newPassword.length >= 8],
                      ['One uppercase letter (A-Z)', /[A-Z]/.test(newPassword)],
                      ['One number (0-9)', /[0-9]/.test(newPassword)],
                      ['One special character (!@#...)', /[^A-Za-z0-9]/.test(newPassword)],
                    ].map(([text, met]) => (
                      <li key={text as string} className={`flex items-center gap-1.5 ${met ? 'text-green-600' : ''}`}>
                        <span>{met ? '✓' : '○'}</span> {text as string}
                      </li>
                    ))}
                  </ul>
                </div>

                <motion.button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResetting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Reset Password
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-sm text-gray-400 mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
