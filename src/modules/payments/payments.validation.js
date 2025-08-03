import Joi from 'joi';

export const validatePaymentIntent = (data) => {
  const schema = Joi.object({
    order_id: Joi.string().uuid().required().messages({
      'string.uuid': 'ID de orden inválido',
      'any.required': 'ID de orden es requerido',
    }),
  });

  return schema.validate(data);
};

export const validateConfirmPayment = (data) => {
  const schema = Joi.object({
    payment_intent_id: Joi.string().required().messages({
      'any.required': 'Payment Intent ID es requerido',
    }),
    order_id: Joi.string().uuid().required().messages({
      'string.uuid': 'ID de orden inválido',
      'any.required': 'ID de orden es requerido',
    }),
  });

  return schema.validate(data);
};

export const validatePayPalPayment = (data) => {
  const schema = Joi.object({
    order_id: Joi.string().uuid().required().messages({
      'string.uuid': 'ID de orden inválido',
      'any.required': 'ID de orden es requerido',
    }),
    paypal_order_id: Joi.string().required().messages({
      'any.required': 'PayPal Order ID es requerido',
    }),
  });

  return schema.validate(data);
};

export const validatePayPalFromCart = (data) => {
  const schema = Joi.object({
    paypal_order_id: Joi.string().required().messages({
      'any.required': 'PayPal Order ID es requerido',
    }),
    shipping_address: Joi.object({
      full_name: Joi.string().required(),
      address_line_1: Joi.string().required(),
      address_line_2: Joi.string().allow(''),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postal_code: Joi.string().required(),
      country: Joi.string().required(),
    }).required(),
    total_amount: Joi.number().positive().required(),
    shipping_cost: Joi.number().min(0).default(0),
    tax_amount: Joi.number().min(0).default(0),
    discount_amount: Joi.number().min(0).default(0),
    notes: Joi.string().allow(''),
  });

  return schema.validate(data);
};

export const validateCheckoutSession = (data) => {
  const schema = Joi.object({
    order_id: Joi.string().uuid().required().messages({
      'string.uuid': 'ID de orden inválido',
      'any.required': 'ID de orden es requerido',
    }),
  });

  return schema.validate(data);
};

export const validateRefund = (data) => {
  const schema = Joi.object({
    amount: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El monto debe ser positivo',
      'number.precision': 'El monto debe tener máximo 2 decimales',
    }),
    reason: Joi.string().min(5).max(200).required().messages({
      'string.min': 'La razón debe tener al menos 5 caracteres',
      'string.max': 'La razón no puede exceder 200 caracteres',
      'any.required': 'La razón del reembolso es requerida',
    }),
  });

  return schema.validate(data);
};
