import uploadsService from './uploads.service.js';
import logger from '../../config/logger.js';

class UploadsController {
  async uploadTempImages(req, res) {
    try {
      console.log('📤 Upload temp images request received');
      console.log('📤 Files count:', req.files?.length || 0);
      console.log('📤 User ID:', req.user?.id || 'No user (anonymous upload)');

      if (!req.files || req.files.length === 0) {
        console.log('❌ No files provided');
        return res.status(400).json({
          error: 'No se han proporcionado archivos',
        });
      }

      // Para subidas temporales, el userId es opcional (puede ser null)
      const userId = req.user?.id || null;
      console.log(
        '📤 Processing',
        req.files.length,
        'files for user',
        userId || 'anonymous'
      );

      const uploadedImages = await uploadsService.uploadTempImages(
        req.files,
        userId
      );

      console.log(
        '✅ Upload successful, uploaded',
        uploadedImages.length,
        'images'
      );

      logger.info('Temp images uploaded successfully', {
        userId: userId || 'anonymous',
        imageCount: uploadedImages.length,
      });

      res.status(200).json({
        message: 'Imágenes subidas correctamente',
        images: uploadedImages,
      });
    } catch (error) {
      console.error('❌ Upload temp images failed:', error.message);

      logger.error('Upload temporary images failed', {
        error: error.message,
        userId: req.user?.id || 'anonymous',
        fileCount: req.files?.length || 0,
      });

      res.status(500).json({
        error: error.message || 'Error subiendo imágenes',
      });
    }
  }

  async uploadDirectToProduct(req, res) {
    try {
      const { productId } = req.params;

      console.log('📤 Upload direct to product request received');
      console.log('📤 Product ID:', productId);
      console.log('📤 Files count:', req.files?.length || 0);
      console.log('📤 User ID:', req.user?.id);

      if (!req.files || req.files.length === 0) {
        console.log('❌ No files provided');
        return res.status(400).json({
          error: 'No se han proporcionado archivos',
        });
      }

      const userId = req.user.id;
      console.log(
        '📤 Processing',
        req.files.length,
        'files for product',
        productId
      );

      // Subir directamente al producto
      const uploadedImages = await uploadsService.uploadDirectToProduct(
        req.files,
        productId,
        userId
      );

      console.log(
        '✅ Upload successful, uploaded',
        uploadedImages.length,
        'images to product',
        productId
      );

      logger.info('Images uploaded directly to product successfully', {
        productId,
        userId,
        imageCount: uploadedImages.length,
      });

      res.status(200).json({
        message: 'Imágenes subidas al producto correctamente',
        images: uploadedImages,
      });
    } catch (error) {
      console.error('❌ Upload direct to product failed:', error.message);

      logger.error('Upload direct to product failed', {
        error: error.message,
        productId: req.params.productId,
        userId: req.user?.id,
        fileCount: req.files?.length || 0,
      });

      res.status(500).json({
        error: error.message || 'Error subiendo imágenes al producto',
      });
    }
  }

  async linkImagesToProduct(req, res) {
    try {
      const { productId } = req.params;
      const { images } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          error: 'Se requiere un array de imágenes',
        });
      }

      const userId = req.user.id;
      const result = await uploadsService.linkImagesToProduct(
        productId,
        images,
        userId
      );

      logger.info('Images linked to product successfully', {
        productId,
        userId,
        linkedCount: result.linkedCount,
      });

      res.status(200).json({
        message: 'Imágenes vinculadas al producto correctamente',
        linkedCount: result.linkedCount,
      });
    } catch (error) {
      logger.error('Link images to product failed', {
        error: error.message,
        productId: req.params.productId,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: error.message || 'Error vinculando imágenes al producto',
      });
    }
  }

  async deleteImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;

      const success = await uploadsService.deleteImage(imageId, userId);

      if (!success) {
        return res.status(404).json({
          error: 'Imagen no encontrada',
        });
      }

      logger.info('Image deleted successfully', {
        imageId,
        userId,
      });

      res.status(200).json({
        message: 'Imagen eliminada correctamente',
      });
    } catch (error) {
      logger.error('Delete image failed', {
        error: error.message,
        imageId: req.params.imageId,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: error.message || 'Error eliminando imagen',
      });
    }
  }

  async getProductImages(req, res) {
    try {
      const { productId } = req.params;
      const images = await uploadsService.getProductImages(productId);

      res.status(200).json({
        images,
      });
    } catch (error) {
      logger.error('Get product images failed', {
        error: error.message,
        productId: req.params.productId,
      });

      res.status(500).json({
        error: error.message || 'Error obteniendo imágenes del producto',
      });
    }
  }

  async updateImageOrder(req, res) {
    try {
      const { productId } = req.params;
      const { imageOrders } = req.body;

      if (!imageOrders || !Array.isArray(imageOrders)) {
        return res.status(400).json({
          error: 'Se requiere un array de órdenes de imágenes',
        });
      }

      const userId = req.user.id;
      await uploadsService.updateImageOrder(productId, imageOrders, userId);

      logger.info('Image order updated successfully', {
        productId,
        userId,
        imageCount: imageOrders.length,
      });

      res.status(200).json({
        message: 'Orden de imágenes actualizado correctamente',
      });
    } catch (error) {
      logger.error('Update image order failed', {
        error: error.message,
        productId: req.params.productId,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: error.message || 'Error actualizando orden de imágenes',
      });
    }
  }

  async cleanupTempImages(req, res) {
    try {
      const result = await uploadsService.cleanupTempImages();

      logger.info('Temp images cleanup completed', {
        cleanedCount: result.cleanedCount,
      });

      res.status(200).json({
        message: 'Limpieza de imágenes temporales completada',
        cleanedCount: result.cleanedCount,
      });
    } catch (error) {
      logger.error('Cleanup temp images failed', {
        error: error.message,
      });

      res.status(500).json({
        error: error.message || 'Error en limpieza de imágenes temporales',
      });
    }
  }
}

export default new UploadsController();
