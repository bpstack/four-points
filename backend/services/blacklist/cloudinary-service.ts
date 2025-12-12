// services/blacklist/cloudinary-service.ts
/**
 * Servicio para subir y eliminar imágenes en Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary'

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
  url: string
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
}

export class CloudinaryService {
  /**
   * Subir imagen a Cloudinary
   * @param fileBuffer - Buffer del archivo
   * @param filename - Nombre original del archivo
   */
  static async uploadImage(
    fileBuffer: Buffer,
    filename: string
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      // Subir usando upload_stream
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'blacklist',
          resource_type: 'image',
          public_id: `blacklist_${Date.now()}_${filename.split('.')[0]}`,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamaño máximo
            { quality: 'auto:good' }, // Optimizar calidad
          ],
        },
        (error, result) => {
          if (error) {
            console.error('[CloudinaryService] Upload error:', error)
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
   * Eliminar imagen de Cloudinary
   * @param publicId - ID público de la imagen
   */
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId)
      return result.result === 'ok'
    } catch (error) {
      console.error('[CloudinaryService] Delete error:', error)
      throw new Error('Error al eliminar imagen de Cloudinary')
    }
  }

  /**
   * Extraer public_id de una URL de Cloudinary
   * @param url - URL completa de Cloudinary
   */
  static extractPublicId(url: string): string | null {
    try {
      // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{format}
      const matches = url.match(/\/blacklist\/([^.]+)/)
      return matches ? `blacklist/${matches[1]}` : null
    } catch {
      return null
    }
  }
}
