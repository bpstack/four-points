// app/dashboard/profile/settings/page.tsx
'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { apiClient } from '@/app/lib/apiClient'
import { useAuth } from '@/app/lib/auth/useAuth'
import NewUserModal from '@/app/components/auth/NewUserModal'
import { UsersTableSkeleton } from '@/app/ui/skeletons'
import { notificationsApi } from '@/app/lib/groups'

import {
  FiUsers,
  FiBell,
  FiShield,
  FiEdit2,
  FiTrash2,
  FiArrowLeft,
  FiRefreshCw,
  FiUserPlus,
  FiCheck,
  FiX,
} from 'react-icons/fi'

// Tipos
interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'group-admin' | 'recepcionista' | 'mantenimiento' | string
  created_at?: string
  updated_at?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Configuración de roles con colores y etiquetas
const ROLE_CONFIG = {
  admin: {
    label: 'Administrator',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  'group-admin': {
    label: 'Group Admin',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  recepcionista: {
    label: 'Receptionist',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  mantenimiento: {
    label: 'Maintenance',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth()
  const isUserAdmin = currentUser?.role?.toLowerCase().trim() === 'admin'

  // ✅ Inicializar activeTab basado en el rol del usuario
  const [activeTab, setActiveTab] = useState<'users' | 'notifications' | 'security'>(
    isUserAdmin ? 'users' : 'notifications'
  )

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ✅ REMOVER este useEffect que causa problemas
  // useEffect(() => {
  //   if (!isUserAdmin && activeTab === 'users') {
  //     setActiveTab('notifications')
  //   }
  // }, [isUserAdmin, activeTab])

  // ✅ Solo fetchUsers si es admin Y el tab está en users
  useEffect(() => {
    if (activeTab === 'users' && isUserAdmin) {
      fetchUsers()
    }
  }, [activeTab, isUserAdmin])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      if (process.env.NODE_ENV === 'development') {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      const data = await apiClient.get(`${API_URL}/api/users`)
      const usersList = Array.isArray(data) ? data : data.users || data.data || []

      if (!Array.isArray(usersList)) {
        setError('Invalid server response format')
        setUsers([])
        return
      }

      setUsers(usersList)
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Error loading users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      await apiClient.delete(`${API_URL}/api/users/${id}`)
      setUsers(users.filter((u) => u.id !== id))
    } catch (err: any) {
      alert(err.message || 'Error deleting user')
    }
  }

  const handleUserCreated = () => {
    fetchUsers()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/dashboard/profile">
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors">
                <FiArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your account preferences and system configuration
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-[#30363d] mb-6">
          <nav className="flex gap-6 overflow-x-auto">
            {/* ✅ Solo mostrar User Management si es admin */}
            {isUserAdmin && (
              <TabButton
                label="User Management"
                icon={<FiUsers className="w-4 h-4" />}
                active={activeTab === 'users'}
                onClick={() => setActiveTab('users')}
              />
            )}
            <TabButton
              label="Notifications"
              icon={<FiBell className="w-4 h-4" />}
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
            />
            <TabButton
              label="Security"
              icon={<FiShield className="w-4 h-4" />}
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
            />
          </nav>
        </div>

        {/* Content */}
        <div>
          {/* ✅ Solo renderizar UserManagement si es admin */}
          {activeTab === 'users' && isUserAdmin && (
            <UserManagement
              users={users}
              loading={loading}
              error={error}
              onDelete={handleDeleteUser}
              onRefresh={fetchUsers}
              onOpenModal={() => setIsModalOpen(true)}
              currentUserRole={currentUser?.role}
            />
          )}
          {activeTab === 'notifications' && <NotificationsSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>

      {/* Modal */}
      {isUserAdmin && (
        <NewUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleUserCreated}
        />
      )}
    </div>
  )
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
        active
          ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function UserManagement({
  users,
  loading,
  error,
  onDelete,
  onRefresh,
  onOpenModal,
  currentUserRole,
}: {
  users: User[]
  loading: boolean
  error: string | null
  onDelete: (id: string) => void
  onRefresh: () => void
  onOpenModal: () => void
  currentUserRole?: string
}) {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-[#30363d]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage system users and their roles
            </p>
          </div>
          <div className="flex gap-2">
            {currentUserRole === 'admin' && (
              <button
                onClick={onOpenModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                <FiUserPlus className="w-4 h-4" />
                <span>New User</span>
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] hover:border-gray-400 dark:hover:border-[#58a6ff] rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && <UsersTableSkeleton />}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="text-center py-12">
            <FiUsers className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No users available</p>
          </div>
        )}

        {!loading && !error && users.length > 0 && <UserTable users={users} onDelete={onDelete} />}
      </div>
    </div>
  )
}

function UserTable({ users, onDelete }: { users: User[]; onDelete: (id: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<User>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setEditForm({ username: user.username, email: user.email, role: user.role })
  }

  const handleSave = async (id: string) => {
    if (!editForm.username || !editForm.email || !editForm.role) {
      alert('All fields are required')
      return
    }

    setSavingId(id)
    try {
      await apiClient.put(`${API_URL}/api/users/${id}`, {
        username: editForm.username,
        email: editForm.email,
        role: editForm.role,
      })

      setEditingId(null)
      setEditForm({})
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Error updating user')
    } finally {
      setSavingId(null)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const getRoleConfig = (role: string) => {
    return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.recepcionista
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-[#30363d]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-[#30363d]">
            {users.map((user) => {
              const roleConfig = getRoleConfig(user.role)
              const isEditing = editingId === user.id

              return (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-[#0d1117]/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.username || ''}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <select
                        value={editForm.role || ''}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full min-w-[160px] px-3 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="recepcionista">Receptionist</option>
                        <option value="admin">Administrator</option>
                        <option value="group-admin">Group Admin</option>
                        <option value="mantenimiento">Maintenance</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${roleConfig.color} ${roleConfig.borderColor}`}
                      >
                        {roleConfig.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSave(user.id)}
                          disabled={savingId === user.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                          {savingId === user.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                        >
                          <FiX className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(user.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {users.map((user) => {
          const roleConfig = getRoleConfig(user.role)
          const isEditing = editingId === user.id

          return (
            <div
              key={user.id}
              className="bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg p-4"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editForm.username || ''}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#303d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#303d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={editForm.role || ''}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#303d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
                    >
                      <option value="recepcionista">Receptionist</option>
                      <option value="admin">Administrator</option>
                      <option value="group-admin">Group Admin</option>
                      <option value="mantenimiento">Maintenance</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleSave(user.id)}
                      disabled={savingId === user.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <FiCheck className="w-4 h-4" />
                      {savingId === user.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#303d] hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(user.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${roleConfig.color} ${roleConfig.borderColor}`}
                    >
                      {roleConfig.label}
                    </span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function NotificationsSettings() {
  const [checkingNotifications, setCheckingNotifications] = useState(false)
  const [notificationResult, setNotificationResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleCheckNotifications = async () => {
    setCheckingNotifications(true)
    setNotificationResult(null)

    try {
      const response = await notificationsApi.checkPending()

      setNotificationResult({
        type: 'success',
        message: response.data
          ? `✓ Verified: ${response.data.checked}, Sent: ${response.data.sent}, Failed: ${response.data.failed}`
          : response.message,
      })

      setTimeout(() => setNotificationResult(null), 5000)
    } catch (error: any) {
      setNotificationResult({
        type: 'error',
        message: error.message || 'Error checking notifications',
      })

      setTimeout(() => setNotificationResult(null), 5000)
    } finally {
      setCheckingNotifications(false)
    }
  }

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-[#30363d]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage how you receive notifications from the system
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-[#30363d]">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Email notifications</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Receive updates via email
            </p>
          </div>
          <input
            type="checkbox"
            defaultChecked
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="py-3 border-b border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Push notifications
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Check and send pending notifications
              </p>
            </div>
            <button
              onClick={handleCheckNotifications}
              disabled={checkingNotifications}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <FiRefreshCw className={`w-4 h-4 ${checkingNotifications ? 'animate-spin' : ''}`} />
              {checkingNotifications ? 'Checking...' : 'Update'}
            </button>
          </div>

          {notificationResult && (
            <div
              className={`p-3 rounded-lg ${
                notificationResult.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <p
                className={`text-sm ${
                  notificationResult.type === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {notificationResult.message}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">System alerts</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Important system updates
            </p>
          </div>
          <input
            type="checkbox"
            defaultChecked
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-[#30363d]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your security settings and login preferences
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-[#30363d]">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Two-factor authentication
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Add an extra layer of security
              </p>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-[#30363d]">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Password rotation</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Require password change every 90 days
              </p>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Login alerts</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Get notified of new device logins
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-[#30363d]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Active Sessions
          </h3>
          <div className="space-y-3">
            <SessionItem device="MacBook Pro - Chrome" location="Barcelona, Spain" active />
            <SessionItem device="iPhone 13 - Safari" location="Barcelona, Spain" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionItem({
  device,
  location,
  active,
}: {
  device: string
  location: string
  active?: boolean
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{device}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{location}</p>
      </div>
      {active && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Active now
        </span>
      )}
    </div>
  )
}
