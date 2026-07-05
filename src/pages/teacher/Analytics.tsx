import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, FileText, Award, Download, Filter, Calendar } from 'lucide-react'
import { analyticsAPI } from '../../lib/api'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const [selectedProgram, setSelectedProgram] = useState('all')

  // Mock data - replace with API calls
  const stats = {
    totalExams: 45,
    totalStudents: 1250,
    avgScore: 78.5,
    passRate: 85.2
  }

  const examPerformance = [
    { name: 'Data Structures', avg: 82, students: 245, pass: 88 },
    { name: 'DBMS', avg: 76, students: 230, pass: 82 },
    { name: 'Web Tech', avg: 85, students: 220, pass: 91 },
    { name: 'Java', avg: 73, students: 235, pass: 79 },
    { name: 'Python', avg: 88, students: 240, pass: 94 },
  ]

  const trendData = [
    { month: 'Jan', avgScore: 75, students: 200 },
    { month: 'Feb', avgScore: 78, students: 215 },
    { month: 'Mar', avgScore: 76, students: 230 },
    { month: 'Apr', avgScore: 81, students: 245 },
    { month: 'May', avgScore: 79, students: 250 },
    { month: 'Jun', avgScore: 83, students: 260 },
  ]

  const programDistribution = [
    { name: 'BCA', value: 450, color: '#3B82F6' },
    { name: 'BBA', value: 320, color: '#10B981' },
    { name: 'B.Tech', value: 280, color: '#F59E0B' },
    { name: 'MBA', value: 120, color: '#EF4444' },
    { name: 'MCA', value: 80, color: '#8B5CF6' },
  ]

  const gradeDistribution = [
    { grade: 'A+', count: 180, percentage: 14.4 },
    { grade: 'A', count: 250, percentage: 20.0 },
    { grade: 'B+', count: 320, percentage: 25.6 },
    { grade: 'B', count: 280, percentage: 22.4 },
    { grade: 'C', count: 150, percentage: 12.0 },
    { grade: 'F', count: 70, percentage: 5.6 },
  ]

  const topPerformers = [
    { name: 'Rahul Sharma', program: 'BCA', cgpa: 9.8, exams: 12 },
    { name: 'Priya Singh', program: 'BBA', cgpa: 9.7, exams: 11 },
    { name: 'Amit Kumar', program: 'B.Tech', cgpa: 9.6, exams: 13 },
    { name: 'Sneha Reddy', program: 'MCA', cgpa: 9.5, exams: 10 },
    { name: 'Arjun Patel', program: 'MBA', cgpa: 9.4, exams: 9 },
  ]

  useEffect(() => {
    loadAnalytics()
  }, [timeRange, selectedProgram])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // const data = await analyticsAPI.getDashboardAnalytics()
      // Process data
      setTimeout(() => setLoading(false), 500)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      setLoading(false)
    }
  }

  const exportReport = () => {
    alert('Exporting report... (Feature coming soon)')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive performance insights and reports</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Programs</option>
                <option value="BCA">BCA</option>
                <option value="BBA">BBA</option>
                <option value="B.Tech">B.Tech</option>
                <option value="MBA">MBA</option>
                <option value="MCA">MCA</option>
              </select>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="semester">This Semester</option>
                <option value="year">This Year</option>
              </select>
              <button
                onClick={exportReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-green-600 font-medium">+12%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalExams}</p>
            <p className="text-sm text-gray-600">Total Exams</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-green-600" />
              <span className="text-sm text-green-600 font-medium">+8%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
            <p className="text-sm text-gray-600">Active Students</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-green-600 font-medium">+5%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.avgScore}%</p>
            <p className="text-sm text-gray-600">Average Score</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <Award className="w-8 h-8 text-orange-600" />
              <span className="text-sm text-green-600 font-medium">+3%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.passRate}%</p>
            <p className="text-sm text-gray-600">Pass Rate</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Exam Performance */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Exam Performance by Subject</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={examPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg" fill="#3B82F6" name="Average Score" />
                <Bar dataKey="pass" fill="#10B981" name="Pass Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trend Analysis */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Performance Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="#3B82F6" strokeWidth={2} name="Avg Score" />
                <Line yAxisId="right" type="monotone" dataKey="students" stroke="#10B981" strokeWidth={2} name="Students" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Program Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Program Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={programDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {programDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Grade Distribution</h2>
            <div className="space-y-3">
              {gradeDistribution.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-16 font-semibold text-gray-900">{item.grade}</div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${item.percentage * 5}%` }}
                      >
                        <span className="text-xs text-white font-medium">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-gray-600">{item.count} students</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Award className="w-6 h-6 mr-2 text-yellow-500" />
            Top Performers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Rank</th>
                  <th className="text-left py-3 px-4">Student Name</th>
                  <th className="text-left py-3 px-4">Program</th>
                  <th className="text-left py-3 px-4">CGPA</th>
                  <th className="text-left py-3 px-4">Exams Taken</th>
                  <th className="text-left py-3 px-4">Performance</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((student, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {index === 0 && <span className="text-2xl">🥇</span>}
                        {index === 1 && <span className="text-2xl">🥈</span>}
                        {index === 2 && <span className="text-2xl">🥉</span>}
                        {index > 2 && <span className="text-gray-600 font-medium">{index + 1}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{student.name}</td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {student.program}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-green-600">{student.cgpa}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{student.exams}</td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full"
                          style={{ width: `${(student.cgpa / 10) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
