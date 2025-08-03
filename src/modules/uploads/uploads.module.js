import express from 'express';
import multer from 'multer';
import uploadsController from './uploads.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import logger from '../../config/logger.js';

const router = express.Router();

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 10, // máximo 10 archivos
  },
  fileFilter: (req, file, cb) => {
    // Validar tipo de archivo
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  },
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Archivo demasiado grande. Máximo 5MB por archivo.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Demasiados archivos. Máximo 10 archivos.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Campo de archivo inesperado.',
      });
    }
  }

  if (err.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      error: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP).',
    });
  }

  logger.error('Multer error', { error: err.message });
  next(err);
};

// Rutas
router.post(
  '/products/:productId/upload-images',
  authenticateToken,
  upload.array('images', 10),
  handleMulterError,
  uploadsController.uploadDirectToProduct
);

router.post(
  '/temp-images',
  upload.array('images', 10),
  handleMulterError,
  uploadsController.uploadTempImages
);

router.post(
  '/products/:productId/link-images',
  authenticateToken,
  uploadsController.linkImagesToProduct
);

router.delete(
  '/images/:imageId',
  authenticateToken,
  uploadsController.deleteImage
);

router.get('/products/:productId/images', uploadsController.getProductImages);

router.put(
  '/products/:productId/images/order',
  authenticateToken,
  uploadsController.updateImageOrder
);

router.post(
  '/cleanup-temp',
  authenticateToken,
  uploadsController.cleanupTempImages
);

export default router;
