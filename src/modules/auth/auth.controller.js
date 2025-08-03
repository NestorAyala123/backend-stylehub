import authService from './auth.service.js';
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
} from './auth.validation.js';
import logger from '../../config/logger.js';

class AuthController {
  async register(req, res) {
    try {
      // Validar datos de entrada
      const { error } = validateRegister(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Datos de registro inválidos',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      // Verificar si el email ya existe
      const emailExists = await authService.emailExists(req.body.email);
      if (emailExists) {
        return res.status(409).json({
          error: 'Este email ya está registrado',
          field: 'email',
        });
      }

      // Registrar usuario
      const result = await authService.register(req.body);

      logger.info('Usuario registrado exitosamente', {
        userId: result.user?.id,
        email: result.user?.email,
        rol: result.profile?.rol,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: result.user,
        session: result.session,
        profile: result.profile,
        requiresVerification: !result.user?.email_confirmed_at,
      });
    } catch (error) {
      logger.error('Error en registro', {
        error: error.message,
        email: req.body?.email,
        ip: req.ip,
        stack: error.stack,
      });

      // Manejar errores específicos
      let statusCode = 500;
      let errorMessage = 'Error interno del servidor';
      let field = null;

      if (
        error.message.includes('already registered') ||
        error.message.includes('ya está registrado')
      ) {
        statusCode = 409;
        errorMessage = 'Este email ya está registrado';
        field = 'email';
      } else if (error.message.includes('email')) {
        statusCode = 400;
        errorMessage = 'Error con el email proporcionado';
        field = 'email';
      } else if (
        error.message.includes('password') ||
        error.message.includes('contraseña')
      ) {
        statusCode = 400;
        errorMessage = 'Error con la contraseña';
        field = 'password';
      } else if (
        error.message.includes('full_name') ||
        error.message.includes('nombre')
      ) {
        statusCode = 400;
        errorMessage = 'Error con el nombre';
        field = 'full_name';
      } else if (
        error.message.includes('phone') ||
        error.message.includes('teléfono')
      ) {
        statusCode = 400;
        errorMessage = 'Error con el teléfono';
        field = 'phone';
      } else if (error.message.includes('rol')) {
        statusCode = 400;
        errorMessage = 'Rol inválido';
        field = 'rol';
      }

      const response = {
        error: errorMessage,
        details: error.message,
      };

      if (field) {
        response.field = field;
      }

      res.status(statusCode).json(response);
    }
  }

  async login(req, res) {
    try {
      // Validar datos de entrada
      const { error } = validateLogin(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Datos de login inválidos',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      // Intentar login
      const result = await authService.login(req.body);

      logger.info('Usuario logueado exitosamente', {
        userId: result.user?.id,
        email: result.user?.email,
        rol: result.profile?.rol,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        user: result.user,
        session: result.session,
        profile: result.profile,
      });
    } catch (error) {
      logger.warn('Error en login', {
        error: error.message,
        email: req.body?.email,
        ip: req.ip,
      });

      const statusCode = 401;
      let errorMessage = 'Credenciales inválidas';

      if (
        error.message.includes('no encontrado') ||
        error.message.includes('not found')
      ) {
        errorMessage = 'Usuario no encontrado';
      } else if (
        error.message.includes('inactivo') ||
        error.message.includes('inactive')
      ) {
        errorMessage = 'Cuenta desactivada';
      } else if (
        error.message.includes('verificar') ||
        error.message.includes('verify')
      ) {
        errorMessage = 'Por favor verifica tu email antes de iniciar sesión';
      }

      res.status(statusCode).json({
        error: errorMessage,
        details: error.message,
      });
    }
  }

  async logout(req, res) {
    try {
      await authService.logout(req.user.id);

      logger.info('Usuario deslogueado', {
        userId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
    } catch (error) {
      logger.error('Error en logout', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Error cerrando sesión',
        details: error.message,
      });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      res.json({
        success: true,
        user: user,
      });
    } catch (error) {
      logger.error('Error obteniendo usuario actual', {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Error obteniendo información del usuario',
        details: error.message,
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { error } = validateChangePassword(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      await authService.changePassword(req.user.id, req.body);

      logger.info('Contraseña cambiada exitosamente', {
        userId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
      });
    } catch (error) {
      logger.error('Error cambiando contraseña', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip,
      });

      let statusCode = 500;
      if (
        error.message.includes('actual incorrecta') ||
        error.message.includes('current password')
      ) {
        statusCode = 401;
      }

      res.status(statusCode).json({
        error: error.message || 'Error cambiando contraseña',
        details: error.message,
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { error } = validateForgotPassword(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Email inválido',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      await authService.forgotPassword(req.body.email);

      logger.info('Recuperación de contraseña solicitada', {
        email: req.body.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Se ha enviado un enlace de recuperación a tu email',
      });
    } catch (error) {
      logger.error('Error en recuperación de contraseña', {
        error: error.message,
        email: req.body?.email,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Error enviando email de recuperación',
        details: error.message,
      });
    }
  }

  async resetPassword(req, res) {
    try {
      await authService.resetPassword(req.body);

      logger.info('Contraseña restablecida exitosamente', {
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Contraseña restablecida exitosamente',
      });
    } catch (error) {
      logger.error('Error restableciendo contraseña', {
        error: error.message,
        ip: req.ip,
      });

      res.status(400).json({
        error: error.message || 'Error restableciendo contraseña',
        details: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const result = await authService.refreshToken(req.user.id);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Error renovando token', {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(401).json({
        error: 'Error renovando token',
        details: error.message,
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      await authService.verifyEmail(req.body.token);

      logger.info('Email verificado exitosamente', {
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Email verificado exitosamente',
      });
    } catch (error) {
      logger.error('Error verificando email', {
        error: error.message,
        ip: req.ip,
      });

      res.status(400).json({
        error: 'Token de verificación inválido o expirado',
        details: error.message,
      });
    }
  }

  async resendVerification(req, res) {
    try {
      await authService.resendVerification(req.body.email);

      logger.info('Email de verificación reenviado', {
        email: req.body.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Email de verificación reenviado',
      });
    } catch (error) {
      logger.error('Error reenviando verificación', {
        error: error.message,
        email: req.body?.email,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Error reenviando email de verificación',
        details: error.message,
      });
    }
  }

  // Nuevo método para actualizar rol de usuario (solo admin)
  async updateUserRole(req, res) {
    try {
      const { userId, newRole } = req.body;

      if (!req.user.is_admin && req.user.rol !== 'admin') {
        return res.status(403).json({
          error: 'No tienes permisos para cambiar roles de usuario',
        });
      }

      await authService.updateUserRole(userId, newRole, req.user.id);

      logger.info('Rol de usuario actualizado', {
        targetUserId: userId,
        newRole: newRole,
        adminUserId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Rol de usuario actualizado exitosamente',
      });
    } catch (error) {
      logger.error('Error actualizando rol', {
        error: error.message,
        targetUserId: req.body?.userId,
        adminUserId: req.user?.id,
        ip: req.ip,
      });

      res.status(400).json({
        error: error.message || 'Error actualizando rol',
        details: error.message,
      });
    }
  }
}

export default new AuthController();
