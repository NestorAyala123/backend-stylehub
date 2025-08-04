// Inicialización de estrategias de validación
import validationContext from './ValidationContext.js';
import JoiValidationStrategy from './JoiValidationStrategy.js';

// Registrar todas las estrategias disponibles
validationContext.registerStrategy('joi', new JoiValidationStrategy());

// Establecer Joi como estrategia por defecto
validationContext.setStrategy('joi');

console.log('✅ Estrategias de validación inicializadas correctamente');

export { validationContext, JoiValidationStrategy };
