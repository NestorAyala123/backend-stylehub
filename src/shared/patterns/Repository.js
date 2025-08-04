/**
 * Repository Pattern Implementation
 * Encapsula la lógica necesaria para acceder a las fuentes de datos
 */

// Interfaz base del Repository
class BaseRepository {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  async findAll(options = {}) {
    throw new Error('findAll method must be implemented by subclasses');
  }

  async findById(id) {
    throw new Error('findById method must be implemented by subclasses');
  }

  async create(entity) {
    throw new Error('create method must be implemented by subclasses');
  }

  async update(id, entity) {
    throw new Error('update method must be implemented by subclasses');
  }

  async delete(id) {
    throw new Error('delete method must be implemented by subclasses');
  }

  async findBy(criteria) {
    throw new Error('findBy method must be implemented by subclasses');
  }

  async count(criteria = {}) {
    throw new Error('count method must be implemented by subclasses');
  }

  async exists(id) {
    throw new Error('exists method must be implemented by subclasses');
  }
}

// Repository concreto para base de datos
class DatabaseRepository extends BaseRepository {
  constructor(dataSource, tableName) {
    super(dataSource);
    this.tableName = tableName;
  }

  async findAll(options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        orderBy = 'created_at',
        order = 'desc',
      } = options;

      const { data, error } = await this.dataSource
        .from(this.tableName)
        .select('*')
        .order(orderBy, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error fetching all ${this.tableName}: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const { data, error } = await this.dataSource
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(
        `Error fetching ${this.tableName} by ID: ${error.message}`
      );
    }
  }

  async create(entity) {
    try {
      const { data, error } = await this.dataSource
        .from(this.tableName)
        .insert(entity)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating ${this.tableName}: ${error.message}`);
    }
  }

  async update(id, entity) {
    try {
      const { data, error } = await this.dataSource
        .from(this.tableName)
        .update({ ...entity, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating ${this.tableName}: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const { data, error } = await this.dataSource
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error deleting ${this.tableName}: ${error.message}`);
    }
  }

  async findBy(criteria) {
    try {
      let query = this.dataSource.from(this.tableName).select('*');

      // Aplicar criterios de búsqueda
      Object.entries(criteria).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value !== null) {
          // Soporte para operadores como { gt: 100 }, { like: '%search%' }
          Object.entries(value).forEach(([operator, operatorValue]) => {
            switch (operator) {
              case 'gt':
                query = query.gt(key, operatorValue);
                break;
              case 'gte':
                query = query.gte(key, operatorValue);
                break;
              case 'lt':
                query = query.lt(key, operatorValue);
                break;
              case 'lte':
                query = query.lte(key, operatorValue);
                break;
              case 'like':
                query = query.like(key, operatorValue);
                break;
              case 'ilike':
                query = query.ilike(key, operatorValue);
                break;
              default:
                query = query.eq(key, operatorValue);
            }
          });
        } else {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(
        `Error finding ${this.tableName} by criteria: ${error.message}`
      );
    }
  }

  async count(criteria = {}) {
    try {
      let query = this.dataSource
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Aplicar criterios de conteo
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query;
      if (error) throw error;
      return count;
    } catch (error) {
      throw new Error(`Error counting ${this.tableName}: ${error.message}`);
    }
  }

  async exists(id) {
    try {
      const entity = await this.findById(id);
      return entity !== null;
    } catch (error) {
      throw new Error(
        `Error checking if ${this.tableName} exists: ${error.message}`
      );
    }
  }
}

// Repository en memoria para testing
class InMemoryRepository extends BaseRepository {
  constructor() {
    super(null);
    this.data = new Map();
    this.currentId = 1;
  }

  generateId() {
    return this.currentId++;
  }

  async findAll(options = {}) {
    const { limit = 100, offset = 0 } = options;
    const items = Array.from(this.data.values());
    return items.slice(offset, offset + limit);
  }

  async findById(id) {
    return this.data.get(id) || null;
  }

  async create(entity) {
    const id = this.generateId();
    const newEntity = {
      ...entity,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.set(id, newEntity);
    return newEntity;
  }

  async update(id, entity) {
    if (!this.data.has(id)) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const existingEntity = this.data.get(id);
    const updatedEntity = {
      ...existingEntity,
      ...entity,
      id,
      updated_at: new Date().toISOString(),
    };

    this.data.set(id, updatedEntity);
    return updatedEntity;
  }

  async delete(id) {
    if (!this.data.has(id)) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const entity = this.data.get(id);
    this.data.delete(id);
    return entity;
  }

  async findBy(criteria) {
    const items = Array.from(this.data.values());
    return items.filter((item) => {
      return Object.entries(criteria).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }

  async count(criteria = {}) {
    if (Object.keys(criteria).length === 0) {
      return this.data.size;
    }

    const filtered = await this.findBy(criteria);
    return filtered.length;
  }

  async exists(id) {
    return this.data.has(id);
  }

  clear() {
    this.data.clear();
    this.currentId = 1;
  }
}

// Factory para repositories
class RepositoryFactory {
  static createRepository(type, dataSource, tableName) {
    switch (type.toLowerCase()) {
      case 'database':
        return new DatabaseRepository(dataSource, tableName);
      case 'memory':
        return new InMemoryRepository();
      default:
        throw new Error(`Repository type "${type}" is not supported`);
    }
  }
}

export {
  BaseRepository,
  DatabaseRepository,
  InMemoryRepository,
  RepositoryFactory,
};
