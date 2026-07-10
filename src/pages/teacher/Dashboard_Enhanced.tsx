import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/globalStore'
import { examAPI, analyticsAPI, notificationsAPI } from '../../lib/api'
import {
  PlusCircle,
  Users,
  BarChart,
  Monitor,
  LogOut,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  Award,
  FileText,
  Activity,
  Zap,
  Eye,
  Bell,
  Brain,
  Sparkles,
  Edit3,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ExamData {
  _id: string
  title: string
  subject: string
  total_questions: number
  duration: number
  created_by: string
  scheduled_date?: string
  active_students?: number
  completion_rate?: number
  avg_score?: number
}

export default function TeacherDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [myExams, setMyExams] = useState<ExamData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeExams, setActiveExams] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [teacherStats, setTeacherStats] = useState<{ avg_score: number; pass_rate: number } | null>(
    null
  )
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      const [examsData, teacherData, activityData, notifData] = await Promise.all([
        examAPI.getExams(),
        analyticsAPI.getTeacherAnalytics().catch(() => null),
        analyticsAPI.getRecentActivity().catch(() => []),
        notificationsAPI.getNotifications(true, 1).catch(() => ({ total: 0 })),
      ])
      const myExamsData = (examsData || []).filter((e: any) => e.created_by === user?.email)
      setMyExams(myExamsData)
      setActiveExams(myExamsData.filter((e: any) => e.status === 'active').length)
      setTotalStudents(
        myExamsData.reduce((sum: number, e: any) => sum + (e.enrolled_students || 0), 0)
      )
      setTeacherStats(
        teacherData ? { avg_score: teacherData.avg_score, pass_rate: teacherData.pass_rate } : null
      )
      setRecentActivity(Array.isArray(activityData) ? activityData : [])
      setNotifCount(notifData?.total || 0)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const stats = [
    {
      icon: BookOpen,
      label: 'Total Exams',
      value: myExams.length.toString(),
      change: `${activeExams} active`,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Users,
      label: 'Students Enrolled',
      value: totalStudents.toString(),
      change: 'Across all exams',
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: CheckCircle,
      label: 'Pass Rate',
      value: teacherStats ? `${teacherStats.pass_rate}%` : 'N/A',
      change: teacherStats ? 'Current average' : 'Loading...',
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: Award,
      label: 'Avg Score',
      value: teacherStats ? `${teacherStats.avg_score}%` : 'N/A',
      change: 'Class average',
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ]

  const quickActions = [
    {
      title: 'Create Exam',
      description: 'Design new examination',
      icon: PlusCircle,
      link: '/teacher/create-exam',
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Live Monitoring',
      description: 'Monitor active exams',
      icon: Monitor,
      link: '/teacher/live-monitoring',
      gradient: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Analytics',
      description: 'Performance insights',
      icon: BarChart,
      link: '/teacher/analytics',
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Plagiarism Check',
      description: 'Verify originality',
      icon: Brain,
      link: '/teacher/plagiarism',
      gradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  PCMT Exam System
                </h1>
                <p className="text-sm text-gray-600">Teacher Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-purple-600 transition">
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-gray-500">Educator</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome, {user?.full_name}! 👨‍🏫
              </h2>
              <p className="text-gray-600">Manage your exams and monitor student performance</p>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">{activeExams} exams active</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all duration-300 border border-gray-100"
            >
              <div
                className={`${stat.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}
              >
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Quick Actions
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="bg-white rounded-xl p-5 hover:shadow-lg transition-all duration-300 border border-gray-100 group"
              >
                <div
                  className={`${action.iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                </div>
                <h4 className="font-semibold mb-1">{action.title}</h4>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* My Exams List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-500" />
                  My Exams
                </h3>
                <Link
                  to="/teacher/create-exam"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  + Create New
                </Link>
              </div>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading exams...</p>
                </div>
              ) : myExams.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">No exams created yet</p>
                  <Link
                    to="/teacher/create-exam"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Your First Exam
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myExams.slice(0, 5).map(exam => (
                    <div
                      key={exam._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{exam.title}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600 flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            {exam.total_questions} questions
                          </span>
                          <span className="text-sm text-gray-600 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {exam.duration} mins
                          </span>
                          {exam.active_students !== undefined && (
                            <span className="text-sm text-gray-600 flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {exam.active_students} active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/teacher/edit-exam/${exam._id}`}
                          className="px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition flex items-center"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                        <Link
                          to={`/teacher/monitoring/${exam._id}`}
                          className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Monitor
                        </Link>
                      </div>
                    </div>
                  ))}
                  {myExams.length > 5 && (
                    <Link
                      to="/teacher/exams"
                      className="block text-center py-2 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      View All {myExams.length} Exams →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity & Insights */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-500" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => {
                  const colorMap: Record<string, string> = {
                    exam: 'blue',
                    alert: 'red',
                    user: 'green',
                    system: 'purple',
                  }
                  const c = colorMap[activity.type] || 'gray'
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div
                        className={`w-10 h-10 bg-${c}-100 rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        {activity.type === 'alert' ? (
                          <AlertTriangle className={`w-5 h-5 text-${c}-600`} />
                        ) : activity.type === 'exam' ? (
                          <FileText className={`w-5 h-5 text-${c}-600`} />
                        ) : activity.type === 'user' ? (
                          <Users className={`w-5 h-5 text-${c}-600`} />
                        ) : (
                          <Activity className={`w-5 h-5 text-${c}-600`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-xs text-gray-600">{activity.time}</p>
                      </div>
                    </div>
                  )
                })}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>

            {/* Quick Insights */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm p-6 border border-purple-200">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                Insights
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">Top Performing Class</p>
                  <p className="text-xs text-gray-600">BCA Semester 5 - 89% avg</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">Most Challenging Topic</p>
                  <p className="text-xs text-gray-600">Database Normalization</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">Upcoming Deadline</p>
                  <p className="text-xs text-gray-600">Exam review due in 2 days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
