//app/login/page.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AtSymbolIcon,
  KeyIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { Fa4 } from 'react-icons/fa6'
import { TbTransformPointTopLeft } from 'react-icons/tb'
import { SimpleThemeButton } from '@/app/components/theme/SetThemeButton'
import { useAuth } from '@/app/lib/auth/useAuth'
import Link from 'next/link'

export default function LoginPage() {
  const t = useTranslations('auth')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const { login, loading } = useAuth()

  const validateUsername = (value: string) => {
    if (value.length === 0) return
    if (value.length < 3) {
      setFieldErrors((prev) => ({ ...prev, username: t('errors.usernameMinLength') }))
    } else {
      setFieldErrors((prev) => ({ ...prev, username: '' }))
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setSuccess(false)
    try {
      await login(username, password)
    } catch (err: unknown) {
      const error = err as { errors?: Record<string, string>; message?: string }
      if (error.errors && typeof error.errors === 'object') {
        setFieldErrors(error.errors)
      } else {
        setError(error.message || t('errors.invalidCredentials'))
      }
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="absolute right-6 top-6">
        <SimpleThemeButton />
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex items-center gap-0.5 text-accent">
            <span className="inline-block text-4xl leading-none transition-transform duration-300 group-hover:scale-110">
              <Fa4 />
            </span>
            <span className="inline-block text-4xl leading-none transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
              <TbTransformPointTopLeft />
            </span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-fg transition-colors duration-300 group-hover:text-accent">
            Four Points
          </span>
        </Link>

        {/* Card */}
        <div className="w-full rounded-xl border border-border bg-surface px-6 pb-6 pt-7 shadow-fp-pop">
          <h1 className="mb-1 text-xl font-semibold text-fg">{t('login.title')}</h1>
          <p className="mb-6 text-sm text-fg-muted">Introduce tus credenciales para acceder</p>

          {success && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {t('login.loginSuccess')}
                </p>
                <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">
                  {t('login.redirecting')}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-fg-muted">
                {t('login.username')}
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  placeholder={t('login.usernamePlaceholder')}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: '' })
                  }}
                  onBlur={(e) => validateUsername(e.target.value)}
                  required
                  minLength={3}
                  className={`block w-full rounded-md border bg-surface-sunken py-2 pl-9 pr-3 text-sm text-fg placeholder-fg-subtle transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.username
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-border focus:border-accent focus:ring-accent/20'
                  }`}
                />
                <AtSymbolIcon
                  className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    fieldErrors.username ? 'text-red-500' : 'text-fg-subtle'
                  }`}
                />
              </div>
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-fg-muted">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                  }}
                  required
                  className={`block w-full rounded-md border bg-surface-sunken py-2 pl-9 pr-10 text-sm text-fg placeholder-fg-subtle transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-border focus:border-accent focus:ring-accent/20'
                  }`}
                />
                <KeyIcon
                  className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    fieldErrors.password ? 'text-red-500' : 'text-fg-subtle'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-fg-subtle transition-colors hover:text-fg"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="mt-2 flex w-full items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t('login.submitting') : success ? t('login.success') : t('login.submit')}
              {!loading && !success && <ArrowRightIcon className="ml-2 h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
