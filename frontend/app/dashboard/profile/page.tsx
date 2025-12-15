// app/dashboard/profile/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth/useAuth'

// Icons
import {
  FiUser,
  FiLock,
  FiCamera,
  FiInfo,
  FiMessageSquare,
  FiSettings,
  FiChevronRight,
} from 'react-icons/fi'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Estados locales
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)

  // ✅ Verificar si es admin
  const isAdmin = user?.role?.toLowerCase().trim() === 'admin'

  // 🔄 Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  // 🚫 Usuario no disponible
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-500 dark:text-gray-400">Unable to load profile</p>
      </div>
    )
  }

  // ✅ Render principal
  return (
    <div className="min-h-screen bg-white text-gray-800 dark:bg-[#010409] dark:text-gray-300">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        {/* Encabezado */}
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Public profile
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This information will be displayed publicly
          </p>
        </header>

        {/* Atajos rápidos */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <QuickAccessCard
            onClick={() => router.push('/dashboard/profile/messages')}
            icon={<FiMessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            title="Mensajes"
            subtitle="Ver tu bandeja de entrada"
          />
          <QuickAccessCard
            onClick={() => router.push('/dashboard/profile/settings')}
            icon={<FiSettings className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            title="Configuración"
            subtitle={isAdmin ? 'Panel de administración' : 'Gestiona tu cuenta'}
          />
        </section>

        {/* Foto de perfil */}
        <ProfilePicture username={user.username} />

        {/* Username */}
        <UsernameSection
          username={user.username}
          isEditing={isEditingUsername}
          onEdit={() => setIsEditingUsername(true)}
          onCancel={() => setIsEditingUsername(false)}
        />

        {/* Email */}
        <InfoCard
          title="Email"
          icon={<FiUser className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
        >
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {user.email || 'No email provided'}
          </span>
        </InfoCard>

        {/* Password */}
        <PasswordSection
          isEditing={isEditingPassword}
          onEdit={() => setIsEditingPassword(true)}
          onCancel={() => setIsEditingPassword(false)}
        />

        {/* Consejo de seguridad */}
        <SecurityTip />
      </div>
    </div>
  )
}

// Atajos rápidos
function QuickAccessCard({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 dark:bg-[#161b22] dark:hover:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-md transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <FiChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
    </button>
  )
}

// Foto de perfil
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProfilePicture(_props: { username: string }) {
  return (
    <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-md">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Profile picture
        </h2>
        <div className="flex items-start gap-4">
          <div className="relative group flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold"></div>
            <button className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <FiCamera className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1">
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
              Upload new picture
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              JPG, GIF or PNG. Max size of 2MB
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Username
function UsernameSection({
  username,
  isEditing,
  onEdit,
  onCancel,
}: {
  username: string
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
}) {
  const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()

  return (
    <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-md">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Username</h2>
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiUser className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{formattedUsername}</span>
            </div>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-md transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                New username
              </label>
              <input
                type="text"
                defaultValue={formattedUsername}
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors">
                Save
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d] border border-gray-300 dark:border-[#30363d] rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Password
function PasswordSection({
  isEditing,
  onEdit,
  onCancel,
}: {
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
}) {
  return (
    <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-md">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Password</h2>
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiLock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">••••••••</span>
            </div>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-md transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {['Current password', 'New password', 'Confirm new password'].map((label, i) => (
              <div key={i}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {label}
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 dark:text-white"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors">
                Update password
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d] border border-gray-300 dark:border-[#30363d] rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Tarjeta simple
function InfoCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-md">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h2>
        <div className="flex items-center gap-2">
          {icon}
          {children}
        </div>
      </div>
    </div>
  )
}

// Consejo de seguridad
function SecurityTip() {
  return (
    <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
      <FiInfo className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Security tip</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Keep your password updated for better security and experience.
        </p>
      </div>
    </div>
  )
}
