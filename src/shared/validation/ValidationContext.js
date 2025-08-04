// Patrón Strategy para validación
class ValidationContext {
  constructor() {
    this.strategy = null;
    this.strategies = new Map();
  }

  registerStrategy(name, strategy) {
    this.strategies.set(name, strategy);
  }

  setStrategy(strategyName) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(
        `Estrategia de validación '${strategyName}' no encontrada`
      );
    }
    this.strategy = strategy;
  }

  validate(data, rules) {
    if (!this.strategy) {
      throw new Error('No se ha configurado una estrategia de validación');
    }

    return this.strategy.validate(data, rules);
  }

  validateOrThrow(data, rules) {
    const result = this.validate(data, rules);

    if (!result.isValid) {
      const error = new Error('Datos de validación inválidos');
      error.validationErrors = result.errors;
      throw error;
    }

    return result.data;
  }
}

// Instancia singleton
const validationContext = new ValidationContext();

export default validationContext;
