import Joi from 'joi';

export const validateRegister = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido',
    }),
    password: Joi.string()
      .min(6)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'string.pattern.base':
          'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
        'any.required': 'La contraseña es requerida',
      }),
    full_name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre completo es requerido',
    }),
    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Formato de teléfono inválido',
      }),
  });

  return schema.validate(data);
};

export const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido',
    }),
    password: Joi.string().required().messages({
      'any.required': 'La contraseña es requerida',
    }),
  });

  return schema.validate(data);
};

export const validateChangePassword = (data) => {
  const schema = Joi.object({
    current_password: Joi.string().required().messages({
      'any.required': 'La contraseña actual es requerida',
    }),
    new_password: Joi.string()
      .min(6)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'La nueva contraseña debe tener al menos 6 caracteres',
        'string.pattern.base':
          'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número',
        'any.required': 'La nueva contraseña es requerida',
      }),
    confirm_password: Joi.string()
      .valid(Joi.ref('new_password'))
      .required()
      .messages({
        'any.only': 'Las contraseñas no coinciden',
        'any.required': 'La confirmación de contraseña es requerida',
      }),
  });

  return schema.validate(data);
};

export const validateForgotPassword = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido',
    }),
  });

  return schema.validate(data);
};
