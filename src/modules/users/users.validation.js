import Joi from 'joi';

export const validateUpdateProfile = (data) => {
  const schema = Joi.object({
    full_name: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
    }),

    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Formato de teléfono inválido',
      }),

    address: Joi.object({
      street: Joi.string().min(5).max(200).optional(),
      city: Joi.string().min(2).max(100).optional(),
      state: Joi.string().min(2).max(100).optional(),
      postal_code: Joi.string().min(3).max(20).optional(),
      country: Joi.string().min(2).max(100).optional(),
    }).optional(),

    avatar_url: Joi.string().uri().optional().messages({
      'string.uri': 'URL de avatar inválida',
    }),
  });

  return schema.validate(data);
};

export const validateUpdateUser = (data) => {
  const schema = Joi.object({
    full_name: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
    }),

    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Formato de teléfono inválido',
      }),

    address: Joi.object({
      street: Joi.string().min(5).max(200).optional(),
      city: Joi.string().min(2).max(100).optional(),
      state: Joi.string().min(2).max(100).optional(),
      postal_code: Joi.string().min(3).max(20).optional(),
      country: Joi.string().min(2).max(100).optional(),
    }).optional(),

    is_admin: Joi.boolean().optional().messages({
      'boolean.base': 'El campo admin debe ser verdadero o falso',
    }),

    is_active: Joi.boolean().optional().messages({
      'boolean.base': 'El campo activo debe ser verdadero o falso',
    }),
  });

  return schema.validate(data);
};

export const validateUserQuery = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional().messages({
      'number.integer': 'La página debe ser un número entero',
      'number.min': 'La página mínima es 1',
    }),

    limit: Joi.number().integer().min(1).max(100).optional().messages({
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite mínimo es 1',
      'number.max': 'El límite máximo es 100',
    }),

    search: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'La búsqueda debe tener al menos 2 caracteres',
      'string.max': 'La búsqueda no puede exceder 100 caracteres',
    }),

    status: Joi.string().valid('true', 'false').optional().messages({
      'any.only': 'El estado debe ser "true" o "false"',
    }),
  });

  return schema.validate(data);
};
