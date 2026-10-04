// services/blacklist/cloudinary-service.ts
/**
 * Servicio para subir y eliminar imágenes/archivos en Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary'
import { logger } from '../../config/logger.js'
import { safePublicName } from '../uploads/cloudinary-url.js'

// Flag para evitar configurar múltiples veces
let isConfigured = false

/**
 * Configurar Cloudinary de forma lazy (solo cuando se necesite)
 * Esto evita problemas de timing con dotenv
 */
function ensureConfigured(): void {
  if (isConfigured) return

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    logger.error(
      { cloud_name: !!cloudName, api_key: !!apiKey, api_secret: !!apiSecret },
      '[CloudinaryService] Missing configuration'
    )
    throw new Error(
      'Cloudinary configuration missing. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
    )
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  isConfigured = true
  logger.info({ cloud: cloudName }, '[CloudinaryService] Configured successfully')
}

export interface CloudinaryUploadResult {
  url: string
  secure_url: string
  public_id: string
  width?: number
  height?: number
  format: string
  resource_type?: string
  bytes?: number
}

// Private files are uploaded as `authenticated`: their URL only works with
// the signature Cloudinary adds to secure_url, so that URL must never reach a
// browser. The API serves them through its own endpoints instead
// (services/uploads/private-files.ts). Only avatars stay public.
const PRIVATE_DELIVERY = 'authenticated'

// Destroy whichever delivery type the file has: files uploaded before
// 2026-10-04 are `upload` until migrated, newer ones `authenticated`
async function destroyAnyType(
  publicId: string,
  resourceType: 'image' | 'raw'
): Promise<{ result: string }> {
  const first = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: PRIVATE_DELIVERY,
    invalidate: true,
  })
  if (first.result !== 'not found') return first
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: 'upload',
    invalidate: true,
  })
}

export class CloudinaryService {
  /**
   * Subir imagen privada a Cloudinary (tipo `authenticated`)
   * @param fileBuffer - Buffer del archivo
   * @param filename - Nombre original del archivo
   * @param folder - Carpeta destino en Cloudinary (default: 'blacklist')
   */
  static async uploadImage(
    fileBuffer: Buffer,
    filename: string,
    folder: string = 'blacklist'
  ): Promise<CloudinaryUploadResult> {
    ensureConfigured()

    return new Promise((resolve, reject) => {
      // Subir usando upload_stream
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
          type: PRIVATE_DELIVERY,
          public_id: `${folder}_${Date.now()}_${safePublicName(filename)}`,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamaño máximo
            { quality: 'auto:good' }, // Optimizar calidad
          ],
        },
        (error, result) => {
          if (error) {
            logger.error({ err: error }, '[CloudinaryService] Upload error')
            reject(new Error('Error al subir imagen a Cloudinary'))
            return
          }

          if (!result) {
            reject(new Error('No se recibió respuesta de Cloudinary'))
            return
          }

          resolve({
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          })
        }
      )

      // Escribir el buffer al stream
      uploadStream.end(fileBuffer)
    })
  }

  /**
   * Subir avatar a Cloudinary con mejor calidad
   * Optimizado para fotos de perfil: cuadrado, alta calidad
   * @param fileBuffer - Buffer del archivo
   * @param filename - Nombre original del archivo
   * @param folder - Carpeta destino en Cloudinary (default: 'avatars')
   */
  static async uploadAvatar(
    fileBuffer: Buffer,
    filename: string,
    folder: string = 'avatars'
  ): Promise<CloudinaryUploadResult> {
    ensureConfigured()

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
          public_id: `avatar_${Date.now()}_${safePublicName(filename)}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Cuadrado, centrado en cara
            { quality: 95 }, // Alta calidad
            { format: 'webp' }, // Formato moderno y eficiente
          ],
        },
        (error, result) => {
          if (error) {
            logger.error({ err: error }, '[CloudinaryService] Avatar upload error')
            reject(new Error('Error al subir avatar a Cloudinary'))
            return
          }

          if (!result) {
            reject(new Error('No se recibió respuesta de Cloudinary'))
            return
          }

          resolve({
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          })
        }
      )

      uploadStream.end(fileBuffer)
    })
  }

  /**
   * Eliminar imagen de Cloudinary
   * @param publicId - ID público de la imagen
   */
  static async deleteImage(publicId: string): Promise<boolean> {
    ensureConfigured()

    try {
      logger.debug({ publicId }, '[CloudinaryService] Attempting to delete image')

      const result = await destroyAnyType(publicId, 'image')

      logger.info({ result }, '[CloudinaryService] Delete result')

      // 'ok' = eliminado exitosamente, 'not found' = ya no existe (también consideramos éxito)
      if (result.result === 'ok' || result.result === 'not found') {
        return true
      }

      // Si el resultado es diferente, logueamos y lanzamos error
      logger.error({ result }, '[CloudinaryService] Unexpected delete result')
      throw new Error(`Cloudinary delete returned: ${result.result}`)
    } catch (error) {
      const err = error as { message?: string }
      logger.error({ err: error }, '[CloudinaryService] Delete error')
      logger.error({ err: error, details: error }, '[CloudinaryService] Delete error details')
      throw new Error(`Error al eliminar imagen de Cloudinary: ${err.message || 'Unknown error'}`, {
        cause: error,
      })
    }
  }

  /**
   * Extraer public_id de una URL de Cloudinary
   * @param url - URL completa de Cloudinary
   * @param folder - Carpeta a buscar (default: 'blacklist')
   */
  static extractPublicId(url: string, folder: string = 'blacklist'): string | null {
    try {
      // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{format}
      const regex = new RegExp(`\\/${folder}\\/([^.]+)`)
      const matches = url.match(regex)
      return matches ? `${folder}/${matches[1]}` : null
    } catch {
      return null
    }
  }

  /**
   * Subir PDF privado a Cloudinary como recurso raw (tipo `authenticated`)
   * @param fileBuffer - Buffer del archivo PDF
   * @param filename - Nombre original del archivo
   * @param folder - Carpeta destino en Cloudinary
   */
  static async uploadPdf(
    fileBuffer: Buffer,
    filename: string,
    folder: string = 'backoffice/invoices'
  ): Promise<CloudinaryUploadResult> {
    ensureConfigured()

    return new Promise((resolve, reject) => {
      // Generar public_id limpio
      const cleanFilename = filename
        .replace(/\.[^/.]+$/, '') // Quitar extensión
        .replace(/[^a-zA-Z0-9_-]/g, '_') // Solo caracteres seguros
        .substring(0, 50) // Limitar longitud

      const publicId = `pdf_${Date.now()}_${cleanFilename}`

      // Subir usando upload_stream como raw
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'raw', // Subir como archivo raw
          public_id: publicId,
          type: PRIVATE_DELIVERY,
          overwrite: true,
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            logger.error({ err: error }, '[CloudinaryService] PDF Upload error')
            reject(new Error(`Error al subir PDF a Cloudinary: ${error.message}`))
            return
          }

          if (!result) {
            reject(new Error('No se recibió respuesta de Cloudinary'))
            return
          }

          logger.info(
            {
              url: result.secure_url,
              publicId: result.public_id,
              resourceType: result.resource_type,
              format: result.format,
            },
            '[CloudinaryService] PDF uploaded successfully'
          )

          resolve({
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format || 'pdf',
            resource_type: result.resource_type,
            bytes: result.bytes,
          })
        }
      )

      // Escribir el buffer al stream
      uploadStream.end(fileBuffer)
    })
  }

  /**
   * Eliminar archivo (imagen o raw) de Cloudinary
   * @param publicId - ID público del archivo
   * @param resourceType - Tipo de recurso ('image' o 'raw')
   */
  static async deleteFile(
    publicId: string,
    resourceType: 'image' | 'raw' = 'image'
  ): Promise<boolean> {
    ensureConfigured()

    try {
      const result = await destroyAnyType(publicId, resourceType)
      return result.result === 'ok'
    } catch (error) {
      logger.error({ err: error }, '[CloudinaryService] Delete error')
      throw new Error('Error al eliminar archivo de Cloudinary', { cause: error })
    }
  }
}
