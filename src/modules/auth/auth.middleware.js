// Middleware de autenticación corregido para tu sistema personalizado

import { supabaseAdmin } from '../../config/supabase.js';
import authService from './auth.service.js';
import logger from '../../config/logger.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔍 Auth Header:', authHeader);
    console.log(
      '🔍 Token extraído:',
      token ? token.substring(0, 30) + '...' : 'No token'
    );

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido',
      });
    }

    console.log('🔍 Verificando token:', token.substring(0, 30) + '...');

    // ⭐ USAR TU MÉTODO PERSONALIZADO EN LUGAR DE SUPABASE
    const payload = authService.verifySessionToken(token);

    if (!payload) {
      console.log('❌ Token inválido');
      logger.warn('Invalid token attempt', {
        tokenStart: token.substring(0, 20),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(403).json({
        success: false,
        error: 'Token inválido o expirado',
      });
    }

    console.log('✅ Token válido, payload:', payload);

    // ⭐ USAR supabaseAdmin PARA BYPASEAR RLS
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', payload.sub)
      .eq('is_active', true)
      .single();

    if (userError || !usuario) {
      console.log('❌ Usuario no encontrado:', payload.sub);
      return res.status(403).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    console.log('✅ Usuario encontrado:', usuario.email, 'Rol:', usuario.rol);

    // Crear objeto user compatible con el formato esperado
    req.user = {
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
    };

    // Mantener compatibilidad con req.profile
    req.profile = usuario;

    next();
  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    logger.error('Authentication error', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // ⭐ USAR TU MÉTODO PERSONALIZADO
      const payload = authService.verifySessionToken(token);

      if (payload) {
        const { data: usuario } = await supabaseAdmin
          .from('usuarios')
          .select('*')
          .eq('id', payload.sub)
          .eq('is_active', true)
          .single();

        if (usuario) {
          req.user = {
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
          };
          req.profile = usuario;
        }
      }
    }

    next();
  } catch (error) {
    // Si hay error en auth opcional, continuar sin usuario
    next();
  }
};
