/**
 * Strategy Pattern Implementation
 * Define una familia de algoritmos, los encapsula y los hace intercambiables
 */

// Interfaz base para las estrategias
class Strategy {
  execute(...args) {
    throw new Error(
      'execute method must be implemented by concrete strategies'
    );
  }

  getName() {
    return this.constructor.name;
  }

  getDescription() {
    throw new Error(
      'getDescription method must be implemented by concrete strategies'
    );
  }
}

// =================== ESTRATEGIAS DE PAGO ===================

class PaymentStrategy extends Strategy {
  constructor() {
    super();
  }

  async processPayment(amount, paymentData) {
    throw new Error(
      'processPayment method must be implemented by payment strategies'
    );
  }

  validatePaymentData(paymentData) {
    throw new Error(
      'validatePaymentData method must be implemented by payment strategies'
    );
  }
}

class CreditCardStrategy extends PaymentStrategy {
  getDescription() {
    return 'Credit Card Payment Processing';
  }

  validatePaymentData(paymentData) {
    const { cardNumber, expiryDate, cvv, holderName } = paymentData;

    if (!cardNumber || !expiryDate || !cvv || !holderName) {
      throw new Error('Missing required credit card information');
    }

    // Validación básica del número de tarjeta (algoritmo de Luhn simplificado)
    if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
      throw new Error('Invalid credit card number format');
    }

    return true;
  }

  async processPayment(amount, paymentData) {
    this.validatePaymentData(paymentData);

    // Simulación del procesamiento de pago con tarjeta de crédito
    const transactionId = `cc_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Simular tiempo de procesamiento
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simular posible fallo (5% de probabilidad)
    if (Math.random() < 0.05) {
      throw new Error('Credit card payment declined');
    }

    return {
      success: true,
      transactionId,
      method: 'credit_card',
      amount,
      processedAt: new Date().toISOString(),
      details: {
        lastFourDigits: paymentData.cardNumber.slice(-4),
        cardType: this.detectCardType(paymentData.cardNumber),
      },
    };
  }

  detectCardType(cardNumber) {
    const firstDigit = cardNumber.charAt(0);
    switch (firstDigit) {
      case '4':
        return 'visa';
      case '5':
        return 'mastercard';
      case '3':
        return 'amex';
      default:
        return 'unknown';
    }
  }
}

class PayPalStrategy extends PaymentStrategy {
  getDescription() {
    return 'PayPal Payment Processing';
  }

  validatePaymentData(paymentData) {
    const { email, password } = paymentData;

    if (!email || !password) {
      throw new Error('Missing PayPal credentials');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    return true;
  }

  async processPayment(amount, paymentData) {
    this.validatePaymentData(paymentData);

    const transactionId = `pp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Simular tiempo de procesamiento
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simular posible fallo (3% de probabilidad)
    if (Math.random() < 0.03) {
      throw new Error('PayPal payment failed');
    }

    return {
      success: true,
      transactionId,
      method: 'paypal',
      amount,
      processedAt: new Date().toISOString(),
      details: {
        paypalEmail: paymentData.email,
      },
    };
  }
}

class BankTransferStrategy extends PaymentStrategy {
  getDescription() {
    return 'Bank Transfer Payment Processing';
  }

  validatePaymentData(paymentData) {
    const { accountNumber, routingNumber, accountHolder } = paymentData;

    if (!accountNumber || !routingNumber || !accountHolder) {
      throw new Error('Missing bank transfer information');
    }

    return true;
  }

  async processPayment(amount, paymentData) {
    this.validatePaymentData(paymentData);

    const transactionId = `bt_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Simular tiempo de procesamiento más largo para transferencias bancarias
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      success: true,
      transactionId,
      method: 'bank_transfer',
      amount,
      processedAt: new Date().toISOString(),
      details: {
        accountLastFour: paymentData.accountNumber.slice(-4),
        routingNumber: paymentData.routingNumber,
        status: 'pending_verification',
      },
    };
  }
}

// =================== ESTRATEGIAS DE DESCUENTO ===================

class DiscountStrategy extends Strategy {
  calculateDiscount(originalPrice, discountData) {
    throw new Error(
      'calculateDiscount method must be implemented by discount strategies'
    );
  }

  isApplicable(criteria) {
    throw new Error(
      'isApplicable method must be implemented by discount strategies'
    );
  }
}

class PercentageDiscountStrategy extends DiscountStrategy {
  constructor(percentage) {
    super();
    this.percentage = percentage;
  }

  getDescription() {
    return `${this.percentage}% Percentage Discount`;
  }

  calculateDiscount(originalPrice, discountData = {}) {
    const discountAmount = (originalPrice * this.percentage) / 100;
    return {
      originalPrice,
      discountPercentage: this.percentage,
      discountAmount,
      finalPrice: originalPrice - discountAmount,
      discountType: 'percentage',
    };
  }

  isApplicable(criteria) {
    // Criterios para descuento porcentual (por ejemplo, compra mínima)
    const { totalAmount = 0, isFirstTime = false } = criteria;
    return totalAmount >= 50 || isFirstTime;
  }
}

class FixedAmountDiscountStrategy extends DiscountStrategy {
  constructor(amount) {
    super();
    this.amount = amount;
  }

  getDescription() {
    return `$${this.amount} Fixed Amount Discount`;
  }

  calculateDiscount(originalPrice, discountData = {}) {
    const discountAmount = Math.min(this.amount, originalPrice);
    return {
      originalPrice,
      discountAmount,
      finalPrice: originalPrice - discountAmount,
      discountType: 'fixed_amount',
    };
  }

  isApplicable(criteria) {
    const { totalAmount = 0 } = criteria;
    return totalAmount >= this.amount * 2; // Aplicable si el total es al menos el doble del descuento
  }
}

class BuyOneGetOneStrategy extends DiscountStrategy {
  getDescription() {
    return 'Buy One Get One Free (BOGO)';
  }

  calculateDiscount(originalPrice, discountData = {}) {
    const { quantity = 1 } = discountData;
    const freeItems = Math.floor(quantity / 2);
    const discountAmount = freeItems * originalPrice;

    return {
      originalPrice,
      quantity,
      freeItems,
      discountAmount,
      finalPrice: quantity * originalPrice - discountAmount,
      discountType: 'bogo',
    };
  }

  isApplicable(criteria) {
    const { quantity = 1, productCategory = '' } = criteria;
    return (
      quantity >= 2 && ['clothing', 'accessories'].includes(productCategory)
    );
  }
}

// =================== CONTEXTO DE ESTRATEGIAS ===================

class StrategyContext {
  constructor() {
    this.strategies = new Map();
    this.currentStrategy = null;
  }

  registerStrategy(name, strategy) {
    if (!(strategy instanceof Strategy)) {
      throw new Error('Strategy must extend Strategy class');
    }
    this.strategies.set(name, strategy);
  }

  setStrategy(name) {
    if (!this.strategies.has(name)) {
      throw new Error(`Strategy "${name}" not found`);
    }
    this.currentStrategy = this.strategies.get(name);
    return this;
  }

  executeStrategy(...args) {
    if (!this.currentStrategy) {
      throw new Error('No strategy selected');
    }
    return this.currentStrategy.execute(...args);
  }

  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }

  getStrategyInfo(name) {
    if (!this.strategies.has(name)) {
      return null;
    }
    const strategy = this.strategies.get(name);
    return {
      name: strategy.getName(),
      description: strategy.getDescription(),
    };
  }
}

// =================== GESTORES ESPECÍFICOS ===================

class PaymentManager extends StrategyContext {
  constructor() {
    super();
    this.setupDefaultStrategies();
  }

  setupDefaultStrategies() {
    this.registerStrategy('credit_card', new CreditCardStrategy());
    this.registerStrategy('paypal', new PayPalStrategy());
    this.registerStrategy('bank_transfer', new BankTransferStrategy());
  }

  async processPayment(method, amount, paymentData) {
    this.setStrategy(method);
    return this.currentStrategy.processPayment(amount, paymentData);
  }

  getSupportedMethods() {
    return this.getAvailableStrategies();
  }
}

class DiscountManager extends StrategyContext {
  constructor() {
    super();
    this.setupDefaultStrategies();
  }

  setupDefaultStrategies() {
    this.registerStrategy('percentage_10', new PercentageDiscountStrategy(10));
    this.registerStrategy('percentage_20', new PercentageDiscountStrategy(20));
    this.registerStrategy('fixed_5', new FixedAmountDiscountStrategy(5));
    this.registerStrategy('fixed_10', new FixedAmountDiscountStrategy(10));
    this.registerStrategy('bogo', new BuyOneGetOneStrategy());
  }

  calculateDiscount(strategyName, originalPrice, discountData, criteria) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Discount strategy "${strategyName}" not found`);
    }

    if (!strategy.isApplicable(criteria)) {
      return {
        applicable: false,
        reason: 'Discount criteria not met',
      };
    }

    return {
      applicable: true,
      ...strategy.calculateDiscount(originalPrice, discountData),
    };
  }

  getApplicableDiscounts(criteria) {
    const applicable = [];
    for (const [name, strategy] of this.strategies) {
      if (strategy.isApplicable(criteria)) {
        applicable.push({
          name,
          description: strategy.getDescription(),
        });
      }
    }
    return applicable;
  }
}

export {
  Strategy,
  PaymentStrategy,
  CreditCardStrategy,
  PayPalStrategy,
  BankTransferStrategy,
  DiscountStrategy,
  PercentageDiscountStrategy,
  FixedAmountDiscountStrategy,
  BuyOneGetOneStrategy,
  StrategyContext,
  PaymentManager,
  DiscountManager,
};
