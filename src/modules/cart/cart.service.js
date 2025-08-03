import { supabase } from '../../config/supabase.js';

class CartService {
  async getCart(userId) {
    try {
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(
          `
          *,
          products!inner(
            id,
            name,
            price,
            stock_quantity,
            product_images(image_url, is_primary, sort_order)
          ),
          product_variants(
            id,
            size,
            color,
            stock_quantity
          )
        `
        )
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error obteniendo carrito: ${error.message}`);
      }

      // Calcular totales (temporalmente sin additional_price)
      const subtotal = cartItems.reduce((total, item) => {
        const basePrice = item.products.price;
        return total + basePrice * item.quantity;
      }, 0);

      const tax = subtotal * 0.16; // 16% IVA
      const shipping = subtotal > 100 ? 0 : 10; // Envío gratis por compras > $100
      const total = subtotal + tax + shipping;

      return {
        items: cartItems,
        summary: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          shipping: parseFloat(shipping.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          itemCount: cartItems.reduce(
            (count, item) => count + item.quantity,
            0
          ),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo carrito');
    }
  }

  async addToCart(userId, { product_id, quantity, variant_id }) {
    try {
      // Verificar que el producto existe y está activo
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, is_active')
        .eq('id', product_id)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        throw new Error('Producto no encontrado');
      }

      // Verificar stock disponible
      let availableStock = product.stock_quantity;
      if (variant_id) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock_quantity, is_active')
          .eq('id', variant_id)
          .eq('is_active', true)
          .single();

        if (variantError || !variant) {
          throw new Error('Variante de producto no encontrada');
        }

        availableStock = variant.stock_quantity;
      }

      if (quantity > availableStock) {
        throw new Error(`Stock insuficiente. Disponible: ${availableStock}`);
      }

      // Verificar si el producto ya está en el carrito
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', product_id)
        .eq('variant_id', variant_id || null)
        .single();

      if (existingItem) {
        // Actualizar cantidad
        const newQuantity = existingItem.quantity + quantity;

        if (newQuantity > availableStock) {
          throw new Error(
            `Stock insuficiente. Disponible: ${availableStock}, en carrito: ${existingItem.quantity}`
          );
        }

        const { data: updatedItem, error: updateError } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingItem.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Error actualizando carrito: ${updateError.message}`);
        }

        return {
          item: updatedItem,
          isUpdate: true,
        };
      } else {
        // Crear nuevo item en el carrito
        const { data: newItem, error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id,
            variant_id,
            quantity,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Error agregando al carrito: ${insertError.message}`);
        }

        return {
          item: newItem,
          isUpdate: false,
        };
      }
    } catch (error) {
      throw new Error(error.message || 'Error agregando producto al carrito');
    }
  }

  async updateCartItem(userId, itemId, quantity) {
    try {
      // Verificar que el item pertenece al usuario
      const { data: cartItem, error: itemError } = await supabase
        .from('cart_items')
        .select(
          `
          *,
          products(stock_quantity),
          product_variants(stock_quantity)
        `
        )
        .eq('id', itemId)
        .eq('user_id', userId)
        .single();

      if (itemError || !cartItem) {
        return null;
      }

      // Verificar stock
      const availableStock =
        cartItem.product_variants?.stock_quantity ||
        cartItem.products.stock_quantity;

      if (quantity > availableStock) {
        throw new Error(`Stock insuficiente. Disponible: ${availableStock}`);
      }

      // Actualizar cantidad
      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({
          quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Error actualizando item: ${updateError.message}`);
      }

      return updatedItem;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando item del carrito');
    }
  }

  async removeFromCart(userId, itemId) {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error eliminando item: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error eliminando item del carrito');
    }
  }

  async clearCart(userId) {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error limpiando carrito: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error limpiando carrito');
    }
  }

  // 🔧 FUNCIÓN PARA CONSOLIDAR CARRITO - Fusionar productos duplicados
  async consolidateCart(userId) {
    try {
      console.log('🔄 Consolidando carrito para usuario:', userId);

      // Obtener todos los items del carrito
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error obteniendo items del carrito: ${error.message}`);
      }

      if (!cartItems || cartItems.length === 0) {
        return true;
      }

      // Agrupar por product_id y variant_id
      const grouped = {};
      for (const item of cartItems) {
        const key = `${item.product_id}_${item.variant_id || 'null'}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      }

      // Procesar cada grupo
      for (const [key, items] of Object.entries(grouped)) {
        if (items.length <= 1) continue; // No hay duplicados

        console.log(
          `🔄 Consolidando ${items.length} items duplicados para:`,
          key
        );

        // Calcular cantidad total
        const totalQuantity = items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        // Mantener el item más reciente y eliminar los demás
        const keepItem = items.reduce((newest, current) =>
          new Date(current.created_at) > new Date(newest.created_at)
            ? current
            : newest
        );

        // Actualizar el item que mantenemos con la cantidad total
        await supabase
          .from('cart_items')
          .update({
            quantity: totalQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', keepItem.id);

        // Eliminar los items duplicados
        const itemsToDelete = items.filter((item) => item.id !== keepItem.id);
        for (const item of itemsToDelete) {
          await supabase.from('cart_items').delete().eq('id', item.id);
        }

        console.log(
          `✅ Consolidado: ${items.length} items → 1 item con cantidad ${totalQuantity}`
        );
      }

      console.log('🎉 Carrito consolidado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error consolidando carrito:', error);
      throw new Error(error.message || 'Error consolidando carrito');
    }
  }

  async applyCoupon(userId, code) {
    try {
      // Verificar que el cupón existe y es válido
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        throw new Error('Cupón no válido o expirado');
      }

      // Verificar fechas de validez
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = coupon.valid_until
        ? new Date(coupon.valid_until)
        : null;

      if (now < validFrom || (validUntil && now > validUntil)) {
        throw new Error('Cupón expirado o no válido aún');
      }

      // Verificar límite de uso
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        throw new Error('Cupón agotado');
      }

      // Obtener carrito actual
      const cart = await this.getCart(userId);

      // Verificar monto mínimo
      if (cart.summary.subtotal < coupon.minimum_amount) {
        throw new Error(`Monto mínimo requerido: $${coupon.minimum_amount}`);
      }

      // Calcular descuento
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = cart.summary.subtotal * (coupon.discount_value / 100);
        if (coupon.maximum_discount && discount > coupon.maximum_discount) {
          discount = coupon.maximum_discount;
        }
      } else {
        discount = coupon.discount_value;
      }

      // Actualizar contador de uso del cupón
      await supabase
        .from('coupons')
        .update({ used_count: coupon.used_count + 1 })
        .eq('id', coupon.id);

      return {
        coupon,
        discount: parseFloat(discount.toFixed(2)),
        cart: {
          ...cart,
          summary: {
            ...cart.summary,
            discount: parseFloat(discount.toFixed(2)),
            total: parseFloat((cart.summary.total - discount).toFixed(2)),
          },
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error aplicando cupón');
    }
  }

  async removeCoupon(userId) {
    try {
      // Simplemente devolver el carrito sin descuento
      const cart = await this.getCart(userId);
      return cart;
    } catch (error) {
      throw new Error(error.message || 'Error removiendo cupón');
    }
  }

  async getCartItemCount(userId) {
    try {
      const { count, error } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error obteniendo contador: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo contador del carrito');
    }
  }
}

export default new CartService();
