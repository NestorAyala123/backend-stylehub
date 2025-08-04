import { supabaseAdmin } from '../../config/supabase.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import EmailService from '../../shared/services/EmailService.js';
import EmailVerificationRepository from './repository/emailverification.repository.js';

class AuthService {
  constructor() {
    this.JWT_SECRET =
      process.env.JWT_SECRET || 'JIAJSAOISIASIABSIAS283893Y7823DD';
    this.JWT_EXPIRES_IN = '24h';
  }

  async register({ email, password, full_name, phone, rol = 'cliente' }) {
    try {
      console.log('=== INICIANDO REGISTRO ===');
      console.log('Email:', email);
      console.log('Nombre:', full_name);
      console.log('Teléfono:', phone ? '[PROVIDED]' : '[EMPTY]');
      console.log('Rol:', rol);

      // Verificar si el email ya existe
      const emailExists = await this.emailExists(email);
      if (emailExists) {
        throw new Error('Este email ya está registrado');
      }

      // Validar y normalizar rol
      const rolesValidos = ['cliente', 'admin', 'moderador', 'vendedor'];
      if (!rolesValidos.includes(rol)) {
        console.warn(`Rol inválido '${rol}', usando 'cliente' por defecto`);
        rol = 'cliente';
      }

      // Hash de la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log('✅ Contraseña hasheada correctamente');

      console.log('=== INSERTANDO EN BASE DE DATOS (MÉTODO DIRECTO) ===');

      // Generar UUID
      const userId = crypto.randomUUID();

      // ⭐ INSERTAR DIRECTAMENTE EN LA TABLA (SIN FUNCIÓN SQL)
      const { data: insertedUser, error: userError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          id: userId,
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          full_name: full_name.trim(),
          phone: phone ? phone.trim() : null,
          rol: rol,
          is_admin: rol === 'admin',
          is_active: true,
          email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ ERROR INSERTANDO USUARIO:', {
          error: userError,
          code: userError.code,
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
        });

        // Proporcionar errores más específicos
        if (userError.code === '23505') {
          if (userError.message.includes('email')) {
            throw new Error('Este email ya está registrado');
          }
          throw new Error('Ya existe un usuario con estos datos');
        } else if (userError.code === '23502') {
          throw new Error('Faltan campos requeridos para el registro');
        } else if (userError.code === '42501') {
          throw new Error('Error de permisos en la base de datos');
        } else if (userError.code === '42P01') {
          throw new Error('Tabla de usuarios no encontrada');
        } else if (userError.code === '23514') {
          throw new Error(
            'Datos inválidos: verifique el formato de los campos'
          );
        } else {
          throw new Error(`Error en la base de datos: ${userError.message}`);
        }
      }

      if (!insertedUser) {
        throw new Error('No se pudo crear el usuario');
      }

      console.log('✅ Usuario creado exitosamente:', insertedUser.id);

      // ⭐ CREAR CÓDIGO DE VERIFICACIÓN USANDO EL REPOSITORIO
      try {
        console.log('🔐 Generando código de verificación...');
        const verificationResult =
          await EmailVerificationRepository.createVerificationCode(
            insertedUser.id,
            insertedUser.email,
            'account_verification'
          );

        console.log('✅ Código de verificación creado:', {
          code: verificationResult.code,
          expiresIn: verificationResult.expires_in_minutes + ' minutos',
        });

        // ⭐ ENVIAR EMAIL CON CÓDIGO DE VERIFICACIÓN
        try {
          console.log('📧 Enviando email de verificación...');
          await EmailService.sendVerificationCode(
            insertedUser.email,
            verificationResult.code,
            insertedUser.full_name
          );
          console.log('✅ Email de verificación enviado exitosamente');
        } catch (emailError) {
          console.error(
            '❌ Error enviando email de verificación:',
            emailError.message
          );
          // No fallar el registro por error de email, el usuario puede solicitar reenvío
        }
      } catch (verificationError) {
        console.error(
          '❌ Error creando código de verificación:',
          verificationError.message
        );
        // No fallar el registro por esto, el usuario puede solicitar un reenvío
      }

      // ⭐ NO CREAR SESIÓN HASTA QUE EL EMAIL ESTÉ VERIFICADO
      // En lugar de crear una sesión, devolver información básica del usuario
      return {
        user: {
          id: insertedUser.id,
          email: insertedUser.email,
          user_metadata: {
            full_name: insertedUser.full_name,
            phone: insertedUser.phone,
            rol: insertedUser.rol,
          },
          email_confirmed_at: null,
        },
        // No incluir session para forzar verificación de email
        session: null,
        profile: {
          id: insertedUser.id,
          email: insertedUser.email,
          full_name: insertedUser.full_name,
          phone: insertedUser.phone,
          rol: insertedUser.rol,
          is_admin: insertedUser.is_admin,
          is_active: insertedUser.is_active,
          email_verified: insertedUser.email_verified,
          created_at: insertedUser.created_at,
        },
        message:
          'Usuario registrado exitosamente. Por favor, verifica tu email para activar tu cuenta.',
        requiresVerification: true,
      };
    } catch (error) {
      console.error('❌ ERROR EN REGISTRO:', error.message);
      throw error;
    }
  }

  async login({ email, password }) {
    try {
      console.log('=== INICIANDO LOGIN ===');
      console.log('Email:', email);

      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

      if (userError || !usuario) {
        console.log('❌ Usuario no encontrado:', userError?.message);
        throw new Error('Credenciales inválidas');
      }

      console.log('✅ Usuario encontrado:', usuario.id, 'Rol:', usuario.rol);

      // Verificar la contraseña
      const isPasswordValid = await bcrypt.compare(password, usuario.password);
      if (!isPasswordValid) {
        console.log('❌ Contraseña inválida para usuario:', usuario.id);
        throw new Error('Credenciales inválidas');
      }

      console.log('✅ Contraseña válida, verificando estado del email...');

      // ⭐ VERIFICAR SI EL EMAIL ESTÁ CONFIRMADO
      if (!usuario.email_verified) {
        console.log('❌ Email no verificado para usuario:', usuario.id);
        throw new Error(
          'Debes verificar tu email antes de poder iniciar sesión. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.'
        );
      }

      console.log('✅ Email verificado, login exitoso');

      // Actualizar último login
      try {
        await supabaseAdmin
          .from('usuarios')
          .update({
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', usuario.id);
        console.log('✅ Last login actualizado');
      } catch (updateError) {
        console.warn('⚠️ No se pudo actualizar last_login:', updateError);
      }

      // Remover la contraseña del usuario antes de retornar
      const { password: _, ...userWithoutPassword } = usuario;

      // Crear token de sesión
      const sessionToken = this.generateSessionToken(usuario);

      return {
        user: {
          id: usuario.id,
          email: usuario.email,
          user_metadata: {
            full_name: usuario.full_name,
            phone: usuario.phone,
            rol: usuario.rol,
          },
          email_confirmed_at: usuario.email_verified
            ? new Date().toISOString()
            : null,
        },
        session: {
          access_token: sessionToken,
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          user: {
            id: usuario.id,
            email: usuario.email,
          },
        },
        profile: userWithoutPassword,
      };
    } catch (error) {
      console.error('❌ ERROR EN LOGIN:', error.message);
      throw error;
    }
  }

  async logout(userId) {
    try {
      console.log('Usuario deslogueado:', userId);
      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Error cerrando sesión');
    }
  }

  async getCurrentUser(userId) {
    try {
      const { data: usuario, error } = await supabaseAdmin
        .from('usuarios')
        .select(
          `
          id, email, full_name, phone, address, avatar_url, 
          rol, is_admin, is_active, email_verified, 
          last_login, preferences, created_at, updated_at
        `
        )
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        throw new Error('Usuario no encontrado');
      }

      return usuario;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo usuario');
    }
  }

  async changePassword(userId, { current_password, new_password }) {
    try {
      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('password')
        .eq('id', userId)
        .single();

      if (userError || !usuario) {
        throw new Error('Usuario no encontrado');
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        current_password,
        usuario.password
      );
      if (!isCurrentPasswordValid) {
        throw new Error('Contraseña actual incorrecta');
      }

      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

      const { error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({
          password: hashedNewPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error('Error actualizando contraseña');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Error cambiando contraseña');
    }
  }

  async updateUserRole(userId, newRole, adminUserId) {
    try {
      const { data: adminUser, error: adminError } = await supabaseAdmin
        .from('usuarios')
        .select('rol, is_admin')
        .eq('id', adminUserId)
        .single();

      if (
        adminError ||
        !adminUser ||
        (adminUser.rol !== 'admin' && !adminUser.is_admin)
      ) {
        throw new Error('No tienes permisos para cambiar roles');
      }

      const rolesValidos = ['cliente', 'admin', 'moderador', 'vendedor'];
      if (!rolesValidos.includes(newRole)) {
        throw new Error('Rol inválido');
      }

      const { error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({
          rol: newRole,
          is_admin: newRole === 'admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error('Error actualizando rol del usuario');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Error actualizando rol');
    }
  }

  async forgotPassword(email) {
    try {
      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('id, full_name')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

      if (userError || !usuario) {
        console.log('Email no encontrado para reset:', email);
        return { success: true };
      }

      const resetToken = this.generateResetToken(usuario.id);
      const resetExpires = new Date(Date.now() + 3600000); // 1 hora

      await supabaseAdmin
        .from('usuarios')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: resetExpires.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuario.id);

      console.log('Token de recuperación generado para:', email);

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Error enviando email de recuperación');
    }
  }

  async resetPassword({ reset_token, new_password }) {
    try {
      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('id, password_reset_expires')
        .eq('password_reset_token', reset_token)
        .single();

      if (userError || !usuario) {
        throw new Error('Token inválido o expirado');
      }

      if (new Date(usuario.password_reset_expires) < new Date()) {
        throw new Error('Token expirado');
      }

      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

      const { error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({
          password: hashedNewPassword,
          password_reset_token: null,
          password_reset_expires: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuario.id);

      if (updateError) {
        throw new Error('Error actualizando contraseña');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Error restableciendo contraseña');
    }
  }

  async refreshToken(userId) {
    try {
      const { data: usuario, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, email, full_name, phone, rol, is_admin')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error || !usuario) {
        throw new Error('Usuario no encontrado');
      }

      const sessionToken = this.generateSessionToken(usuario);

      return {
        session: {
          access_token: sessionToken,
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          user: {
            id: usuario.id,
            email: usuario.email,
          },
        },
        user: {
          id: usuario.id,
          email: usuario.email,
          user_metadata: {
            full_name: usuario.full_name,
            phone: usuario.phone,
            rol: usuario.rol,
          },
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error renovando token');
    }
  }

  async verifyEmail({ email, code }) {
    try {
      console.log(
        'Verificación de email solicitada para email:',
        email,
        'con código:',
        code
      );

      // ⭐ VERIFICAR CÓDIGO USANDO EL REPOSITORIO
      const verificationResult = await EmailVerificationRepository.verifyCode(
        email.toLowerCase().trim(),
        code,
        'account_verification'
      );

      if (!verificationResult.valid) {
        console.error(
          '❌ Código de verificación inválido:',
          verificationResult.error
        );
        throw new Error(verificationResult.error);
      }

      console.log('✅ Código verificado exitosamente');

      // Buscar usuario para crear la sesión
      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (userError || !usuario) {
        console.error('❌ Usuario no encontrado:', userError?.message);
        throw new Error('Usuario no encontrado');
      }

      console.log('✅ Usuario encontrado para verificación:', usuario.id);

      // Actualizar el estado de verificación del usuario
      const { error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuario.id);

      if (updateError) {
        console.error('❌ Error actualizando verificación:', updateError);
        throw new Error('Error verificando email');
      }

      // ⭐ CREAR SESIÓN DESPUÉS DE VERIFICAR EL EMAIL
      const sessionToken = this.generateSessionToken(usuario);

      // Remover la contraseña del usuario antes de retornar
      const { password: _, ...userWithoutPassword } = usuario;

      console.log('✅ Email verificado exitosamente y sesión creada');

      return {
        user: {
          id: usuario.id,
          email: usuario.email,
          user_metadata: {
            full_name: usuario.full_name,
            phone: usuario.phone,
            rol: usuario.rol,
          },
          email_confirmed_at: new Date().toISOString(),
        },
        session: {
          access_token: sessionToken,
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          user: {
            id: usuario.id,
            email: usuario.email,
          },
        },
        profile: {
          ...userWithoutPassword,
          email_verified: true,
        },
        message: 'Email verificado exitosamente',
      };
    } catch (error) {
      console.error('❌ ERROR EN VERIFICACIÓN DE EMAIL:', error.message);
      throw new Error(error.message || 'Error verificando email');
    }
  }

  async resendVerification(email) {
    try {
      console.log('Reenvío de verificación solicitado para:', email);

      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('id, email_verified, full_name')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (userError || !usuario) {
        return { success: true };
      }

      if (usuario.email_verified) {
        throw new Error('El email ya está verificado');
      }

      // ⭐ USAR REPOSITORIO PARA CREAR CÓDIGO DE VERIFICACIÓN
      const verificationResult =
        await EmailVerificationRepository.createVerificationCode(
          usuario.id,
          email.toLowerCase().trim(),
          'account_verification'
        );

      console.log('Código de verificación generado:', verificationResult.code);

      // ⭐ ENVIAR EMAIL CON CÓDIGO DE VERIFICACIÓN
      try {
        console.log('📧 Enviando email de verificación...');
        await EmailService.sendVerificationCode(
          email,
          verificationResult.code,
          usuario.full_name
        );
        console.log('✅ Email de verificación enviado exitosamente');
      } catch (emailError) {
        console.error(
          '❌ Error enviando email de verificación:',
          emailError.message
        );
        // No fallar la operación por error de email
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Error reenviando verificación');
    }
  }

  async resendVerificationCode(email) {
    try {
      console.log('=== REENVÍO DE CÓDIGO DE VERIFICACIÓN ===');
      console.log('Email:', email);

      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('id, email_verified, full_name')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

      if (userError || !usuario) {
        console.log('❌ Usuario no encontrado para reenvío:', email);
        // Por seguridad, devolvemos success aunque no exista el usuario
        return {
          success: true,
          message: 'Si el email existe, recibirás un código de verificación',
        };
      }

      if (usuario.email_verified) {
        throw new Error('El email ya está verificado');
      }

      // ⭐ VERIFICAR SI HAY CÓDIGOS RECIENTES PARA EVITAR SPAM
      const hasRecentCode =
        await EmailVerificationRepository.hasRecentActiveCode(
          email.toLowerCase().trim(),
          'account_verification',
          2 // 2 minutos de cooldown
        );

      if (hasRecentCode) {
        throw new Error(
          'Ya se envió un código recientemente. Espera 2 minutos antes de solicitar otro.'
        );
      }

      // ⭐ INVALIDAR CÓDIGOS ANTERIORES
      await EmailVerificationRepository.invalidatePreviousCodes(
        usuario.id,
        'account_verification'
      );

      // ⭐ CREAR NUEVO CÓDIGO DE VERIFICACIÓN
      const verificationResult =
        await EmailVerificationRepository.createVerificationCode(
          usuario.id,
          email.toLowerCase().trim(),
          'account_verification'
        );

      console.log('✅ Nuevo código de verificación generado:', {
        code: verificationResult.code,
        expiresIn: verificationResult.expires_in_minutes + ' minutos',
      });

      // ⭐ ENVIAR EMAIL CON NUEVO CÓDIGO DE VERIFICACIÓN
      try {
        console.log('📧 Reenviando email de verificación...');
        await EmailService.sendVerificationCode(
          email,
          verificationResult.code,
          usuario.full_name
        );
        console.log('✅ Email de verificación reenviado exitosamente');
      } catch (emailError) {
        console.error(
          '❌ Error reenviando email de verificación:',
          emailError.message
        );
        // No fallar la operación por error de email
      }

      return {
        success: true,
        message: 'Código de verificación enviado exitosamente',
      };
    } catch (error) {
      console.error('❌ ERROR EN REENVÍO DE VERIFICACIÓN:', error.message);
      throw new Error(
        error.message || 'Error reenviando código de verificación'
      );
    }
  }

  async emailExists(email) {
    try {
      const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      return !error && data;
    } catch (error) {
      return false;
    }
  }

  generateSessionToken(usuario) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      is_admin: usuario.is_admin,
      full_name: usuario.full_name,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    console.log('✅ Token JWT generado:', {
      userId: usuario.id,
      email: usuario.email,
      tokenStart: token.substring(0, 30) + '...',
      expiresIn: this.JWT_EXPIRES_IN,
    });

    return token;
  }

  verifySessionToken(token) {
    try {
      console.log('🔍 Verificando token JWT:', token.substring(0, 30) + '...');

      const payload = jwt.verify(token, this.JWT_SECRET);

      console.log('✅ Token JWT válido:', {
        userId: payload.sub,
        email: payload.email,
        rol: payload.rol,
        exp: new Date(payload.exp * 1000).toISOString(),
      });

      return payload;
    } catch (error) {
      console.log('❌ Token JWT inválido:', error.message);
      return null;
    }
  }

  generateResetToken(userId) {
    const payload = {
      sub: userId,
      type: 'reset',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '1h',
    });
  }

  verifyResetToken(token) {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET);

      if (payload.type !== 'reset') {
        return null;
      }

      return payload.sub;
    } catch (error) {
      return null;
    }
  }
}

export default new AuthService();
