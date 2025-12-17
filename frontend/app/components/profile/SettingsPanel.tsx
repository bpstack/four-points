// app/components/profile/SettingsPanel.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/app/lib/apiClient'
import { useAuth } from '@/app/lib/auth/useAuth'
import NewUserModal from '@/app/components/auth/NewUserModal'
import { UsersTableSkeleton } from '@/app/ui/skeletons'
import { notificationsApi } from '@/app/lib/groups'
import { cn } from '@/app/lib/helpers/utils'
import {
  FiUsers,
  FiBell,
  FiShield,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiUserPlus,
  FiCheck,
  FiX,
  FiChevronDown,
  FiFileText,
} from 'react-icons/fi'
import { ReportsTab } from './reports'

// Types
interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'group-admin' | 'recepcionista' | 'mantenimiento' | string
  created_at?: string
  updated_at?: string
}

type SettingsTab = 'users' | 'notifications' | 'security' | 'reports'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

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

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'users', label: 'Usuarios', icon: <FiUsers className="w-4 h-4" />, adminOnly: true },
  { id: 'notifications', label: 'Notificaciones', icon: <FiBell className="w-4 h-4" /> },
  { id: 'security', label: 'Seguridad', icon: <FiShield className="w-4 h-4" /> },
  { id: 'reports', label: 'Reportes', icon: <FiFileText className="w-4 h-4" />, adminOnly: true },
]

export function SettingsPanel() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isUserAdmin = currentUser?.role?.toLowerCase().trim() === 'admin'
  
  const activeTab = (searchParams.get('tab') as SettingsTab) || (isUserAdmin ? 'users' : 'notifications')
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Mobile dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const availableTabs = tabs.filter(tab => !tab.adminOnly || isUserAdmin)
  const activeTabConfig = availableTabs.find(t => t.id === activeTab) || availableTabs[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeTab === 'users' && isUserAdmin) {
      fetchUsers()
    }
  }, [activeTab, isUserAdmin])

  const handleTabChange = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/dashboard/profile?${params.toString()}`, { scroll: false })
    setIsDropdownOpen(false)
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
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

  return (
    <div className="h-full max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configuracion</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Gestiona tu cuenta y preferencias del sistema
        </p>
      </div>

      {/* Tabs - Mobile Dropdown */}
      <div className="md:hidden mb-4" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <span className="flex items-center gap-2">
            {activeTabConfig.icon}
            {activeTabConfig.label}
          </span>
          <FiChevronDown className={cn('w-4 h-4 transition-transform', isDropdownOpen && 'rotate-180')} />
        </button>
        
        {isDropdownOpen && (
          <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
                {activeTab === tab.id && <FiCheck className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs - Desktop */}
      <div className="hidden md:block border-b border-gray-200 dark:border-[#30363d] mb-6">
        <nav className="flex gap-4">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'users' && isUserAdmin && (
          <UserManagement
            users={users}
            loading={loading}
            error={error}
            onDelete={handleDeleteUser}
            onRefresh={fetchUsers}
            onOpenModal={() => setIsModalOpen(true)}
          />
        )}
        {activeTab === 'notifications' && <NotificationsSettings />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'reports' && isUserAdmin && <ReportsTab />}
      </div>

      {/* Modal */}
      {isUserAdmin && (
        <NewUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  )
}

// User Management Component
function UserManagement({
  users,
  loading,
  error,
  onDelete,
  onRefresh,
  onOpenModal,
}: {
  users: User[]
  loading: boolean
  error: string | null
  onDelete: (id: string) => void
  onRefresh: () => void
  onOpenModal: () => void
}) {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Gestion de Usuarios</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Administra usuarios y roles del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FiUserPlus className="w-3.5 h-3.5" />
              Nuevo
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading && <UsersTableSkeleton />}
        
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="text-center py-8">
            <FiUsers className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay usuarios</p>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <UserTable users={users} onDelete={onDelete} />
        )}
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
      await apiClient.put(`${API_URL}/api/users/${id}`, editForm)
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
    <div className="space-y-2">
      {users.map((user) => {
        const roleConfig = getRoleConfig(user.role)
        const isEditing = editingId === user.id

        return (
          <div
            key={user.id}
            className="bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg p-3"
          >
            {isEditing ? (
              <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-3">
                <input
                  type="text"
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="Username"
                  className="w-full md:w-40 px-3 py-1.5 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
                />
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full md:flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
                />
                <select
                  value={editForm.role || ''}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full md:w-40 px-3 py-1.5 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
                >
                  <option value="recepcionista">Receptionist</option>
                  <option value="admin">Administrator</option>
                  <option value="group-admin">Group Admin</option>
                  <option value="mantenimiento">Maintenance</option>
                </select>
                <div className="flex gap-2 md:flex-shrink-0">
                  <button
                    onClick={() => handleSave(user.id)}
                    disabled={savingId === user.id}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg"
                  >
                    <FiCheck className="w-3.5 h-3.5" />
                    {savingId === user.id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Mobile: stacked layout */}
                  <div className="min-w-0 flex-1 md:hidden">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    <span className={cn('inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium border', roleConfig.color, roleConfig.borderColor)}>
                      {roleConfig.label}
                    </span>
                  </div>

                  {/* Desktop: horizontal layout */}
                  <div className="hidden md:flex md:items-center md:gap-4 md:flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate w-32 flex-shrink-0">{user.username}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">{user.email}</p>
                    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0', roleConfig.color, roleConfig.borderColor)}>
                      {roleConfig.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function NotificationsSettings() {
  const [checkingNotifications, setCheckingNotifications] = useState(false)
  const [notificationResult, setNotificationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleCheckNotifications = async () => {
    setCheckingNotifications(true)
    setNotificationResult(null)
    try {
      const response = await notificationsApi.checkPending()
      setNotificationResult({
        type: 'success',
        message: response.data
          ? `Verificados: ${response.data.checked}, Enviados: ${response.data.sent}, Fallidos: ${response.data.failed}`
          : response.message,
      })
      setTimeout(() => setNotificationResult(null), 5000)
    } catch (error: any) {
      setNotificationResult({ type: 'error', message: error.message || 'Error checking notifications' })
      setTimeout(() => setNotificationResult(null), 5000)
    } finally {
      setCheckingNotifications(false)
    }
  }

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Configura como recibes las notificaciones
        </p>
      </div>
      <div className="p-4 space-y-3">
        <SettingRow label="Notificaciones por email" description="Recibir actualizaciones via email" defaultChecked />
        
        <div className="py-3 border-t border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Push notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Verificar y enviar pendientes</p>
            </div>
            <button
              onClick={handleCheckNotifications}
              disabled={checkingNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              <FiRefreshCw className={cn('w-3.5 h-3.5', checkingNotifications && 'animate-spin')} />
              {checkingNotifications ? 'Checking...' : 'Update'}
            </button>
          </div>
          {notificationResult && (
            <div className={cn(
              'p-2 rounded-lg text-xs',
              notificationResult.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            )}>
              {notificationResult.message}
            </div>
          )}
        </div>

        <SettingRow label="Alertas del sistema" description="Actualizaciones importantes" defaultChecked />
      </div>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Seguridad</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Gestiona la seguridad de tu cuenta
        </p>
      </div>
      <div className="p-4 space-y-3">
        <SettingRow label="Autenticacion de dos factores" description="Anade una capa extra de seguridad" />
        <SettingRow label="Rotacion de contrasena" description="Requerir cambio cada 90 dias" />
        <SettingRow label="Alertas de inicio de sesion" description="Notificar nuevos dispositivos" defaultChecked />

        <div className="pt-4 border-t border-gray-200 dark:border-[#30363d]">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sesiones activas</h4>
          <div className="space-y-2">
            <SessionItem device="Desktop - Chrome" location="Barcelona, Spain" active />
            <SessionItem device="Mobile - Safari" location="Barcelona, Spain" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function SessionItem({ device, location, active }: { device: string; location: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{device}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{location}</p>
      </div>
      {active && (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Activa
        </span>
      )}
    </div>
  )
}
