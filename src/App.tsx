import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, lazy, Suspense } from 'react'
import { useAuthStore } from './store/authStore'
import { performanceMonitor } from './lib/performanceMonitor'
import { offlineStorage } from './lib/offlineStorage'
import { logger } from './lib/logger'
import AccessibilityPanel from './components/AccessibilityPanel'

// ─── Layouts ────────────────────────────────────────────────────────────────
const StudentLayout = lazy(() => import('./components/layouts/StudentLayout'))
const TeacherLayout = lazy(() => import('./components/layouts/TeacherLayout'))
const AdminLayout   = lazy(() => import('./components/layouts/AdminLayout'))

// ─── Public Pages ───────────────────────────────────────────────────────────
const LandingPage  = lazy(() => import('./pages/LandingPage'))
const LoginPage    = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const NotFoundPage = lazy(() => import('./pages/NotFound'))

// ─── Common Protected Pages ─────────────────────────────────────────────────
const NotificationCenterPage = lazy(() => import('./pages/NotificationCenter'))
const SettingsPage            = lazy(() => import('./pages/Settings'))

// ─── Student Pages ──────────────────────────────────────────────────────────
const StudentDashboard       = lazy(() => import('./pages/student/Dashboard'))
const ExamPage               = lazy(() => import('./pages/student/ExamPage'))
const ExamResultPage         = lazy(() => import('./pages/student/ExamResultPage'))
const StudyMaterialsPage     = lazy(() => import('./pages/student/StudyMaterials'))
const AITutorPage            = lazy(() => import('./pages/student/AITutor'))
const PracticeSectionPage    = lazy(() => import('./pages/student/PracticeSection'))
const PracticeMockExam       = lazy(() => import('./pages/student/PracticeMockExam'))
const PracticeResults        = lazy(() => import('./pages/student/PracticeResults'))
const AILearningPathPage     = lazy(() => import('./pages/student/AILearningPath'))
const GamificationPage       = lazy(() => import('./pages/student/Gamification'))
const CollaborativeExamPage  = lazy(() => import('./pages/student/CollaborativeExam'))
const PreExamVerificationPage = lazy(() => import('./pages/student/PreExamVerification'))

// ─── Teacher Pages ──────────────────────────────────────────────────────────
const TeacherDashboard              = lazy(() => import('./pages/teacher/Dashboard'))
const CreateExamPage                = lazy(() => import('./pages/teacher/CreateExam'))
const LiveMonitoringPage            = lazy(() => import('./pages/teacher/LiveMonitoring'))
const AnalyticsPage                 = lazy(() => import('./pages/teacher/Analytics'))
const AIExamGeneratorPage           = lazy(() => import('./pages/teacher/AIExamGenerator'))
const AdvancedAnalyticsPage         = lazy(() => import('./pages/teacher/AdvancedAnalyticsDashboard'))
const ExamTemplatesLibraryPage      = lazy(() => import('./pages/teacher/ExamTemplatesLibrary'))
const QuestionBankManagerPage       = lazy(() => import('./pages/teacher/QuestionBankManager'))
const PlagiarismCheckerPage         = lazy(() => import('./pages/teacher/PlagiarismChecker'))
const ReportGeneratorPage           = lazy(() => import('./pages/teacher/ReportGenerator'))
const ExamDifficultyPage            = lazy(() => import('./pages/teacher/ExamDifficultyCalibrator'))
const StudentPerformancePredictorPage = lazy(() => import('./pages/teacher/StudentPerformancePredictor'))
const ExamSessionReplayPage         = lazy(() => import('./pages/teacher/ExamSessionReplay'))
const CollaborativeMonitoringPage   = lazy(() => import('./pages/teacher/CollaborativeMonitoring'))

// ─── Admin Pages ─────────────────────────────────────────────────────────────
const AdminDashboard               = lazy(() => import('./pages/admin/Dashboard'))
const UserManagementPage           = lazy(() => import('./pages/admin/UserManagement'))
const UserApprovalPage             = lazy(() => import('./pages/admin/UserApproval'))
const SecurityCenterPage           = lazy(() => import('./pages/admin/SecurityCenter'))
const WebhookManagementPage        = lazy(() => import('./pages/admin/WebhookManagement'))
const AccessibilityDashboardPage   = lazy(() => import('./pages/admin/AccessibilityDashboard'))
const AdvancedProctoringSettingsPage = lazy(() => import('./pages/admin/AdvancedProctoringSettings'))

// ─── Loading Fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

function App() {
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    let cleanupInterval: NodeJS.Timeout | null = null
    const initializeServices = async () => {
      try {
        performanceMonitor.init()
        await offlineStorage.init()
        cleanupInterval = setInterval(() => {
          if ((performance as any).memory) {
            const memoryUsage = (performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit
            if (memoryUsage > 0.9) {
              logger.warn('High memory usage detected', { usagePercent: (memoryUsage * 100).toFixed(1) + '%' })
              queryClient.clear()
            }
          }
          offlineStorage.clearOldData().catch(err => logger.error('Failed to clear old data', err))
          performanceMonitor.cleanup()
          queryClient.removeQueries({ predicate: (query) => !query.getObserversCount() })
        }, 30 * 60 * 1000)
      } catch (error) {
        logger.error('Failed to initialize services', error)
      }
    }
    initializeServices()
    return () => { if (cleanupInterval) clearInterval(cleanupInterval) }
  }, [])

  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
    return <>{children}</>
  }

  // ─── Student Route with Layout ────────────────────────────────────────────
  const SRoute = ({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) => (
    <ProtectedRoute allowedRoles={['student']}>
      <StudentLayout title={title} subtitle={subtitle}>
        {children}
      </StudentLayout>
    </ProtectedRoute>
  )

  // ─── Teacher Route with Layout ────────────────────────────────────────────
  const TRoute = ({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) => (
    <ProtectedRoute allowedRoles={['teacher', 'admin']}>
      <TeacherLayout title={title} subtitle={subtitle}>
        {children}
      </TeacherLayout>
    </ProtectedRoute>
  )

  // ─── Admin Route with Layout ──────────────────────────────────────────────
  const ARoute = ({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) => (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout title={title} subtitle={subtitle}>
        {children}
      </AdminLayout>
    </ProtectedRoute>
  )

  const getDashboardByRole = () => {
    if (!user) return <Navigate to="/login" replace />
    switch (user.role) {
      case 'student': return <Navigate to="/student/dashboard" replace />
      case 'teacher': return <Navigate to="/teacher/dashboard" replace />
      case 'admin':   return <Navigate to="/admin/dashboard" replace />
      default:        return <Navigate to="/" replace />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <div id="main-content" tabIndex={-1}>
            <Routes>
              {/* ── Public Routes ──────────────────────────────────────── */}
              <Route path="/"         element={<LandingPage />} />
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ── Generic Dashboard Redirect ────────────────────────── */}
              <Route path="/dashboard" element={<ProtectedRoute>{getDashboardByRole()}</ProtectedRoute>} />

              {/* ── Student Dashboard (with own sidebar) ─────────────── */}
              <Route path="/student/dashboard" element={
                <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>
              } />

              {/* ── Student Inner Pages (with shared layout) ─────────── */}
              <Route path="/student/results"               element={<SRoute title="My Results"><ExamResultPage /></SRoute>} />
              <Route path="/student/results/:submissionId" element={<SRoute title="Exam Result"><ExamResultPage /></SRoute>} />
              <Route path="/results/:submissionId"         element={<SRoute title="Exam Result"><ExamResultPage /></SRoute>} />
              <Route path="/student/ai-tutor"       element={<SRoute title="AI Tutor" subtitle="Ask anything, get instant help"><AITutorPage /></SRoute>} />
              <Route path="/student/materials"      element={<SRoute title="Study Materials"><StudyMaterialsPage /></SRoute>} />
              <Route path="/student/learning-path"  element={<SRoute title="Learning Path"><AILearningPathPage /></SRoute>} />
              <Route path="/student/gamification"   element={<SRoute title="Achievements"><GamificationPage /></SRoute>} />
              <Route path="/student/collaborative"  element={<SRoute title="Collaborative Exam"><CollaborativeExamPage /></SRoute>} />
              <Route path="/practice"               element={<SRoute title="Practice Tests"><PracticeSectionPage /></SRoute>} />
              <Route path="/practice/mock/:testId"  element={<ProtectedRoute allowedRoles={['student']}><PracticeMockExam /></ProtectedRoute>} />
              <Route path="/practice/results"       element={<SRoute title="Practice Results"><PracticeResults /></SRoute>} />

              {/* ── Exam Routes (no sidebar/layout — fullscreen) ──────── */}
              <Route path="/exam/:examId/verify" element={<ProtectedRoute allowedRoles={['student']}><PreExamVerificationPage /></ProtectedRoute>} />
              <Route path="/exam/:examId"         element={<ProtectedRoute allowedRoles={['student']}><ExamPage /></ProtectedRoute>} />

              {/* ── Teacher Dashboard (with own sidebar) ─────────────── */}
              <Route path="/teacher/dashboard" element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherDashboard /></ProtectedRoute>
              } />

              {/* ── Teacher Inner Pages (with shared layout) ─────────── */}
              <Route path="/teacher/create-exam"            element={<TRoute title="Create Exam"><CreateExamPage /></TRoute>} />
              {/* FIX: /teacher/live-monitoring (no examId required) */}
              <Route path="/teacher/live-monitoring"        element={<TRoute title="Live Monitoring"><LiveMonitoringPage /></TRoute>} />
              <Route path="/teacher/monitoring/:examId"     element={<TRoute title="Live Monitoring"><LiveMonitoringPage /></TRoute>} />
              <Route path="/teacher/analytics"              element={<TRoute title="Analytics"><AnalyticsPage /></TRoute>} />
              <Route path="/teacher/ai-generator"           element={<TRoute title="AI Exam Generator"><AIExamGeneratorPage /></TRoute>} />
              <Route path="/teacher/advanced-analytics"     element={<TRoute title="Advanced Analytics"><AdvancedAnalyticsPage /></TRoute>} />
              <Route path="/teacher/templates"              element={<TRoute title="Exam Templates"><ExamTemplatesLibraryPage /></TRoute>} />
              <Route path="/teacher/question-bank"          element={<TRoute title="Question Bank"><QuestionBankManagerPage /></TRoute>} />
              <Route path="/teacher/plagiarism"             element={<TRoute title="Plagiarism Checker"><PlagiarismCheckerPage /></TRoute>} />
              <Route path="/teacher/reports"                element={<TRoute title="Reports"><ReportGeneratorPage /></TRoute>} />
              <Route path="/teacher/difficulty-calibrator"  element={<TRoute title="Difficulty Calibrator"><ExamDifficultyPage /></TRoute>} />
              <Route path="/teacher/student-predictor"      element={<TRoute title="Student Predictor"><StudentPerformancePredictorPage /></TRoute>} />
              <Route path="/teacher/session-replay/:examId" element={<TRoute title="Session Replay"><ExamSessionReplayPage /></TRoute>} />
              <Route path="/teacher/collaborative-monitoring" element={<TRoute title="Collaborative Monitoring"><CollaborativeMonitoringPage /></TRoute>} />

              {/* ── Admin Dashboard (with own sidebar) ───────────────── */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />

              {/* ── Admin Inner Pages (with shared layout) ───────────── */}
              <Route path="/admin/users"               element={<ARoute title="User Management"><UserManagementPage /></ARoute>} />
              <Route path="/admin/approvals"           element={<ARoute title="User Approvals"><UserApprovalPage /></ARoute>} />
              <Route path="/admin/security"            element={<ARoute title="Security Center"><SecurityCenterPage /></ARoute>} />
              <Route path="/admin/webhooks"            element={<ARoute title="Webhooks"><WebhookManagementPage /></ARoute>} />
              <Route path="/admin/accessibility"       element={<ARoute title="Accessibility"><AccessibilityDashboardPage /></ARoute>} />
              <Route path="/admin/proctoring-settings" element={<ARoute title="Proctoring Settings"><AdvancedProctoringSettingsPage /></ARoute>} />

              {/* ── Common Protected Routes (role-aware layout) ────────── */}
              <Route path="/notifications" element={
                <ProtectedRoute>
                  {user?.role === 'admin' ? (
                    <AdminLayout title="Notifications"><NotificationCenterPage /></AdminLayout>
                  ) : user?.role === 'teacher' ? (
                    <TeacherLayout title="Notifications"><NotificationCenterPage /></TeacherLayout>
                  ) : (
                    <StudentLayout title="Notifications"><NotificationCenterPage /></StudentLayout>
                  )}
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  {user?.role === 'admin' ? (
                    <AdminLayout title="Settings"><SettingsPage /></AdminLayout>
                  ) : user?.role === 'teacher' ? (
                    <TeacherLayout title="Settings"><SettingsPage /></TeacherLayout>
                  ) : (
                    <StudentLayout title="Settings"><SettingsPage /></StudentLayout>
                  )}
                </ProtectedRoute>
              } />

              {/* ── 404 ───────────────────────────────────────────────── */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>

            {/* Global Accessibility Panel */}
            <AccessibilityPanel />
          </div>
        </Suspense>
      </Router>
    </QueryClientProvider>
  )
}

export default App

