import express from 'express';
import authController from './auth.controller.js';
import { authenticateToken } from './auth.middleware.js';

const router = express.Router();


// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification-code', authController.resendVerificationCode);
// Rutas protegidas
router.post('/logout', authenticateToken, authController.logout);
router.post('/refresh-token', authenticateToken, authController.refreshToken);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put(
  '/change-password',
  authenticateToken,
  authController.changePassword
);

export default router;
