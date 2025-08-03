import cartService from './cart.service.js';
import {
  validateAddToCart,
  validateUpdateCart,
  validateCoupon,
} from './cart.validation.js';
import logger from '../../config/logger.js';

class CartController {
  async getCart(req, res) {
    try {
      const userId = req.user.id;
      const cart = await cartService.getCart(userId);

      res.json(cart);
    } catch (error) {
      logger.error('Get cart failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo carrito',
      });
    }
  }

  async addToCart(req, res) {
    const { error } = validateAddToCart(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const result = await cartService.addToCart(userId, req.body);

      logger.info('Product added to cart', {
        userId,
        productId: req.body.product_id,
        quantity: req.body.quantity,
      });

      res.status(201).json({
        message: result.isUpdate
          ? 'Cantidad actualizada en el carrito'
          : 'Producto agregado al carrito',
        item: result.item,
      });
    } catch (error) {
      logger.error('Add to cart failed', {
        error: error.message,
        userId: req.user.id,
        productId: req.body.product_id,
      });

      res.status(400).json({
        error: error.message || 'Error agregando al carrito',
      });
    }
  }

  async updateCartItem(req, res) {
    const { error } = validateUpdateCart(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { itemId } = req.params;
      const userId = req.user.id;
      const { quantity } = req.body;

      const item = await cartService.updateCartItem(userId, itemId, quantity);

      if (!item) {
        return res.status(404).json({
          error: 'Item no encontrado en el carrito',
        });
      }

      logger.info('Cart item updated', {
        userId,
        itemId,
        newQuantity: quantity,
      });

      res.json({
        message: 'Cantidad actualizada',
        item,
      });
    } catch (error) {
      logger.error('Update cart item failed', {
        error: error.message,
        userId: req.user.id,
        itemId: req.params.itemId,
      });

      res.status(400).json({
        error: error.message || 'Error actualizando carrito',
      });
    }
  }

  async removeFromCart(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user.id;

      const success = await cartService.removeFromCart(userId, itemId);

      if (!success) {
        return res.status(404).json({
          error: 'Item no encontrado en el carrito',
        });
      }

      logger.info('Item removed from cart', {
        userId,
        itemId,
      });

      res.json({
        message: 'Producto eliminado del carrito',
      });
    } catch (error) {
      logger.error('Remove from cart failed', {
        error: error.message,
        userId: req.user.id,
        itemId: req.params.itemId,
      });

      res.status(500).json({
        error: 'Error eliminando del carrito',
      });
    }
  }

  async clearCart(req, res) {
    try {
      const userId = req.user.id;
      await cartService.clearCart(userId);

      logger.info('Cart cleared', { userId });

      res.json({
        message: 'Carrito limpiado',
      });
    } catch (error) {
      logger.error('Clear cart failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error limpiando carrito',
      });
    }
  }

  async applyCoupon(req, res) {
    const { error } = validateCoupon(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Código de cupón inválido',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const { code } = req.body;

      const result = await cartService.applyCoupon(userId, code);

      logger.info('Coupon applied', {
        userId,
        couponCode: code,
        discount: result.discount,
      });

      res.json({
        message: 'Cupón aplicado exitosamente',
        coupon: result.coupon,
        discount: result.discount,
        cart: result.cart,
      });
    } catch (error) {
      logger.error('Apply coupon failed', {
        error: error.message,
        userId: req.user.id,
        couponCode: req.body.code,
      });

      res.status(400).json({
        error: error.message || 'Error aplicando cupón',
      });
    }
  }

  async removeCoupon(req, res) {
    try {
      const userId = req.user.id;
      const cart = await cartService.removeCoupon(userId);

      logger.info('Coupon removed', { userId });

      res.json({
        message: 'Cupón removido',
        cart,
      });
    } catch (error) {
      logger.error('Remove coupon failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error removiendo cupón',
      });
    }
  }
}

export default new CartController();
