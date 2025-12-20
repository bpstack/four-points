// controllers/auth/auth-controllers.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import {
  validateUser,
  validateUpdateProfile,
  validateUpdatePassword,
  getValidationErrors,
} from '../../validations/auth/user-validation.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../../services/auth/tokenService.js'
import type {
  CookieOptions,
  TokenPayload,
  UserWithRole,
  LoginDTO,
  UpdateProfileDTO,
  UpdatePasswordDTO,
} from '../../models/auth/index.js'

// ============================================
// COOKIE CONFIGURATION
// ============================================

const COOKIE_DOMAIN = '.four-points.stackbp.es'

const cookieOptions: CookieOptions = {
  httpOnly: true, // Siempre HttpOnly para seguridad
  secure: process.env.NODE_ENV === 'production', // HTTPS en producción
  sameSite: 'lax', // Protección CSRF
  path: '/',
  // Domain solo en producción (permite compartir entre subdominios)
  ...(process.env.NODE_ENV === 'production' ? { domain: COOKIE_DOMAIN } : {}),
}

// ============================================
// AUTH CONTROLLERS
// ============================================

/**
 * Login de usuario
 * Genera access token (15min) y refresh token (8h) en cookies HttpOnly
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as LoginDTO

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' })
      return
    }

    const user = await UserRepository.login({ username, password })

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const tokenPayload: TokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    // Set cookies
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    })

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días (debe coincidir con tokenService.ts)
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user as UserWithRole & {
      password: string
    }

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      token: accessToken,
      // Siempre enviar refreshToken - el proxy de Next.js lo necesita para crear cookies HttpOnly
      refreshToken: refreshToken,
    })
  } catch (error) {
    const err = error as Error
    res.status(401).json({
      error: err.message || 'Invalid credentials',
    })
  }
}

/**
 * Registro de nuevo usuario
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const validationResult = validateUser(req.body)

  if (!validationResult.success) {
    res.status(400).json({ errors: getValidationErrors(validationResult) })
    return
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
    const err = error as Error & { code?: string }

    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: err.message })
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('Registration error:', error)
    }

    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Refrescar access token usando el refresh token
 * Acepta token desde cookies O Authorization header
 */
export const refreshToken = (req: Request, res: Response): void => {
  // 1. Try to get from cookies (production)
  let token = req.cookies.refresh_token as string | undefined

  // 2. If not in cookies, check Authorization header (development)
  if (!token) {
    const authHeader = req.headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Refresh token no proporcionado' })
    return
  }

  try {
    const payload = verifyToken(token) as TokenPayload

    const tokenPayload: TokenPayload = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(tokenPayload)

    // Generate new refresh token (sliding sessions)
    const newRefreshToken = generateRefreshToken(tokenPayload)

    // Set cookies
    res.cookie('access_token', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })

    res.cookie('refresh_token', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días (debe coincidir con tokenService.ts)
    })

    // Return tokens in body as well (for localStorage and Next.js proxy)
    res.status(200).json({
      success: true,
      token: newAccessToken,
      // Siempre enviar refreshToken - el proxy de Next.js lo necesita para crear cookies HttpOnly
      refreshToken: newRefreshToken,
    })
  } catch {
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
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('access_token', cookieOptions)
  res.clearCookie('refresh_token', cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente',
  })
}

/**
 * Obtener información del usuario autenticado
 * Los datos vienen de req.user (ya verificado por el middleware)
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    // authenticateToken middleware already verified the token
    // and stored the data in req.user
    const user = await UserRepository.getById(req.user!.id)

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user as UserWithRole & {
      password?: string
    }

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Error en /me:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

/**
 * Actualizar perfil (username) del usuario autenticado
 * Requiere contraseña actual para confirmar identidad
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar entrada
    const validationResult = validateUpdateProfile(req.body)
    if (!validationResult.success) {
      res.status(400).json({ errors: getValidationErrors(validationResult) })
      return
    }

    const { username, currentPassword } = req.body as UpdateProfileDTO
    const userId = req.user!.id

    // Actualizar perfil
    const updatedUser = await UserRepository.updateProfile(userId, {
      username,
      currentPassword,
    })

    // Generar nuevos tokens con el username actualizado
    const tokenPayload: TokenPayload = {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    // Actualizar cookies
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: updatedUser,
      token: accessToken,
      refreshToken: refreshToken,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error en updateProfile:', err.message)

    // Errores conocidos
    if (err.message === 'Contraseña actual incorrecta') {
      res.status(401).json({ error: err.message })
      return
    }

    if (err.message === 'El nombre de usuario ya está en uso') {
      res.status(409).json({ error: err.message })
      return
    }

    if (err.message === 'Usuario no encontrado') {
      res.status(404).json({ error: err.message })
      return
    }

    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

/**
 * Actualizar contraseña del usuario autenticado
 * Requiere contraseña actual para confirmar identidad
 * Invalida sesiones actuales (requiere re-login)
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar entrada
    const validationResult = validateUpdatePassword(req.body)
    if (!validationResult.success) {
      res.status(400).json({ errors: getValidationErrors(validationResult) })
      return
    }

    const { currentPassword, newPassword } = req.body as UpdatePasswordDTO & { confirmPassword: string }
    const userId = req.user!.id

    // Actualizar contraseña
    await UserRepository.updatePassword(userId, {
      currentPassword,
      newPassword,
    })

    // Invalidar sesiones actuales limpiando las cookies
    // El usuario deberá iniciar sesión nuevamente con la nueva contraseña
    res.clearCookie('access_token', cookieOptions)
    res.clearCookie('refresh_token', cookieOptions)

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente. Por seguridad, debes iniciar sesión nuevamente.',
      requiresRelogin: true,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error en updatePassword:', err.message)

    // Errores conocidos
    if (err.message === 'Contraseña actual incorrecta') {
      res.status(401).json({ error: err.message })
      return
    }

    if (err.message === 'La nueva contraseña debe ser diferente a la actual') {
      res.status(400).json({ error: err.message })
      return
    }

    if (err.message === 'Usuario no encontrado') {
      res.status(404).json({ error: err.message })
      return
    }

    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
