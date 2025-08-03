import logger from '../../config/logger.js';

export const notFound = (req, res, next) => {
  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.originalUrl} no existe`,
    timestamp: new Date().toISOString(),
  });
};
