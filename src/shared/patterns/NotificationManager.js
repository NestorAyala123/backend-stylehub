/**
 * 🔔 Strategy Pattern para Notificaciones
 *
 * Diferentes estrategias para enviar notificaciones:
 * - Email
 * - SMS
 * - Push Notifications
 * - Webhook
 */

class NotificationStrategy {
  async send(data) {
    throw new Error('send method must be implemented');
  }

  async validate(data) {
    return true; // Implementar validación específica en cada estrategia
  }
}

/**
 * 📧 Estrategia de Email (Simulada)
 */
class EmailNotificationStrategy extends NotificationStrategy {
  constructor(emailConfig = {}) {
    super();
    this.config = {
      service: emailConfig.service || 'nodemailer',
      from: emailConfig.from || 'noreply@stylehub.com',
      templates: emailConfig.templates || {},
      ...emailConfig,
    };
  }

  async validate(data) {
    if (!data.email) {
      throw new Error('Email is required for email notification');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    return true;
  }

  async send(data) {
    await this.validate(data);

    // Simular envío de email (en producción usarías nodemailer, SendGrid, etc.)
    console.log(`📧 [EMAIL NOTIFICATION] To: ${data.email}`);
    console.log(
      `📧 [EMAIL NOTIFICATION] Subject: ${data.subject || 'Notification'}`
    );
    console.log(
      `📧 [EMAIL NOTIFICATION] Content: ${data.content || data.message}`
    );

    // Simular delay de envío
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      messageId: `email_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      provider: 'email',
      timestamp: new Date().toISOString(),
      recipient: data.email,
    };
  }

  /**
   * Enviar verificación de email
   */
  async sendEmailVerification(data) {
    const { email, code, userName, expiresInMinutes } = data;

    const content = `
      ¡Hola ${userName}!
      
      Tu código de verificación es: ${code}
      
      Este código expira en ${expiresInMinutes} minutos.
      
      Si no solicitaste esta verificación, puedes ignorar este mensaje.
      
      ¡Gracias!
      Equipo StyleHub
    `;

    return await this.send({
      email,
      subject: '🔐 Código de verificación - StyleHub',
      content,
      template: 'email_verification',
      data: { code, userName, expiresInMinutes },
    });
  }

  /**
   * Enviar código de recuperación de contraseña
   */
  async sendPasswordReset(data) {
    const { email, code, userName, expiresInMinutes } = data;

    const content = `
      ¡Hola ${userName}!
      
      Recibimos una solicitud para restablecer tu contraseña.
      
      Tu código de recuperación es: ${code}
      
      Este código expira en ${expiresInMinutes} minutos.
      
      Si no solicitaste este cambio, puedes ignorar este mensaje.
      
      ¡Saludos!
      Equipo StyleHub
    `;

    return await this.send({
      email,
      subject: '🔑 Recuperación de contraseña - StyleHub',
      content,
      template: 'password_reset',
      data: { code, userName, expiresInMinutes },
    });
  }
}

/**
 * 📱 Estrategia de SMS (Simulada)
 */
class SMSNotificationStrategy extends NotificationStrategy {
  constructor(smsConfig = {}) {
    super();
    this.config = {
      service: smsConfig.service || 'twilio',
      from: smsConfig.from || '+1234567890',
      ...smsConfig,
    };
  }

  async validate(data) {
    if (!data.phone) {
      throw new Error('Phone number is required for SMS notification');
    }
    return true;
  }

  async send(data) {
    await this.validate(data);

    console.log(`📱 [SMS NOTIFICATION] To: ${data.phone}`);
    console.log(`📱 [SMS NOTIFICATION] Message: ${data.message}`);

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'sms',
      timestamp: new Date().toISOString(),
      recipient: data.phone,
    };
  }
}

/**
 * 🔔 Estrategia de Push Notifications (Simulada)
 */
class PushNotificationStrategy extends NotificationStrategy {
  constructor(pushConfig = {}) {
    super();
    this.config = {
      service: pushConfig.service || 'firebase',
      ...pushConfig,
    };
  }

  async validate(data) {
    if (!data.deviceToken) {
      throw new Error('Device token is required for push notification');
    }
    return true;
  }

  async send(data) {
    await this.validate(data);

    console.log(`🔔 [PUSH NOTIFICATION] To: ${data.deviceToken}`);
    console.log(`🔔 [PUSH NOTIFICATION] Title: ${data.title}`);
    console.log(`🔔 [PUSH NOTIFICATION] Body: ${data.body}`);

    await new Promise((resolve) => setTimeout(resolve, 30));

    return {
      success: true,
      messageId: `push_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      provider: 'push',
      timestamp: new Date().toISOString(),
      recipient: data.deviceToken,
    };
  }
}

/**
 * 🌐 Estrategia de Webhook (Simulada)
 */
class WebhookNotificationStrategy extends NotificationStrategy {
  constructor(webhookConfig = {}) {
    super();
    this.config = {
      url: webhookConfig.url,
      method: webhookConfig.method || 'POST',
      headers: webhookConfig.headers || { 'Content-Type': 'application/json' },
      ...webhookConfig,
    };
  }

  async validate(data) {
    if (!this.config.url) {
      throw new Error('Webhook URL is required');
    }
    return true;
  }

  async send(data) {
    await this.validate(data);

    console.log(`🌐 [WEBHOOK NOTIFICATION] URL: ${this.config.url}`);
    console.log(`🌐 [WEBHOOK NOTIFICATION] Method: ${this.config.method}`);
    console.log(`🌐 [WEBHOOK NOTIFICATION] Payload:`, data);

    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: true,
      messageId: `webhook_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      provider: 'webhook',
      timestamp: new Date().toISOString(),
      url: this.config.url,
    };
  }
}

/**
 * 🎯 Manager de Notificaciones
 */
class NotificationManager {
  constructor() {
    this.strategies = new Map();
    this.defaultStrategy = 'email';

    // Registrar estrategias por defecto
    this.registerStrategy('email', new EmailNotificationStrategy());
    this.registerStrategy('sms', new SMSNotificationStrategy());
    this.registerStrategy('push', new PushNotificationStrategy());
    this.registerStrategy('webhook', new WebhookNotificationStrategy());
  }

  /**
   * Registrar nueva estrategia
   */
  registerStrategy(name, strategy) {
    if (!(strategy instanceof NotificationStrategy)) {
      throw new Error('Strategy must extend NotificationStrategy');
    }
    this.strategies.set(name, strategy);
    return this;
  }

  /**
   * Obtener estrategia
   */
  getStrategy(name) {
    return this.strategies.get(name);
  }

  /**
   * Ejecutar notificación con estrategia específica
   */
  async execute(strategyName, data) {
    const strategy = this.getStrategy(strategyName);
    if (!strategy) {
      throw new Error(`Notification strategy '${strategyName}' not found`);
    }

    try {
      const result = await strategy.send(data);

      console.log(`✅ Notification sent successfully via ${strategyName}:`, {
        messageId: result.messageId,
        provider: result.provider,
        recipient: result.recipient || result.url,
      });

      return result;
    } catch (error) {
      console.error(
        `❌ Notification failed via ${strategyName}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Enviar con múltiples estrategias
   */
  async executeMultiple(strategies, data) {
    const promises = strategies.map((strategyName) =>
      this.execute(strategyName, data).catch((error) => ({
        strategy: strategyName,
        success: false,
        error: error.message,
      }))
    );

    const results = await Promise.all(promises);

    return {
      success: results.some((r) => r.success !== false),
      results: results,
    };
  }

  /**
   * Métodos de conveniencia para tipos específicos
   */
  async sendEmailVerification(data) {
    const emailStrategy = this.getStrategy('email');
    if (
      emailStrategy &&
      typeof emailStrategy.sendEmailVerification === 'function'
    ) {
      return await emailStrategy.sendEmailVerification(data);
    }
    return await this.execute('email', {
      ...data,
      subject: '🔐 Código de verificación',
      content: `Tu código de verificación es: ${data.code}`,
    });
  }

  async sendPasswordReset(data) {
    const emailStrategy = this.getStrategy('email');
    if (
      emailStrategy &&
      typeof emailStrategy.sendPasswordReset === 'function'
    ) {
      return await emailStrategy.sendPasswordReset(data);
    }
    return await this.execute('email', {
      ...data,
      subject: '🔑 Recuperación de contraseña',
      content: `Tu código de recuperación es: ${data.code}`,
    });
  }

  /**
   * Listar estrategias disponibles
   */
  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Configurar estrategia por defecto
   */
  setDefaultStrategy(strategyName) {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Strategy '${strategyName}' not registered`);
    }
    this.defaultStrategy = strategyName;
    return this;
  }
}

export {
  NotificationStrategy,
  EmailNotificationStrategy,
  SMSNotificationStrategy,
  PushNotificationStrategy,
  WebhookNotificationStrategy,
  NotificationManager,
};

// Exportar instancia singleton
export default new NotificationManager();
