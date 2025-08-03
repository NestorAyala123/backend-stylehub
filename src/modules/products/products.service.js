import { supabaseAdmin } from '../../config/supabase.js';

class ProductsService {
  async getProducts(filters = {}, userId = null) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        search,
        minPrice,
        maxPrice,
        min_price, // Soporte para formato snake_case
        max_price, // Soporte para formato snake_case
        sortBy = 'created_at',
        sort_by, // Soporte para formato snake_case
        sortOrder = 'desc',
        brand,
      } = filters;

      // Normalizar precios (usar el formato que venga)
      const finalMinPrice = minPrice || min_price;
      const finalMaxPrice = maxPrice || max_price;

      // Normalizar ordenamiento
      let finalSortBy = sortBy || sort_by || 'created_at';
      let finalSortOrder = sortOrder;

      // Convertir ordenamientos del frontend al formato del backend
      if (sort_by) {
        switch (sort_by) {
          case 'featured':
            finalSortBy = 'featured';
            finalSortOrder = 'desc';
            break;
          case 'price-asc':
            finalSortBy = 'price';
            finalSortOrder = 'asc';
            break;
          case 'price-desc':
            finalSortBy = 'price';
            finalSortOrder = 'desc';
            break;
          case 'newest':
            finalSortBy = 'created_at';
            finalSortOrder = 'desc';
            break;
          case 'oldest':
            finalSortBy = 'created_at';
            finalSortOrder = 'asc';
            break;
          case 'name':
            finalSortBy = 'name';
            finalSortOrder = 'asc';
            break;
          default:
            finalSortBy = 'created_at';
            finalSortOrder = 'desc';
        }
      }

      const offset = (page - 1) * limit;

      let query = supabaseAdmin.from('products').select(
        `
          *,
          categories(name),
          product_images(image_url, alt_text, is_primary)
        `,
        { count: 'exact' }
      );

      // Filtros
      if (category) {
        query = query.eq('categories.name', category);
      }

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      if (finalMinPrice) {
        query = query.gte('price', finalMinPrice);
      }

      if (finalMaxPrice) {
        query = query.lte('price', finalMaxPrice);
      }

      if (brand) {
        // Si hay múltiples marcas separadas por comas
        const brands = brand.split(',').map((b) => b.trim());
        if (brands.length === 1) {
          query = query.ilike('tags', `%${brands[0]}%`);
        } else {
          const brandConditions = brands
            .map((b) => `tags.ilike.%${b}%`)
            .join(',');
          query = query.or(brandConditions);
        }
      }

      // Solo productos activos
      query = query.eq('is_active', true);

      // Ordenamiento
      if (finalSortBy === 'featured') {
        // Para productos destacados, ordenar primero por featured=true, luego por fecha
        query = query.order('featured', { ascending: false });
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order(finalSortBy, {
          ascending: finalSortOrder === 'asc',
        });
      }

      // Paginación
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        throw new Error(`Error obteniendo productos: ${error.message}`);
      }

      // Si hay usuario, verificar favoritos
      if (userId && products.length > 0) {
        const productIds = products.map((p) => p.id);
        const { data: favorites } = await supabaseAdmin
          .from('user_favorites')
          .select('product_id')
          .eq('user_id', userId)
          .in('product_id', productIds);

        const favoriteIds = new Set(favorites?.map((f) => f.product_id) || []);

        products.forEach((product) => {
          product.is_favorite = favoriteIds.has(product.id);
        });
      }

      // Normalizar las imágenes para el frontend
      products.forEach((product) => {
        if (product.product_images) {
          product.images = product.product_images.sort(
            (a, b) => a.sort_order - b.sort_order
          );
          delete product.product_images;
        }
        // Normalizar categorías para mantener compatibilidad
        if (product.categories) {
          product.category = product.categories;
        }
      });

      return {
        products,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo productos');
    }
  }

  async getProductById(id, userId = null) {
    try {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select(
          `
          *,
          categories(name),
          product_images(image_url, alt_text, is_primary, sort_order),
          product_variants(
            id,
            size,
            color,
            additional_price,
            stock_quantity,
            sku,
            is_active
          )
        `
        )
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error obteniendo producto: ${error.message}`);
      }

      // Verificar si es favorito del usuario
      if (userId) {
        const { data: favorite } = await supabaseAdmin
          .from('user_favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('product_id', id)
          .single();

        product.is_favorite = !!favorite;
      }

      // Ordenar imágenes por sort_order y normalizar para frontend
      if (product.product_images) {
        product.images = product.product_images.sort(
          (a, b) => a.sort_order - b.sort_order
        );
        delete product.product_images;
      }

      // Normalizar categorías para mantener compatibilidad
      if (product.categories) {
        product.category = product.categories;
      }

      // Filtrar solo variantes activas
      if (product.product_variants) {
        product.product_variants = product.product_variants.filter(
          (v) => v.is_active
        );
      }

      return product;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo producto por ID');
    }
  }

  async createProduct(productData, adminId) {
    try {
      console.log('=== CREANDO PRODUCTO ===');
      console.log('Admin ID:', adminId);
      console.log('Product data:', productData);

      const {
        name,
        description,
        price,
        original_price,
        category_id,
        stock_quantity,
        sku,
        weight,
        dimensions,
        featured = false,
        brand,
        rating,
        discount_percentage,
        is_active = true,
        tags = [],
      } = productData;

      // Procesar tags: convertir string a array si es necesario
      let processedTags = tags;
      if (typeof tags === 'string') {
        processedTags = tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }

      // Verificar que la categoría existe
      const { data: category, error: categoryError } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('id', category_id)
        .eq('is_active', true)
        .single();

      if (categoryError || !category) {
        throw new Error('Categoría no encontrada');
      }

      // Verificar que el SKU no existe
      if (sku) {
        const { data: existingSku } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('sku', sku)
          .single();

        if (existingSku) {
          throw new Error('El SKU ya existe');
        }
      }

      // ⭐ USAR supabaseAdmin PARA BYPASEAR RLS
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert({
          name,
          description,
          price,
          original_price,
          category_id,
          stock_quantity,
          sku,
          weight,
          dimensions,
          featured,
          brand,
          rating,
          discount_percentage,
          tags: processedTags,
          is_active,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando producto:', error);
        throw new Error(`Error creando producto: ${error.message}`);
      }

      console.log('✅ Producto creado exitosamente:', product.id);
      return product;
    } catch (error) {
      console.error('❌ Error en createProduct:', error);
      throw new Error(error.message || 'Error creando producto');
    }
  }

  async updateProduct(id, updateData, adminId) {
    try {
      const allowedFields = [
        'name',
        'description',
        'price',
        'original_price',
        'category_id',
        'stock_quantity',
        'sku',
        'weight',
        'dimensions',
        'featured',
        'brand',
        'rating',
        'discount_percentage',
        'tags',
        'is_active',
      ];

      // Filtrar solo campos permitidos
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      // Procesar tags si están presentes
      if (filteredData.tags && typeof filteredData.tags === 'string') {
        filteredData.tags = filteredData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      // Verificar SKU único si se está actualizando
      if (filteredData.sku) {
        const { data: existingSku } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('sku', filteredData.sku)
          .neq('id', id)
          .single();

        if (existingSku) {
          throw new Error('El SKU ya existe');
        }
      }

      const { data: product, error } = await supabaseAdmin
        .from('products')
        .update({
          ...filteredData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando producto: ${error.message}`);
      }

      return product;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando producto');
    }
  }

  async deleteProduct(id, adminId) {
    try {
      // Verificar que el producto existe
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', id)
        .single();

      if (productError || !product) {
        return false;
      }

      // Soft delete - marcar como inactivo
      const { error } = await supabaseAdmin
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Error eliminando producto: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error eliminando producto');
    }
  }

  async getFeaturedProducts(limit = 8) {
    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(
          `
          *,
          categories(name),
          product_images(image_url, alt_text, is_primary)
        `
        )
        .eq('is_active', true)
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(
          `Error obteniendo productos destacados: ${error.message}`
        );
      }

      // Normalizar las imágenes para el frontend
      products.forEach((product) => {
        if (product.product_images) {
          product.images = product.product_images.sort(
            (a, b) => a.sort_order - b.sort_order
          );
          delete product.product_images;
        }
        // Normalizar categorías para mantener compatibilidad
        if (product.categories) {
          product.category = product.categories;
        }
      });

      return products;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo productos destacados');
    }
  }

  async getRelatedProducts(productId, limit = 4) {
    try {
      // Obtener la categoría del producto actual
      const { data: currentProduct } = await supabaseAdmin
        .from('products')
        .select('category_id')
        .eq('id', productId)
        .single();

      if (!currentProduct) {
        return [];
      }

      // Obtener productos relacionados de la misma categoría
      const { data: relatedProducts, error } = await supabaseAdmin
        .from('products')
        .select(
          `
          *,
          categories(name),
          product_images(image_url, alt_text, is_primary)
        `
        )
        .eq('category_id', currentProduct.category_id)
        .neq('id', productId)
        .eq('is_active', true)
        .limit(limit);

      if (error) {
        throw new Error(
          `Error obteniendo productos relacionados: ${error.message}`
        );
      }

      // Normalizar las imágenes para el frontend
      relatedProducts.forEach((product) => {
        if (product.product_images) {
          product.images = product.product_images.sort(
            (a, b) => a.sort_order - b.sort_order
          );
          delete product.product_images;
        }
        // Normalizar categorías para mantener compatibilidad
        if (product.categories) {
          product.category = product.categories;
        }
      });

      return relatedProducts;
    } catch (error) {
      throw new Error(
        error.message || 'Error obteniendo productos relacionados'
      );
    }
  }

  async searchProducts(query, limit = 10) {
    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(
          `
          *,
          categories(name),
          product_images(image_url, alt_text, is_primary)
        `
        )
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true)
        .order('name')
        .limit(limit);

      if (error) {
        throw new Error(`Error en búsqueda: ${error.message}`);
      }

      // Normalizar las imágenes para el frontend
      products.forEach((product) => {
        if (product.product_images) {
          product.images = product.product_images.sort(
            (a, b) => a.sort_order - b.sort_order
          );
          delete product.product_images;
        }
        // Normalizar categorías para mantener compatibilidad
        if (product.categories) {
          product.category = product.categories;
        }
      });

      return products;
    } catch (error) {
      throw new Error(error.message || 'Error en búsqueda de productos');
    }
  }

  async getCategories() {
    try {
      const { data: categories, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw new Error(`Error obteniendo categorías: ${error.message}`);
      }

      return categories;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo categorías');
    }
  }

  async createCategory(categoryData, adminId) {
    try {
      console.log('=== CREANDO CATEGORÍA ===');
      console.log('Admin ID:', adminId);
      console.log('Category data:', categoryData);

      const { name, description, image_url } = categoryData;

      // Verificar que el nombre no existe
      const { data: existingCategory } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('name', name)
        .single();

      if (existingCategory) {
        throw new Error('Ya existe una categoría con ese nombre');
      }

      // ⭐ USAR supabaseAdmin PARA BYPASEAR RLS
      const { data: category, error } = await supabaseAdmin
        .from('categories')
        .insert({
          name,
          description,
          image_url,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando categoría:', error);
        throw new Error(`Error creando categoría: ${error.message}`);
      }

      console.log('✅ Categoría creada exitosamente:', category.id);
      return category;
    } catch (error) {
      console.error('❌ Error en createCategory:', error);
      throw new Error(error.message || 'Error creando categoría');
    }
  }

  async updateCategory(id, updateData, adminId) {
    try {
      const { name, description, image_url, is_active } = updateData;

      // Verificar nombre único si se está actualizando
      if (name) {
        const { data: existingCategory } = await supabaseAdmin
          .from('categories')
          .select('id')
          .eq('name', name)
          .neq('id', id)
          .single();

        if (existingCategory) {
          throw new Error('Ya existe una categoría con ese nombre');
        }
      }

      const { data: category, error } = await supabaseAdmin
        .from('categories')
        .update({
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(image_url !== undefined && { image_url }),
          ...(is_active !== undefined && { is_active }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando categoría: ${error.message}`);
      }

      return category;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando categoría');
    }
  }

  async deleteCategory(id, adminId) {
    try {
      // Verificar que no hay productos en esta categoría
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('category_id', id)
        .eq('is_active', true);

      if (productsError) {
        throw new Error(
          `Error verificando productos: ${productsError.message}`
        );
      }

      if (products && products.length > 0) {
        throw new Error(
          'No se puede eliminar una categoría que tiene productos activos'
        );
      }

      // Soft delete - marcar como inactiva
      const { error } = await supabaseAdmin
        .from('categories')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Error eliminando categoría: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error eliminando categoría');
    }
  }

  // Métodos para variantes de productos
  async createVariant(productId, variantData, adminId) {
    try {
      const {
        size,
        color,
        additional_price = 0,
        stock_quantity,
        sku,
      } = variantData;

      // Verificar que el producto existe
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        throw new Error('Producto no encontrado');
      }

      // Verificar SKU único si se proporciona
      if (sku) {
        const { data: existingSku } = await supabaseAdmin
          .from('product_variants')
          .select('id')
          .eq('sku', sku)
          .single();

        if (existingSku) {
          throw new Error('El SKU de variante ya existe');
        }
      }

      const { data: variant, error } = await supabaseAdmin
        .from('product_variants')
        .insert({
          product_id: productId,
          size,
          color,
          additional_price,
          stock_quantity,
          sku,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error creando variante: ${error.message}`);
      }

      return variant;
    } catch (error) {
      throw new Error(error.message || 'Error creando variante de producto');
    }
  }

  async updateVariant(productId, variantId, updateData, adminId) {
    try {
      const allowedFields = [
        'size',
        'color',
        'additional_price',
        'stock_quantity',
        'sku',
        'is_active',
      ];

      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      // Verificar SKU único si se está actualizando
      if (filteredData.sku) {
        const { data: existingSku } = await supabaseAdmin
          .from('product_variants')
          .select('id')
          .eq('sku', filteredData.sku)
          .neq('id', variantId)
          .single();

        if (existingSku) {
          throw new Error('El SKU de variante ya existe');
        }
      }

      const { data: variant, error } = await supabaseAdmin
        .from('product_variants')
        .update({
          ...filteredData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId)
        .eq('product_id', productId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando variante: ${error.message}`);
      }

      return variant;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando variante');
    }
  }

  async deleteVariant(productId, variantId, adminId) {
    try {
      const { error } = await supabaseAdmin
        .from('product_variants')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId)
        .eq('product_id', productId);

      if (error) {
        throw new Error(`Error eliminando variante: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error eliminando variante');
    }
  }

  // Métodos para reseñas
  async getProductReviews(productId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const {
        data: reviews,
        error,
        count,
      } = await supabaseAdmin
        .from('product_reviews')
        .select(
          `*,
          usuarios(full_name)
        `,
          { count: 'exact' }
        )
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error obteniendo reseñas: ${error.message}`);
      }

      return {
        reviews,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo reseñas del producto');
    }
  }

  async createReview(productId, reviewData, userId) {
    try {
      const { rating, title, comment, order_id } = reviewData;

      // Verificar que el producto existe
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        throw new Error('Producto no encontrado');
      }

      // Verificar que el usuario no ha reseñado ya este producto
      const { data: existingReview } = await supabaseAdmin
        .from('product_reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .single();

      if (existingReview) {
        throw new Error('Ya has reseñado este producto');
      }

      const { data: review, error } = await supabaseAdmin
        .from('product_reviews')
        .insert({
          product_id: productId,
          user_id: userId,
          order_id,
          rating,
          title,
          comment,
          is_verified: !!order_id, // Verificado si viene de una orden
          is_approved: true, // Auto-aprobar por ahora
        })
        .select(
          `*,
          usuarios(full_name)
        `
        )
        .single();

      if (error) {
        throw new Error(`Error creando reseña: ${error.message}`);
      }

      return review;
    } catch (error) {
      throw new Error(error.message || 'Error creando reseña');
    }
  }

  async updateReview(productId, reviewId, updateData, userId) {
    try {
      const { rating, title, comment } = updateData;

      const { data: review, error } = await supabaseAdmin
        .from('product_reviews')
        .update({
          rating,
          title,
          comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('product_id', productId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Error actualizando reseña: ${error.message}`);
      }

      return review;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando reseña');
    }
  }

  async deleteReview(productId, reviewId, userId) {
    try {
      const { error } = await supabaseAdmin
        .from('product_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('product_id', productId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Error eliminando reseña: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Error eliminando reseña');
    }
  }
}

export default new ProductsService();
