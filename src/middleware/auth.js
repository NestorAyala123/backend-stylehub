import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log(
      '🔐 Auth middleware - Header:',
      authHeader ? 'Present' : 'Missing'
    );
    console.log(
      '🔐 Auth middleware - Token:',
      token ? `${token.substring(0, 20)}...` : 'Missing'
    );

    if (!token) {
      console.log('❌ Auth middleware - No token provided');
      return res.status(401).json({
        error: 'Token de acceso requerido',
      });
    }

    // Verificar token JWT personalizado en lugar de Supabase
    console.log('🔐 Auth middleware - Verifying custom JWT token...');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Auth middleware - JWT decoded successfully:', {
        userId: decoded.sub,
        email: decoded.email,
        rol: decoded.rol,
      });

      // Crear un objeto user compatible con el resto del sistema
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        user_metadata: {
          full_name: decoded.full_name,
          rol: decoded.rol,
        },
        is_admin: decoded.is_admin,
        rol: decoded.rol,
      };

      console.log('✅ Auth middleware - User authenticated:', req.user.id);
      next();
    } catch (jwtError) {
      console.log(
        '❌ Auth middleware - JWT verification failed:',
        jwtError.message
      );
      return res.status(403).json({
        error: 'Token inválido o expirado',
      });
    }
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      req.user = user;
    }

    next();
  } catch (error) {
    // Si hay error en auth opcional, continuar sin usuario
    next();
  }
};
