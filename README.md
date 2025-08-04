# StyleHub Backend - E-commerce API con Patrones de Diseño

## Descripción

Backend robusto y escalable para plataforma de e-commerce, construido con Node.js + Express siguiendo una arquitectura de monolito modular por dominios. **Ahora integrado con 4 patrones de diseño fundamentales** para mayor mantenibilidad, escalabilidad y flexibilidad.

## 🎨 Patrones de Diseño Integrados

### ✅ **Singleton Pattern** - Configuración Global

- Estado único compartido en toda la aplicación
- Configuración centralizada (BD, negocio, pagos)
- Cache global persistente

### ✅ **Factory Method Pattern** - Creación de Productos

- Creación flexible de productos por categoría
- Soporte para: clothing, electronics, books
- Extensible para nuevos tipos
- Cálculo automático de impuestos por tipo

### ✅ **Repository Pattern** - Abstracción de Datos

- Interfaz única para acceso a datos
- Soporte para Supabase y memoria (testing)
- CRUD estandarizado y reutilizable
- Fácil cambio entre fuentes de datos

### ✅ **Strategy Pattern** - Algoritmos Intercambiables

- **Pagos**: Credit Card, PayPal, Bank Transfer
- **Descuentos**: Porcentaje, Monto fijo, BOGO
- Fácil agregar nuevos métodos/estrategias
- Validación automática por estrategia

## Características Principales

### 🏗️ **Arquitectura Modular**

- Organización por dominios de negocio
- Separación clara de responsabilidades
- Fácil mantenimiento y escalabilidad
- Preparado para migración a microservicios

### 🔐 **Seguridad Avanzada**

- Autenticación JWT con Supabase
- Rate limiting por endpoint
- CORS configurado
- Validación robusta con Joi
- Headers de seguridad con Helmet

### 📸 **Gestión de Imágenes**

- Integración completa con Cloudinary
- Upload automático de imágenes de productos
- Transformaciones de imágenes
- Gestión de avatares de usuario
- Eliminación automática de imágenes

### 💳 **Procesamiento de Pagos**

- Integración con Stripe
- Simulación de PayPal
- Webhooks para confirmación
- Manejo de reembolsos
- Historial de transacciones

### 📊 **Logging y Monitoreo**

- Winston para logging estructurado
- Logs por niveles y rotación
- Tracking de requests
- Manejo centralizado de errores

## Instalación

### Prerrequisitos

- Node.js 18+
- Cuenta de Supabase
- Cuenta de Cloudinary
- Cuenta de Stripe (opcional)

### Configuración

1. **Instalar dependencias**

```bash
npm install
```

2. **Configurar variables de entorno**

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
# Servidor
PORT=5000
NODE_ENV=development
LOG_LEVEL=info

# Supabase
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_KEY=tu_supabase_service_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend
FRONTEND_URL=http://localhost:3000
```

3. **Configurar base de datos**

- Ejecutar `database/schema.sql` en Supabase
- Ejecutar `database/seed.sql` para datos de prueba

4. **Iniciar servidor**

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Estructura de Módulos

### **Auth Module** 🔐

- Registro y login
- Recuperación de contraseña
- Verificación de email
- Gestión de tokens

### **Users Module** 👥

- Gestión de perfiles
- Favoritos
- Historial de órdenes
- Administración de usuarios

### **Products Module** 📦

- CRUD de productos
- Gestión de categorías
- Variantes de productos
- Sistema de reseñas
- Búsqueda y filtros

### **Cart Module** 🛒

- Gestión de carrito
- Aplicación de cupones
- Cálculo de totales
- Validación de stock

### **Orders Module** 📋

- Creación de órdenes
- Seguimiento de estado
- Cancelación de órdenes
- Panel administrativo

### **Payments Module** 💳

- Procesamiento con Stripe
- Simulación PayPal
- Webhooks
- Historial de pagos
- Reembolsos

### **Uploads Module** 📸

- Upload de imágenes de productos
- Gestión de avatares
- Transformaciones automáticas
- Eliminación de imágenes

## API Endpoints

### Autenticación

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/change-password
POST   /api/auth/forgot-password
```

### Productos

```
GET    /api/products
GET    /api/products/:id
POST   /api/products (admin)
PUT    /api/products/:id (admin)
DELETE /api/products/:id (admin)
GET    /api/products/categories
```

### Carrito

```
GET    /api/cart
POST   /api/cart/add
PUT    /api/cart/update/:itemId
DELETE /api/cart/remove/:itemId
DELETE /api/cart/clear
```

### Órdenes

```
POST   /api/orders
GET    /api/orders
GET    /api/orders/:orderId
PUT    /api/orders/:orderId/cancel
```

### Pagos

```
POST   /api/payments/create-payment-intent
POST   /api/payments/confirm-payment
POST   /api/payments/simulate-paypal
GET    /api/payments/history
```

### Uploads

```
POST   /api/uploads/products (admin)
POST   /api/uploads/avatar
DELETE /api/uploads/image/:publicId (admin)
```

## Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## Deployment

### Variables de Entorno Producción

```env
NODE_ENV=production
LOG_LEVEL=warn
# ... otras variables
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Monitoreo

### Health Check

```
GET /health
```

### Logs

- Archivos en `/logs/`
- Rotación automática
- Niveles: error, warn, info, debug

### Métricas

- Request duration
- Error rates
- Database queries
- Upload statistics

## Contribución

1. Fork del proyecto
2. Crear feature branch
3. Commit cambios
4. Push a la branch
5. Crear Pull Request

## Licencia

MIT License

---

**Desarrollado por Dana Murillo**  
_Arquitectura de Backend y Procesamiento de Pagos_
