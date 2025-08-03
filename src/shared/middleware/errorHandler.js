import logger from '../../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Error de validación de Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  // Error de validación de express-validator
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.message,
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
    });
  }

  // Error de Supabase
  if (err.code && err.code.startsWith('PG')) {
    return res.status(400).json({
      error: 'Error de base de datos',
      details:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Error en la operación de base de datos',
    });
  }

  // Error de Multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'Archivo demasiado grande',
      details: 'El archivo excede el tamaño máximo permitido',
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Demasiados archivos',
      details: 'Se excedió el número máximo de archivos permitidos',
    });
  }

  // Error de Cloudinary
  if (err.http_code) {
    return res.status(400).json({
      error: 'Error de subida de imagen',
      details: err.message,
    });
  }

  // Error de Stripe
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(400).json({
      error: 'Error de procesamiento de pago',
      details: err.message,
    });
  }

  // Error genérico
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
};
