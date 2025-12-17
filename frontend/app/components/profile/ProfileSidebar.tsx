// app/components/profile/ProfileSidebar.tsx

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/lib/auth/useAuth'
import { apiClient } from '@/app/lib/apiClient'
import {
  FiUser,
  FiLock,
  FiCamera,
  FiMessageSquare,
  FiSettings,
  FiChevronRight,
  FiEdit2,
  FiCheck,
  FiX,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
} from 'react-icons/fi'
import { cn } from '@/app/lib/helpers/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function ProfileSidebar() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel')

  // Edit states
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)

  // Form states - Username
  const [newUsername, setNewUsername] = useState('')
  const [usernamePassword, setUsernamePassword] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null)

  // Form states - Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  if (!user) return null

  const handleNavigate = (panel: string | null) => {
    if (panel) {
      router.push(`/dashboard/profile?panel=${panel}`, { scroll: false })
    } else {
      router.push('/dashboard/profile', { scroll: false })
    }
  }

  const formattedUsername = user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase()

  // ============================
  // Username Edit Handlers
  // ============================
  const handleStartEditUsername = () => {
    setIsEditingUsername(true)
    setNewUsername(user.username)
    setUsernamePassword('')
    setUsernameError(null)
    setUsernameSuccess(null)
  }

  const handleCancelEditUsername = () => {
    setIsEditingUsername(false)
    setNewUsername('')
    setUsernamePassword('')
    setUsernameError(null)
    setUsernameSuccess(null)
  }

  const handleSaveUsername = async () => {
    // Validations
    if (!newUsername.trim()) {
      setUsernameError('El nombre de usuario es requerido')
      return
    }

    if (newUsername.trim().length < 3) {
      setUsernameError('El nombre de usuario debe tener al menos 3 caracteres')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername.trim())) {
      setUsernameError('Solo se permiten letras, números y guiones bajos')
      return
    }

    if (!usernamePassword) {
      setUsernameError('Ingresa tu contraseña actual para confirmar')
      return
    }

    setUsernameLoading(true)
    setUsernameError(null)

    try {
      const response = await apiClient.patch(`${API_URL}/api/auth/me/profile`, {
        username: newUsername.trim(),
        currentPassword: usernamePassword,
      })

      // Update tokens in localStorage (development)
      if (process.env.NODE_ENV === 'development' && response.token) {
        localStorage.setItem('access_token', response.token)
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken)
        }
      }

      setUsernameSuccess('Nombre de usuario actualizado correctamente')
      setIsEditingUsername(false)
      setNewUsername('')
      setUsernamePassword('')

      // Refresh user data
      if (refreshUser) {
        await refreshUser()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setUsernameSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error updating username:', error)
      setUsernameError(error.message || 'Error al actualizar el nombre de usuario')
    } finally {
      setUsernameLoading(false)
    }
  }

  // ============================
  // Password Edit Handlers
  // ============================
  const handleStartEditPassword = () => {
    setIsEditingPassword(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  const handleCancelEditPassword = () => {
    setIsEditingPassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  const handleSavePassword = async () => {
    // Validations
    if (!currentPassword) {
      setPasswordError('Ingresa tu contraseña actual')
      return
    }

    if (!newPassword) {
      setPasswordError('Ingresa la nueva contraseña')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setPasswordLoading(true)
    setPasswordError(null)

    try {
      await apiClient.patch(`${API_URL}/api/auth/me/password`, {
        currentPassword,
        newPassword,
        confirmPassword,
      })

      // Clear tokens and redirect to login
      if (process.env.NODE_ENV === 'development') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }

      // Redirect to login with message
      router.push('/login?message=password_changed')
    } catch (error: any) {
      console.error('Error updating password:', error)
      setPasswordError(error.message || 'Error al actualizar la contraseña')
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative group flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <button className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <FiCamera className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {formattedUsername}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email || 'No email'}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {usernameSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">{usernameSuccess}</p>
        </div>
      )}

      {/* Username Section */}
      <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FiUser className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Username</span>
            </div>
            {!isEditingUsername && (
              <button
                onClick={handleStartEditUsername}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Editar username"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!isEditingUsername ? (
            <p className="text-sm text-gray-900 dark:text-white">{formattedUsername}</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Nuevo nombre de usuario
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Nuevo username"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={usernameLoading}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contraseña actual (para confirmar)
                </label>
                <input
                  type="password"
                  value={usernamePassword}
                  onChange={(e) => setUsernamePassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={usernameLoading}
                />
              </div>

              {usernameError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{usernameError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveUsername}
                  disabled={usernameLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {usernameLoading ? (
                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <FiCheck className="w-3.5 h-3.5" />
                  )}
                  {usernameLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancelEditUsername}
                  disabled={usernameLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] disabled:opacity-50 rounded-lg transition-colors"
                >
                  <FiX className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FiLock className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Password</span>
            </div>
            {!isEditingPassword && (
              <button
                onClick={handleStartEditPassword}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Cambiar contraseña"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!isEditingPassword ? (
            <p className="text-sm text-gray-900 dark:text-white">••••••••</p>
          ) : (
            <div className="space-y-3">
              {/* Current Password */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Contraseña actual"
                    className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Al cambiar tu contraseña, se cerrará tu sesión y deberás iniciar sesión nuevamente.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSavePassword}
                  disabled={passwordLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {passwordLoading ? (
                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <FiCheck className="w-3.5 h-3.5" />
                  )}
                  {passwordLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
                <button
                  onClick={handleCancelEditPassword}
                  disabled={passwordLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] disabled:opacity-50 rounded-lg transition-colors"
                >
                  <FiX className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
        <NavButton
          icon={<FiMessageSquare className="w-4 h-4" />}
          label="Mensajes"
          description="Comunicaciones internas"
          active={activePanel === 'messages'}
          onClick={() => handleNavigate('messages')}
        />
        <NavButton
          icon={<FiSettings className="w-4 h-4" />}
          label="Configuracion"
          description="Ajustes de cuenta"
          active={activePanel === 'settings'}
          onClick={() => handleNavigate('settings')}
          borderTop
        />
      </div>
    </div>
  )
}

function NavButton({
  icon,
  label,
  description,
  active,
  onClick,
  borderTop,
}: {
  icon: React.ReactNode
  label: string
  description: string
  active: boolean
  onClick: () => void
  borderTop?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-3 transition-colors text-left',
        borderTop && 'border-t border-gray-200 dark:border-[#30363d]',
        active
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-100 dark:hover:bg-[#21262d]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-md',
          active
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        )}>
          {icon}
        </div>
        <div>
          <p className={cn(
            'text-sm font-medium',
            active
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-gray-900 dark:text-white'
          )}>
            {label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <FiChevronRight className={cn(
        'w-4 h-4',
        active
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-400 dark:text-gray-500'
      )} />
    </button>
  )
}
