import express from 'express';
import ordersController from './orders.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const router = express.Router();

// Rutas de usuario autenticado
router.post('/', authenticateToken, ordersController.createOrder);
router.get('/', authenticateToken, ordersController.getUserOrders);
router.get('/:orderId', authenticateToken, ordersController.getOrderById);
router.put('/:orderId/cancel', authenticateToken, ordersController.cancelOrder);

// Rutas de administrador
router.get(
  '/admin/all',
  authenticateToken,
  ordersController.getAllOrders
);
router.put(
  '/admin/:orderId/status',
  authenticateToken,
  ordersController.updateOrderStatus
);
router.put(
  '/admin/:orderId/tracking',
  authenticateToken,
  ordersController.updateTracking
);

export default router;
