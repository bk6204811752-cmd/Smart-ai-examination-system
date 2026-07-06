import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  GraduationCap,
  Calendar,
  AlertCircle,
  Filter,
  Search,
  Eye,
  X,
  BookOpen,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { api } from '../../lib/api'
import { toast } from 'sonner'

interface PendingUser {
  _id: string
  email: string
  full_name: string
  role: 'student' | 'teacher'
  program?: string
  semester?: number
  department?: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  email_verified?: boolean
  cgpa?: number
  rejection_reason?: string
  statistics?: { totalExamsTaken: number; averageScore: number; studyHours: number }
}

export default function UserApprovalManagement() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [allUsers, setAllUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [viewUser, setViewUser] = useState<PendingUser | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      // Fetch pending users (only those who verified email)
      const pendingRes = await api.get('/api/users/pending')
      setPendingUsers(pendingRes.data || [])
      
      // Fetch all users for other tabs
      const allRes = await api.get('/api/users')
      setAllUsers(allRes.data || [])
      
      toast.success('Users loaded successfully', {
        description: `Showing ${pendingRes.data?.length || 0} pending approvals`
      })
    } catch (error: any) {
      toast.error('Failed to fetch users')
      console.error('Error fetching users:', error)
      setPendingUsers([])
      setAllUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to approve ${userName}?`)) return
    
    try {
      setProcessingId(userId)
      await api.post(`/api/users/${userId}/approve`)
      
      toast.success(`✅ ${userName} approved successfully!`, {
        description: 'User can now login to the system'
      })
      
      // Refresh user lists immediately
      await fetchUsers()
    } catch (error: any) {
      toast.error('Failed to approve user')
      console.error(error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (userId: string, userName: string) => {
    const reason = prompt(`Enter rejection reason for ${userName}:`)
    if (!reason) return
    
    try {
      setProcessingId(userId)
      await api.post(`/api/users/${userId}/reject`, null, { 
        params: { reason } 
      })
      
      toast.error(`${userName} registration rejected`, {
        description: reason
      })
      
      // Refresh user lists immediately
      await fetchUsers()
    } catch (error: any) {
      toast.error('Failed to reject user')
      console.error(error)
    } finally {
      setProcessingId(null)
    }
  }

  const displayUsers = filter === 'pending'
    ? pendingUsers
    : filter === 'all'
      ? allUsers
      : allUsers.filter(u => u.status === filter)
  const filteredUsers = displayUsers.filter(user => 
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openDetail = async (user: PendingUser) => {
    setViewUser(user)
    try {
      const { data } = await api.get(`/api/users/${user._id}`)
      setViewUser(data)
    } catch { /* use cached */ }
  }

  const stats = {
    pending: pendingUsers.length,
    total: allUsers.length,
    approved: allUsers.filter(u => u.status === 'approved').length,
    rejected: allUsers.filter(u => u.status === 'rejected').length
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Approval Management</h1>
          <p className="text-gray-600 mt-2">Review and approve new user registrations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Approved</p>
                <p className="text-3xl font-bold text-green-700">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-700">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Users</p>
                <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'approved'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <XCircle className="w-4 h-4 inline mr-2" />
                Rejected
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4 inline mr-2" />
                All Users
              </button>
            </div>

            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {filter === 'pending' 
                ? 'No pending approvals at the moment' 
                : 'No users match your filter criteria'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {filter === 'pending' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.full_name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'teacher'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.program || '-'}
                          {user.semester && ` (Sem ${user.semester})`}
                        </div>
                        {user.department && (
                          <div className="text-xs text-gray-500">{user.department}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(user.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                          {user.status === 'rejected' && <XCircle className="w-3 h-3 mr-1 inline" />}
                          {user.status === 'pending' && <Clock className="w-3 h-3 mr-1 inline" />}
                          {(user.status || 'pending').charAt(0).toUpperCase() + (user.status || 'pending').slice(1)}
                        </span>
                      </td>
                      {filter === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openDetail(user)}
                            className="text-blue-500 hover:text-blue-700 mr-3"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5 inline" />
                          </button>
                          <button
                            onClick={() => handleApprove(user._id, user.full_name)}
                            disabled={processingId === user._id}
                            className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                          >
                            <CheckCircle className="w-5 h-5 inline mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(user._id, user.full_name)}
                            disabled={processingId === user._id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <XCircle className="w-5 h-5 inline mr-1" />
                            Reject
                          </button>
                        </td>
                      )}
                      {filter !== 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => openDetail(user)}
                            className="text-blue-500 hover:text-blue-700"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5 inline" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Alert */}
        {filter === 'pending' && pendingUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Pending Approvals</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You have {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} waiting for approval. 
                  Review their information and approve or reject their registration.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── User Detail Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {viewUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewUser(null)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">User Details</h2>
                <button onClick={() => setViewUser(null)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Banner */}
                <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black">
                    {viewUser.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-gray-900">{viewUser.full_name}</h3>
                    <p className="text-sm text-gray-500">{viewUser.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        viewUser.role === 'teacher' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>{viewUser.role.charAt(0).toUpperCase() + viewUser.role.slice(1)}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        viewUser.status === 'approved' ? 'bg-green-100 text-green-700' :
                        viewUser.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{(viewUser.status || 'pending').charAt(0).toUpperCase() + (viewUser.status || 'pending').slice(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Program',    value: viewUser.program    || '—' },
                    { label: 'Semester',   value: viewUser.semester ? `Semester ${viewUser.semester}` : '—' },
                    { label: 'Department', value: viewUser.department  || '—' },
                    { label: 'Registered', value: viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400 font-medium">{label}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {viewUser.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Rejection Reason</p>
                      <p className="text-sm text-red-600">{viewUser.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {viewUser.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { handleApprove(viewUser._id, viewUser.full_name); setViewUser(null) }}
                      disabled={processingId === viewUser._id}
                      className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => { handleReject(viewUser._id, viewUser.full_name); setViewUser(null) }}
                      disabled={processingId === viewUser._id}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
