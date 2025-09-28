import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as sharp from 'sharp';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly uploadPath = join(process.cwd(), 'uploads', 'products');
  private readonly maxWidth = 1280;
  private readonly maxHeight = 720;
  private readonly targetSizeKB = 1024; // 1MB target size
  private readonly quality = 85; // Initial quality for JPEG

  constructor(private readonly prisma: PrismaService) {}

  async uploadProductImage(file: Express.Multer.File, productId: string): Promise<{ url: string; filename: string; size: number }> {
    // Validate input
    if (!file || !file.buffer) {
      throw new Error('Invalid file: no buffer provided');
    }

    this.logger.debug(`Processing image: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`);

    // Ensure upload directory exists
    if (!existsSync(this.uploadPath)) {
      await mkdir(this.uploadPath, { recursive: true });
    }

    // Process and optimize image
    const processedImage = await this.processImage(file.buffer);
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${productId}_${timestamp}.webp`; // Always save as WebP for best compression
    const filepath = join(this.uploadPath, filename);

    // Write processed file
    await writeFile(filepath, processedImage.buffer);

    // Save image metadata to database
    const imageRecord = await this.prisma.productImage.create({
      data: {
        filename,
        originalName: file.originalname,
        url: `/uploads/products/${filename}`,
        size: processedImage.size,
        width: processedImage.width,
        height: processedImage.height,
        mimeType: 'image/webp',
        productId: (productId && productId !== 'temp') ? productId : null
      }
    });

    return {
      url: imageRecord.url,
      filename: imageRecord.filename,
      size: processedImage.size
    };
  }

  async uploadMultipleImages(files: Express.Multer.File[], productId: string): Promise<Array<{ url: string; filename: string; size: number }>> {
    const uploadPromises = files.map((file, index) => 
      this.uploadProductImage(file, `${productId}_${index}`)
    );
    
    return Promise.all(uploadPromises);
  }

  private async processImage(buffer: Buffer): Promise<{ buffer: Buffer; size: number; width: number; height: number }> {
    let quality = this.quality;
    let processedBuffer: Buffer;
    let metadata: sharp.Metadata;

    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Invalid image buffer: empty or null buffer');
    }

    try {
      // First pass: resize and convert to WebP
      let image = sharp(buffer)
        .resize({
          width: this.maxWidth,
          height: this.maxHeight,
          fit: 'inside', // Maintain aspect ratio
          withoutEnlargement: true // Don't upscale smaller images
        })
        .webp({ quality });

      processedBuffer = await image.toBuffer();
      metadata = await sharp(processedBuffer).metadata();

      // If still too large, reduce quality iteratively
      while (processedBuffer.length > this.targetSizeKB * 1024 && quality > 30) {
        quality -= 10;
        image = sharp(buffer)
          .resize({
            width: this.maxWidth,
            height: this.maxHeight,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality });
        
        processedBuffer = await image.toBuffer();
        metadata = await sharp(processedBuffer).metadata();
      }

      // If still too large, reduce dimensions
      if (processedBuffer.length > this.targetSizeKB * 1024) {
        const scaleFactor = Math.sqrt((this.targetSizeKB * 1024) / processedBuffer.length);
        const newWidth = Math.floor((metadata.width || this.maxWidth) * scaleFactor);
        const newHeight = Math.floor((metadata.height || this.maxHeight) * scaleFactor);

        image = sharp(buffer)
          .resize({
            width: newWidth,
            height: newHeight,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 });
        
        processedBuffer = await image.toBuffer();
        metadata = await sharp(processedBuffer).metadata();
      }

      return {
        buffer: processedBuffer,
        size: processedBuffer.length,
        width: metadata.width || this.maxWidth,
        height: metadata.height || this.maxHeight
      };
    } catch (error) {
      console.error('Sharp processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // Validate image file (more flexible since we process everything)
  validateImageFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    const maxSize = 50 * 1024 * 1024; // 50MB - we can handle large files since we process them

    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Invalid file type. Only common image formats are allowed.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 50MB.' };
    }

    return { valid: true };
  }

  // Get image upload configuration for frontend
  getUploadConfig() {
    return {
      maxFiles: 10,
      maxFileSize: 50 * 1024 * 1024, // 50MB input, will be processed to ~1MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      uploadEndpoint: '/api/v1/menu/products/upload-images',
      processedSize: {
        maxWidth: this.maxWidth,
        maxHeight: this.maxHeight,
        targetSizeKB: this.targetSizeKB
      }
    };
  }

  // Get processed images for a product
  async getProductImages(productId: string): Promise<any[]> {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Delete image by ID
  async deleteImage(imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId }
    });

    if (image) {
      // Delete file from filesystem
      const filepath = join(this.uploadPath, image.filename);
      try {
        await require('fs/promises').unlink(filepath);
      } catch (error) {
        // File might not exist, continue with database deletion
      }

      // Delete from database
      await this.prisma.productImage.delete({
        where: { id: imageId }
      });
    }
  }

  // Update orphaned images with productId after product creation
  async updateImageProductId(imageUrls: string[], productId: string): Promise<void> {
    const filenames = imageUrls.map(url => url.split('/').pop()).filter(Boolean);
    
    // Update ProductImage records
    await this.prisma.productImage.updateMany({
      where: {
        filename: { in: filenames },
        productId: null
      },
      data: {
        productId
      }
    });

    // Update MenuProduct with primary image URL and images array
    if (imageUrls.length > 0) {
      const primaryImage = imageUrls[0]; // First image as primary
      
      await this.prisma.menuProduct.update({
        where: { id: productId },
        data: {
          image: primaryImage,
          images: imageUrls
        }
      });
      
      this.logger.debug(`Updated product ${productId} with primary image: ${primaryImage}`);
    }
  }

  // Bulk upload with automatic optimization
  async bulkUploadAndOptimize(files: Express.Multer.File[], productId?: string): Promise<Array<{ url: string; filename: string; size: number; originalSize: number }>> {
    const results = [];
    
    for (const file of files) {
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        throw new Error(`Invalid file ${file.originalname}: ${validation.error}`);
      }

      const originalSize = file.size;
      const result = await this.uploadProductImage(file, productId || 'temp');
      
      results.push({
        ...result,
        originalSize
      });
    }

    return results;
  }
}