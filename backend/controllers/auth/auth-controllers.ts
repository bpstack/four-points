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
import { CloudinaryService } from '../../services/blacklist/cloudinary-service.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
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
      res.status(400).json({
        error: ERROR_CODES.AUTH_CREDENTIALS_REQUIRED,
        code: ERROR_CODES.AUTH_CREDENTIALS_REQUIRED,
      })
      return
    }

    const user = await UserRepository.login({ username, password })

    if (!user) {
      res.status(401).json({
        error: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      })
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
    })
  } catch {
    res.status(401).json({
      error: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
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
    res.status(401).json({
      error: ERROR_CODES.AUTH_REFRESH_TOKEN_MISSING,
      code: ERROR_CODES.AUTH_REFRESH_TOKEN_MISSING,
    })
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

    res.status(200).json({
      success: true,
      token: newAccessToken,
    })
  } catch {
    res.clearCookie('access_token', cookieOptions)
    res.clearCookie('refresh_token', cookieOptions)

    res.status(403).json({
      error: ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID,
      code: ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID,
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
    message: SUCCESS_CODES.AUTH_LOGOUT_SUCCESS,
    code: SUCCESS_CODES.AUTH_LOGOUT_SUCCESS,
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
      res.status(404).json({
        error: ERROR_CODES.AUTH_USER_NOT_FOUND,
        code: ERROR_CODES.AUTH_USER_NOT_FOUND,
      })
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
    res.status(500).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
    })
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
      message: SUCCESS_CODES.AUTH_PROFILE_UPDATED,
      code: SUCCESS_CODES.AUTH_PROFILE_UPDATED,
      user: updatedUser,
      token: accessToken,
      refreshToken: refreshToken,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error en updateProfile:', err.message)

    // Errores conocidos
    if (err.message === 'Contraseña actual incorrecta') {
      res.status(401).json({
        error: ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT,
        code: ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT,
      })
      return
    }

    if (err.message === 'El nombre de usuario ya está en uso') {
      res.status(409).json({ error: err.message })
      return
    }

    if (err.message === 'Usuario no encontrado') {
      res.status(404).json({
        error: ERROR_CODES.AUTH_USER_NOT_FOUND,
        code: ERROR_CODES.AUTH_USER_NOT_FOUND,
      })
      return
    }

    res.status(500).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
    })
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
      message: SUCCESS_CODES.AUTH_PASSWORD_UPDATED,
      code: SUCCESS_CODES.AUTH_PASSWORD_UPDATED,
      requiresRelogin: true,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error en updatePassword:', err.message)

    // Errores conocidos
    if (err.message === 'Contraseña actual incorrecta') {
      res.status(401).json({
        error: ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT,
        code: ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT,
      })
      return
    }

    if (err.message === 'La nueva contraseña debe ser diferente a la actual') {
      res.status(400).json({ error: err.message })
      return
    }

    if (err.message === 'Usuario no encontrado') {
      res.status(404).json({
        error: ERROR_CODES.AUTH_USER_NOT_FOUND,
        code: ERROR_CODES.AUTH_USER_NOT_FOUND,
      })
      return
    }

    res.status(500).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
    })
  }
}

/**
 * Subir/actualizar avatar del usuario autenticado
 * Máximo 2MB, solo imágenes
 */
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id

    if (!req.file) {
      res.status(400).json({
        error: ERROR_CODES.AUTH_NO_IMAGE_PROVIDED,
        code: ERROR_CODES.AUTH_NO_IMAGE_PROVIDED,
      })
      return
    }

    // Validar tipo de archivo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMimes.includes(req.file.mimetype)) {
      res.status(400).json({
        error: ERROR_CODES.AUTH_INVALID_FILE_TYPE,
        code: ERROR_CODES.AUTH_INVALID_FILE_TYPE,
      })
      return
    }

    // Obtener el public_id del avatar anterior (si existe) para eliminarlo después
    const previousPublicId = await UserRepository.getAvatarPublicId(userId)
    console.log(`[AUTH] Previous avatar public_id for user ${userId}:`, previousPublicId)

    // Subir nueva imagen a Cloudinary (método optimizado para avatares)
    const uploadResult = await CloudinaryService.uploadAvatar(
      req.file.buffer,
      req.file.originalname,
      'avatars' // Carpeta en Cloudinary
    )
    console.log(`[AUTH] New avatar uploaded:`, uploadResult.public_id)

    // Actualizar usuario con nuevo avatar
    const updatedUser = await UserRepository.updateAvatar(
      userId,
      uploadResult.secure_url,
      uploadResult.public_id
    )

    // Eliminar avatar anterior de Cloudinary (si existía)
    if (previousPublicId) {
      try {
        await CloudinaryService.deleteImage(previousPublicId)
        console.info(`[AUTH] Previous avatar deleted: ${previousPublicId}`)
      } catch (error) {
        // No bloquear si falla la eliminación del anterior
        console.error('[AUTH] Failed to delete previous avatar:', error)
      }
    }

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.AUTH_AVATAR_UPDATED,
      code: SUCCESS_CODES.AUTH_AVATAR_UPDATED,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error en uploadAvatar:', error)
    res.status(500).json({
      error: ERROR_CODES.AUTH_UPLOAD_AVATAR_ERROR,
      code: ERROR_CODES.AUTH_UPLOAD_AVATAR_ERROR,
    })
  }
}

/**
 * Eliminar avatar del usuario autenticado
 */
export const deleteAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id

    // Obtener public_id para eliminar de Cloudinary
    const publicId = await UserRepository.deleteAvatar(userId)

    // Eliminar de Cloudinary si existe
    if (publicId) {
      try {
        await CloudinaryService.deleteImage(publicId)
        console.info(`[AUTH] Avatar deleted from Cloudinary: ${publicId}`)
      } catch (error) {
        // No bloquear si falla la eliminación de Cloudinary
        console.error('[AUTH] Failed to delete avatar from Cloudinary:', error)
      }
    }

    // Obtener usuario actualizado
    const updatedUser = await UserRepository.getById(userId)

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.AUTH_AVATAR_DELETED,
      code: SUCCESS_CODES.AUTH_AVATAR_DELETED,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error en deleteAvatar:', error)
    res.status(500).json({
      error: ERROR_CODES.AUTH_DELETE_AVATAR_ERROR,
      code: ERROR_CODES.AUTH_DELETE_AVATAR_ERROR,
    })
  }
}
