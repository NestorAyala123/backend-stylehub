import express from 'express';
import cartController from './cart.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const router = express.Router();

// Todas las rutas del carrito requieren autenticación
router.use(authenticateToken);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/update/:itemId', cartController.updateCartItem);
router.delete('/remove/:itemId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);
router.post('/apply-coupon', cartController.applyCoupon);
router.delete('/remove-coupon', cartController.removeCoupon);

export default router;
