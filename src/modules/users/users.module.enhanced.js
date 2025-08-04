import { Router } from 'express';
import usersController from './users.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.js';
import { adminMiddleware } from '../../shared/middleware/adminMiddleware.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de usuario
router.get('/profile', usersController.getProfile);
router.put('/profile', usersController.updateProfile);
router.patch('/preferences', usersController.updateUserPreferences);
router.get('/orders', usersController.getUserOrders);

// Rutas específicas que pueden ser de usuario o admin
router.get('/:id', usersController.getUserById);
router.get('/:id/orders', usersController.getUserOrders);

// Rutas de admin
router.get('/', adminMiddleware, usersController.getUsers);
router.put('/:id', adminMiddleware, usersController.updateUser);
router.delete('/:id', adminMiddleware, usersController.deleteUser);
router.get('/admin/stats', adminMiddleware, usersController.getUserStats);

export default router;
