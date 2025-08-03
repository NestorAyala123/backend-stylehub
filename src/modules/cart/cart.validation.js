import Joi from 'joi';

export const validateAddToCart = (data) => {
  const schema = Joi.object({
    product_id: Joi.string().uuid().required().messages({
      'string.uuid': 'ID de producto inválido',
      'any.required': 'ID de producto es requerido',
    }),
    quantity: Joi.number().integer().min(1).max(99).required().messages({
      'number.min': 'La cantidad debe ser mayor a 0',
      'number.max': 'La cantidad máxima es 99',
      'any.required': 'La cantidad es requerida',
    }),
    variant_id: Joi.string().uuid().optional().messages({
      'string.uuid': 'ID de variante inválido',
    }),
  });

  return schema.validate(data);
};

export const validateUpdateCart = (data) => {
  const schema = Joi.object({
    quantity: Joi.number().integer().min(1).max(99).required().messages({
      'number.min': 'La cantidad debe ser mayor a 0',
      'number.max': 'La cantidad máxima es 99',
      'any.required': 'La cantidad es requerida',
    }),
  });

  return schema.validate(data);
};

export const validateCoupon = (data) => {
  const schema = Joi.object({
    code: Joi.string().min(3).max(50).uppercase().required().messages({
      'string.min': 'El código debe tener al menos 3 caracteres',
      'string.max': 'El código no puede exceder 50 caracteres',
      'any.required': 'El código de cupón es requerido',
    }),
  });

  return schema.validate(data);
};
