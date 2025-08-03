import ordersService from './orders.service.js';
import {
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateTracking,
  validateOrderQuery,
} from './orders.validation.js';
import logger from '../../config/logger.js';

class OrdersController {
  async createOrder(req, res) {
    const { error } = validateCreateOrder(req.body);
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
      const order = await ordersService.createOrder(userId, req.body);

      logger.info('Order created successfully', {
        orderId: order.id,
        userId,
        total: order.total,
        itemCount: order.items?.length,
      });

      res.status(201).json({
        message: 'Orden creada exitosamente',
        order,
      });
    } catch (error) {
      logger.error('Create order failed', {
        error: error.message,
        userId: req.user.id,
        orderData: req.body,
      });

      res.status(400).json({
        error: error.message || 'Error creando orden',
      });
    }
  }

  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 10;

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
        limit = 10;
      }

      const status = req.query.status;

      const result = await ordersService.getUserOrders(userId, {
        page,
        limit,
        status,
      });

      // Mapear orders a data para consistencia con el frontend
      res.json({
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get user orders failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo órdenes',
      });
    }
  }

  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await ordersService.getOrderById(orderId, userId);

      if (!order) {
        return res.status(404).json({
          error: 'Orden no encontrada',
        });
      }

      res.json(order);
    } catch (error) {
      logger.error('Get order by ID failed', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo orden',
      });
    }
  }

  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const success = await ordersService.cancelOrder(orderId, userId);

      if (!success) {
        return res.status(400).json({
          error: 'La orden no puede ser cancelada en su estado actual',
        });
      }

      logger.info('Order cancelled successfully', {
        orderId,
        userId,
      });

      res.json({
        message: 'Orden cancelada exitosamente',
      });
    } catch (error) {
      logger.error('Cancel order failed', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error cancelando orden',
      });
    }
  }

  // Métodos de administrador
  async getAllOrders(req, res) {
    // Validar parámetros de consulta
    const { error } = validateOrderQuery(req.query);
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
      const search = req.query.search;

      const result = await ordersService.getAllOrders({
        page,
        limit,
        status,
        search,
      });

      res.json(result);
    } catch (error) {
      logger.error('Get all orders failed', {
        error: error.message,
        adminId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo órdenes',
      });
    }
  }

  async updateOrderStatus(req, res) {
    const { error } = validateUpdateOrderStatus(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Estado inválido',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;
      const adminId = req.user.id;

      const order = await ordersService.updateOrderStatus(
        orderId,
        status,
        notes,
        adminId
      );

      if (!order) {
        return res.status(404).json({
          error: 'Orden no encontrada',
        });
      }

      logger.info('Order status updated', {
        orderId,
        newStatus: status,
        adminId,
      });

      res.json({
        message: 'Estado de orden actualizado',
        order,
      });
    } catch (error) {
      logger.error('Update order status failed', {
        error: error.message,
        orderId: req.params.orderId,
        adminId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error actualizando estado de orden',
      });
    }
  }

  async updateTracking(req, res) {
    const { error } = validateTracking(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de seguimiento inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { orderId } = req.params;
      const { tracking_number, carrier, notes } = req.body;
      const adminId = req.user.id;

      const order = await ordersService.updateTracking(
        orderId,
        {
          tracking_number,
          carrier,
          notes,
        },
        adminId
      );

      if (!order) {
        return res.status(404).json({
          error: 'Orden no encontrada',
        });
      }

      logger.info('Order tracking updated', {
        orderId,
        trackingNumber: tracking_number,
        carrier,
        adminId,
      });

      res.json({
        message: 'Información de seguimiento actualizada',
        order,
      });
    } catch (error) {
      logger.error('Update tracking failed', {
        error: error.message,
        orderId: req.params.orderId,
        adminId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error actualizando seguimiento',
      });
    }
  }
}

export default new OrdersController();
