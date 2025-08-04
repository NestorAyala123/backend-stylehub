import { Router } from 'express';
import logger from '../../config/logger.js';

const router = Router();

// Endpoint para demostrar los patrones de diseño en funcionamiento
router.get('/demo', async (req, res) => {
  try {
    const demoResults = {};

    // 1. Demostración del Singleton Pattern
    demoResults.singleton = {
      pattern: 'Singleton Pattern',
      description: 'Configuración global única',
      config: req.config.getInfo(),
      appConfig: {
        name: req.config.get('app').name,
        version: req.config.get('app').version,
        environment: req.config.get('app').environment,
      },
    };

    // 2. Demostración del Factory Method Pattern
    try {
      const sampleProduct = req.patterns.productFactory.createProduct(
        'clothing',
        'Demo T-Shirt',
        29.99,
        'L',
        'Cotton'
      );

      demoResults.factory = {
        pattern: 'Factory Method Pattern',
        description: 'Creación flexible de productos',
        supportedTypes: req.patterns.productFactory
          .getFactory()
          .getSupportedTypes(),
        sampleProduct: sampleProduct.getInfo(),
        tax: sampleProduct.calculateTax(),
      };
    } catch (error) {
      demoResults.factory = {
        pattern: 'Factory Method Pattern',
        error: error.message,
      };
    }

    // 3. Demostración del Repository Pattern
    try {
      // Verificar repositorios disponibles
      const availableRepos = Object.keys(req.repositories);

      demoResults.repository = {
        pattern: 'Repository Pattern',
        description: 'Abstracción de acceso a datos',
        availableRepositories: availableRepos,
        // 🔹 DEMO DEL EMAIL VERIFICATION REPOSITORY
        emailVerificationFeatures: req.repositories.emailVerification
          ? {
              methods: [
                'createVerificationCode',
                'verifyCode',
                'markCodeAsUsed',
                'invalidatePreviousCodes',
                'getActiveCodesForUser',
                'cleanupExpiredCodes',
                'hasRecentActiveCode',
                'getVerificationStats',
              ],
              supportedCodeTypes: ['account_verification', 'password_reset'],
              expirationConfig: {
                accountVerification:
                  req.config.get('email_verification')
                    ?.accountVerificationExpiryMinutes || 15,
                passwordReset:
                  req.config.get('email_verification')
                    ?.passwordResetExpiryMinutes || 10,
              },
            }
          : 'Not available',
        sampleOperations: {
          count: (await req.repositories.users?.count?.()) || 'N/A',
          databaseConnection: 'Active via Supabase',
        },
      };
    } catch (error) {
      demoResults.repository = {
        pattern: 'Repository Pattern',
        error: error.message,
      };
    }

    // 4. Demostración del Strategy Pattern
    try {
      // Demostrar métodos de pago disponibles
      const paymentMethods = req.patterns.paymentManager.getSupportedMethods();

      // Demostrar descuentos aplicables
      const sampleCriteria = {
        totalAmount: 100,
        isFirstTime: true,
        productCategory: 'clothing',
        quantity: 2,
      };

      const applicableDiscounts =
        req.patterns.discountManager.getApplicableDiscounts(sampleCriteria);

      demoResults.strategy = {
        pattern: 'Strategy Pattern',
        description: 'Algoritmos intercambiables',
        paymentMethods: paymentMethods,
        sampleDiscountCriteria: sampleCriteria,
        applicableDiscounts: applicableDiscounts,
      };
    } catch (error) {
      demoResults.strategy = {
        pattern: 'Strategy Pattern',
        error: error.message,
      };
    }

    // 5. Demostración de utilidades del middleware
    demoResults.utilities = {
      description: 'Utilidades del middleware de patrones',
      sampleCalculations: {
        tax: {
          amount: 100,
          tax: req.utils.calculateTax(100),
          description: 'Cálculo de impuesto usando configuración global',
        },
        shipping: {
          amount: 30,
          shipping: req.utils.calculateShipping(30),
          description: 'Cálculo de envío (gratis si supera el mínimo)',
        },
        price: {
          rawPrice: 25.999,
          formatted: req.utils.formatPrice(25.999),
          description: 'Formateo de precio',
        },
        orderId: {
          generated: req.utils.generateOrderId(),
          description: 'Generación de ID único de orden',
        },
      },
    };

    // 5. 🔹 Demostración del Notification Strategy Pattern
    try {
      if (req.patterns.notification) {
        // Obtener estrategias disponibles
        const availableStrategies =
          req.patterns.notification.getAvailableStrategies();

        // Demostrar envío de email de verificación (simulado)
        const verificationDemo =
          await req.patterns.notification.sendEmailVerification({
            email: 'demo@stylehub.com',
            code: '123456',
            userName: 'Demo User',
            expiresInMinutes: 15,
          });

        demoResults.notifications = {
          pattern: 'Notification Strategy Pattern',
          description: 'Sistema de notificaciones flexible',
          availableStrategies: availableStrategies,
          emailVerificationDemo: verificationDemo,
          supportedNotifications: [
            'email_verification',
            'password_reset',
            'order_confirmation',
            'payment_received',
          ],
        };
      } else {
        demoResults.notifications = {
          pattern: 'Notification Strategy Pattern',
          status: 'Not initialized',
        };
      }
    } catch (error) {
      demoResults.notifications = {
        pattern: 'Notification Strategy Pattern',
        error: error.message,
      };
    }

    // 6. Información del sistema
    demoResults.system = {
      timestamp: new Date().toISOString(),
      patterns_initialized: true,
      middleware_version: '1.0.0',
      total_patterns: 5, // Singleton, Factory, Repository, Strategy, Notification
      email_verification_enabled: !!req.repositories.emailVerification,
      notification_manager_enabled: !!req.patterns.notification,
    };

    logger.info('Design patterns demo accessed', {
      timestamp: new Date().toISOString(),
      patterns_working: Object.keys(demoResults).filter(
        (key) => !demoResults[key].error
      ).length,
      patterns_with_errors: Object.keys(demoResults).filter(
        (key) => demoResults[key].error
      ).length,
    });

    res.json({
      success: true,
      message: 'Demostración de patrones de diseño',
      data: demoResults,
    });
  } catch (error) {
    logger.error('Demo patterns failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Error en la demostración de patrones',
      details: error.message,
    });
  }
});

// Endpoint para obtener estadísticas de los patrones
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      patterns: {
        singleton: {
          initialized: !!req.config,
          configItems: req.config ? req.config.getInfo().dataSize : 0,
        },
        factory: {
          initialized: !!req.patterns?.productFactory,
          supportedTypes:
            req.patterns?.productFactory?.getFactory?.()?.getSupportedTypes?.()
              ?.length || 0,
        },
        repository: {
          initialized: !!req.repositories,
          availableRepositories: req.repositories
            ? Object.keys(req.repositories).length
            : 0,
        },
        strategy: {
          initialized: !!req.patterns?.paymentManager,
          paymentMethods:
            req.patterns?.paymentManager?.getSupportedMethods?.()?.length || 0,
        },
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get patterns stats failed', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de patrones',
    });
  }
});

// Endpoint para configurar valores en el Singleton
router.post('/config', (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren key y value',
      });
    }

    // Solo permitir ciertas configuraciones por seguridad
    const allowedKeys = ['demo', 'feature_flags', 'cache_settings'];
    const keyPrefix = key.split('.')[0];

    if (!allowedKeys.includes(keyPrefix)) {
      return res.status(403).json({
        success: false,
        error: 'Configuración no permitida',
      });
    }

    req.config.set(key, value);

    logger.info('Configuration updated via API', {
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
    });

    res.json({
      success: true,
      message: 'Configuración actualizada',
      data: {
        key,
        value,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Update config failed', {
      error: error.message,
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Error actualizando configuración',
    });
  }
});

// 🔹 ENDPOINT ESPECÍFICO PARA DEMO DE EMAIL VERIFICATION
router.get('/email-verification-demo', async (req, res) => {
  try {
    if (!req.repositories.emailVerification) {
      return res.status(404).json({
        success: false,
        error: 'Email verification repository not available',
      });
    }

    const demoEmail = 'demo@stylehub.com';
    const demoUserId = 'demo-user-123';

    // Simular creación de código de verificación
    const verificationResult =
      await req.repositories.emailVerification.createVerificationCode(
        demoUserId,
        demoEmail,
        'account_verification'
      );

    // Simular envío de notificación
    let notificationResult = null;
    if (req.patterns.notification) {
      notificationResult =
        await req.patterns.notification.sendEmailVerification({
          email: demoEmail,
          code: verificationResult.code,
          userName: 'Demo User',
          expiresInMinutes: verificationResult.expires_in_minutes,
        });
    }

    // Obtener códigos activos (para demostración)
    const activeCodes =
      await req.repositories.emailVerification.getActiveCodesForUser(
        demoUserId,
        'account_verification'
      );

    // Obtener estadísticas
    const stats =
      await req.repositories.emailVerification.getVerificationStats();

    res.json({
      success: true,
      message: 'Demostración del sistema de verificación de email',
      data: {
        verificationCreated: {
          id: verificationResult.id,
          code: verificationResult.code,
          expiresInMinutes: verificationResult.expires_in_minutes,
          codeType: 'account_verification',
        },
        notificationSent: notificationResult,
        activeCodesForUser: activeCodes.length,
        globalStats: stats,
        configuration: req.config.get('email_verification'),
        availableNotificationStrategies: req.patterns.notification
          ? req.patterns.notification.getAvailableStrategies()
          : 'N/A',
      },
    });
  } catch (error) {
    logger.error('Email verification demo failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Error en demostración de email verification',
      details: error.message,
    });
  }
});

export default router;
