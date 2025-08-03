import express from 'express';
import usersController from './users.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const router = express.Router();

// Rutas de usuario autenticado
router.get('/profile', authenticateToken, usersController.getProfile);
router.put('/profile', authenticateToken, usersController.updateProfile);
router.get('/orders', authenticateToken, usersController.getUserOrders);
router.get('/favorites', authenticateToken, usersController.getFavorites);
router.post(
  '/favorites/:productId',
  authenticateToken,
  usersController.addToFavorites
);
router.delete(
  '/favorites/:productId',
  authenticateToken,
  usersController.removeFromFavorites
);

// Rutas de administrador
router.get('/', authenticateToken, usersController.getAllUsers);
router.get(
  '/:id',
  authenticateToken,
  usersController.getUserById
);
router.put('/:id', authenticateToken, usersController.updateUser);
router.delete(
  '/:id',
  authenticateToken,
  usersController.deleteUser
);
router.put(
  '/:id/status',
  authenticateToken,
  usersController.updateUserStatus
);

export default router;
