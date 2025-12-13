// controllers/auth/auth-controllers.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import {
  validateUser,
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
} from '../../models/auth/index.js'

// ============================================
// COOKIE CONFIGURATION
// ============================================

const IN_DEV_MODE = process.env.NODE_ENV !== 'production'

const cookieOptions: CookieOptions = {
  httpOnly: IN_DEV_MODE ? false : true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
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
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user as UserWithRole & {
      password: string
    }

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      token: accessToken,
      refreshToken: IN_DEV_MODE ? refreshToken : undefined,
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
      maxAge: 8 * 60 * 60 * 1000,
    })

    // Return tokens in body as well (for localStorage)
    res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: IN_DEV_MODE ? newRefreshToken : undefined,
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
