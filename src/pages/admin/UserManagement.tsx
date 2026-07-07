import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Download,
  Mail,
  X,
  Shield,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  Eye,
  MoreVertical,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { api } from '../../lib/api'
import { toast } from 'sonner'

interface User {
  _id: string
  email: string
  full_name: string
  role: string
  program?: string
  semester?: number
  department?: string
  status: string
  is_active: boolean
  email_verified?: boolean
  created_at?: string
  cgpa?: number
  statistics?: {
    totalExamsTaken: number
    averageScore: number
    studyHours: number
  }
  rejection_reason?: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  student: { label: 'Student', color: 'text-blue-700', bg: 'bg-blue-100', icon: BookOpen },
  teacher: { label: 'Teacher', color: 'text-green-700', bg: 'bg-green-100', icon: GraduationCap },
  admin: { label: 'Admin', color: 'text-purple-700', bg: 'bg-purple-100', icon: Shield },
}
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
  suspended: { label: 'Suspended', color: 'text-orange-700', bg: 'bg-orange-100' },
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
    program: '',
    semester: '',
    department: '',
  })

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterRole !== 'all') params.role = filterRole
      const { data } = await api.get('/api/users', { params })
      setUsers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Unknown error'
      if (err?.response?.status === 401) {
        toast.error('Session expired. Please login again.')
      } else if (err?.response?.status === 403) {
        toast.error('You do not have permission to view users.')
      } else {
        toast.error('Failed to load users: ' + msg)
      }
    } finally {
      setLoading(false)
    }
  }, [filterRole])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openDetail = async (user: User) => {
    setSelectedUser(user)
    setDrawerOpen(true)
    // Fetch full details
    try {
      const { data } = await api.get(`/api/users/${user._id}`)
      setSelectedUser(data)
    } catch {
      /* use cached data */
    }
  }

  const handleAction = async (
    userId: string,
    action: 'approve' | 'reject' | 'suspend' | 'activate' | 'delete',
    userName: string
  ) => {
    setOpenMenu(null)
    if (action === 'delete') {
      if (!confirm(`Delete ${userName}? This cannot be undone.`)) return
    }
    if (action === 'reject') {
      const reason = prompt(`Rejection reason for ${userName}:`)
      if (!reason) return
      setActionLoading(userId)
      try {
        await api.post(`/api/users/${userId}/reject`, null, { params: { reason } })
        toast.success(`${userName} rejected`)
        loadUsers()
        if (selectedUser?._id === userId) setDrawerOpen(false)
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || 'Action failed')
      } finally {
        setActionLoading(null)
      }
      return
    }

    setActionLoading(userId)
    try {
      if (action === 'delete') {
        await api.delete(`/api/users/${userId}`)
        toast.success(`${userName} deleted`)
        if (selectedUser?._id === userId) setDrawerOpen(false)
      } else if (action === 'approve') {
        await api.post(`/api/users/${userId}/approve`)
        toast.success(`✅ ${userName} approved!`)
      } else if (action === 'suspend') {
        await api.post(`/api/users/${userId}/suspend`)
        toast.success(`${userName} suspended`)
      } else if (action === 'activate') {
        await api.post(`/api/users/${userId}/activate`)
        toast.success(`${userName} activated`)
      }
      loadUsers()
      if (selectedUser?._id === userId) {
        // refresh drawer user
        const { data } = await api.get(`/api/users/${userId}`)
        setSelectedUser(data)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = users.filter(u => {
    const matchSearch =
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    const matchStatus = filterStatus === 'all' || u.status === filterStatus
    return matchSearch && matchRole && matchStatus
  })

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No users to export')
      return
    }
    const headers = ['Name', 'Email', 'Role', 'Status', 'Program/Dept', 'Joined']
    const rows = filtered.map(u => [
      u.full_name,
      u.email,
      u.role,
      u.status,
      u.program || u.department || '—',
      u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} users`)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.full_name || !createForm.email || !createForm.password) {
      toast.error('Name, email and password are required')
      return
    }
    setCreateLoading(true)
    try {
      const payload: any = {
        full_name: createForm.full_name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      }
      if (createForm.program) payload.program = createForm.program
      if (createForm.department) payload.department = createForm.department
      if (createForm.semester) payload.semester = parseInt(createForm.semester)
      await api.post('/api/users', payload)
      toast.success(`✅ User "${createForm.full_name}" created successfully!`)
      setShowCreateModal(false)
      setCreateForm({
        full_name: '',
        email: '',
        password: '',
        role: 'student',
        program: '',
        semester: '',
        department: '',
      })
      loadUsers()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create user')
    } finally {
      setCreateLoading(false)
    }
  }

  const stats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    admins: users.filter(u => u.role === 'admin').length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.is_active).length,
  }

  const Avatar = ({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClass =
      size === 'lg'
        ? 'w-16 h-16 text-2xl'
        : size === 'sm'
          ? 'w-8 h-8 text-sm'
          : 'w-10 h-10 text-base'
    const colors: Record<string, string> = {
      student: 'from-blue-500 to-cyan-500',
      teacher: 'from-green-500 to-emerald-500',
      admin: 'from-purple-500 to-violet-500',
    }
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br ${colors[user.role] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white font-bold flex-shrink-0`}
      >
        {user.full_name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Manage all users — students, teachers, admins
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={loadUsers}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Students', value: stats.students, color: 'text-blue-700', bg: 'bg-blue-50' },
            {
              label: 'Teachers',
              value: stats.teachers,
              color: 'text-green-700',
              bg: 'bg-green-50',
            },
            { label: 'Admins', value: stats.admins, color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
            {
              label: 'Active',
              value: stats.active,
              color: 'text-emerald-700',
              bg: 'bg-emerald-50',
            },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 border border-white shadow-sm`}>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          >
            <option value="all">All Status</option>
            <option value="approved">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          <span className="text-sm text-gray-400 ml-auto">
            Showing {filtered.length} of {users.length}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading users...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-sm">No users found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['User', 'Role', 'Program / Dept', 'Status', 'Joined', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(user => {
                    const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.student
                    const status = STATUS_CONFIG[user.status] || STATUS_CONFIG.pending
                    return (
                      <motion.tr
                        key={user._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        {/* User */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <Avatar user={user} size="sm" />
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {user.full_name}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${role.bg} ${role.color}`}
                          >
                            <role.icon className="w-3 h-3" />
                            {role.label}
                          </span>
                        </td>

                        {/* Program */}
                        <td className="py-3.5 px-5 text-sm text-gray-600">
                          {user.program || user.department || '—'}
                          {user.semester && (
                            <span className="text-gray-400"> · Sem {user.semester}</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="py-3.5 px-5 text-xs text-gray-400">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1">
                            {/* View Detail */}
                            <button
                              onClick={() => openDetail(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Status action */}
                            {user.status === 'pending' && (
                              <button
                                onClick={() => handleAction(user._id, 'approve', user.full_name)}
                                disabled={actionLoading === user._id}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {user.is_active && user.status === 'approved' && (
                              <button
                                onClick={() => handleAction(user._id, 'suspend', user.full_name)}
                                disabled={actionLoading === user._id}
                                className="p-1.5 text-orange-500 hover:bg-orange-100 rounded-lg transition disabled:opacity-50"
                                title="Suspend"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                            {!user.is_active && user.status === 'suspended' && (
                              <button
                                onClick={() => handleAction(user._id, 'activate', user.full_name)}
                                disabled={actionLoading === user._id}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                                title="Activate"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* More menu */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenu(openMenu === user._id ? null : user._id)}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenu === user._id && (
                                <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-xl z-20 min-w-36 py-1">
                                  {user.status === 'pending' && (
                                    <button
                                      onClick={() =>
                                        handleAction(user._id, 'reject', user.full_name)
                                      }
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <X className="w-3.5 h-3.5" /> Reject
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleAction(user._id, 'delete', user.full_name)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── User Detail Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && selectedUser && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-40 overflow-y-auto"
            >
              {/* Drawer header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-gray-900">User Details</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile banner */}
                <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                  <Avatar user={selectedUser} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-900 text-xl truncate">
                      {selectedUser.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      {selectedUser.email}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(() => {
                        const rc = ROLE_CONFIG[selectedUser.role] || ROLE_CONFIG.student
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${rc.bg} ${rc.color}`}
                          >
                            <rc.icon className="w-3 h-3" />
                            {rc.label}
                          </span>
                        )
                      })()}
                      {(() => {
                        const sc = STATUS_CONFIG[selectedUser.status] || STATUS_CONFIG.pending
                        return (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.color}`}
                          >
                            {sc.label}
                          </span>
                        )
                      })()}
                      {selectedUser.email_verified && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                          ✓ Email Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Program', value: selectedUser.program || '—', icon: BookOpen },
                    {
                      label: 'Semester',
                      value: selectedUser.semester ? `Sem ${selectedUser.semester}` : '—',
                      icon: Calendar,
                    },
                    {
                      label: 'Department',
                      value: selectedUser.department || '—',
                      icon: GraduationCap,
                    },
                    {
                      label: 'CGPA',
                      value: selectedUser.cgpa != null ? selectedUser.cgpa.toFixed(2) : '—',
                      icon: Shield,
                    },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-xs font-medium text-gray-400">{label}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Statistics */}
                {selectedUser.statistics && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Academic Statistics</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center bg-blue-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-blue-700">
                          {selectedUser.statistics.totalExamsTaken}
                        </p>
                        <p className="text-xs text-blue-500 mt-0.5">Exams Taken</p>
                      </div>
                      <div className="text-center bg-green-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-green-700">
                          {selectedUser.statistics.averageScore?.toFixed(1) || '—'}%
                        </p>
                        <p className="text-xs text-green-500 mt-0.5">Avg Score</p>
                      </div>
                      <div className="text-center bg-purple-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-purple-700">
                          {selectedUser.statistics.studyHours}h
                        </p>
                        <p className="text-xs text-purple-500 mt-0.5">Study Hours</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Joined date */}
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Registered: </span>
                  <span className="font-medium text-gray-700">
                    {selectedUser.created_at
                      ? new Date(selectedUser.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>

                {/* Rejection reason */}
                {selectedUser.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Rejection Reason</p>
                      <p className="text-sm text-red-600 mt-0.5">{selectedUser.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="border-t border-gray-100 pt-5 space-y-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Quick Actions</h4>

                  {selectedUser.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleAction(selectedUser._id, 'approve', selectedUser.full_name)
                        }
                        disabled={!!actionLoading}
                        className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() =>
                          handleAction(selectedUser._id, 'reject', selectedUser.full_name)
                        }
                        disabled={!!actionLoading}
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}

                  {selectedUser.is_active && selectedUser.status === 'approved' && (
                    <button
                      onClick={() =>
                        handleAction(selectedUser._id, 'suspend', selectedUser.full_name)
                      }
                      disabled={!!actionLoading}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <UserX className="w-4 h-4" /> Suspend Account
                    </button>
                  )}

                  {selectedUser.status === 'suspended' && (
                    <button
                      onClick={() =>
                        handleAction(selectedUser._id, 'activate', selectedUser.full_name)
                      }
                      disabled={!!actionLoading}
                      className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <UserCheck className="w-4 h-4" /> Reactivate Account
                    </button>
                  )}

                  <button
                    onClick={() => handleAction(selectedUser._id, 'delete', selectedUser.full_name)}
                    disabled={!!actionLoading}
                    className="w-full py-2.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" /> Delete User
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Close dropdown on outside click */}
      {openMenu && <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />}

      {/* ── Create User Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Create New User</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      User will be immediately approved
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-white/60 rounded-xl transition"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.full_name}
                        onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="user@pcmt.edu.in"
                        required
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Min 8 characters"
                        required
                        minLength={6}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Role *
                      </label>
                      <select
                        value={createForm.role}
                        onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {createForm.role === 'student' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Program
                          </label>
                          <input
                            type="text"
                            value={createForm.program}
                            onChange={e => setCreateForm(f => ({ ...f, program: e.target.value }))}
                            placeholder="e.g. BCA, MCA"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Semester
                          </label>
                          <input
                            type="number"
                            value={createForm.semester}
                            onChange={e => setCreateForm(f => ({ ...f, semester: e.target.value }))}
                            placeholder="1–8"
                            min="1"
                            max="8"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Department
                        </label>
                        <input
                          type="text"
                          value={createForm.department}
                          onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))}
                          placeholder="e.g. Computer Science"
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {createLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{' '}
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Create User
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
