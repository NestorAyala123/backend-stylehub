/**
 * Middleware para integrar los patrones de diseño en toda la aplicación
 */

import {
  Singleton,
  ProductFactoryManager,
  RepositoryFactory,
  PaymentManager,
  DiscountManager,
} from '../patterns/index.js';
import { supabaseAdmin } from '../../config/supabase.js';
import logger from '../../config/logger.js';
import emailVerificationRepository from '../../modules/auth/repository/emailverification.repository.js';
import notificationManager from '../patterns/NotificationManager.js';

// Inicializar configuración global con Singleton
const appConfig = Singleton.getInstance();

// Configurar valores por defecto
appConfig.set('app', {
  name: 'StyleHub Backend',
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

appConfig.set('database', {
  maxRetries: 3,
  timeout: 30000,
  poolSize: 20,
});

appConfig.set('business', {
  taxRate: 0.18,
  shippingCost: 5.99,
  freeShippingThreshold: 50.0,
  maxCartItems: 100,
});

appConfig.set('payments', {
  stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
  paypalClientId: process.env.PAYPAL_CLIENT_ID,
  supportedMethods: ['credit_card', 'paypal', 'bank_transfer'],
});

// 🔹 CONFIGURACIÓN PARA EMAIL VERIFICATION
appConfig.set('email_verification', {
  accountVerificationExpiryMinutes: 15,
  passwordResetExpiryMinutes: 10,
  resendThresholdMinutes: 2,
  maxAttemptsPerDay: 5,
  cleanupIntervalHours: 24,
});

appConfig.set('user_creation_settings', {
  require_email_verification: true,
  default_role: 'cliente',
  password_strength: 'strong',
  auto_login_after_verification: true,
});

// Inicializar managers globales
const productFactory = ProductFactoryManager.getInstance();
const paymentManager = new PaymentManager();
const discountManager = new DiscountManager();
// 🔹 INTEGRACIÓN DEL NOTIFICATION MANAGER
const notificationManagerInstance = notificationManager;

// Crear repositorios para cada entidad
const repositories = {
  products: RepositoryFactory.createRepository(
    'database',
    supabaseAdmin,
    'products'
  ),
  users: RepositoryFactory.createRepository('database', supabaseAdmin, 'users'),
  orders: RepositoryFactory.createRepository(
    'database',
    supabaseAdmin,
    'orders'
  ),
  cart: RepositoryFactory.createRepository(
    'database',
    supabaseAdmin,
    'cart_items'
  ),
  payments: RepositoryFactory.createRepository(
    'database',
    supabaseAdmin,
    'payments'
  ),
  // 🔹 INTEGRACIÓN DEL EMAIL VERIFICATION REPOSITORY
  emailVerification: emailVerificationRepository,
};

/**
 * Middleware que inyecta los patrones de diseño en req
 */
export const patternsMiddleware = (req, res, next) => {
  try {
    // Inyectar configuración global
    req.config = appConfig;

    // Inyectar repositorios
    req.repositories = repositories;

    // Inyectar managers
    req.patterns = {
      productFactory,
      paymentManager,
      discountManager,
      // 🔹 AGREGAR NOTIFICATION MANAGER
      notification: notificationManagerInstance,
    };

    // Inyectar utilidades comunes
    req.utils = {
      calculateTax: (amount) => amount * appConfig.get('business').taxRate,
      calculateShipping: (amount, threshold) => {
        const { shippingCost, freeShippingThreshold } =
          appConfig.get('business');
        return amount >= (threshold || freeShippingThreshold)
          ? 0
          : shippingCost;
      },
      formatPrice: (price) => parseFloat(price).toFixed(2),
      generateOrderId: () =>
        `ORD_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 6)
          .toUpperCase()}`,
    };

    // Log de request con configuración
    if (appConfig.get('app').environment === 'development') {
      logger.info(`${req.method} ${req.path} - Patterns injected`);
    }

    next();
  } catch (error) {
    logger.error('Error in patterns middleware:', error);
    next(error);
  }
};

/**
 * Middleware para validación de configuración de patrones
 */
export const validatePatternsConfig = (req, res, next) => {
  try {
    const requiredConfigs = ['app', 'database', 'business', 'payments'];

    for (const config of requiredConfigs) {
      if (!appConfig.has(config)) {
        throw new Error(`Missing configuration: ${config}`);
      }
    }

    // Validar repositorios
    const requiredRepos = ['products', 'users', 'orders'];
    for (const repo of requiredRepos) {
      if (!repositories[repo]) {
        throw new Error(`Repository not initialized: ${repo}`);
      }
    }

    next();
  } catch (error) {
    logger.error('Patterns configuration validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server configuration error',
    });
  }
};

/**
 * Función para obtener instancia de configuración global
 */
export const getGlobalConfig = () => appConfig;

/**
 * Función para obtener repositorios
 */
export const getRepositories = () => repositories;

/**
 * Función para obtener managers de patrones
 */
export const getPatternManagers = () => ({
  productFactory,
  paymentManager,
  discountManager,
});

export default {
  patternsMiddleware,
  validatePatternsConfig,
  getGlobalConfig,
  getRepositories,
  getPatternManagers,
};
