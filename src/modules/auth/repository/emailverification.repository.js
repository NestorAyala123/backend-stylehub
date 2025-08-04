import BaseRepository from '../../../shared/repositories/BaseRepository.js';
import crypto from 'crypto';

class EmailVerificationRepository extends BaseRepository {
  constructor() {
    super('email_verifications');
  }

  /**
   * Crear un nuevo código de verificación
   */
  async createVerificationCode(
    userId,
    email,
    codeType = 'account_verification'
  ) {
    try {
      const verificationCode = this.generateVerificationCode();

      const expirationMinutes = codeType === 'password_reset' ? 10 : 15;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      const verificationData = {
        user_id: userId,
        email: email,
        verification_code: verificationCode,
        code_type: codeType,
        is_used: false,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await this.create(verificationData);

      return {
        ...result,
        code: verificationCode,
        expires_in_minutes: expirationMinutes,
      };
    } catch (error) {
      throw new Error(`Error creating verification code: ${error.message}`);
    }
  }

  /**
   * Verificar un código
   */
  async verifyCode(email, code, codeType = 'account_verification') {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .eq('verification_code', code)
        .eq('code_type', codeType)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        return {
          valid: false,
          error: 'Código inválido o expirado',
        };
      }

      // Marcar código como usado
      await this.markCodeAsUsed(data.id);

      return {
        valid: true,
        verification: data,
      };
    } catch (error) {
      throw new Error(`Error verifying code: ${error.message}`);
    }
  }

  /**
   * Marcar código como usado
   */
  async markCodeAsUsed(verificationId) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .update({
          is_used: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', verificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error marking code as used: ${error.message}`);
    }
  }

  /**
   * Invalidar códigos anteriores del usuario
   */
  async invalidatePreviousCodes(userId, codeType) {
    try {
      const { error } = await this.db
        .from(this.tableName)
        .update({
          is_used: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('code_type', codeType)
        .eq('is_used', false);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Error invalidating previous codes: ${error.message}`);
    }
  }

  /**
   * Obtener códigos activos del usuario
   */
  async getActiveCodesForUser(userId, codeType = null) {
    try {
      let query = this.db
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());

      if (codeType) {
        query = query.eq('code_type', codeType);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error getting active codes: ${error.message}`);
    }
  }

  /**
   * Limpiar códigos expirados
   */
  async cleanupExpiredCodes() {
    try {
      const { error } = await this.db
        .from(this.tableName)
        .delete()
        .or(`expires_at.lt.${new Date().toISOString()},is_used.eq.true`);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Error cleaning up expired codes: ${error.message}`);
    }
  }

  /**
   * Verificar si existe un código activo reciente
   */
  async hasRecentActiveCode(email, codeType, minutesThreshold = 2) {
    try {
      const thresholdTime = new Date(Date.now() - minutesThreshold * 60 * 1000);

      const { data, error } = await this.db
        .from(this.tableName)
        .select('id, created_at')
        .eq('email', email)
        .eq('code_type', codeType)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .gt('created_at', thresholdTime.toISOString())
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      throw new Error(`Error checking recent codes: ${error.message}`);
    }
  }

  /**
   * Generar código de verificación de 6 dígitos
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Obtener estadísticas de verificaciones
   */
  async getVerificationStats(dateFrom = null, dateTo = null) {
    try {
      let query = this.db
        .from(this.tableName)
        .select('code_type, is_used, created_at');

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calcular estadísticas
      const stats = {
        total: data.length,
        by_type: {},
        usage_rate: 0,
        success_rate: 0,
      };

      data.forEach((record) => {
        if (!stats.by_type[record.code_type]) {
          stats.by_type[record.code_type] = {
            total: 0,
            used: 0,
            success_rate: 0,
          };
        }

        stats.by_type[record.code_type].total++;
        if (record.is_used) {
          stats.by_type[record.code_type].used++;
        }
      });

      // Calcular tasas de éxito
      Object.keys(stats.by_type).forEach((type) => {
        const typeStats = stats.by_type[type];
        typeStats.success_rate =
          typeStats.total > 0
            ? Math.round((typeStats.used / typeStats.total) * 100)
            : 0;
      });

      const totalUsed = data.filter((r) => r.is_used).length;
      stats.usage_rate =
        stats.total > 0 ? Math.round((totalUsed / stats.total) * 100) : 0;

      return stats;
    } catch (error) {
      throw new Error(`Error getting verification stats: ${error.message}`);
    }
  }
}

// Exportar instancia singleton
export default new EmailVerificationRepository();
