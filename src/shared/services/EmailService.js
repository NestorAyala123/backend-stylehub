import nodemailer from 'nodemailer';
import logger from '../../config/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      console.log('📧 Inicializando transporter de email...');
      console.log('📧 EMAIL_HOST:', process.env.EMAIL_HOST);
      console.log('📧 EMAIL_PORT:', process.env.EMAIL_PORT);
      console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
      console.log('📧 EMAIL_PASS existe:', !!process.env.EMAIL_PASS);

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      console.log('📧 Transporter creado exitosamente');
      logger.info('Email service initialized successfully');
    } catch (error) {
      console.error('📧 Error inicializando transporter:', error.message);
      logger.error('Failed to initialize email service:', error.message);
    }
  }

  async sendVerificationCode(email, verificationCode, userName = 'Usuario') {
    try {
      console.log(
        '📧 EmailService: Iniciando envío de código de verificación...'
      );
      console.log('📧 EmailService: Email destino:', email);
      console.log('📧 EmailService: Código:', verificationCode);
      console.log('📧 EmailService: Nombre usuario:', userName);

      // Validar que email sea un string
      if (typeof email !== 'string') {
        console.error(
          '📧 EmailService: Email debe ser un string, recibido:',
          typeof email,
          email
        );
        throw new Error('Email debe ser un string válido');
      }

      // Validar formato básico de email
      if (!email || !email.includes('@')) {
        console.error('📧 EmailService: Email inválido:', email);
        throw new Error('Email inválido');
      }

      if (!this.transporter) {
        console.error('📧 EmailService: Transporter no inicializado');
        throw new Error('Email service not properly initialized');
      }

      console.log('📧 EmailService: Configurando opciones de email...');
      const mailOptions = {
        from: `"StyleHub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Código de Verificación - StyleHub',
        html: this.getVerificationEmailTemplate(verificationCode, userName),
      };

      console.log('📧 EmailService: Enviando email...');
      const result = await this.transporter.sendMail(mailOptions);

      console.log('📧 EmailService: Email enviado exitosamente', {
        to: email,
        messageId: result.messageId,
      });

      logger.info('Verification email sent successfully', {
        to: email,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('📧 EmailService: Error enviando email:', error.message);
      console.error('📧 EmailService: Stack trace:', error.stack);

      logger.error('Failed to send verification email:', {
        error: error.message,
        to: email,
      });

      throw new Error(`Error enviando email de verificación: ${error.message}`);
    }
  }

  async sendPasswordReset(email, resetCode, userName = 'Usuario') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not properly initialized');
      }

      const mailOptions = {
        from: `"StyleHub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Código de Recuperación de Contraseña - StyleHub',
        html: this.getPasswordResetEmailTemplate(resetCode, userName),
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Password reset email sent successfully', {
        to: email,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      logger.error('Failed to send password reset email:', {
        error: error.message,
        to: email,
      });

      throw new Error(`Error enviando email de recuperación: ${error.message}`);
    }
  }

  getVerificationEmailTemplate(verificationCode, userName) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Cuenta</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #000000;
            color: white;
            text-align: center;
            padding: 30px;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .code-box {
            background: #e8f4fd;
            border: 2px solid #2196F3;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #2196F3;
            letter-spacing: 5px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>STYLEHUB</h1>
          <p>Verifica tu cuenta</p>
        </div>
        
        <div class="content">
          <h2>¡Hola ${userName}!</h2>
          
          <p>Gracias por registrarte en StyleHub. Para completar tu registro y activar tu cuenta, necesitas verificar tu dirección de email.</p>
          
          <p>Tu código de verificación es:</p>
          
          <div class="code-box">
            <div class="code">${verificationCode}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
              Este código es válido por 15 minutos
            </p>
          </div>
          
          <p>Ingresa este código en la página de verificación para activar tu cuenta.</p>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong> Si no fuiste tú quien se registró, puedes ignorar este email. Tu dirección de email no será utilizada.
          </div>
          
          <p>Si tienes algún problema, no dudes en contactarnos.</p>
          
          <p>¡Bienvenido a StyleHub!</p>
        </div>
        
        <div class="footer">
          <p>© 2025 StyleHub. Todos los derechos reservados.</p>
          <p>Este es un email automático, por favor no respondas a este mensaje.</p>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailTemplate(resetCode, userName) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #000000;
            color: white;
            text-align: center;
            padding: 30px;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .code-box {
            background: #fff5f5;
            border: 2px solid #ff6b6b;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #ff6b6b;
            letter-spacing: 5px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>STYLEHUB</h1>
          <p>Recuperación de Contraseña</p>
        </div>
        
        <div class="content">
          <h2>¡Hola ${userName}!</h2>
          
          <p>Recibimos una solicitud para restablecer tu contraseña en StyleHub.</p>
          
          <p>Tu código de recuperación es:</p>
          
          <div class="code-box">
            <div class="code">${resetCode}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
              Este código es válido por 10 minutos
            </p>
          </div>
          
          <p>Ingresa este código junto con tu nueva contraseña para completar el restablecimiento.</p>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong> Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña actual seguirá siendo válida.
          </div>
          
          <p>Por tu seguridad, nunca compartas este código con nadie.</p>
        </div>
        
        <div class="footer">
          <p>© 2025 StyleHub. Todos los derechos reservados.</p>
          <p>Este es un email automático, por favor no respondas a este mensaje.</p>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      await this.transporter.verify();
      logger.info('Email service connection test successful');
      return { success: true };
    } catch (error) {
      logger.error('Email service connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();
