import { supabase } from '../../config/supabase.js';

class UsersService {
  async getProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(`Error obteniendo perfil: ${error.message}`);
      }

      // No devolver información sensible
      const { created_at, updated_at, ...safeProfile } = profile;

      return {
        ...safeProfile,
        member_since: created_at,
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo perfil del usuario');
    }
  }

  async updateProfile(userId, updateData) {
    try {
      const allowedFields = ['full_name', 'phone', 'address', 'avatar_url'];

      // Filtrar solo campos permitidos
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      const { data: profile, error } = await supabase
        .from('usuarios')
        .update({
          ...filteredData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error actualizando perfil: ${error.message}`);
      }

      return profile;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando perfil');
    }
  }

  async getUserOrders(userId, { page = 1, limit = 10, status }) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from('orders')
        .select(
          `
          *,
          order_items(
            *,
            products(name, product_images(image_url, is_primary)),
            product_variants(size, color)
          )
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      const {
        data: orders,
        error,
        count,
      } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error obteniendo órdenes: ${error.message}`);
      }

      return {
        orders,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo órdenes del usuario');
    }
  }

  async getFavorites(userId, { page = 1, limit = 12 }) {
    try {
      const offset = (page - 1) * limit;

      const {
        data: favorites,
        error,
        count,
      } = await supabase
        .from('user_favorites')
        .select(
          `
          *,
          products(
            *,
            categories(name),
            product_images(image_url, is_primary)
          )
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId)
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error obteniendo favoritos: ${error.message}`);
      }

      return {
        favorites: favorites.map((fav) => fav.products),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo favoritos');
    }
  }

  async addToFavorites(userId, productId) {
    try {
      // Verificar que el producto existe
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        throw new Error('Producto no encontrado');
      }

      // Verificar si ya está en favoritos
      const { data: existing } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (existing) {
        return false; // Ya existe
      }

      // Agregar a favoritos
      const { error: insertError } = await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          product_id: productId,
        });

      if (insertError) {
        throw new Error(`Error agregando a favoritos: ${insertError.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error agregando producto a favoritos');
    }
  }

  async removeFromFavorites(userId, productId) {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        throw new Error(`Error eliminando de favoritos: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error eliminando de favoritos');
    }
  }

  async isFavorite(userId, productId) {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error verificando favorito: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      throw new Error(error.message || 'Error verificando si es favorito');
    }
  }

  // Métodos de administrador
  async getAllUsers({ page = 1, limit = 20, search, status }) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase.from('usuarios').select('*', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (status !== undefined) {
        const isActive = status === 'active';
        query = query.eq('is_active', isActive);
      }

      const {
        data: users,
        error,
        count,
      } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error obteniendo usuarios: ${error.message}`);
      }

      return {
        users,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo todos los usuarios');
    }
  }

  async getUserById(userId) {
    try {
      const { data: user, error } = await supabase
        .from('usuarios')
        .select(
          `
          *,
          orders(count),
          payments(count)
        `
        )
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error obteniendo usuario: ${error.message}`);
      }

      return user;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo usuario por ID');
    }
  }

  async updateUser(userId, updateData, adminId) {
    try {
      const allowedFields = [
        'full_name',
        'phone',
        'address',
        'is_admin',
        'is_active',
      ];

      // Filtrar solo campos permitidos
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      const { data: user, error } = await supabase
        .from('usuarios')
        .update({
          ...filteredData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando usuario: ${error.message}`);
      }

      return user;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando usuario');
    }
  }

  async deleteUser(userId, adminId) {
    try {
      // Verificar que el usuario existe
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('id, is_admin')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return false;
      }

      // No permitir eliminar otros administradores
      if (user.is_admin) {
        throw new Error('No se puede eliminar una cuenta de administrador');
      }

      // Eliminar usuario (esto también eliminará el perfil por CASCADE)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        userId
      );

      if (deleteError) {
        throw new Error(`Error eliminando usuario: ${deleteError.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error eliminando usuario');
    }
  }

  async updateUserStatus(userId, isActive, adminId) {
    try {
      const { data: user, error } = await supabase
        .from('usuarios')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando estado: ${error.message}`);
      }

      return user;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando estado del usuario');
    }
  }

  async getUserStats() {
    try {
      const { data: stats, error } = await supabase.rpc('get_user_stats');

      if (error) {
        throw new Error(`Error obteniendo estadísticas: ${error.message}`);
      }

      return stats;
    } catch (error) {
      throw new Error(
        error.message || 'Error obteniendo estadísticas de usuarios'
      );
    }
  }
}

export default new UsersService();
