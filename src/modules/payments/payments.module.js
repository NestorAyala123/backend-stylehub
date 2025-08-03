import express from 'express';
import paymentsController from './payments.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const router = express.Router();

// Configuración pública de pagos (sin autenticación - datos públicos solamente)
router.get('/config', paymentsController.getPublicConfig);

// Rutas de procesamiento de pagos
router.post(
  '/create-payment-intent',
  authenticateToken,
  paymentsController.createPaymentIntent
);
router.post(
  '/confirm-payment',
  authenticateToken,
  paymentsController.confirmPayment
);
router.post(
  '/create-checkout-session',
  authenticateToken,
  paymentsController.createCheckoutSession
);
router.post(
  '/create-paypal-order',
  authenticateToken,
  paymentsController.createPayPalOrder
);
router.post(
  '/capture-paypal-order',
  authenticateToken,
  paymentsController.capturePayPalOrder
);
router.post(
  '/process-paypal',
  authenticateToken,
  paymentsController.processPayPalPayment
);

// Webhook de Stripe (sin autenticación)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.stripeWebhook
);

// Rutas de usuario autenticado
router.get('/history', authenticateToken, paymentsController.getPaymentHistory);

// Rutas de administrador
router.get('/admin/all', authenticateToken, paymentsController.getAllPayments);
router.get('/stats', authenticateToken, paymentsController.getPaymentStats);
router.get('/export', authenticateToken, paymentsController.exportPayments);
router.get(
  '/:paymentId',
  authenticateToken,
  paymentsController.getPaymentDetails
);
router.post(
  '/:paymentId/refund',
  authenticateToken,
  paymentsController.processRefund
);
router.post(
  '/:paymentId/process',
  authenticateToken,
  paymentsController.processPayment
);

// Mantener rutas legacy para compatibilidad
router.post(
  '/admin/refund/:paymentId',
  authenticateToken,
  paymentsController.processRefund
);

export default router;
