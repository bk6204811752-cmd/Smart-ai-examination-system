import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  GraduationCap, Brain, Shield, BarChart3, Users,
  ArrowRight, Building, TrendingUp, CheckCircle, Star,
  Zap, Globe, Lock, Award, ChevronRight, Play,
  Camera, BookOpen, Clock, Target, Sparkles
} from 'lucide-react'

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: Math.random() * 8 + 4,
  x: Math.random() * 100,
  y: Math.random() * 100,
  delay: Math.random() * 4,
  duration: Math.random() * 4 + 3,
}))

const COUNTER_ITEMS = [
  { value: 6000, suffix: '+', label: 'Active Students', icon: Users },
  { value: 250, suffix: '+', label: 'Faculty Members', icon: GraduationCap },
  { value: 92, suffix: '%', label: 'Placement Rate', icon: TrendingUp },
  { value: 18, suffix: ' LPA', label: 'Highest Package', icon: Award },
]

function AnimatedCounter({ value, suffix, duration = 2000 }: { value: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const startRef = useRef<number | null>(null)
  const frameRef = useRef<number>()

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      setCount(Math.floor(eased * value))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [value, duration])

  return <>{count.toLocaleString()}{suffix}</>
}

export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const programs = [
    { name: 'BBA', fullName: 'Business Administration', duration: '3 Years', icon: Building, color: 'from-orange-400 to-amber-500' },
    { name: 'BCA', fullName: 'Computer Applications', duration: '3 Years', icon: Brain, color: 'from-blue-400 to-cyan-500' },
    { name: 'B.Tech', fullName: 'Bachelor of Technology', duration: '4 Years', icon: Zap, color: 'from-purple-400 to-indigo-500' },
    { name: 'MBA', fullName: 'Business Administration', duration: '2 Years', icon: TrendingUp, color: 'from-green-400 to-emerald-500' },
    { name: 'MCA', fullName: 'Computer Applications', duration: '2 Years', icon: Globe, color: 'from-pink-400 to-rose-500' },
  ]

  const features = [
    {
      icon: Camera,
      title: 'AI-Powered Proctoring',
      description: '99.7% accuracy real-time facial recognition, multi-face detection, and behavioral analysis',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Core Feature',
    },
    {
      icon: Shield,
      title: 'Zero-Tolerance Security',
      description: 'Fullscreen lockdown, DevTools blocking, copy-paste prevention, and screen capture detection',
      color: 'from-indigo-500 to-purple-500',
      badge: 'Advanced',
    },
    {
      icon: BarChart3,
      title: 'Deep Analytics',
      description: 'Real-time performance insights, predictive scoring, learning path recommendations',
      color: 'from-green-500 to-emerald-500',
      badge: 'Smart',
    },
    {
      icon: Brain,
      title: 'AI Exam Generator',
      description: 'Generate adaptive exam questions automatically with difficulty calibration',
      color: 'from-amber-500 to-orange-500',
      badge: 'AI-Powered',
    },
    {
      icon: Clock,
      title: 'Live Monitoring',
      description: 'Teachers watch live video feeds, get violation alerts, and intervene in real-time',
      color: 'from-pink-500 to-rose-500',
      badge: 'Real-time',
    },
    {
      icon: Target,
      title: 'Adaptive Learning',
      description: 'Personalized study paths, gamification badges, and AI tutor support',
      color: 'from-teal-500 to-cyan-500',
      badge: 'Personalized',
    },
  ]

  const howItWorks = [
    { step: '01', icon: Users, title: 'Register & Verify', desc: 'Create account, get approved by admin, and complete identity verification' },
    { step: '02', icon: Camera, title: 'Camera Setup', desc: 'AI captures reference face and initializes real-time proctoring engine' },
    { step: '03', icon: BookOpen, title: 'Take Exam', desc: 'Answer questions in a locked, monitored environment with zero distractions' },
    { step: '04', icon: BarChart3, title: 'Get Results', desc: 'Instant AI-scored results with detailed performance analytics' },
  ]

  const testimonials = [
    { name: 'Dr. Rajesh Kumar', role: 'Head of Academics, PCMT', text: 'The AI proctoring has completely eliminated exam malpractice. Integrity scores are at an all-time high.', rating: 5 },
    { name: 'Priya Sharma', role: 'BCA Student', text: 'The interface is incredibly smooth. The AI tutor helped me prepare and my scores improved by 40%.', rating: 5 },
    { name: 'Prof. Anita Verma', role: 'Faculty, MBA Dept.', text: 'Creating exams with the AI generator saves me hours. The analytics give deep insights into student progress.', rating: 5 },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">PCMT</h1>
                <p className="text-xs text-gray-400 font-medium leading-tight">Smart AI Exam System</p>
              </div>
            </motion.div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
              <a href="#programs" className="hover:text-blue-600 transition-colors">Programs</a>
            </nav>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 font-semibold text-sm transition-colors hidden sm:block"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-premium text-sm px-5 py-2.5"
              >
                Get Started <ChevronRight className="w-4 h-4 inline ml-0.5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden hero-gradient-pcmt">
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {PARTICLES.map(p => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-white/10"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.x}%`,
                top: `${p.y}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
          {/* Gradient orbs */}
          <div className="absolute top-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.8s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                AI-Powered Exam Platform • 2025
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
                Secure Exams.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                  Smart Results.
                </span>
              </h1>

              <p className="text-blue-100/80 text-lg leading-relaxed mb-8 max-w-lg">
                PCMT's cutting-edge AI exam platform with real-time facial recognition, behavioral monitoring, adaptive learning, and instant analytics.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  to="/register"
                  className="group flex items-center justify-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold text-base hover:bg-blue-50 transition-all shadow-xl shadow-black/20"
                >
                  Start Free Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/20 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Sign In
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4">
                {['NAAC A+ Accredited', '99.7% Proctoring Accuracy', 'ISO 27001 Compliant'].map(badge => (
                  <div key={badge} className="flex items-center gap-1.5 text-white/70 text-xs">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                    {badge}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right — Floating UI Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: 40, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Main card */}
              <div className="glass-card p-6 rounded-3xl max-w-sm ml-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Live Proctoring Active</p>
                    <p className="text-white/60 text-xs">Monitoring in progress...</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-xs font-bold">LIVE</span>
                  </div>
                </div>

                {/* Mock progress */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>Progress</span>
                    <span>7 / 20 Questions</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '35%' }}
                      transition={{ delay: 0.8, duration: 1.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">● 5 Answered</span>
                    <span className="text-amber-400">◆ 2 Flagged</span>
                    <span className="text-white/40">○ 13 Left</span>
                  </div>
                </div>

                {/* Trust score mini */}
                <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                  <div className="w-10 h-10 relative">
                    <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                      <motion.circle
                        cx="20" cy="20" r="16"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 16}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 16 * 0.1 }}
                        transition={{ delay: 1, duration: 1.5, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-green-400">90</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">Trust Score</p>
                    <p className="text-green-400 text-xs">Excellent Integrity</p>
                  </div>
                </div>
              </div>

              {/* Floating alert card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute -bottom-8 -left-8 glass-card px-4 py-3 rounded-2xl max-w-[180px]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/30 rounded-xl flex items-center justify-center">
                    <Camera className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold leading-tight">Face Detected</p>
                    <p className="text-green-400 text-xs">100% confidence</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating stats card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="absolute -top-6 -right-4 glass-card px-4 py-3 rounded-2xl"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-xs font-bold">42:30 left</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats Section ─────────────────────────────────────────── */}
      <section ref={statsRef} className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {COUNTER_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-black text-white mb-1 tabular-nums">
                  {statsVisible ? <AnimatedCounter value={item.value} suffix={item.suffix} /> : '0' + item.suffix}
                </div>
                <p className="text-gray-400 text-sm font-medium">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Section ──────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              A complete exam management ecosystem powered by cutting-edge AI
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group premium-card bg-white p-6 rounded-2xl border border-gray-100 hover:border-blue-100 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-gray-900 font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-black text-white mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Four simple steps to a secure exam experience</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full h-px border-t border-dashed border-gray-700" />
                )}
                <div className="relative inline-flex mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white text-gray-900 rounded-full text-xs font-black flex items-center justify-center shadow-md">
                    {step.step.slice(1)}
                  </div>
                </div>
                <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Programs Section ──────────────────────────────────────── */}
      <section id="programs" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-black text-gray-900 mb-4">Academic Programs</h2>
            <p className="text-gray-500 text-lg">Serving all departments under one unified platform</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {programs.map((prog, i) => (
              <motion.div
                key={prog.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group premium-card bg-white p-5 rounded-2xl border border-gray-100 text-center cursor-default"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${prog.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <prog.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-gray-900 text-lg mb-0.5">{prog.name}</h3>
                <p className="text-gray-400 text-xs leading-snug mb-2">{prog.fullName}</p>
                <span className="text-xs text-gray-300 font-medium">{prog.duration}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-black text-gray-900 mb-4">What People Say</h2>
            <p className="text-gray-500 text-lg">Trusted by faculty, students, and administrators</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="premium-card bg-white p-6 rounded-2xl border border-gray-100"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ───────────────────────────────────────────── */}
      <section className="py-24 hero-gradient-pcmt relative overflow-hidden">
        <div className="absolute inset-0">
          {PARTICLES.slice(0, 10).map(p => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-white/5"
              style={{ width: p.size * 2, height: p.size * 2, left: `${p.x}%`, top: `${p.y}%` }}
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity }}
            />
          ))}
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              Ready to Transform Your Exam Experience?
            </h2>
            <p className="text-blue-100/80 text-lg mb-10">
              Join thousands of students and faculty already using PCMT's AI exam platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="group flex items-center justify-center gap-2 bg-white text-blue-700 px-10 py-4 rounded-2xl font-bold text-base hover:bg-blue-50 transition-all shadow-xl shadow-black/20"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white px-10 py-4 rounded-2xl font-semibold text-base hover:bg-white/20 transition-all"
              >
                <Lock className="w-5 h-5" />
                Sign In to Portal
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">PCMT Smart AI Exam System</p>
                <p className="text-gray-500 text-xs">Paramedical College of Medical Technology</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <span>© 2025 PCMT. All rights reserved.</span>
              <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
