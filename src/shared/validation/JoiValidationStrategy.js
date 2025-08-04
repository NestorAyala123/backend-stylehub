import Joi from 'joi';
import validationContext from './ValidationContext.js';

class JoiValidationStrategy {
  validate(data, rules) {
    try {
      // Crear schema de Joi a partir de las reglas
      const schema = Joi.object(rules);

      // Validar los datos
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        return {
          isValid: false,
          errors,
          data: null,
        };
      }

      return {
        isValid: true,
        errors: null,
        data: value,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'general',
            message: `Error de validación: ${error.message}`,
          },
        ],
        data: null,
      };
    }
  }

  static createCommonRules() {
    return {
      email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
          'string.email': 'Debe ser un email válido',
          'any.required': 'El email es requerido',
          'string.empty': 'El email no puede estar vacío',
        }),

      password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
          'string.min': 'La contraseña debe tener al menos 8 caracteres',
          'string.max': 'La contraseña no puede tener más de 128 caracteres',
          'string.pattern.base':
            'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
          'any.required': 'La contraseña es requerida',
          'string.empty': 'La contraseña no puede estar vacía',
        }),

      fullName: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .required()
        .messages({
          'string.min': 'El nombre debe tener al menos 2 caracteres',
          'string.max': 'El nombre no puede tener más de 100 caracteres',
          'string.pattern.base':
            'El nombre solo puede contener letras y espacios',
          'any.required': 'El nombre completo es requerido',
          'string.empty': 'El nombre completo no puede estar vacío',
        }),

      phone: Joi.string()
        .pattern(/^[+]?[\d\s\-\(\)]{8,20}$/)
        .allow('', null)
        .messages({
          'string.pattern.base': 'El teléfono debe ser un número válido',
        }),

      id: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.guid': 'Debe ser un ID válido',
        'any.required': 'El ID es requerido',
      }),

      rol: Joi.string()
        .valid('cliente', 'admin', 'moderador', 'vendedor')
        .default('cliente')
        .messages({
          'any.only': 'El rol debe ser: cliente, admin, moderador o vendedor',
        }),

      code: Joi.string()
        .length(6)
        .pattern(/^\d{6}$/)
        .required()
        .messages({
          'string.length': 'El código debe tener exactamente 6 dígitos',
          'string.pattern.base': 'El código debe contener solo números',
          'any.required': 'El código es requerido',
        }),

      // Reglas para objetos comunes
      pagination: {
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().valid('asc', 'desc').default('desc'),
        sortBy: Joi.string().default('created_at'),
      },

      // Reglas para fechas
      date: Joi.date().iso().messages({
        'date.base': 'Debe ser una fecha válida',
        'date.format': 'La fecha debe estar en formato ISO',
      }),

      // Reglas para URLs
      url: Joi.string().uri().messages({
        'string.uri': 'Debe ser una URL válida',
      }),

      // Reglas para números
      positiveNumber: Joi.number().positive().messages({
        'number.positive': 'Debe ser un número positivo',
      }),

      // Reglas para booleanos
      boolean: Joi.boolean().messages({
        'boolean.base': 'Debe ser verdadero o falso',
      }),
    };
  }

  static createPasswordStrengthRules() {
    return {
      weak: Joi.string().min(6).required(),

      medium: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])/)
        .required(),

      strong: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required(),

      veryStrong: Joi.string()
        .min(10)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .required(),
    };
  }
}

// Registrar la estrategia Joi en el contexto
validationContext.registerStrategy('joi', new JoiValidationStrategy());

export default JoiValidationStrategy;
