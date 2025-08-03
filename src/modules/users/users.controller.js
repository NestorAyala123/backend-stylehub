import usersService from './users.service.js';
import {
  validateUpdateProfile,
  validateUpdateUser,
  validateUserQuery,
} from './users.validation.js';
import logger from '../../config/logger.js';

class UsersController {
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const profile = await usersService.getProfile(userId);

      res.json(profile);
    } catch (error) {
      logger.error('Get profile failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo perfil',
      });
    }
  }

  async updateProfile(req, res) {
    const { error } = validateUpdateProfile(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de perfil inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const userId = req.user.id;
      const profile = await usersService.updateProfile(userId, req.body);

      logger.info('Profile updated', {
        userId,
        updatedFields: Object.keys(req.body),
      });

      res.json({
        message: 'Perfil actualizado exitosamente',
        profile,
      });
    } catch (error) {
      logger.error('Update profile failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error actualizando perfil',
      });
    }
  }

  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;

      const result = await usersService.getUserOrders(userId, {
        page,
        limit,
        status,
      });

      res.json(result);
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

  async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;

      const result = await usersService.getFavorites(userId, { page, limit });

      res.json(result);
    } catch (error) {
      logger.error('Get favorites failed', {
        error: error.message,
        userId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo favoritos',
      });
    }
  }

  async addToFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const success = await usersService.addToFavorites(userId, productId);

      if (!success) {
        return res.status(400).json({
          error: 'El producto ya está en favoritos o no existe',
        });
      }

      logger.info('Product added to favorites', {
        userId,
        productId,
      });

      res.status(201).json({
        message: 'Producto agregado a favoritos',
      });
    } catch (error) {
      logger.error('Add to favorites failed', {
        error: error.message,
        userId: req.user.id,
        productId: req.params.productId,
      });

      res.status(400).json({
        error: error.message || 'Error agregando a favoritos',
      });
    }
  }

  async removeFromFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const success = await usersService.removeFromFavorites(userId, productId);

      if (!success) {
        return res.status(404).json({
          error: 'Producto no encontrado en favoritos',
        });
      }

      logger.info('Product removed from favorites', {
        userId,
        productId,
      });

      res.json({
        message: 'Producto eliminado de favoritos',
      });
    } catch (error) {
      logger.error('Remove from favorites failed', {
        error: error.message,
        userId: req.user.id,
        productId: req.params.productId,
      });

      res.status(500).json({
        error: 'Error eliminando de favoritos',
      });
    }
  }

  // Métodos de administrador
  async getAllUsers(req, res) {
    // Validar parámetros de consulta
    const { error } = validateUserQuery(req.query);
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
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search;
      const status = req.query.status;

      const result = await usersService.getAllUsers({
        page,
        limit,
        search,
        status,
      });

      res.json(result);
    } catch (error) {
      logger.error('Get all users failed', {
        error: error.message,
        adminId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo usuarios',
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await usersService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
        });
      }

      res.json(user);
    } catch (error) {
      logger.error('Get user by ID failed', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id,
      });

      res.status(500).json({
        error: 'Error obteniendo usuario',
      });
    }
  }

  async updateUser(req, res) {
    const { error } = validateUpdateUser(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de usuario inválidos',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    try {
      const { id } = req.params;
      const adminId = req.user.id;

      const user = await usersService.updateUser(id, req.body, adminId);

      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
        });
      }

      logger.info('User updated by admin', {
        userId: id,
        adminId,
        updatedFields: Object.keys(req.body),
      });

      res.json({
        message: 'Usuario actualizado exitosamente',
        user,
      });
    } catch (error) {
      logger.error('Update user failed', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error actualizando usuario',
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // No permitir que un admin se elimine a sí mismo
      if (id === adminId) {
        return res.status(400).json({
          error: 'No puedes eliminar tu propia cuenta',
        });
      }

      const success = await usersService.deleteUser(id, adminId);

      if (!success) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
        });
      }

      logger.info('User deleted by admin', {
        userId: id,
        adminId,
      });

      res.json({
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error) {
      logger.error('Delete user failed', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error eliminando usuario',
      });
    }
  }

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const adminId = req.user.id;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          error: 'Estado inválido',
        });
      }

      // No permitir que un admin se desactive a sí mismo
      if (id === adminId && !is_active) {
        return res.status(400).json({
          error: 'No puedes desactivar tu propia cuenta',
        });
      }

      const user = await usersService.updateUserStatus(id, is_active, adminId);

      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
        });
      }

      logger.info('User status updated by admin', {
        userId: id,
        adminId,
        newStatus: is_active,
      });

      res.json({
        message: `Usuario ${
          is_active ? 'activado' : 'desactivado'
        } exitosamente`,
        user,
      });
    } catch (error) {
      logger.error('Update user status failed', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id,
      });

      res.status(400).json({
        error: error.message || 'Error actualizando estado del usuario',
      });
    }
  }
}

export default new UsersController();
