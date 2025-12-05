// services/group/email-service.ts

import nodemailer from 'nodemailer'
import { Notification } from '../../models/notifications/index'
import { NotificationRepository } from '../../repositories/notifications/notification-repository'

// Configuración del transportador de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export class EmailService {
  /**
   * Enviar email de notificación a los destinatarios
   */
  static async sendNotification(notification: Notification): Promise<void> {
    try {
      const recipients = await NotificationRepository.getRecipients(
        notification.id
      )

      if (recipients.length === 0) {
        console.log(
          `No hay destinatarios para la notificación ${notification.id}`
        )
        return
      }

      for (const recipient of recipients) {
        if (recipient.email) {
          await this.sendEmail(
            recipient.email,
            notification.title,
            notification.message || '',
            notification.priority
          )
        }
      }

      await NotificationRepository.markEmailSent(notification.id)
    } catch (error) {
      console.error('Error enviando email de notificación:', error)
      throw error
    }
  }

  /**
   * Enviar email individual
   */
  static async sendEmail(
    to: string,
    subject: string,
    message: string,
    priority: string = 'medium'
  ): Promise<void> {
    try {
      // ✅ Convertir priority a tipo aceptado por nodemailer
      const emailPriority: 'low' | 'high' | 'normal' =
        priority === 'urgent' ? 'high' : 'normal'

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@hotel.com',
        to,
        subject,
        html: this.generateEmailTemplate(subject, message, priority),
        priority: emailPriority, // ✅ Ahora usa el tipo correcto
      }

      await transporter.sendMail(mailOptions)
      console.log(`Email enviado a ${to}: ${subject}`)
    } catch (error) {
      console.error(`Error enviando email a ${to}:`, error)
      throw error
    }
  }

  /**
   * Generar template HTML para el email
   */
  private static generateEmailTemplate(
    title: string,
    message: string,
    priority: string
  ): string {
    const priorityColor = this.getPriorityColor(priority)

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .header {
            background-color: ${priorityColor};
            color: white;
            padding: 15px;
            border-radius: 5px 5px 0 0;
            text-align: center;
          }
          .content {
            padding: 20px;
            background-color: #f9f9f9;
          }
          .footer {
            text-align: center;
            padding: 15px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${title}</h2>
          </div>
          <div class="content">
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático del sistema de gestión de grupos.</p>
            <p>Por favor no responder a este email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Obtener color según prioridad
   */
  private static getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      low: '#28a745',
      medium: '#17a2b8',
      high: '#ffc107',
      urgent: '#dc3545',
    }

    return colors[priority] || colors.medium
  }

  /**
   * Verificar conexión con el servidor SMTP
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      await transporter.verify()
      console.log('✅ Conexión SMTP verificada correctamente')
      return true
    } catch (error) {
      console.error('❌ Error verificando conexión SMTP:', error)
      return false
    }
  }
}
