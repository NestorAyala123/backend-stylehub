import { supabase } from '../../config/supabase.js';
import cartService from '../cart/cart.service.js';

class OrdersService {
  async createOrder(userId, orderData) {
    try {
      const { shipping_address, payment_method, notes } = orderData;

      // Obtener items del carrito
      const cart = await cartService.getCart(userId);

      if (!cart.items || cart.items.length === 0) {
        throw new Error('El carrito está vacío');
      }

      // Verificar stock disponible para todos los items
      for (const item of cart.items) {
        const availableStock =
          item.product_variants?.stock_quantity || item.products.stock_quantity;
        if (item.quantity > availableStock) {
          throw new Error(
            `Stock insuficiente para ${item.products.name}. Disponible: ${availableStock}`
          );
        }
      }

      // Crear la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          status: 'pending',
          subtotal: cart.summary.subtotal,
          tax: cart.summary.tax,
          shipping: cart.summary.shipping,
          total: cart.summary.total,
          shipping_address,
          payment_method,
          notes,
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(`Error creando orden: ${orderError.message}`);
      }

      // Crear items de la orden
      const orderItems = cart.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.products.price,
        variant_price: item.product_variants?.additional_price || 0,
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems).select(`
          *,
          products(name, product_images(image_url, is_primary, sort_order)),
          product_variants(size, color)
        `);

      if (itemsError) {
        // Si falla, eliminar la orden creada
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Error creando items de orden: ${itemsError.message}`);
      }

      // Actualizar stock de productos
      for (const item of cart.items) {
        if (item.product_variants) {
          // Actualizar stock de variante
          await supabase
            .from('product_variants')
            .update({
              stock_quantity:
                item.product_variants.stock_quantity - item.quantity,
            })
            .eq('id', item.variant_id);
        } else {
          // Actualizar stock de producto
          await supabase
            .from('products')
            .update({
              stock_quantity: item.products.stock_quantity - item.quantity,
            })
            .eq('id', item.product_id);
        }
      }

      // Limpiar carrito
      await cartService.clearCart(userId);

      const orderWithItems = {
        ...order,
        order_items: createdItems,
      };

      return this._processOrderImages(orderWithItems);
    } catch (error) {
      throw new Error(error.message || 'Error creando orden');
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
            products(name, product_images(image_url, is_primary, sort_order)),
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
        orders: this._processOrderImages(orders),
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

  async getOrderById(orderId, userId) {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items(
            *,
            products(name, description, product_images(image_url, is_primary, sort_order)),
            product_variants(size, color)
          )
        `
        )
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error obteniendo orden: ${error.message}`);
      }

      return this._processOrderImages(order);
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo orden');
    }
  }

  async cancelOrder(orderId, userId) {
    try {
      // Verificar que la orden pertenece al usuario y se puede cancelar
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items(
            *,
            products(name, product_images(image_url, is_primary, sort_order)),
            product_variants(size, color)
          )
        `
        )
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        return false;
      }

      if (!['pending', 'confirmed'].includes(order.status)) {
        return false;
      }

      // Actualizar estado de la orden
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        throw new Error(`Error cancelando orden: ${updateError.message}`);
      }

      // Restaurar stock de productos
      for (const item of order.order_items) {
        if (item.variant_id) {
          await supabase.rpc('increment_variant_stock', {
            variant_id: item.variant_id,
            quantity: item.quantity,
          });
        } else {
          await supabase.rpc('increment_product_stock', {
            product_id: item.product_id,
            quantity: item.quantity,
          });
        }
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error cancelando orden');
    }
  }

  // Métodos de administrador
  async getAllOrders({ page = 1, limit = 20, status, search }) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase.from('orders').select(
        `
          *,
          usuarios(full_name, email),
          order_items(
            *,
            products(name, product_images(image_url, is_primary, sort_order)),
            product_variants(size, color)
          )
        `,
        { count: 'exact' }
      );

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(
          `id.ilike.%${search}%,usuarios.email.ilike.%${search}%,usuarios.full_name.ilike.%${search}%`
        );
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
        orders: this._processOrderImages(orders),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo todas las órdenes');
    }
  }

  async updateOrderStatus(orderId, status, notes, adminId) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Agregar timestamps específicos según el estado
      if (status === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { data: order, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando orden: ${error.message}`);
      }

      return order;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando estado de orden');
    }
  }

  async updateTracking(orderId, trackingData, adminId) {
    try {
      const { tracking_number, carrier, notes } = trackingData;

      const updateData = {
        tracking_number,
        updated_at: new Date().toISOString(),
      };

      if (carrier) {
        updateData.shipping_carrier = carrier;
      }

      if (notes) {
        updateData.notes = notes;
      }

      // Si se agrega tracking, cambiar estado a shipped si está en processing
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (currentOrder?.status === 'processing') {
        updateData.status = 'shipped';
        updateData.shipped_at = new Date().toISOString();
      }

      const { data: order, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando tracking: ${error.message}`);
      }

      return order;
    } catch (error) {
      throw new Error(
        error.message || 'Error actualizando información de seguimiento'
      );
    }
  }

  async getOrderStats() {
    try {
      const { data: stats, error } = await supabase.rpc('get_order_stats');

      if (error) {
        throw new Error(`Error obteniendo estadísticas: ${error.message}`);
      }

      return stats;
    } catch (error) {
      throw new Error(
        error.message || 'Error obteniendo estadísticas de órdenes'
      );
    }
  }

  // Función auxiliar para procesar las órdenes y ordenar las imágenes
  _processOrderImages(orders) {
    if (!orders) return orders;

    // Si es una sola orden
    if (!Array.isArray(orders)) {
      return this._processOrderImages([orders])[0];
    }

    return orders.map((order) => ({
      ...order,
      order_items:
        order.order_items?.map((item) => ({
          ...item,
          products: {
            ...item.products,
            product_images:
              item.products?.product_images?.sort((a, b) => {
                // Primero las primarias
                if (a.is_primary && !b.is_primary) return -1;
                if (!a.is_primary && b.is_primary) return 1;
                // Luego por sort_order
                return (a.sort_order || 0) - (b.sort_order || 0);
              }) || [],
          },
        })) || [],
    }));
  }
}

export default new OrdersService();
