import { supabaseAdmin } from '../../config/supabase.js';

class UserRepository {
  constructor() {
    this.tableName = 'usuarios';
  }

  async findByEmail(email) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding user by email:', error);
        throw new Error('Error buscando usuario');
      }

      return data;
    } catch (error) {
      console.error('Error in findByEmail:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding user by id:', error);
        throw new Error('Error buscando usuario');
      }

      return data;
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const userToInsert = {
        id: userData.id,
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        full_name: userData.full_name.trim(),
        phone: userData.phone ? userData.phone.trim() : null,
        rol: userData.rol || 'cliente',
        is_admin: userData.rol === 'admin', // Calcular is_admin basado en el rol
        is_active: true,
        email_verified: false,
        email_confirmed_at: userData.email_confirmed_at || null,
        created_at: userData.created_at || new Date().toISOString(),
        updated_at: userData.updated_at || new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .insert(userToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);

        // Manejar errores específicos
        if (error.code === '23505') {
          if (error.message.includes('email')) {
            throw new Error('Este email ya está registrado');
          }
          throw new Error('Ya existe un usuario con estos datos');
        } else if (error.code === '23502') {
          throw new Error('Faltan campos requeridos para el registro');
        } else if (error.code === '42501') {
          throw new Error('Error de permisos en la base de datos');
        } else if (error.code === '42P01') {
          throw new Error('Tabla de usuarios no encontrada');
        } else if (error.code === '23514') {
          throw new Error(
            'Datos inválidos: verifique el formato de los campos'
          );
        } else {
          throw new Error(`Error en la base de datos: ${error.message}`);
        }
      }

      if (!data) {
        throw new Error('No se pudo crear el usuario');
      }

      return data;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async updateUser(id, updateData) {
    try {
      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw new Error('Error actualizando usuario');
      }

      return data;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  async emailExists(email) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      // Si no hay error y hay data, significa que el email existe
      if (!error && data) {
        return true;
      }

      // Si el error es PGRST116, significa que no se encontró (no existe)
      if (error && error.code === 'PGRST116') {
        return false;
      }

      // Si hay otro tipo de error, lo manejamos
      if (error) {
        console.error('Error checking email existence:', error);
        throw new Error('Error verificando existencia del email');
      }

      return false;
    } catch (error) {
      console.error('Error in emailExists:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      // Soft delete - marcar como inactivo
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error deleting user:', error);
        throw new Error('Error eliminando usuario');
      }

      return data;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  async findAll(filters = {}) {
    try {
      let query = supabaseAdmin
        .from(this.tableName)
        .select(
          'id, email, full_name, phone, rol, is_admin, is_active, email_verified, created_at, updated_at'
        )
        .eq('is_active', true);

      // Aplicar filtros si existen
      if (filters.rol) {
        query = query.eq('rol', filters.rol);
      }

      if (filters.is_admin !== undefined) {
        query = query.eq('is_admin', filters.is_admin);
      }

      if (filters.email_verified !== undefined) {
        query = query.eq('email_verified', filters.email_verified);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        console.error('Error finding all users:', error);
        throw new Error('Error obteniendo usuarios');
      }

      return data || [];
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }
}

export default new UserRepository();
