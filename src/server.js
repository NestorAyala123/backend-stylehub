import dotenv from 'dotenv';
import app from './app.js';
import logger from './config/logger.js';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 5000;

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  logger.info(`📱 Ambiente: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default server;
