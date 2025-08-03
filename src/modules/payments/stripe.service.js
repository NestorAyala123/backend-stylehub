import Stripe from 'stripe';
import { supabase } from '../../config/supabase.js';
import paymentsService from './payments.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeService {
  async createPaymentIntent(orderId, userId) {
    try {
      // Obtener la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (orderError || !order) {
        throw new Error('Orden no encontrada o no válida');
      }

      // Crear Payment Intent con Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(order.total) * 100), // Convertir a centavos
        currency: 'usd',
        metadata: {
          order_id: order.id,
          user_id: userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Guardar el payment intent ID en la orden
      await supabase
        .from('orders')
        .update({
          payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      };
    } catch (error) {
      throw new Error(
        error.message || 'Error creando intención de pago con Stripe'
      );
    }
  }

  async createCheckoutSession(orderId, userId) {
    try {
      // Obtener la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items(
            *,
            products(
              name, 
              description,
              product_images(image_url, is_primary, sort_order)
            ),
            product_variants(size, color)
          )
        `
        )
        .eq('id', orderId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (orderError || !order) {
        throw new Error('Orden no encontrada o no válida');
      }

      // Crear line items para Stripe con imágenes
      const lineItems = order.order_items.map((item) => {
        // Obtener la imagen principal del producto
        const images = item.products.product_images || [];
        const sortedImages = images.sort((a, b) => {
          // Primero las primarias
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          // Luego por sort_order
          return (a.sort_order || 0) - (b.sort_order || 0);
        });

        const primaryImageUrl = sortedImages[0]?.image_url;

        // Crear descripción que incluya variantes si existen
        let description = item.products.description || '';
        if (item.product_variants) {
          const variantInfo = [];
          if (item.product_variants.size)
            variantInfo.push(`Talla: ${item.product_variants.size}`);
          if (item.product_variants.color)
            variantInfo.push(`Color: ${item.product_variants.color}`);
          if (variantInfo.length > 0) {
            description += (description ? ' - ' : '') + variantInfo.join(', ');
          }
        }

        const productData = {
          name: item.products.name,
          description: description,
        };

        // Agregar imagen si está disponible
        if (primaryImageUrl) {
          productData.images = [primaryImageUrl];
        }

        return {
          price_data: {
            currency: 'usd',
            product_data: productData,
            unit_amount: Math.round(parseFloat(item.price) * 100), // Convertir a centavos
          },
          quantity: item.quantity,
        };
      });

      // Agregar shipping como line item si hay costo de envío
      if (order.shipping > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Envío',
              description: 'Costo de envío',
            },
            unit_amount: Math.round(parseFloat(order.shipping) * 100),
          },
          quantity: 1,
        });
      }

      // Agregar impuestos como line item si hay impuestos
      if (order.tax > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Impuestos',
              description: 'IVA y otros impuestos',
            },
            unit_amount: Math.round(parseFloat(order.tax) * 100),
          },
          quantity: 1,
        });
      }

      // Crear sesión de checkout
      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: 'payment',
        success_url: `${
          process.env.FRONTEND_URL || 'http://localhost:4321'
        }/checkout/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${
          process.env.FRONTEND_URL || 'http://localhost:4321'
        }/checkout/cancel?order=${order.id}`,
        metadata: {
          order_id: order.id,
          user_id: userId,
        },
        customer_email: order.user_email || undefined,
        payment_intent_data: {
          metadata: {
            order_id: order.id,
            user_id: userId,
          },
        },
      });

      // Guardar el session ID en la orden
      await supabase
        .from('orders')
        .update({
          checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      return {
        url: session.url,
        session_id: session.id,
      };
    } catch (error) {
      throw new Error(
        error.message || 'Error creando sesión de checkout con Stripe'
      );
    }
  }

  async confirmPayment(paymentIntentId, orderId, userId) {
    try {
      // Verificar el estado del pago con Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(
          `El pago no ha sido completado. Estado: ${paymentIntent.status}`
        );
      }

      // Actualizar la orden con estado completado
      const updatedOrder = await paymentsService.updateOrderPaymentStatus(
        orderId,
        'completed',
        {
          payment_intent_id: paymentIntentId,
          payment_method_details: {
            type: 'stripe',
            payment_intent_id: paymentIntentId,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            payment_method: paymentIntent.payment_method,
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
        amount: (paymentIntent.amount / 100).toFixed(2),
        currency: paymentIntent.currency,
        payment_method: 'stripe',
        external_id: paymentIntentId,
        status: 'completed',
        metadata: {
          payment_intent_id: paymentIntentId,
          payment_method: paymentIntent.payment_method,
        },
      });

      return {
        order: updatedOrder,
        payment,
      };
    } catch (error) {
      throw new Error(error.message || 'Error confirmando pago con Stripe');
    }
  }

  async handleWebhook(body, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'checkout.session.async_payment_succeeded':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'checkout.session.async_payment_failed':
          await this.handleCheckoutSessionFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return {
        eventType: event.type,
        paymentIntentId: event.data.object.id,
      };
    } catch (error) {
      throw new Error(`Webhook error: ${error.message}`);
    }
  }

  async handlePaymentSucceeded(paymentIntent) {
    try {
      const orderId = paymentIntent.metadata.order_id;
      const userId = paymentIntent.metadata.user_id;

      if (!orderId || !userId) {
        console.error('Missing metadata in payment intent:', paymentIntent.id);
        return;
      }

      // Verificar si ya existe un pago para esta orden
      const existingPayment = await paymentsService.getPaymentByOrderId(
        orderId
      );

      if (existingPayment && existingPayment.status === 'completed') {
        console.log('Payment already processed for order:', orderId);
        return;
      }

      // Actualizar orden con estado completado
      await paymentsService.updateOrderPaymentStatus(orderId, 'completed', {
        payment_intent_id: paymentIntent.id,
      });

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

      // Crear o actualizar registro de pago
      if (existingPayment) {
        await paymentsService.updatePayment(existingPayment.id, {
          status: 'completed',
          external_id: paymentIntent.id,
          metadata: {
            payment_intent_id: paymentIntent.id,
            webhook_processed: true,
          },
        });
      } else {
        await paymentsService.createPayment({
          order_id: orderId,
          user_id: userId,
          amount: (paymentIntent.amount / 100).toFixed(2),
          currency: paymentIntent.currency,
          payment_method: 'stripe',
          external_id: paymentIntent.id,
          status: 'completed',
          metadata: {
            payment_intent_id: paymentIntent.id,
            webhook_processed: true,
          },
        });
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  async handlePaymentFailed(paymentIntent) {
    try {
      const orderId = paymentIntent.metadata.order_id;

      if (!orderId) {
        console.error(
          'Missing order_id in payment intent metadata:',
          paymentIntent.id
        );
        return;
      }

      // Actualizar orden con estado de fallo
      await paymentsService.updateOrderPaymentStatus(orderId, 'failed');

      // Actualizar o crear registro de pago
      const existingPayment = await paymentsService.getPaymentByOrderId(
        orderId
      );

      if (existingPayment) {
        await paymentsService.updatePayment(existingPayment.id, {
          status: 'failed',
          metadata: {
            ...existingPayment.metadata,
            failure_reason: paymentIntent.last_payment_error?.message,
            webhook_processed: true,
          },
        });
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  async handlePaymentCanceled(paymentIntent) {
    try {
      const orderId = paymentIntent.metadata.order_id;

      if (!orderId) {
        console.error(
          'Missing order_id in payment intent metadata:',
          paymentIntent.id
        );
        return;
      }

      // Actualizar orden
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Actualizar registro de pago si existe
      const existingPayment = await paymentsService.getPaymentByOrderId(
        orderId
      );

      if (existingPayment) {
        await paymentsService.updatePayment(existingPayment.id, {
          status: 'cancelled',
          metadata: {
            ...existingPayment.metadata,
            webhook_processed: true,
          },
        });
      }
    } catch (error) {
      console.error('Error handling payment canceled:', error);
    }
  }

  async createRefund(paymentIntentId, amount, reason) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convertir a centavos
        reason: reason || 'requested_by_customer',
      });

      return {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        reason: refund.reason,
      };
    } catch (error) {
      throw new Error(`Error creando reembolso en Stripe: ${error.message}`);
    }
  }

  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      return paymentIntent;
    } catch (error) {
      throw new Error(`Error obteniendo payment intent: ${error.message}`);
    }
  }

  async handleCheckoutSessionCompleted(session) {
    try {
      const orderId = session.metadata.order_id;
      const userId = session.metadata.user_id;

      if (!orderId || !userId) {
        console.error('Missing metadata in checkout session:', session.id);
        return;
      }

      console.log('Processing checkout session completed:', session.id);

      // Verificar si ya existe un pago para esta orden
      const existingPayment = await paymentsService.getPaymentByOrderId(
        orderId
      );

      if (existingPayment && existingPayment.status === 'completed') {
        console.log('Payment already processed for order:', orderId);
        return;
      }

      // Obtener el payment intent de la sesión
      const paymentIntentId = session.payment_intent;
      let paymentAmount = session.amount_total / 100; // Convertir de centavos

      // Actualizar orden con estado completado y información del pago
      await paymentsService.updateOrderPaymentStatus(orderId, 'completed', {
        checkout_session_id: session.id,
        payment_intent_id: paymentIntentId,
      });

      // También actualizar el estado general de la orden a "confirmed"
      // para indicar que el pago fue exitoso
      await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'completed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Crear o actualizar registro de pago
      if (existingPayment) {
        await paymentsService.updatePayment(existingPayment.id, {
          status: 'completed',
          external_id: session.id,
          metadata: {
            checkout_session_id: session.id,
            payment_intent_id: paymentIntentId,
            webhook_processed: true,
          },
        });
      } else {
        await paymentsService.createPayment({
          order_id: orderId,
          user_id: userId,
          amount: paymentAmount.toFixed(2),
          currency: session.currency,
          payment_method: 'stripe_checkout',
          external_id: session.id,
          status: 'completed',
          metadata: {
            checkout_session_id: session.id,
            payment_intent_id: paymentIntentId,
            webhook_processed: true,
          },
        });
      }

      console.log(
        'Checkout session completed successfully for order:',
        orderId
      );
    } catch (error) {
      console.error('Error handling checkout session completed:', error);
    }
  }

  async handleCheckoutSessionFailed(session) {
    try {
      const orderId = session.metadata.order_id;

      if (!orderId) {
        console.error(
          'Missing order_id in checkout session metadata:',
          session.id
        );
        return;
      }

      console.log('Processing checkout session failed:', session.id);

      // Actualizar orden con estado de fallo
      await paymentsService.updateOrderPaymentStatus(orderId, 'failed');

      // Actualizar o crear registro de pago
      const existingPayment = await paymentsService.getPaymentByOrderId(
        orderId
      );

      if (existingPayment) {
        await paymentsService.updatePayment(existingPayment.id, {
          status: 'failed',
          metadata: {
            ...existingPayment.metadata,
            checkout_session_id: session.id,
            failure_reason: 'Checkout session failed',
            webhook_processed: true,
          },
        });
      }

      console.log('Checkout session failure processed for order:', orderId);
    } catch (error) {
      console.error('Error handling checkout session failed:', error);
    }
  }
}

export default new StripeService();
