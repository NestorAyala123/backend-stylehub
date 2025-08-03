import { supabase, supabaseAdmin } from '../../config/supabase.js';
import cloudinary from '../../config/cloudinary.js';
import logger from '../../config/logger.js';

class UploadsService {
  async uploadTempImages(files, userId) {
    const uploadedImages = [];

    try {
      console.log('🔄 Starting upload process for', files.length, 'files');

      for (const file of files) {
        console.log(
          '📁 Processing file:',
          file.originalname,
          'Size:',
          file.size,
          'Type:',
          file.mimetype
        );

        // Validar tipo de archivo
        if (!file.mimetype.startsWith('image/')) {
          throw new Error(
            `Archivo ${file.originalname} no es una imagen válida`
          );
        }

        // Validar tamaño (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(
            `Archivo ${file.originalname} excede el tamaño máximo de 5MB`
          );
        }

        console.log('☁️ Uploading to Cloudinary:', file.originalname);

        // Subir a Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'styleshop/products',
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
            },
            (error, result) => {
              if (error) {
                console.error(
                  '❌ Cloudinary upload failed for',
                  file.originalname,
                  ':',
                  error.message
                );
                logger.error('Cloudinary upload failed', {
                  error: error.message,
                  filename: file.originalname,
                });
                reject(error);
              } else {
                console.log(
                  '✅ Cloudinary upload successful for',
                  file.originalname,
                  'Public ID:',
                  result.public_id
                );
                resolve(result);
              }
            }
          );
          uploadStream.end(file.buffer);
        });

        console.log('💾 Saving to database...');

        // Guardar en tabla temporal
        const { data: tempImage, error: dbError } = await supabaseAdmin
          .from('temp_images')
          .insert({
            original_name: file.originalname,
            cloudinary_public_id: uploadResult.public_id,
            image_url: uploadResult.secure_url,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_by: userId,
          })
          .select()
          .single();

        if (dbError) {
          console.error(
            '❌ Database insert failed for',
            file.originalname,
            ':',
            dbError.message
          );
          logger.error('Database insert failed for temp image', {
            error: dbError.message,
            publicId: uploadResult.public_id,
          });

          // Limpiar imagen de Cloudinary si falla la BD
          await cloudinary.uploader.destroy(uploadResult.public_id);
          throw new Error('Error guardando imagen en base de datos');
        }

        console.log(
          '✅ Database insert successful for',
          file.originalname,
          'ID:',
          tempImage.id
        );

        uploadedImages.push({
          id: tempImage.id,
          url: tempImage.image_url,
          publicId: tempImage.cloudinary_public_id,
          originalName: tempImage.original_name,
          size: tempImage.file_size,
        });

        logger.info('Image uploaded successfully', {
          imageId: tempImage.id,
          publicId: uploadResult.public_id,
          originalName: file.originalname,
        });
      }

      console.log(
        '🎉 Upload process completed successfully. Total images:',
        uploadedImages.length
      );
      return uploadedImages;
    } catch (error) {
      console.error('❌ Upload process failed:', error.message);

      // Limpiar imágenes ya subidas en caso de error
      for (const image of uploadedImages) {
        try {
          console.log('🧹 Cleaning up image:', image.originalName);
          await cloudinary.uploader.destroy(image.publicId);
          await supabaseAdmin.from('temp_images').delete().eq('id', image.id);
        } catch (cleanupError) {
          logger.error('Cleanup failed for uploaded image', {
            error: cleanupError.message,
            imageId: image.id,
          });
        }
      }
      throw error;
    }
  }

  async uploadDirectToProduct(files, productId, userId) {
    const uploadedImages = [];

    try {
      console.log(
        '🔄 Starting direct upload to product process for',
        files.length,
        'files'
      );
      console.log('📦 Target product ID:', productId);

      // Verificar que el producto existe
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new Error('Producto no encontrado');
      }

      for (const file of files) {
        console.log(
          '📁 Processing file:',
          file.originalname,
          'Size:',
          file.size,
          'Type:',
          file.mimetype
        );

        // Validar tipo de archivo
        if (!file.mimetype.startsWith('image/')) {
          throw new Error(
            `Archivo ${file.originalname} no es una imagen válida`
          );
        }

        // Validar tamaño (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(
            `Archivo ${file.originalname} excede el tamaño máximo de 5MB`
          );
        }

        console.log('☁️ Uploading to Cloudinary:', file.originalname);

        // Subir a Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'styleshop/products',
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
            },
            (error, result) => {
              if (error) {
                console.error(
                  '❌ Cloudinary upload failed for',
                  file.originalname,
                  error
                );
                reject(error);
              } else {
                console.log(
                  '✅ Cloudinary upload successful for',
                  file.originalname,
                  'URL:',
                  result.secure_url
                );
                resolve(result);
              }
            }
          );

          uploadStream.end(file.buffer);
        });

        console.log('💾 Saving to database:', file.originalname);

        // Guardar directamente en product_images
        const { data: productImage, error: dbError } = await supabaseAdmin
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: uploadResult.secure_url,
            cloudinary_public_id: uploadResult.public_id,
            alt_text: file.originalname, // Usar originalname como alt_text
            is_primary: false, // Por defecto no es primary
            sort_order: 0, // Por defecto orden 0
          })
          .select()
          .single();

        if (dbError || !productImage) {
          console.error(
            '❌ Database insert failed for',
            file.originalname,
            dbError
          );

          // Limpiar imagen de Cloudinary si falla la BD
          await cloudinary.uploader.destroy(uploadResult.public_id);
          throw new Error('Error guardando imagen en base de datos');
        }

        console.log(
          '✅ Database insert successful for',
          file.originalname,
          'ID:',
          productImage.id
        );

        uploadedImages.push({
          id: productImage.id,
          url: productImage.image_url,
          publicId: productImage.cloudinary_public_id,
          originalName: file.originalname, // Usar el nombre del archivo original
          size: file.size, // Usar el tamaño del archivo original
        });

        logger.info('Image uploaded directly to product successfully', {
          productId,
          imageId: productImage.id,
          publicId: uploadResult.public_id,
          originalName: file.originalname,
        });
      }

      console.log(
        '🎉 Direct upload to product completed successfully. Total images:',
        uploadedImages.length
      );
      return uploadedImages;
    } catch (error) {
      console.error('❌ Direct upload to product failed:', error.message);

      // Limpiar imágenes ya subidas en caso de error
      for (const image of uploadedImages) {
        try {
          console.log('🧹 Cleaning up image:', image.originalName);
          await cloudinary.uploader.destroy(image.publicId);
          await supabaseAdmin
            .from('product_images')
            .delete()
            .eq('id', image.id);
        } catch (cleanupError) {
          logger.error('Cleanup failed for uploaded image', {
            error: cleanupError.message,
            imageId: image.id,
          });
        }
      }
      throw error;
    }
  }

  async linkImagesToProduct(productId, images, userId) {
    try {
      // Verificar que el producto existe
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new Error('Producto no encontrado');
      }

      let linkedCount = 0;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Si la imagen tiene ID, viene de temp_images
        if (image.id) {
          // Obtener datos de la imagen temporal
          const { data: tempImage, error: tempError } = await supabaseAdmin
            .from('temp_images')
            .select('*')
            .eq('id', image.id)
            .single();

          if (tempError || !tempImage) {
            logger.warn('Temp image not found', { imageId: image.id });
            continue;
          }

          // Crear registro en product_images
          const { error: insertError } = await supabaseAdmin
            .from('product_images')
            .insert({
              product_id: productId,
              image_url: tempImage.image_url,
              cloudinary_public_id: tempImage.cloudinary_public_id,
              alt_text: tempImage.original_name,
              is_primary: i === 0,
              sort_order: i,
            });

          if (insertError) {
            logger.error('Failed to insert product image', {
              error: insertError.message,
              productId,
              imageId: image.id,
            });
            continue;
          }

          // Eliminar de temp_images
          await supabaseAdmin.from('temp_images').delete().eq('id', image.id);

          linkedCount++;
        } else if (image.url && image.publicId) {
          // Imagen directa (para casos especiales)
          const { error: insertError } = await supabaseAdmin
            .from('product_images')
            .insert({
              product_id: productId,
              image_url: image.url,
              cloudinary_public_id: image.publicId,
              alt_text: image.originalName || `Imagen ${i + 1}`,
              is_primary: i === 0,
              sort_order: i,
              created_by: userId,
            });

          if (!insertError) {
            linkedCount++;
          }
        }
      }

      logger.info('Images linked to product', {
        productId,
        linkedCount,
        totalImages: images.length,
      });

      return { linkedCount };
    } catch (error) {
      logger.error('Link images to product failed', {
        error: error.message,
        productId,
        imageCount: images.length,
      });
      throw error;
    }
  }

  async deleteImage(imageId, userId) {
    try {
      // Obtener información de la imagen
      const { data: image, error: getError } = await supabase
        .from('product_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (getError || !image) {
        return false;
      }

      // Eliminar de Cloudinary
      if (image.cloudinary_public_id) {
        try {
          await cloudinary.uploader.destroy(image.cloudinary_public_id);
        } catch (cloudinaryError) {
          logger.warn('Failed to delete image from Cloudinary', {
            error: cloudinaryError.message,
            publicId: image.cloudinary_public_id,
          });
        }
      }

      // Eliminar de base de datos
      const { error: deleteError } = await supabaseAdmin
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (deleteError) {
        throw new Error('Error eliminando imagen de la base de datos');
      }

      logger.info('Image deleted successfully', {
        imageId,
        publicId: image.cloudinary_public_id,
      });

      return true;
    } catch (error) {
      logger.error('Delete image failed', {
        error: error.message,
        imageId,
      });
      throw error;
    }
  }

  async getProductImages(productId) {
    try {
      const { data: images, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) {
        throw new Error('Error obteniendo imágenes del producto');
      }

      return images || [];
    } catch (error) {
      logger.error('Get product images failed', {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  async updateImageOrder(productId, imageOrders, userId) {
    try {
      for (const order of imageOrders) {
        const { error } = await supabaseAdmin
          .from('product_images')
          .update({
            sort_order: order.sortOrder,
            is_primary: order.isPrimary || false,
          })
          .eq('id', order.imageId)
          .eq('product_id', productId);

        if (error) {
          logger.error('Failed to update image order', {
            error: error.message,
            imageId: order.imageId,
            productId,
          });
        }
      }

      logger.info('Image order updated', {
        productId,
        imageCount: imageOrders.length,
      });
    } catch (error) {
      logger.error('Update image order failed', {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  async cleanupTempImages() {
    try {
      // Eliminar imágenes temporales más antiguas de 24 horas
      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: oldImages, error: selectError } = await supabaseAdmin
        .from('temp_images')
        .select('*')
        .lt('created_at', oneDayAgo);

      if (selectError) {
        throw new Error('Error obteniendo imágenes temporales antiguas');
      }

      if (!oldImages || oldImages.length === 0) {
        return { cleanedCount: 0 };
      }

      // Eliminar de Cloudinary
      for (const image of oldImages) {
        try {
          await cloudinary.uploader.destroy(image.cloudinary_public_id);
        } catch (cloudinaryError) {
          logger.warn('Failed to delete temp image from Cloudinary', {
            error: cloudinaryError.message,
            publicId: image.cloudinary_public_id,
          });
        }
      }

      // Eliminar de base de datos
      const { error: deleteError } = await supabaseAdmin
        .from('temp_images')
        .delete()
        .lt('created_at', oneDayAgo);

      if (deleteError) {
        throw new Error(
          'Error eliminando imágenes temporales de la base de datos'
        );
      }

      logger.info('Temp images cleaned up', {
        cleanedCount: oldImages.length,
      });

      return { cleanedCount: oldImages.length };
    } catch (error) {
      logger.error('Cleanup temp images failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

export default new UploadsService();
