import { supabaseAdmin } from '../../config/supabase.js';

/**
 * 🗄️ BaseRepository - Implementación del Repository Pattern
 *
 * Proporciona operaciones CRUD básicas para todas las tablas
 * Abstrae la lógica de acceso a datos de Supabase
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = supabaseAdmin;
  }

  /**
   * 🔹 CREAR REGISTRO
   */
  async create(data) {
    try {
      const { data: result, error } = await this.db
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      throw new Error(
        `Error creating record in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 OBTENER POR ID
   */
  async findById(id) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(
        `Error finding record by id in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 OBTENER TODOS
   */
  async findAll(filters = {}, options = {}) {
    try {
      let query = this.db.from(this.tableName).select('*');

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Aplicar opciones (ordenamiento, límite, etc.)
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 50) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(
        `Error finding records in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 ACTUALIZAR POR ID
   */
  async update(id, data) {
    try {
      const { data: result, error } = await this.db
        .from(this.tableName)
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      throw new Error(
        `Error updating record in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 ELIMINAR POR ID
   */
  async delete(id) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(
        `Error deleting record in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 BUSCAR CON CONDICIONES PERSONALIZADAS
   */
  async findWhere(conditions = {}) {
    try {
      let query = this.db.from(this.tableName).select('*');

      Object.entries(conditions).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value !== null) {
          // Operadores especiales
          if (value.gt !== undefined) query = query.gt(key, value.gt);
          if (value.gte !== undefined) query = query.gte(key, value.gte);
          if (value.lt !== undefined) query = query.lt(key, value.lt);
          if (value.lte !== undefined) query = query.lte(key, value.lte);
          if (value.like !== undefined) query = query.like(key, value.like);
          if (value.ilike !== undefined) query = query.ilike(key, value.ilike);
        } else {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(
        `Error finding records with conditions in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 CONTAR REGISTROS
   */
  async count(filters = {}) {
    try {
      let query = this.db
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new Error(
        `Error counting records in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 BUSCAR UNO POR CONDICIÓN
   */
  async findOne(conditions = {}) {
    try {
      let query = this.db.from(this.tableName).select('*');

      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(
        `Error finding one record in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 UPSERT (INSERTAR O ACTUALIZAR)
   */
  async upsert(data, onConflict = 'id') {
    try {
      const { data: result, error } = await this.db
        .from(this.tableName)
        .upsert(data, {
          onConflict: onConflict,
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      throw new Error(
        `Error upserting record in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 BUSCAR POR EMAIL (COMÚN EN MUCHAS TABLAS)
   */
  async findByEmail(email) {
    return await this.findOne({ email: email.toLowerCase().trim() });
  }

  /**
   * 🔹 TRANSACCIÓN PERSONALIZADA
   */
  async transaction(callback) {
    try {
      // Supabase maneja transacciones automáticamente en operaciones múltiples
      return await callback(this.db);
    } catch (error) {
      throw new Error(
        `Transaction error in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * 🔹 QUERY SQL PERSONALIZADA
   */
  async rawQuery(query, params = {}) {
    try {
      const { data, error } = await this.db.rpc(query, params);

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Raw query error: ${error.message}`);
    }
  }

  /**
   * 🔹 PAGINACIÓN
   */
  async paginate(
    page = 1,
    limit = 10,
    filters = {},
    orderBy = { column: 'created_at', ascending: false }
  ) {
    try {
      const offset = (page - 1) * limit;

      // Contar total de registros
      const total = await this.count(filters);

      // Obtener registros paginados
      const data = await this.findAll(filters, {
        limit,
        offset,
        orderBy,
      });

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Pagination error in ${this.tableName}: ${error.message}`
      );
    }
  }
}

export default BaseRepository;
