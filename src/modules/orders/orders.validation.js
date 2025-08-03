import Joi from 'joi';

export const validateCreateOrder = (data) => {
  const schema = Joi.object({
    shipping_address: Joi.object({
      street: Joi.string().min(5).max(200).required().messages({
        'string.min': 'La dirección debe tener al menos 5 caracteres',
        'string.max': 'La dirección no puede exceder 200 caracteres',
        'any.required': 'La dirección es requerida',
      }),
      city: Joi.string().min(2).max(100).required().messages({
        'string.min': 'La ciudad debe tener al menos 2 caracteres',
        'string.max': 'La ciudad no puede exceder 100 caracteres',
        'any.required': 'La ciudad es requerida',
      }),
      state: Joi.string().min(2).max(100).optional().messages({
        'string.min': 'El estado debe tener al menos 2 caracteres',
        'string.max': 'El estado no puede exceder 100 caracteres',
      }),
      postal_code: Joi.string().min(3).max(20).required().messages({
        'string.min': 'El código postal debe tener al menos 3 caracteres',
        'string.max': 'El código postal no puede exceder 20 caracteres',
        'any.required': 'El código postal es requerido',
      }),
      country: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .default('México')
        .messages({
          'string.min': 'El país debe tener al menos 2 caracteres',
          'string.max': 'El país no puede exceder 100 caracteres',
        }),
      phone: Joi.string()
        .pattern(/^[+]?[\d\s\-\(\)]+$/)
        .optional()
        .messages({
          'string.pattern.base': 'Formato de teléfono inválido',
        }),
      recipient_name: Joi.string().min(2).max(100).optional().messages({
        'string.min':
          'El nombre del destinatario debe tener al menos 2 caracteres',
        'string.max':
          'El nombre del destinatario no puede exceder 100 caracteres',
      }),
      full_name: Joi.string().min(2).max(100).optional().messages({
        'string.min': 'El nombre completo debe tener al menos 2 caracteres',
        'string.max': 'El nombre completo no puede exceder 100 caracteres',
      }),
    })
      .required()
      .messages({
        'any.required': 'La dirección de envío es requerida',
      }),

    payment_method: Joi.string()
      .valid('card', 'credit_card', 'paypal', 'transfer', 'cash_on_delivery')
      .required()
      .messages({
        'any.only': 'Método de pago inválido',
        'any.required': 'El método de pago es requerido',
      }),

    billing_address: Joi.object({
      street: Joi.string().min(5).max(200).required(),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().min(2).max(100).optional(),
      postal_code: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).optional().default('México'),
      phone: Joi.string()
        .pattern(/^[+]?[\d\s\-\(\)]+$/)
        .optional(),
      recipient_name: Joi.string().min(2).max(100).optional(),
      full_name: Joi.string().min(2).max(100).optional(),
    }).optional(),

    notes: Joi.string().max(500).optional().allow('').messages({
      'string.max': 'Las notas no pueden exceder 500 caracteres',
    }),

    coupon_code: Joi.string().min(3).max(50).uppercase().optional().messages({
      'string.min': 'El código de cupón debe tener al menos 3 caracteres',
      'string.max': 'El código de cupón no puede exceder 50 caracteres',
    }),
  });

  return schema.validate(data);
};

export const validateUpdateOrderStatus = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
        'payment_failed'
      )
      .required()
      .messages({
        'any.only': 'Estado de orden inválido',
        'any.required': 'El estado es requerido',
      }),

    notes: Joi.string().max(500).optional().allow('').messages({
      'string.max': 'Las notas no pueden exceder 500 caracteres',
    }),
  });

  return schema.validate(data);
};

export const validateTracking = (data) => {
  const schema = Joi.object({
    tracking_number: Joi.string().min(5).max(100).required().messages({
      'string.min': 'El número de seguimiento debe tener al menos 5 caracteres',
      'string.max': 'El número de seguimiento no puede exceder 100 caracteres',
      'any.required': 'El número de seguimiento es requerido',
    }),

    carrier: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'El transportista debe tener al menos 2 caracteres',
      'string.max': 'El transportista no puede exceder 100 caracteres',
    }),

    notes: Joi.string().max(500).optional().allow('').messages({
      'string.max': 'Las notas no pueden exceder 500 caracteres',
    }),
  });

  return schema.validate(data);
};

export const validateOrderQuery = (data) => {
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

    status: Joi.string()
      .valid(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
        'payment_failed'
      )
      .optional()
      .messages({
        'any.only': 'Estado de orden inválido',
      }),

    search: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'La búsqueda debe tener al menos 2 caracteres',
      'string.max': 'La búsqueda no puede exceder 100 caracteres',
    }),
  });

  return schema.validate(data);
};
