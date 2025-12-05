// app/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AtSymbolIcon, KeyIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { Fa4 } from 'react-icons/fa6'
import { TbTransformPointTopLeft } from 'react-icons/tb'
import { SimpleThemeButton } from '@/app/components/theme/SetThemeButton'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Validación en tiempo real
  const validateUsername = (value: string) => {
    if (value.length === 0) return // No validar si está vacío
    if (value.length < 3) {
      setFieldErrors((prev) => ({
        ...prev,
        username: 'Username must be at least 3 characters long',
      }))
    } else {
      setFieldErrors((prev) => ({ ...prev, username: '' }))
    }
  }

  const validateEmail = (value: string) => {
    if (value.length === 0) return // No validar si está vacío
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setFieldErrors((prev) => ({ ...prev, email: 'Invalid email address' }))
    } else {
      setFieldErrors((prev) => ({ ...prev, email: '' }))
    }
  }

  const validatePassword = (value: string) => {
    if (value.length === 0) return // No validar si está vacío
    if (value.length < 6) {
      setFieldErrors((prev) => ({
        ...prev,
        password: 'Password must be at least 6 characters long',
      }))
    } else {
      setFieldErrors((prev) => ({ ...prev, password: '' }))
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include',
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        // Esperar 2 segundos para mostrar el mensaje de éxito antes de redirigir
        setTimeout(() => {
          router.push('/login')
        }, 2500)
      } else {
        // Si el backend devuelve errores por campo (formato Zod)
        if (data.errors && typeof data.errors === 'object') {
          setFieldErrors(data.errors)
        } else {
          setError(data.error || data.message || 'Error en el registro')
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-6">
      <div className="flex flex-col items-center w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex h-20 w-full items-center justify-center rounded-lg bg-blue-500 dark:bg-black p-4 md:h-42">
          <div className="absolute right-8 top-8 md:hidden">
            <SimpleThemeButton />
          </div>
          <div className="relative flex items-center justify-center gap-6">
            <div className="flex gap-1">
              <a
                href="/"
                className="text-white text-5xl drop-shadow-lg hover:scale-125 transition-transform duration-300 cursor-pointer"
              >
                <Fa4 />
              </a>
              <a
                href="/"
                className="text-white text-5xl drop-shadow-lg hover:rotate-12 hover:scale-125 transition-transform duration-300 cursor-pointer"
              >
                <TbTransformPointTopLeft />
              </a>
            </div>
          </div>
        </div>

        {/* Formulario de Registro */}
        <form
          onSubmit={handleRegister}
          className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0d1117] px-6 pb-6 pt-8 shadow-lg border border-gray-200 dark:border-neutral-800"
        >
          <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Create your account
          </h1>

          {/* Mensaje de éxito */}
          {success && (
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Account created successfully!
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Redirecting to login page...
                </p>
              </div>
            </div>
          )}

          {/* Error general */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-xs font-medium text-gray-700 dark:text-[#c9d1d9]"
            >
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                placeholder="Username must be at least 3 characters long"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (fieldErrors.username) {
                    setFieldErrors({ ...fieldErrors, username: '' })
                  }
                }}
                onBlur={(e) => validateUsername(e.target.value)}
                required
                minLength={3}
                className={`peer block w-full rounded-md border ${
                  fieldErrors.username
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-[#30363d]'
                } bg-white dark:bg-[#0d1117] py-2 pl-10 text-sm 
                  text-black dark:text-[#f0f6fc] 
                  placeholder-gray-500 dark:placeholder-[#8b949e] 
                  focus:outline-none focus:ring-2 ${
                    fieldErrors.username
                      ? 'focus:ring-red-500'
                      : 'focus:ring-blue-500 dark:focus:ring-[#1f6feb]'
                  }`}
              />
              <AtSymbolIcon
                className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                  fieldErrors.username
                    ? 'text-red-500'
                    : 'text-gray-500 dark:text-[#8b949e] peer-focus:text-gray-900 dark:peer-focus:text-[#f0f6fc]'
                }`}
              />
            </div>
            {fieldErrors.username && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.username}</p>
            )}
          </div>

          {/* Email */}
          <div className="mt-4">
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-medium text-gray-700 dark:text-[#c9d1d9]"
            >
              Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors({ ...fieldErrors, email: '' })
                  }
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                required
                className={`peer block w-full rounded-md border ${
                  fieldErrors.email
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-[#30363d]'
                } bg-white dark:bg-[#0d1117] py-2 pl-10 text-sm 
                  text-black dark:text-[#f0f6fc] 
                  placeholder-gray-500 dark:placeholder-[#8b949e] 
                  focus:outline-none focus:ring-2 ${
                    fieldErrors.email
                      ? 'focus:ring-red-500'
                      : 'focus:ring-blue-500 dark:focus:ring-[#1f6feb]'
                  }`}
              />
              <EnvelopeIcon
                className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                  fieldErrors.email
                    ? 'text-red-500'
                    : 'text-gray-500 dark:text-[#8b949e] peer-focus:text-gray-900 dark:peer-focus:text-[#f0f6fc]'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="mt-4">
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-medium text-gray-700 dark:text-[#c9d1d9]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                placeholder="Password must be at least 6 characters long"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors({ ...fieldErrors, password: '' })
                  }
                }}
                onBlur={(e) => validatePassword(e.target.value)}
                required
                minLength={6}
                className={`peer block w-full rounded-md border ${
                  fieldErrors.password
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-[#30363d]'
                } bg-white dark:bg-[#0d1117] py-2 pl-10 text-sm 
                  text-black dark:text-[#f0f6fc] 
                  placeholder-gray-500 dark:placeholder-[#8b949e] 
                  focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'focus:ring-red-500'
                      : 'focus:ring-blue-500 dark:focus:ring-[#1f6feb]'
                  }`}
              />
              <KeyIcon
                className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                  fieldErrors.password
                    ? 'text-red-500'
                    : 'text-gray-500 dark:text-[#8b949e] peer-focus:text-gray-900 dark:peer-focus:text-[#f0f6fc]'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || success}
            className="mt-6 flex w-full items-center justify-center rounded-md bg-green-600 hover:bg-green-700 dark:bg-green-800 dark:hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : success ? 'Account created!' : 'Sign up'}
            {!loading && !success && <ArrowRightIcon className="ml-2 h-5 w-5" />}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Sign in here
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}

// full code w/o validations messages on the fields, just in case previous one gives problem

// app/register/page.tsx
// 'use client'

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { AtSymbolIcon, KeyIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
// import { ArrowRightIcon } from '@heroicons/react/20/solid'
// import { Fa4 } from 'react-icons/fa6'
// import { TbTransformPointTopLeft } from 'react-icons/tb'
// import { SimpleThemeButton } from '@/app/components/theme/SetThemeButton'

// export default function RegisterPage() {
//   const [username, setUsername] = useState('')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
//   const [success, setSuccess] = useState(false)
//   const router = useRouter()

//   const handleRegister = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)
//     setError(null)
//     setFieldErrors({})
//     setSuccess(false)

//     try {
//       const res = await fetch('/api/auth/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ username, email, password }),
//         credentials: 'include',
//       })

//       const data = await res.json()

//       if (res.ok) {
//         setSuccess(true)
//         // Esperar 2 segundos para mostrar el mensaje de éxito antes de redirigir
//         setTimeout(() => {
//           router.push('/login')
//         }, 2000)
//       } else {
//         // Si el backend devuelve errores por campo (formato Zod)
//         if (data.errors && typeof data.errors === 'object') {
//           setFieldErrors(data.errors)
//         } else {
//           setError(data.error || data.message || 'Error en el registro')
//         }
//       }
//     } catch (err) {
//       setError('Error de conexión con el servidor')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-6">
//       <div className="flex flex-col items-center w-full max-w-md space-y-6">
//         {/* Logo */}
//         <div className="flex h-20 w-full items-center justify-center rounded-lg bg-blue-500 dark:bg-black p-4 md:h-42">
//           <div className="absolute right-8 top-8 md:hidden">
//             <SimpleThemeButton />
//           </div>
//           <div className="relative flex items-center justify-center gap-6">
//             <div className="flex gap-1">
//               <a
//                 href="/"
//                 className="text-white text-5xl drop-shadow-lg hover:scale-125 transition-transform duration-300 cursor-pointer"
//               >
//                 <Fa4 />
//               </a>
//               <a
//                 href="/"
//                 className="text-white text-5xl drop-shadow-lg hover:rotate-12 hover:scale-125 transition-transform duration-300 cursor-pointer"
//               >
//                 <TbTransformPointTopLeft />
//               </a>
//             </div>
//           </div>
//         </div>

//         {/* Formulario de Registro */}
//         <form
//           onSubmit={handleRegister}
//           className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0d1117] px-6 pb-6 pt-8 shadow-lg border border-gray-200 dark:border-neutral-800"
//         >
//           <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
//             Create your account
//           </h1>

//           {/* Mensaje de éxito */}
//           {success && (
//             <div className="mb-4 flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
//               <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
//               <div className="flex-1">
//                 <p className="text-sm font-medium text-green-800 dark:text-green-300">
//                   Account created successfully!
//                 </p>
//                 <p className="text-xs text-green-700 dark:text-green-400 mt-1">
//                   Redirecting to login page...
//                 </p>
//               </div>
//             </div>
//           )}

//           {/* Error general */}
//           {error && (
//             <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
//               <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
//             </div>
//           )}

//           {/* Username */}
//           <div>
//             <label
//               htmlFor="username"
//               className="mb-2 block text-xs font-medium text-gray-700 dark:text-[#c9d1d9]"
//             >
//               Username
//             </label>
//             <div className="relative">
//               <input
//                 id="username"
//                 type="text"
//                 placeholder="Username must be at least 3 characters long"
//                 value={username}
//                 onChange={(e) => {
//                   setUsername(e.target.value)
//                   if (fieldErrors.username) {
//                     setFieldErrors({ ...fieldErrors, username: '' })
//                   }
//                 }}
//                 required
//                 minLength={3}
//                 className={`peer block w-full rounded-md border ${
//                   fieldErrors.username
//                     ? 'border-red-500 dark:border-red-500'
//                     : 'border-gray-300 dark:border-[#30363d]'
//                 } bg-white dark:bg-[#0d1117] py-2 pl-10 text-sm
//                   text-black dark:text-[#f0f6fc]
//                   placeholder-gray-500 dark:placeholder-[#8b949e]
//                   focus:outline-none focus:ring-2 ${
//                     fieldErrors.username
//                       ? 'focus:ring-red-500'
//                       : 'focus:ring-blue-500 dark:focus:ring-[#1f6feb]'
//                   }`}
//               />
//               <AtSymbolIcon
//                 className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
//                   fieldErrors.username
//                     ? 'text-red-500'
//                     : 'text-gray-500 dark:text-[#8b949e] peer-focus:text-gray-900 dark:peer-focus:text-[#f0f6fc]'
//                 }`}
//               />
//             </div>
//             {fieldErrors.username && (
//               <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.username}</p>
//             )}
//           </div>

//           {/* Email */}
//           <div className="mt-4">
//             <label
//               htmlFor="email"
//               className="mb-2 block text-xs font-medium text-gray-700 dark:text-[#c9d1d9]"
//             >
//               Email
//             </label>
//             <div className="relative">
//               <input
//                 id="email"
//                 type="email"
//                 placeholder="your@email.com"
//                 value={email}
//                 onChange={(e) => {
//                   setEmail(e.target.value)
//                   if (fieldErrors.email) {
//                     setFieldErrors({ ...fieldErrors, email: '' })
//                   }
//                 }}
//                 required
//                 className={`peer block w-full rounded-md border ${
//                   fieldErrors.email
//                     ? 'border-red-500 dark:border-red-500'
//                     : 'border-gray-300 dark:border-[#30363d]'
//                 } bg-white dark:bg-[#0d1117] py-2 pl-10 text-sm
//                   text-black dark:text-[#f0f6fc]
//                   placeholder-gray-500 dark:placeholder-[#8b949e]
//                   focus:outline-none focus:ring-2 ${
//                     fieldErrors.email
//                       ? 'focus:ring-red-500'
//                       : 'focus:ring-blue-500 dark:focus:ring-[#1f6feb]'
//                   }`}
//               />
//               <EnvelopeIcon
//                 className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
//                   fieldErrors.email
//                     ? 'text-red-500'
//                     : 'text-gray-500 dark:text-[#8b949e] peer-focus:text-gray-900 dark:peer-focus:text-[#f0f6fc]'
//                 }`}
//               />
//             </div>
//             {fieldErrors.email && (
//               <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
//             )}
//           </div>

//           {/* Password */}
//           <div className="mt-4">
//             <label
//               htmlFor="password"
//               className="mb-2 block text-xs font-medium text-gray-700 dark:text-[#c9d1d9]"
//             >
//               Password
//             </label>
//             <div className="relative">
//               <input
//                 id="password"
//                 type="password"
//                 placeholder="Password must be at least 6 characters long"
//                 value={password}
//                 onChange={(e) => {
//                   setPassword(e.target.value)
//                   if (fieldErrors.password) {
//                     setFieldErrors({ ...fieldErrors, password: '' })
//                   }
//                 }}
//                 required
//                 minLength={6}
//                 className={`peer block w-full rounded-md border ${
//                   fieldErrors.password
//                     ? 'border-red-500 dark:border-red-500'
//                     : 'border-gray-300 dark:border-[#30363d]'
//                 } bg-white dark:bg-[#0d1117] py-2 pl-10 text-sm
//                   text-black dark:text-[#f0f6fc]
//                   placeholder-gray-500 dark:placeholder-[#8b949e]
//                   focus:outline-none focus:ring-2 ${
//                     fieldErrors.password
//                       ? 'focus:ring-red-500'
//                       : 'focus:ring-blue-500 dark:focus:ring-[#1f6feb]'
//                   }`}
//               />
//               <KeyIcon
//                 className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
//                   fieldErrors.password
//                     ? 'text-red-500'
//                     : 'text-gray-500 dark:text-[#8b949e] peer-focus:text-gray-900 dark:peer-focus:text-[#f0f6fc]'
//                 }`}
//               />
//             </div>
//             {fieldErrors.password && (
//               <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
//             )}
//           </div>

//           {/* Botón */}
//           <button
//             type="submit"
//             disabled={loading || success}
//             className="mt-6 flex w-full items-center justify-center rounded-md bg-green-600 hover:bg-green-700 dark:bg-green-800 dark:hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? 'Creating account...' : success ? 'Account created!' : 'Sign up'}
//             {!loading && !success && <ArrowRightIcon className="ml-2 h-5 w-5" />}
//           </button>

//           <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
//             Already have an account?{' '}
//             <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
//               Sign in here
//             </a>
//           </p>
//         </form>
//       </div>
//     </main>
//   )
// }
