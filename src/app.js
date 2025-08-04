import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import 'express-async-errors';

// Importar configuraciones
import { corsConfig } from './config/cors.js';
import logger from './config/logger.js';

// Inicializar estrategias de validación
import './shared/validation/index.js';

// Importar middlewares globales
import { errorHandler } from './shared/middleware/errorHandler.js';
import { notFound } from './shared/middleware/notFound.js';
import { requestLogger } from './shared/middleware/requestLogger.js';
import {
  patternsMiddleware,
  validatePatternsConfig,
} from './shared/middleware/patternsMiddleware.js';

// Importar módulos de dominio
import authModule from './modules/auth/auth.module.js';
import userModule from './modules/users/users.module.js';
import productModule from './modules/products/products.module.js';
import cartModule from './modules/cart/cart.module.js';
import orderModule from './modules/orders/orders.module.js';
import paymentModule from './modules/payments/payments.module.js';
import uploadModule from './modules/uploads/uploads.module.js';

// Importar rutas de demostración de patrones
import patternsRoutes from './shared/routes/patterns.js';

const app = express();

// Middlewares de seguridad y optimización
app.use(helmet());
app.use(compression());
app.use(cors(corsConfig));

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
app.use(requestLogger);

// Middlewares de patrones de diseño
app.use(validatePatternsConfig);
app.use(patternsMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'E-commerce API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    patterns: {
      singleton: req.config ? 'initialized' : 'not initialized',
      repositories: req.repositories ? Object.keys(req.repositories).length : 0,
      patternManagers: req.patterns ? Object.keys(req.patterns).length : 0,
      emailVerification: req.repositories?.emailVerification
        ? 'enabled'
        : 'disabled',
      notificationManager: req.patterns?.notification ? 'enabled' : 'disabled',
    },
  });
});

// API Routes - Módulos de dominio
// 🔹 USAR MÓDULO DE AUTH MEJORADO CON EMAIL VERIFICATION
app.use('/api/auth', authModule);
// Fallback al módulo original si es necesario
// app.use('/api/auth-legacy', authModule);
app.use('/api/users', userModule);
app.use('/api/products', productModule);
app.use('/api/cart', cartModule);
app.use('/api/orders', orderModule);
app.use('/api/payments', paymentModule);
app.use('/api/uploads', uploadModule);

// Ruta de demostración de patrones
app.use('/api/patterns', patternsRoutes);

// Middlewares de manejo de errores
app.use(notFound);
app.use(errorHandler);

export default app;
