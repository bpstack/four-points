// controllers/auth-controllers.js

import { UserRepository } from '../../repositories/auth/user-repository.js'
import {
  validateUser,
  getValidationErrors,
} from '../../validations/auth/user-validation.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../../services/tokenService.js'

// Configuración de cookies consistente

const IN_DEV_MODE = process.env.NODE_ENV !== 'production'

const cookieOptions = {
  httpOnly: IN_DEV_MODE ? false : true, // <- Clave para desarrollo
  secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // ✅ 'lax' en desarrollo
  path: '/', // ✅ Asegurar que se envíe en todas las rutas
}
/**
 * Login de usuario
 * Genera access token (15min) y refresh token (7d) en cookies HttpOnly
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required' })
    }

    const user = await UserRepository.login({ username, password })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const accessToken = generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    const refreshToken = generateRefreshToken({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    // ✅ Cookies corregidas
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutos
    })

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000, // 8 horas (consistente con tokenService)
    })

    // Eliminar contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      token: accessToken,
      refreshToken: IN_DEV_MODE ? refreshToken : undefined, // ← Solo en desarrollo
    })
  } catch (error) {
    res.status(401).json({
      error: error.message || 'Invalid credentials',
    })
  }
}

/**
 * Registro de nuevo usuario
 */
export const register = async (req, res) => {
  const validationResult = validateUser(req.body)

  if (!validationResult.success) {
    return res
      .status(400)
      .json({ errors: getValidationErrors(validationResult) })
  }

  const { username, email, password, role } = req.body

  try {
    const user = await UserRepository.create({
      username,
      email,
      password,
      role,
    })

    res.status(201).json({ success: true, user })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: error.message })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('Registration error:', error)
    }

    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Refrescar access token usando el refresh token
 * ✅ CORREGIDO: Ahora incluye username y role en el nuevo token
 */
/**
 * Refrescar access token usando el refresh token
 * ✅ Acepta token desde cookies O Authorization header
 */
export const refreshToken = (req, res) => {
  // 1️⃣ Intentar obtener de cookies (producción)
  let refreshToken = req.cookies.refresh_token

  // 2️⃣ Si no hay en cookies, buscar en Authorization header (desarrollo)
  if (!refreshToken) {
    const authHeader = req.headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      refreshToken = authHeader.substring(7)
    }
  }

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token no proporcionado' })
  }

  try {
    const payload = verifyToken(refreshToken)

    // Generar nuevo access token
    const newAccessToken = generateAccessToken({
      id: payload.id,
      username: payload.username,
      role: payload.role,
    })

    // Generar nuevo refresh token (sliding sessions)
    const newRefreshToken = generateRefreshToken({
      id: payload.id,
      username: payload.username,
      role: payload.role,
    })

    // Establecer cookies (solo si están habilitadas)
    res.cookie('access_token', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })

    res.cookie('refresh_token', newRefreshToken, {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000,
    })

    // ✅ IMPORTANTE: Devolver tokens en body también (para localStorage)
    res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: IN_DEV_MODE ? newRefreshToken : undefined, // ← Solo en dev
    })
  } catch (error) {
    res.clearCookie('access_token', cookieOptions)
    res.clearCookie('refresh_token', cookieOptions)

    res.status(403).json({
      error: 'Refresh token inválido o expirado',
    })
  }
}

/**
 * Cerrar sesión (limpiar cookies)
 */

export const logout = (req, res) => {
  res.clearCookie('access_token', cookieOptions)
  res.clearCookie('refresh_token', cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente',
  })
}

/**
 * Obtener información del usuario autenticado
 * ✅ CORREGIDO: Ahora usa el middleware authenticateToken
 * Los datos vienen de req.user (ya verificado por el middleware)
 */
export const me = async (req, res) => {
  try {
    // El middleware authenticateToken ya verificó el token
    // y guardó los datos en req.user
    const user = await UserRepository.getById(req.user.id)

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Eliminar contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Error en /me:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
