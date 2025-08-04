import { supabase } from '../../config/supabase.js';
import paymentsService from './payments.service.js';
import axios from 'axios';

const PAYPAL_API =
  process.env.PAYPAL_ENVIRONMENT === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

class PayPalService {
  // Obtener token de acceso de PayPal
  async getAccessToken() {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(
        `${PAYPAL_API}/v1/oauth2/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_CLIENT_SECRET,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Error obteniendo token de PayPal: ${error.message}`);
    }
  }

  // Crear orden de PayPal - Método principal con validación robusta
  async createPayPalOrder(orderId, userId) {
    try {
      console.log(
        `🔄 Creating PayPal order for order ${orderId}, user ${userId}`
      );

      // Validar que las credenciales de PayPal estén configuradas
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        throw new Error('PayPal credentials not configured');
      }

      // Obtener la orden con validación completa
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items(
            *,
            products(name, description),
            product_variants(size, color)
          )
        `
        )
        .eq('id', orderId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (orderError || !order) {
        console.error('❌ Order not found:', orderError);
        throw new Error('Orden no encontrada o no válida');
      }

      // Validar que la orden tenga items
      if (!order.order_items || order.order_items.length === 0) {
        throw new Error('La orden no tiene productos');
      }

      // Validar que el total sea válido
      if (!order.total || order.total <= 0) {
        throw new Error('Total de la orden inválido');
      }

      console.log(
        `✅ Order validated: $${order.total}, ${order.order_items.length} items`
      );

      const accessToken = await this.getAccessToken();
      console.log('✅ PayPal access token obtained');

      // Crear estructura simplificada para PayPal (evitar errores de validación)
      const paypalOrder = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.id,
            description: `Orden #${order.id.toString().slice(-8)}`,
            amount: {
              currency_code: 'USD',
              value: parseFloat(order.total).toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: 'StyleHub',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${
            process.env.FRONTEND_URL || 'http://localhost:4321'
          }/checkout/paypal-success?order=${orderId}`,
          cancel_url: `${
            process.env.FRONTEND_URL || 'http://localhost:4321'
          }/checkout/cancel?order=${orderId}`,
        },
      };

      console.log(
        '🔄 Sending order to PayPal:',
        JSON.stringify(paypalOrder, null, 2)
      );

      const response = await axios.post(
        `${PAYPAL_API}/v2/checkout/orders`,
        paypalOrder,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `order-${orderId}-${Date.now()}`, // Evitar duplicados
          },
        }
      );

      console.log('✅ PayPal order created:', response.data.id);

      // Guardar el PayPal order ID en la orden
      await supabase
        .from('orders')
        .update({
          paypal_order_id: response.data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return {
        paypal_order_id: response.data.id,
        approval_url: response.data.links.find((link) => link.rel === 'approve')
          ?.href,
        order_data: response.data,
      };
    } catch (error) {
      console.error(
        '❌ PayPal order creation error:',
        error.response?.data || error.message
      );

      // Si es un error de PayPal, incluir más detalles
      if (error.response?.data?.details) {
        const details = error.response.data.details
          .map((d) => d.description)
          .join(', ');
        throw new Error(`PayPal error: ${details}`);
      }

      throw new Error(`Error creando orden PayPal: ${error.message}`);
    }
  }

  // Capturar pago de PayPal - Método principal con API real
  async capturePayPalOrder(paypalOrderId, orderId, userId) {
    try {
      console.log(
        `🔄 Capturing PayPal order ${paypalOrderId} for order ${orderId}`
      );

      // Validar que las credenciales estén configuradas
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        throw new Error('PayPal credentials not configured');
      }

      const accessToken = await this.getAccessToken();
      console.log('✅ PayPal access token obtained for capture');

      // Capturar el pago en PayPal
      const response = await axios.post(
        `${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `capture-${orderId}-${Date.now()}`, // Evitar duplicados
          },
        }
      );

      console.log(
        '✅ PayPal capture response:',
        JSON.stringify(response.data, null, 2)
      );

      if (response.data.status === 'COMPLETED') {
        // Obtener detalles del pago capturado
        const captureDetails =
          response.data.purchase_units[0].payments.captures[0];

        console.log(
          `✅ PayPal payment captured successfully: ${captureDetails.id}`
        );

        // Actualizar orden con estado completado
        await paymentsService.updateOrderPaymentStatus(orderId, 'completed', {
          paypal_order_id: paypalOrderId,
          payment_method_details: {
            type: 'paypal',
            paypal_order_id: paypalOrderId,
            capture_id: captureDetails.id,
            amount: captureDetails.amount.value,
            currency: captureDetails.amount.currency_code,
          },
        });

        // Actualizar el estado general de la orden a "confirmed"
        await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'completed',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        // Crear registro de pago
        const payment = await paymentsService.createPayment({
          order_id: orderId,
          user_id: userId,
          amount: parseFloat(captureDetails.amount.value),
          currency: 'usd',
          payment_method: 'paypal',
          external_id: paypalOrderId,
          status: 'completed',
          metadata: {
            paypal_order_id: paypalOrderId,
            capture_id: captureDetails.id,
            paypal_response: response.data,
          },
        });

        return {
          success: true,
          order_id: orderId,
          paypal_order_id: paypalOrderId,
          capture_data: response.data,
          payment,
        };
      } else {
        throw new Error(
          `PayPal payment not completed. Status: ${response.data.status}`
        );
      }
    } catch (error) {
      console.error(
        '❌ PayPal capture error:',
        error.response?.data || error.message
      );

      // Si es un error de PayPal, incluir más detalles
      if (error.response?.data?.details) {
        const details = error.response.data.details
          .map((d) => d.description)
          .join(', ');
        throw new Error(`PayPal capture error: ${details}`);
      }

      throw new Error(`Error capturando orden PayPal: ${error.message}`);
    }
  }
  // Nueva función que crea la orden y procesa el pago automáticamente
  async processPaymentFromCart(paypalOrderId, userId, orderData) {
    try {
      // Importar ordersService para crear la orden
      const { default: ordersService } = await import(
        '../orders/orders.service.js'
      );

      // Crear la orden primero desde el carrito
      console.log('Creating order from cart for PayPal payment...');
      const order = await ordersService.createOrder(userId, orderData);
      console.log('Order created for PayPal payment:', order.id);

      // Procesar el pago de PayPal con la orden recién creada
      return await this.processPayment(order.id, paypalOrderId, userId);
    } catch (error) {
      throw new Error(
        error.message || 'Error procesando pago PayPal desde carrito'
      );
    }
  }

  async processPayment(orderId, paypalOrderId, userId) {
    try {
      // Obtener la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        throw new Error('Orden no encontrada');
      }

      if (order.status !== 'pending') {
        throw new Error('La orden no está en estado pendiente');
      }

      // En un entorno real, aquí verificarías el pago con la API de PayPal
      // Por ahora, asumimos que el pago es válido si llega aquí
      console.log(
        `Processing PayPal payment for order ${orderId} with PayPal order ID ${paypalOrderId}`
      );

      // Actualizar la orden con estado completado
      const updatedOrder = await paymentsService.updateOrderPaymentStatus(
        orderId,
        'completed',
        {
          payment_method_details: {
            type: 'paypal',
            paypal_order_id: paypalOrderId,
            amount: order.total,
            currency: 'USD',
          },
        }
      );

      // También actualizar el estado general de la orden a "confirmed"
      await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'completed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Crear registro de pago
      const payment = await paymentsService.createPayment({
        order_id: orderId,
        user_id: userId,
        amount: order.total,
        currency: 'usd',
        payment_method: 'paypal',
        external_id: paypalOrderId,
        status: 'completed',
        metadata: {
          paypal_order_id: paypalOrderId,
          processed_timestamp: new Date().toISOString(),
        },
      });

      return {
        order: updatedOrder,
        payment,
      };
    } catch (error) {
      throw new Error(error.message || 'Error procesando pago con PayPal');
    }
  }

  async simulatePayPalVerification(paypalOrderId, amount) {
    // Simulación de verificación con PayPal
    // En producción, aquí harías una llamada real a la API de PayPal

    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular diferentes escenarios
        const random = Math.random();

        if (random > 0.95) {
          // 5% de probabilidad de fallo
          resolve({
            success: false,
            error: 'Insufficient funds',
            paypal_order_id: paypalOrderId,
          });
        } else {
          // 95% de probabilidad de éxito
          resolve({
            success: true,
            paypal_order_id: paypalOrderId,
            amount: amount,
            currency: 'USD',
            status: 'COMPLETED',
            payer: {
              email: 'buyer@example.com',
              payer_id: 'PAYERID123',
            },
            transaction_id: `TXN_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 11)}`,
          });
        }
      }, 1000); // Simular latencia de red
    });
  }

  async createRefund(transactionId, amount, reason) {
    try {
      // Estructura para reembolso real en PayPal
      const refundData = {
        amount: {
          currency_code: 'USD',
          value: amount.toString(),
        },
        note_to_payer: reason || 'Refund processed',
      };

      // Aquí iría la llamada real a PayPal API
      // const response = await paypalClient.payments.captures.refund(transactionId, refundData);

      // Simulación de reembolso
      return {
        id: `REFUND_${Date.now()}`,
        status: 'COMPLETED',
        amount: {
          currency_code: 'USD',
          value: amount.toString(),
        },
        create_time: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Error creando reembolso en PayPal: ${error.message}`);
    }
  }

  async getPayPalOrderDetails(paypalOrderId) {
    try {
      // Aquí iría la llamada real para obtener detalles de la orden
      // const response = await paypalClient.orders.get(paypalOrderId);

      // Simulación
      return {
        id: paypalOrderId,
        status: 'APPROVED',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '100.00',
            },
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Error obteniendo detalles de orden PayPal: ${error.message}`
      );
    }
  }

  // Webhook handler para PayPal (estructura preparada)
  async handleWebhook(body, headers) {
    try {
      // Aquí iría la verificación del webhook de PayPal
      // const isValid = await this.verifyPayPalWebhook(body, headers);

      const event = JSON.parse(body);

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCaptured(event.resource);
          break;

        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentDenied(event.resource);
          break;

        default:
          console.log(`Unhandled PayPal webhook event: ${event.event_type}`);
      }

      return {
        eventType: event.event_type,
        resourceId: event.resource.id,
      };
    } catch (error) {
      throw new Error(`PayPal webhook error: ${error.message}`);
    }
  }

  async handlePaymentCaptured(resource) {
    try {
      const orderId = resource.custom_id;

      if (!orderId) {
        console.error('Missing order ID in PayPal capture:', resource.id);
        return;
      }

      // Actualizar orden y crear pago
      await paymentsService.updateOrderPaymentStatus(orderId, 'completed');

      // Crear registro de pago si no existe
      const existingPayment = await paymentsService.getPaymentByOrderId(
        orderId
      );

      if (!existingPayment) {
        await paymentsService.createPayment({
          order_id: orderId,
          amount: resource.amount.value,
          currency: resource.amount.currency_code.toLowerCase(),
          payment_method: 'paypal',
          external_id: resource.id,
          status: 'completed',
          metadata: {
            paypal_capture_id: resource.id,
            webhook_processed: true,
          },
        });
      }
    } catch (error) {
      console.error('Error handling PayPal payment captured:', error);
    }
  }

  async handlePaymentDenied(resource) {
    try {
      const orderId = resource.custom_id;

      if (!orderId) {
        console.error('Missing order ID in PayPal denial:', resource.id);
        return;
      }

      // Actualizar orden con estado de fallo
      await paymentsService.updateOrderPaymentStatus(orderId, 'failed');
    } catch (error) {
      console.error('Error handling PayPal payment denied:', error);
    }
  }
}

export default new PayPalService();
