import paymentsService from './payments.service.js';
import stripeService from './stripe.service.js';
import paypalService from './paypal.service.js';
import {
  validatePaymentIntent,
  validateConfirmPayment,
} from './payments.validation.js';
import logger from '../../config/logger.js';

class PaymentsController {
  // Obtener configuración pública de pagos (solo datos seguros para el frontend)
  async getPublicConfig(req, res) {
    try {
      const config = {
        stripe: {
          publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || null,
          enabled: !!(
            process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY
          ),
        },
        paypal: {
          client_id: process.env.PAYPAL_CLIENT_ID || null,
          environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
          enabled: !!(
            process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
          ),
        },
        currency: process.env.CURRENCY || 'USD',
        features: {
          stripe_enabled: !!(
            process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY
          ),
          paypal_enabled: !!(
            process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
          ),
        },
      };

      logger.info('Payment public config requested', {
        stripe_enabled: config.features.stripe_enabled,
        paypal_enabled: config.features.paypal_enabled,
      });

      res.json(config);
    } catch (error) {
      logger.error('Get payment config failed', {
        error: error.message,
      });

      res.status(500).json({
        error: 'Error obteniendo configuración de pagos',
      });
    }
  }

  async createPaymentIntent(req, res) {
    const { error } = validatePaymentIntent(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de pago inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const { order_id } = req.body;

      const result = await stripeService.createPaymentIntent(order_id, userId);

      logger.info('Payment intent created', {
        orderId: order_id,
        userId,
        paymentIntentId: result.payment_intent_id,
      });

      res.json({
        client_secret: result.client_secret,
        payment_intent_id: result.payment_intent_id,
      });
    } catch (error) {
      logger.error('Create payment intent failed', {
        error: error.message,
        userId: req.user.id,
        orderId: req.body.order_id,
      });

      res.status(400).json({
        error: error.message || 'Error creando intención de pago',
      });
    }
  }

  async confirmPayment(req, res) {
    const { error } = validateConfirmPayment(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de confirmación inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const { payment_intent_id, order_id } = req.body;

      const result = await stripeService.confirmPayment(
        payment_intent_id,
        order_id,
        userId
      );

      logger.info('Payment confirmed', {
        orderId: order_id,
        userId,
        paymentIntentId: payment_intent_id,
      });

      res.json({
        message: 'Pago confirmado exitosamente',
        order: result.order,
        payment: result.payment,
      });
    } catch (error) {
      logger.error('Confirm payment failed', {
        error: error.message,
        userId: req.user.id,
        orderId: req.body.order_id,
        paymentIntentId: req.body.payment_intent_id,
      });

      res.status(400).json({
        error: error.message || 'Error confirmando pago',
      });
    }
  }

  // Crear Stripe Checkout Session - Para checkout directo
  async createCheckoutSession(req, res) {
    const { error } = validateCheckoutSession(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de checkout inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const { order_id } = req.body;

      const result = await stripeService.createCheckoutSession(
        order_id,
        userId
      );

      logger.info('Checkout session created', {
        orderId: order_id,
        userId,
        sessionId: result.session_id,
      });

      res.json({
        url: result.url,
        session_id: result.session_id,
      });
    } catch (error) {
      logger.error('Create checkout session failed', {
        error: error.message,
        userId: req.user?.id,
        orderId: req.body?.order_id,
      });

      res.status(400).json({
        error: error.message || 'Error creando sesión de checkout',
      });
    }
  }

  // Crear orden de PayPal
  async createPayPalOrder(req, res) {
    const { error } = validateCheckoutSession(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de orden inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const { order_id } = req.body;

      const result = await paypalService.createPayPalOrder(order_id, userId);

      logger.info('PayPal order created', {
        orderId: order_id,
        userId,
        paypalOrderId: result.paypal_order_id,
      });

      res.json({
        success: true,
        paypal_order_id: result.paypal_order_id,
        approval_url: result.approval_url,
      });
    } catch (error) {
      logger.error('Create PayPal order failed', {
        error: error.message,
        userId: req.user?.id,
        orderId: req.body?.order_id,
      });

      res.status(400).json({
        error: error.message || 'Error creando orden PayPal',
      });
    }
  }

  // Capturar orden de PayPal
  async capturePayPalOrder(req, res) {
    try {
      const userId = req.user.id;
      const { paypal_order_id, order_id } = req.body;

      if (!paypal_order_id || !order_id) {
        return res.status(400).json({
          error: 'PayPal Order ID y Order ID son requeridos',
        });
      }

      const result = await paypalService.capturePayPalOrder(
        paypal_order_id,
        order_id,
        userId
      );

      logger.info('PayPal order captured', {
        orderId: order_id,
        userId,
        paypalOrderId: paypal_order_id,
      });

      res.json({
        success: true,
        message: 'Pago completado exitosamente',
        order_id: result.order_id,
        payment: result.payment,
      });
    } catch (error) {
      logger.error('Capture PayPal order failed', {
        error: error.message,
        userId: req.user?.id,
        paypalOrderId: req.body?.paypal_order_id,
        orderId: req.body?.order_id,
      });

      res.status(400).json({
        error: error.message || 'Error capturando pago PayPal',
      });
    }
  }

  async processPayPalPayment(req, res) {
    const { error } = validatePayPalPayment(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de PayPal inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const { order_id, paypal_order_id } = req.body;

      const result = await paypalService.processPayment(
        order_id,
        paypal_order_id,
        userId
      );

      logger.info('PayPal payment processed', {
        orderId: order_id,
        userId,
        paypalOrderId: paypal_order_id,
      });

      res.json({
        message: 'Pago con PayPal procesado exitosamente',
        order: result.order,
        payment: result.payment,
      });
    } catch (error) {
      logger.error('PayPal payment processing failed', {
        error: error.message,
        userId: req.user.id,
        orderId: req.body.order_id,
        paypalOrderId: req.body.paypal_order_id,
      });

      res.status(400).json({
        error: error.message || 'Error procesando pago con PayPal',
      });
    }
  }

  async stripeWebhook(req, res) {
    try {
      const result = await stripeService.handleWebhook(
        req.body,
        req.headers['stripe-signature']
      );

      logger.info('Stripe webhook processed', {
        eventType: result.eventType,
        paymentIntentId: result.paymentIntentId,
      });

      res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook failed', {
        error: error.message,
        signature: req.headers['stripe-signature'],
      });

      res.status(400).json({
        error: 'Webhook verification failed',
      });
    }
  }

  async getPaymentHistory(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;

      const result = await paymentsService.getPaymentHistory(userId, {
        page,
        limit,
        status,
      });

      res.json(result);
    } catch (error) {
      logger.error('Get payment history failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo historial de pagos',
      });
    }
  }

  // Métodos de administrador
  async getAllPayments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 20;

      // Validar límites
      if (limit > 100) {
        return res.status(400).json({
          error: 'Parámetros de consulta inválidos',
          details: [
            {
              field: 'limit',
              message: 'El límite máximo es 100',
            },
          ],
        });
      }

      if (limit < 1) {
        limit = 20;
      }

      const status = req.query.status;
      const method = req.query.method;
      const search = req.query.search;

      const result = await paymentsService.getAllPayments({
        page,
        limit,
        status,
        method,
        search,
      });

      res.json(result);
    } catch (error) {
      logger.error('Get all payments failed', {
        error: error.message,
        adminId: req.user?.id,
      });

      res.status(500).json({
        error: 'Error obteniendo todos los pagos',
      });
    }
  }

  async processRefund(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      const adminId = req.user.id;

      const result = await paymentsService.processRefund(paymentId, {
        amount,
        reason,
        adminId,
      });

      if (!result) {
        return res.status(404).json({
          error: 'Pago no encontrado',
        });
      }

      logger.info('Refund processed', {
        paymentId,
        amount,
        reason,
        adminId,
      });

      res.json({
        message: 'Reembolso procesado exitosamente',
        refund: result,
      });
    } catch (error) {
      logger.error('Process refund failed', {
        error: error.message,
        paymentId: req.params.paymentId,
        adminId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error procesando reembolso',
      });
    }
  }

  // Obtener estadísticas de pagos para el panel de administración
  async getPaymentStats(req, res) {
    try {
      const stats = await paymentsService.getPaymentStats();

      logger.info('Payment stats requested', {
        adminId: req.user.id,
      });

      res.json(stats);
    } catch (error) {
      logger.error('Get payment stats failed', {
        error: error.message,
        adminId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo estadísticas de pagos',
      });
    }
  }

  // Obtener detalles de un pago específico
  async getPaymentDetails(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await paymentsService.getPaymentById(paymentId);

      if (!payment) {
        return res.status(404).json({
          error: 'Pago no encontrado',
        });
      }

      logger.info('Payment details requested', {
        paymentId,
        adminId: req.user.id,
      });

      res.json(payment);
    } catch (error) {
      logger.error('Get payment details failed', {
        error: error.message,
        paymentId: req.params.paymentId,
        adminId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo detalles del pago',
      });
    }
  }

  // Exportar pagos a CSV
  async exportPayments(req, res) {
    try {
      const filters = {
        status: req.query.status,
        method: req.query.method,
        search: req.query.search,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
      };

      const payments = await paymentsService.getAllPayments({
        ...filters,
        limit: 10000, // Obtener todos los pagos para exportar
        page: 1,
      });

      // Crear CSV
      const csvHeader =
        'ID,Orden,Cliente,Monto,Método,Estado,ID Transacción,Fecha\n';
      const csvRows = payments.payments
        .map((payment) => {
          return [
            payment.id,
            payment.order_id,
            payment.user_email,
            payment.amount,
            payment.method,
            payment.status,
            payment.transaction_id,
            new Date(payment.created_at).toLocaleDateString('es-ES'),
          ].join(',');
        })
        .join('\n');

      const csvContent = csvHeader + csvRows;

      logger.info('Payments export requested', {
        adminId: req.user.id,
        count: payments.payments.length,
        filters,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=pagos_${
          new Date().toISOString().split('T')[0]
        }.csv`
      );
      res.send(csvContent);
    } catch (error) {
      logger.error('Export payments failed', {
        error: error.message,
        adminId: req.user.id,
      });

      res.status(500).json({
        error: 'Error exportando pagos',
      });
    }
  }

  // Procesar un pago pendiente manualmente
  async processPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const adminId = req.user.id;

      const result = await paymentsService.processPaymentManually(
        paymentId,
        adminId
      );

      if (!result) {
        return res.status(404).json({
          error: 'Pago no encontrado',
        });
      }

      logger.info('Payment processed manually', {
        paymentId,
        adminId,
      });

      res.json({
        message: 'Pago procesado exitosamente',
        payment: result,
      });
    } catch (error) {
      logger.error('Process payment manually failed', {
        error: error.message,
        paymentId: req.params.paymentId,
        adminId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error procesando pago',
      });
    }
  }
}

export default new PaymentsController();
