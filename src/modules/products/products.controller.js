import productsService from './products.service.js';
import {
  validateProduct,
  validateProductUpdate,
  validateCategory,
  validateReview,
  validateProductQuery,
} from './products.validation.js';
import logger from '../../config/logger.js';

class ProductsController {
  async getProducts(req, res) {
    const { error } = validateProductQuery(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Parámetros de consulta inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const result = await productsService.getProducts(req.query, req.user?.id);
      res.json(result);
    } catch (error) {
      logger.error('Get products failed', {
        error: error.message,
        query: req.query,
      });

      res.status(500).json({
        error: 'Error obteniendo productos',
      });
    }
  }

  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await productsService.getProductById(id, req.user?.id);

      if (!product) {
        return res.status(404).json({
          error: 'Producto no encontrado',
        });
      }

      res.json(product);
    } catch (error) {
      logger.error('Get product by ID failed', {
        error: error.message,
        productId: req.params.id,
      });

      res.status(500).json({
        error: 'Error obteniendo producto',
      });
    }
  }

  async createProduct(req, res) {
    const { error } = validateProduct(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de producto inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const product = await productsService.createProduct(
        req.body,
        req.user.id
      );

      logger.info('Product created successfully', {
        productId: product.id,
        userId: req.user.id,
        productName: product.name,
      });

      res.status(201).json({
        message: 'Producto creado exitosamente',
        product,
      });
    } catch (error) {
      logger.error('Create product failed', {
        error: error.message,
        userId: req.user.id,
        productData: req.body,
      });

      res.status(500).json({
        error: error.message || 'Error creando producto',
      });
    }
  }

  async updateProduct(req, res) {
    const { error } = validateProductUpdate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de actualización inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { id } = req.params;
      const product = await productsService.updateProduct(
        id,
        req.body,
        req.user.id
      );

      if (!product) {
        return res.status(404).json({
          error: 'Producto no encontrado',
        });
      }

      logger.info('Product updated successfully', {
        productId: id,
        userId: req.user.id,
      });

      res.json({
        message: 'Producto actualizado exitosamente',
        product,
      });
    } catch (error) {
      logger.error('Update product failed', {
        error: error.message,
        productId: req.params.id,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error actualizando producto',
      });
    }
  }

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const success = await productsService.deleteProduct(id, req.user.id);

      if (!success) {
        return res.status(404).json({
          error: 'Producto no encontrado',
        });
      }

      logger.info('Product deleted successfully', {
        productId: id,
        userId: req.user.id,
      });

      res.json({
        message: 'Producto eliminado exitosamente',
      });
    } catch (error) {
      logger.error('Delete product failed', {
        error: error.message,
        productId: req.params.id,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error eliminando producto',
      });
    }
  }

  async getFeaturedProducts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 8;
      const products = await productsService.getFeaturedProducts(limit);
      res.json(products);
    } catch (error) {
      logger.error('Get featured products failed', {
        error: error.message,
      });

      res.status(500).json({
        error: 'Error obteniendo productos destacados',
      });
    }
  }

  async getRelatedProducts(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 4;
      const products = await productsService.getRelatedProducts(id, limit);
      res.json(products);
    } catch (error) {
      logger.error('Get related products failed', {
        error: error.message,
        productId: req.params.id,
      });

      res.status(500).json({
        error: 'Error obteniendo productos relacionados',
      });
    }
  }

  async searchProducts(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          error: 'La búsqueda debe tener al menos 2 caracteres',
        });
      }

      const products = await productsService.searchProducts(
        q.trim(),
        parseInt(limit)
      );
      res.json(products);
    } catch (error) {
      logger.error('Search products failed', {
        error: error.message,
        query: req.query.q,
      });

      res.status(500).json({
        error: 'Error en la búsqueda de productos',
      });
    }
  }

  async getCategories(req, res) {
    try {
      const categories = await productsService.getCategories();
      res.json({
        success: true,
        categories: categories,
      });
    } catch (error) {
      logger.error('Get categories failed', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Error obteniendo categorías',
      });
    }
  }

  async createCategory(req, res) {
    const { error } = validateCategory(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Datos de categoría inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const category = await productsService.createCategory(
        req.body,
        req.user.id
      );

      logger.info('Category created successfully', {
        categoryId: category.id,
        userId: req.user.id,
        categoryName: category.name,
      });

      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente',
        category,
      });
    } catch (error) {
      logger.error('Create category failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Error creando categoría',
      });
    }
  }

  async updateCategory(req, res) {
    const { error } = validateCategory(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Datos de categoría inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { id } = req.params;
      const category = await productsService.updateCategory(
        id,
        req.body,
        req.user.id
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada',
        });
      }

      logger.info('Category updated successfully', {
        categoryId: id,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        category,
      });
    } catch (error) {
      logger.error('Update category failed', {
        error: error.message,
        categoryId: req.params.id,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Error actualizando categoría',
      });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const success = await productsService.deleteCategory(id, req.user.id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada',
        });
      }

      logger.info('Category deleted successfully', {
        categoryId: id,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Categoría eliminada exitosamente',
      });
    } catch (error) {
      logger.error('Delete category failed', {
        error: error.message,
        categoryId: req.params.id,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Error eliminando categoría',
      });
    }
  }

  // Métodos para variantes de productos
  async createVariant(req, res) {
    try {
      const { id: productId } = req.params;
      const variant = await productsService.createVariant(
        productId,
        req.body,
        req.user.id
      );

      logger.info('Product variant created successfully', {
        productId,
        variantId: variant.id,
        userId: req.user.id,
      });

      res.status(201).json({
        message: 'Variante creada exitosamente',
        variant,
      });
    } catch (error) {
      logger.error('Create variant failed', {
        error: error.message,
        productId: req.params.id,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error creando variante',
      });
    }
  }

  async updateVariant(req, res) {
    try {
      const { id: productId, variantId } = req.params;
      const variant = await productsService.updateVariant(
        productId,
        variantId,
        req.body,
        req.user.id
      );

      if (!variant) {
        return res.status(404).json({
          error: 'Variante no encontrada',
        });
      }

      logger.info('Product variant updated successfully', {
        productId,
        variantId,
        userId: req.user.id,
      });

      res.json({
        message: 'Variante actualizada exitosamente',
        variant,
      });
    } catch (error) {
      logger.error('Update variant failed', {
        error: error.message,
        productId: req.params.id,
        variantId: req.params.variantId,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error actualizando variante',
      });
    }
  }

  async deleteVariant(req, res) {
    try {
      const { id: productId, variantId } = req.params;
      const success = await productsService.deleteVariant(
        productId,
        variantId,
        req.user.id
      );

      if (!success) {
        return res.status(404).json({
          error: 'Variante no encontrada',
        });
      }

      logger.info('Product variant deleted successfully', {
        productId,
        variantId,
        userId: req.user.id,
      });

      res.json({
        message: 'Variante eliminada exitosamente',
      });
    } catch (error) {
      logger.error('Delete variant failed', {
        error: error.message,
        productId: req.params.id,
        variantId: req.params.variantId,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error eliminando variante',
      });
    }
  }

  // Métodos para reseñas
  async getProductReviews(req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await productsService.getProductReviews(id, page, limit);
      res.json(result);
    } catch (error) {
      logger.error('Get product reviews failed', {
        error: error.message,
        productId: req.params.id,
      });

      res.status(500).json({
        error: 'Error obteniendo reseñas',
      });
    }
  }

  async createReview(req, res) {
    const { error } = validateReview(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de reseña inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { id: productId } = req.params;
      const review = await productsService.createReview(
        productId,
        req.body,
        req.user.id
      );

      logger.info('Product review created successfully', {
        productId,
        reviewId: review.id,
        userId: req.user.id,
        rating: req.body.rating,
      });

      res.status(201).json({
        message: 'Reseña creada exitosamente',
        review,
      });
    } catch (error) {
      logger.error('Create review failed', {
        error: error.message,
        productId: req.params.id,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error creando reseña',
      });
    }
  }

  async updateReview(req, res) {
    const { error } = validateReview(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de reseña inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { id: productId, reviewId } = req.params;
      const review = await productsService.updateReview(
        productId,
        reviewId,
        req.body,
        req.user.id
      );

      if (!review) {
        return res.status(404).json({
          error: 'Reseña no encontrada',
        });
      }

      logger.info('Product review updated successfully', {
        productId,
        reviewId,
        userId: req.user.id,
      });

      res.json({
        message: 'Reseña actualizada exitosamente',
        review,
      });
    } catch (error) {
      logger.error('Update review failed', {
        error: error.message,
        productId: req.params.id,
        reviewId: req.params.reviewId,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error actualizando reseña',
      });
    }
  }

  async deleteReview(req, res) {
    try {
      const { id: productId, reviewId } = req.params;
      const success = await productsService.deleteReview(
        productId,
        reviewId,
        req.user.id
      );

      if (!success) {
        return res.status(404).json({
          error: 'Reseña no encontrada',
        });
      }

      logger.info('Product review deleted successfully', {
        productId,
        reviewId,
        userId: req.user.id,
      });

      res.json({
        message: 'Reseña eliminada exitosamente',
      });
    } catch (error) {
      logger.error('Delete review failed', {
        error: error.message,
        productId: req.params.id,
        reviewId: req.params.reviewId,
        userId: req.user.id,
      });

      res.status(500).json({
        error: error.message || 'Error eliminando reseña',
      });
    }
  }
}

export default new ProductsController();
