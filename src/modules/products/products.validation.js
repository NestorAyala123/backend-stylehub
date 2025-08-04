import Joi from 'joi';

export const validateProduct = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'any.required': 'El nombre del producto es requerido',
    }),

    description: Joi.string().max(2000).optional().messages({
      'string.max': 'La descripción no puede exceder 2000 caracteres',
    }),

    price: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'El precio debe ser positivo',
      'number.precision': 'El precio debe tener máximo 2 decimales',
      'any.required': 'El precio es requerido',
    }),

    category_id: Joi.string().uuid().required().messages({
      'string.uuid': 'ID de categoría inválido',
      'any.required': 'La categoría es requerida',
    }),

    stock_quantity: Joi.number().integer().min(0).required().messages({
      'number.integer': 'La cantidad debe ser un número entero',
      'number.min': 'La cantidad no puede ser negativa',
      'any.required': 'La cantidad en stock es requerida',
    }),

    sku: Joi.string().max(100).optional().messages({
      'string.max': 'El SKU no puede exceder 100 caracteres',
    }),

    weight: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El peso debe ser positivo',
      'number.precision': 'El peso debe tener máximo 2 decimales',
    }),

    dimensions: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional(),
    }).optional(),

    featured: Joi.boolean().optional().messages({
      'boolean.base': 'El campo destacado debe ser verdadero o falso',
    }),

    tags: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().max(50)).max(10),
        Joi.string().max(500)
      )
      .optional()
      .messages({
        'array.max': 'Máximo 10 etiquetas permitidas',
        'string.max': 'Las etiquetas no pueden exceder 500 caracteres',
      }),

    brand: Joi.string().max(100).optional().allow('').messages({
      'string.max': 'La marca no puede exceder 100 caracteres',
    }),

    original_price: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El precio original debe ser positivo',
      'number.precision': 'El precio original debe tener máximo 2 decimales',
    }),

    rating: Joi.number().min(0).max(5).precision(1).optional().messages({
      'number.min': 'El rating mínimo es 0',
      'number.max': 'El rating máximo es 5',
      'number.precision': 'El rating debe tener máximo 1 decimal',
    }),

    discount_percentage: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .optional()
      .messages({
        'number.integer': 'El descuento debe ser un número entero',
        'number.min': 'El descuento no puede ser negativo',
        'number.max': 'El descuento no puede exceder 100%',
      }),

    is_active: Joi.boolean().optional().messages({
      'boolean.base': 'El campo activo debe ser verdadero o falso',
    }),
  });

  return schema.validate(data);
};

export const validateProductUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(255).optional().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
    }),

    description: Joi.string().max(2000).optional().allow('').messages({
      'string.max': 'La descripción no puede exceder 2000 caracteres',
    }),

    price: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El precio debe ser positivo',
      'number.precision': 'El precio debe tener máximo 2 decimales',
    }),

    category_id: Joi.string().uuid().optional().messages({
      'string.uuid': 'ID de categoría inválido',
    }),

    stock_quantity: Joi.number().integer().min(0).optional().messages({
      'number.integer': 'La cantidad debe ser un número entero',
      'number.min': 'La cantidad no puede ser negativa',
    }),

    sku: Joi.string().max(100).optional().allow('').messages({
      'string.max': 'El SKU no puede exceder 100 caracteres',
    }),

    weight: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El peso debe ser positivo',
      'number.precision': 'El peso debe tener máximo 2 decimales',
    }),

    dimensions: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional(),
    }).optional(),

    featured: Joi.boolean().optional().messages({
      'boolean.base': 'El campo destacado debe ser verdadero o falso',
    }),

    tags: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().max(50)).max(10),
        Joi.string().max(500)
      )
      .optional()
      .messages({
        'array.max': 'Máximo 10 etiquetas permitidas',
        'string.max': 'Las etiquetas no pueden exceder 500 caracteres',
      }),

    brand: Joi.string().max(100).optional().allow('').messages({
      'string.max': 'La marca no puede exceder 100 caracteres',
    }),

    original_price: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El precio original debe ser positivo',
      'number.precision': 'El precio original debe tener máximo 2 decimales',
    }),

    rating: Joi.number().min(0).max(5).precision(1).optional().messages({
      'number.min': 'El rating mínimo es 0',
      'number.max': 'El rating máximo es 5',
      'number.precision': 'El rating debe tener máximo 1 decimal',
    }),

    discount_percentage: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .optional()
      .messages({
        'number.integer': 'El descuento debe ser un número entero',
        'number.min': 'El descuento no puede ser negativo',
        'number.max': 'El descuento no puede exceder 100%',
      }),

    is_active: Joi.boolean().optional().messages({
      'boolean.base': 'El campo activo debe ser verdadero o falso',
    }),
  });

  return schema.validate(data);
};

export const validateCategory = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre de la categoría es requerido',
    }),

    description: Joi.string().max(500).optional().allow('').messages({
      'string.max': 'La descripción no puede exceder 500 caracteres',
    }),

    image_url: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'URL de imagen inválida',
    }),

    is_active: Joi.boolean().optional().messages({
      'boolean.base': 'El campo activo debe ser verdadero o falso',
    }),
  });

  return schema.validate(data);
};

export const validateReview = (data) => {
  const schema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.integer': 'La calificación debe ser un número entero',
      'number.min': 'La calificación mínima es 1',
      'number.max': 'La calificación máxima es 5',
      'any.required': 'La calificación es requerida',
    }),

    title: Joi.string().min(5).max(255).optional().messages({
      'string.min': 'El título debe tener al menos 5 caracteres',
      'string.max': 'El título no puede exceder 255 caracteres',
    }),

    comment: Joi.string().min(10).max(1000).required().messages({
      'string.min': 'El comentario debe tener al menos 10 caracteres',
      'string.max': 'El comentario no puede exceder 1000 caracteres',
      'any.required': 'El comentario es requerido',
    }),

    order_id: Joi.string().uuid().optional().messages({
      'string.uuid': 'ID de orden inválido',
    }),
  });

  return schema.validate(data);
};

export const validateProductQuery = (data) => {
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

    category: Joi.string().max(100).optional().messages({
      'string.max': 'El nombre de categoría no puede exceder 100 caracteres',
    }),

    search: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'La búsqueda debe tener al menos 2 caracteres',
      'string.max': 'La búsqueda no puede exceder 100 caracteres',
    }),

    // Soporte para ambos formatos de precios
    minPrice: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El precio mínimo debe ser positivo',
      'number.precision': 'El precio debe tener máximo 2 decimales',
    }),

    maxPrice: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El precio máximo debe ser positivo',
      'number.precision': 'El precio debe tener máximo 2 decimales',
    }),

    min_price: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El precio mínimo debe ser positivo',
      'number.precision': 'El precio debe tener máximo 2 decimales',
    }),

    max_price: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'El precio máximo debe ser positivo',
      'number.precision': 'El precio debe tener máximo 2 decimales',
    }),

    // Soporte para ambos formatos de ordenamiento
    sortBy: Joi.string()
      .valid('name', 'price', 'created_at', 'featured')
      .optional()
      .messages({
        'any.only': 'Campo de ordenamiento inválido',
      }),

    sort_by: Joi.string()
      .valid(
        'featured',
        'name',
        'price-asc',
        'price-desc',
        'newest',
        'oldest',
        'created_at',
        'price'
      )
      .optional()
      .messages({
        'any.only': 'Campo de ordenamiento inválido',
      }),

    sortOrder: Joi.string().valid('asc', 'desc').optional().messages({
      'any.only': 'Orden de clasificación inválido',
    }),

    featured: Joi.boolean().optional().messages({
      'boolean.base': 'El campo destacado debe ser verdadero o falso',
    }),

    brand: Joi.string().max(100).optional().messages({
      'string.max': 'La marca no puede exceder 100 caracteres',
    }),
  });

  return schema.validate(data);
};

export const validateVariant = (data) => {
  const schema = Joi.object({
    size: Joi.string().max(50).optional().messages({
      'string.max': 'La talla no puede exceder 50 caracteres',
    }),

    color: Joi.string().max(50).optional().messages({
      'string.max': 'El color no puede exceder 50 caracteres',
    }),

    additional_price: Joi.number().precision(2).optional().default(0).messages({
      'number.precision': 'El precio adicional debe tener máximo 2 decimales',
    }),

    stock_quantity: Joi.number().integer().min(0).required().messages({
      'number.integer': 'La cantidad debe ser un número entero',
      'number.min': 'La cantidad no puede ser negativa',
      'any.required': 'La cantidad en stock es requerida',
    }),

    sku: Joi.string().max(100).optional().messages({
      'string.max': 'El SKU no puede exceder 100 caracteres',
    }),

    is_active: Joi.boolean().optional().default(true).messages({
      'boolean.base': 'El campo activo debe ser verdadero o falso',
    }),
  });

  return schema.validate(data);
};
