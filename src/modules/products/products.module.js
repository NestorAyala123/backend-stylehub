import express from 'express';
import productsController from './products.controller.js';
import { authenticateToken, optionalAuth } from '../auth/auth.middleware.js';

const router = express.Router();

// Rutas públicas
router.get('/', optionalAuth, productsController.getProducts);
router.get('/featured', productsController.getFeaturedProducts);
router.get('/categories', productsController.getCategories);
router.get('/search', productsController.searchProducts);
router.get('/:id', optionalAuth, productsController.getProductById);
router.get('/:id/related', productsController.getRelatedProducts);
router.get('/:id/reviews', productsController.getProductReviews);

// Rutas protegidas (solo token requerido)
router.post('/', authenticateToken, productsController.createProduct);
router.put('/:id', authenticateToken, productsController.updateProduct);
router.delete('/:id', authenticateToken, productsController.deleteProduct);
router.post(
  '/:id/variants',
  authenticateToken,
  productsController.createVariant
);
router.put(
  '/:id/variants/:variantId',
  authenticateToken,
  productsController.updateVariant
);
router.delete(
  '/:id/variants/:variantId',
  authenticateToken,
  productsController.deleteVariant
);

// Rutas de categorías (solo token requerido)
router.post(
  '/categories',
  authenticateToken,
  productsController.createCategory
);
router.put(
  '/categories/:id',
  authenticateToken,
  productsController.updateCategory
);
router.delete(
  '/categories/:id',
  authenticateToken,
  productsController.deleteCategory
);

// Rutas de reseñas (usuario autenticado)
router.post('/:id/reviews', authenticateToken, productsController.createReview);
router.put(
  '/:id/reviews/:reviewId',
  authenticateToken,
  productsController.updateReview
);
router.delete(
  '/:id/reviews/:reviewId',
  authenticateToken,
  productsController.deleteReview
);

export default router;
