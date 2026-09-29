// services/blacklist/cloudinary-service.ts
/**
 * Servicio para subir y eliminar imágenes/archivos en Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary'
import { logger } from '../../config/logger.js'

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
    logger.error({ cloud_name: !!cloudName, api_key: !!apiKey, api_secret: !!apiSecret }, '[CloudinaryService] Missing configuration')
    throw new Error('Cloudinary configuration missing. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET')
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

export class CloudinaryService {
  /**
   * Subir imagen a Cloudinary
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
          public_id: `${folder}_${Date.now()}_${filename.split('.')[0]}`,
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
          public_id: `avatar_${Date.now()}_${filename.split('.')[0]}`,
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
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      })
      
      logger.info({ result }, '[CloudinaryService] Delete result')
      
      // 'ok' = eliminado exitosamente, 'not found' = ya no existe (también consideramos éxito)
      if (result.result === 'ok' || result.result === 'not found') {
        return true
      }
      
      // Si el resultado es diferente, logueamos y lanzamos error
      logger.error({ result }, '[CloudinaryService] Unexpected delete result')
      throw new Error(`Cloudinary delete returned: ${result.result}`)
    } catch (error: any) {
      logger.error({ err: error }, '[CloudinaryService] Delete error')
      logger.error({ err: error, details: error }, '[CloudinaryService] Delete error details')
      throw new Error(`Error al eliminar imagen de Cloudinary: ${error.message || 'Unknown error'}`, { cause: error })
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
   * Subir PDF a Cloudinary como recurso raw con acceso público
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
          type: 'upload',
          access_mode: 'public', // Acceso público
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

          logger.info({ url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type, format: result.format }, '[CloudinaryService] PDF uploaded successfully')

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
  static async deleteFile(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<boolean> {
    ensureConfigured()
    
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
      return result.result === 'ok'
    } catch (error) {
      logger.error({ err: error }, '[CloudinaryService] Delete error')
      throw new Error('Error al eliminar archivo de Cloudinary', { cause: error })
    }
  }

  /**
   * Generar URL firmada para acceso temporal a un archivo
   * @param publicId - ID público del archivo
   * @param resourceType - Tipo de recurso ('image' o 'raw')
   * @param expiresInSeconds - Tiempo de expiración en segundos (default: 1 hora)
   */
  static generateSignedUrl(
    publicId: string,
    resourceType: 'image' | 'raw' = 'raw',
    expiresInSeconds: number = 3600
  ): string {
    ensureConfigured()
    
    const timestamp = Math.floor(Date.now() / 1000) + expiresInSeconds

    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      expires_at: timestamp,
    })

    logger.info({ publicId }, '[CloudinaryService] Generated signed URL')
    return signedUrl
  }

  /**
   * Generar URL firmada a partir de una URL de Cloudinary
   * Extrae el public_id de la URL y genera una URL firmada
   * @param url - URL completa de Cloudinary
   * @param expiresInSeconds - Tiempo de expiración en segundos (default: 1 hora)
   */
  static generateSignedUrlFromUrl(url: string, expiresInSeconds: number = 3600): string {
    try {
      // Determinar resource_type desde la URL
      // URL format: https://res.cloudinary.com/{cloud}/{resource_type}/upload/v{version}/{folder}/{public_id}.{format}
      let resourceType: 'image' | 'raw' = 'raw'
      if (url.includes('/image/upload/')) {
        resourceType = 'image'
      }

      // Extraer public_id de la URL
      // Example: https://res.cloudinary.com/xxx/raw/upload/v123/backoffice/invoices/pdf_123_name.pdf
      const uploadMatch = url.match(/\/upload\/v\d+\/(.+)$/)
      if (!uploadMatch) {
        logger.error({ url }, '[CloudinaryService] Could not extract public_id from URL')
        return url // Devolver URL original si no se puede parsear
      }

      // El public_id incluye carpetas pero NO la extensión
      let publicId = uploadMatch[1]
      // Remover extensión del archivo
      publicId = publicId.replace(/\.[^/.]+$/, '')

      logger.debug({ publicId, resourceType }, '[CloudinaryService] Extracted public_id')

      return this.generateSignedUrl(publicId, resourceType, expiresInSeconds)
    } catch (error) {
      logger.error({ err: error }, '[CloudinaryService] Error generating signed URL')
      return url // Devolver URL original en caso de error
    }
  }
}
