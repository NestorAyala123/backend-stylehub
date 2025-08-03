import { supabase } from '../../config/supabase.js';

class PaymentsService {
  async createPayment(paymentData) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        throw new Error(`Error creando pago: ${error.message}`);
      }

      return payment;
    } catch (error) {
      throw new Error(error.message || 'Error creando registro de pago');
    }
  }

  async updatePayment(paymentId, updateData) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error actualizando pago: ${error.message}`);
      }

      return payment;
    } catch (error) {
      throw new Error(error.message || 'Error actualizando pago');
    }
  }

  async getPaymentByOrderId(orderId) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error obteniendo pago: ${error.message}`);
      }

      return payment;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo pago por orden');
    }
  }

  async getPaymentByExternalId(externalId, paymentMethod) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('external_id', externalId)
        .eq('payment_method', paymentMethod)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error obteniendo pago: ${error.message}`);
      }

      return payment;
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo pago por ID externo');
    }
  }

  async getPaymentHistory(userId, { page = 1, limit = 10, status }) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from('payments')
        .select(
          `
          *,
          orders(id, status, total, created_at)
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      const {
        data: payments,
        error,
        count,
      } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error obteniendo historial: ${error.message}`);
      }

      return {
        payments,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo historial de pagos');
    }
  }

  async getAllPayments({ page = 1, limit = 20, status, method, search }) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase.from('payments').select(
        `
          *,
          orders(id, status, total)
        `,
        { count: 'exact' }
      );

      if (status) {
        query = query.eq('status', status);
      }

      if (method) {
        query = query.eq('payment_method', method);
      }

      if (search) {
        query = query.or(
          `external_id.ilike.%${search}%,orders.id.ilike.%${search}%`
        );
      }

      const {
        data: payments,
        error,
        count,
      } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error obteniendo pagos: ${error.message}`);
      }

      // Obtener información de usuarios por separado
      const paymentsWithUsers = await Promise.all(
        payments.map(async (payment) => {
          // Buscar usuario en la tabla usuarios por user_id
          const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('full_name, email')
            .eq('id', payment.user_id)
            .single();

          return {
            ...payment,
            user_email: user?.email || 'Usuario no encontrado',
            user_name: user?.full_name || 'N/A',
          };
        })
      );

      return {
        payments: paymentsWithUsers,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo todos los pagos');
    }
  }

  async processRefund(paymentId, refundData) {
    try {
      const { amount, reason, adminId } = refundData;

      // Obtener el pago original
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        return null;
      }

      if (payment.status !== 'completed') {
        throw new Error('Solo se pueden reembolsar pagos completados');
      }

      const refundAmount = amount || payment.amount;

      if (refundAmount > payment.amount) {
        throw new Error(
          'El monto del reembolso no puede ser mayor al pago original'
        );
      }

      // Crear registro de reembolso
      const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .insert({
          payment_id: paymentId,
          order_id: payment.order_id,
          user_id: payment.user_id,
          amount: refundAmount,
          reason,
          processed_by: adminId,
          status: 'pending',
        })
        .select()
        .single();

      if (refundError) {
        throw new Error(`Error creando reembolso: ${refundError.message}`);
      }

      // Actualizar estado del pago
      const newPaymentStatus =
        refundAmount === payment.amount ? 'refunded' : 'partially_refunded';

      await supabase
        .from('payments')
        .update({
          status: newPaymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Actualizar estado de la orden
      await supabase
        .from('orders')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.order_id);

      return refund;
    } catch (error) {
      throw new Error(error.message || 'Error procesando reembolso');
    }
  }

  async getPaymentStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startOfMonthISO = startOfMonth.toISOString().split('T')[0];

      // Pagos de hoy
      const { data: todayPayments, error: todayError } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z');

      if (todayError) {
        console.error('Error getting today payments:', todayError);
      }

      // Pagos del mes
      const { data: monthPayments, error: monthError } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfMonthISO + 'T00:00:00.000Z');

      if (monthError) {
        console.error('Error getting month payments:', monthError);
      }

      // Pagos pendientes
      const { data: pendingPayments, error: pendingError } = await supabase
        .from('payments')
        .select('id')
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Error getting pending payments:', pendingError);
      }

      // Reembolsos
      const { data: refundPayments, error: refundError } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'refunded');

      if (refundError) {
        console.error('Error getting refunded payments:', refundError);
      }

      const todayTotal = (todayPayments || []).reduce(
        (sum, payment) => sum + parseFloat(payment.amount || 0),
        0
      );
      const monthTotal = (monthPayments || []).reduce(
        (sum, payment) => sum + parseFloat(payment.amount || 0),
        0
      );
      const pendingCount = (pendingPayments || []).length;
      const refundsTotal = (refundPayments || []).reduce(
        (sum, payment) => sum + parseFloat(payment.amount || 0),
        0
      );

      return {
        today: todayTotal,
        month: monthTotal,
        pending: pendingCount,
        refunds: refundsTotal,
      };
    } catch (error) {
      console.error('Error in getPaymentStats:', error);
      // Devolver estadísticas por defecto en caso de error
      return {
        today: 0,
        month: 0,
        pending: 0,
        refunds: 0,
      };
    }
  }

  async updateOrderPaymentStatus(orderId, status, paymentData = {}) {
    try {
      const updateData = {
        payment_status: status,
        updated_at: new Date().toISOString(),
      };

      if (paymentData.payment_intent_id) {
        updateData.payment_intent_id = paymentData.payment_intent_id;
      }

      if (paymentData.payment_method_details) {
        updateData.payment_method_details = paymentData.payment_method_details;
      }

      // Si el pago es exitoso, cambiar estado de la orden
      if (status === 'completed') {
        updateData.status = 'confirmed';
      } else if (status === 'failed') {
        updateData.status = 'payment_failed';
      }

      const { data: order, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error actualizando orden: ${error.message}`);
      }

      return order;
    } catch (error) {
      throw new Error(
        error.message || 'Error actualizando estado de pago de la orden'
      );
    }
  }

  // Obtener un pago por ID
  async getPaymentById(paymentId) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(
          `
          *,
          orders(id, status, total)
        `
        )
        .eq('id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        throw new Error(`Error obteniendo pago: ${error.message}`);
      }

      // Obtener información del usuario por separado
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('full_name, email')
        .eq('id', payment.user_id)
        .single();

      return {
        ...payment,
        user_email: user?.email || 'Usuario no encontrado',
        user_name: user?.full_name || 'N/A',
      };
    } catch (error) {
      throw new Error(error.message || 'Error obteniendo pago por ID');
    }
  }

  // Procesar un reembolso (versión admin)
  async processRefundAdmin(paymentId, refundData) {
    try {
      // Verificar que el pago existe y está completado
      const payment = await this.getPaymentById(paymentId);

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      if (payment.status !== 'completed') {
        throw new Error('Solo se pueden reembolsar pagos completados');
      }

      // Actualizar el estado del pago
      const updatedPayment = await this.updatePayment(paymentId, {
        status: 'refunded',
        refund_amount: refundData.amount || payment.amount,
        refunded_at: new Date().toISOString(),
      });

      // Actualizar el estado de la orden
      if (payment.order_id) {
        await this.updateOrderPaymentStatus(payment.order_id, 'refunded');
      }

      return updatedPayment;
    } catch (error) {
      throw new Error(error.message || 'Error procesando reembolso');
    }
  }

  // Procesar un pago pendiente manualmente
  async processPaymentManually(paymentId, adminId) {
    try {
      // Verificar que el pago existe y está pendiente
      const payment = await this.getPaymentById(paymentId);

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      if (payment.status !== 'pending') {
        throw new Error('Solo se pueden procesar pagos pendientes');
      }

      // Actualizar el estado del pago
      const updatedPayment = await this.updatePayment(paymentId, {
        status: 'completed',
        processed_by: adminId,
        processed_at: new Date().toISOString(),
      });

      // Actualizar el estado de la orden
      if (payment.order_id) {
        await this.updateOrderPaymentStatus(payment.order_id, 'completed');
      }

      return updatedPayment;
    } catch (error) {
      throw new Error(error.message || 'Error procesando pago manualmente');
    }
  }
}

export default new PaymentsService();
