/**
 * Thermal Logo Processor Service
 * Handles logo upload, processing, and optimization for thermal receipt printing
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PrismaService } from '../../database/prisma.service';

export interface ProcessedLogo {
  id: string;
  originalName: string;
  companyId: string;
  thermal58: {
    width: number;
    height: number;
    data: Buffer;
    base64: string;
    escposCommands: string[];
  };
  thermal80: {
    width: number;
    height: number;
    data: Buffer;
    base64: string;
    escposCommands: string[];
  };
  web: {
    width: number;
    height: number;
    url: string;
  };
  createdAt: Date;
  fileSize: number;
}

export interface LogoUploadOptions {
  maxFileSize: number; // bytes
  allowedFormats: string[];
  thermal58MaxWidth: number;
  thermal58MaxHeight: number;
  thermal80MaxWidth: number;
  thermal80MaxHeight: number;
  webMaxWidth: number;
  webMaxHeight: number;
}

@Injectable()
export class ThermalLogoProcessorService {
  private readonly logger = new Logger(ThermalLogoProcessorService.name);
  private readonly uploadDir: string;
  private readonly options: LogoUploadOptions;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads/logos');
    this.options = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      thermal58MaxWidth: 200, // pixels for 58mm paper
      thermal58MaxHeight: 100,
      thermal80MaxWidth: 300, // pixels for 80mm paper
      thermal80MaxHeight: 150,
      webMaxWidth: 800,
      webMaxHeight: 400
    };

    this.ensureUploadDirectory();
  }

  /**
   * Process uploaded logo for thermal printing
   */
  async processLogo(
    file: Express.Multer.File,
    companyId: string,
    options?: Partial<LogoUploadOptions>
  ): Promise<ProcessedLogo> {
    const processingOptions = { ...this.options, ...options };

    this.logger.log(`Processing logo for company ${companyId}: ${file.originalname}`);

    // Validate file
    this.validateFile(file, processingOptions);

    try {
      // Generate unique ID for this logo
      const logoId = `logo_${companyId}_${Date.now()}`;
      const originalBuffer = file.buffer;

      // Process for different thermal paper sizes
      const thermal58 = await this.processForThermal(originalBuffer, 58, processingOptions);
      const thermal80 = await this.processForThermal(originalBuffer, 80, processingOptions);
      const web = await this.processForWeb(originalBuffer, processingOptions);

      // Save to database
      const processedLogo: ProcessedLogo = {
        id: logoId,
        originalName: file.originalname,
        companyId,
        thermal58,
        thermal80,
        web,
        createdAt: new Date(),
        fileSize: file.size
      };

      // Store in database
      await this.storeLogo(processedLogo);

      this.logger.log(`Logo processed successfully: ${logoId}`);
      return processedLogo;

    } catch (error) {
      this.logger.error('Error processing logo:', error);
      throw new BadRequestException('Failed to process logo: ' + error.message);
    }
  }

  /**
   * Process image for thermal printing (specific paper width)
   */
  private async processForThermal(
    buffer: Buffer,
    paperWidth: 58 | 80,
    options: LogoUploadOptions
  ) {
    const maxWidth = paperWidth === 58 ? options.thermal58MaxWidth : options.thermal80MaxWidth;
    const maxHeight = paperWidth === 58 ? options.thermal58MaxHeight : options.thermal80MaxHeight;

    // Convert to monochrome and resize for thermal printing
    const processedImage = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .greyscale()
      .threshold(128) // Convert to 1-bit monochrome
      .png()
      .toBuffer();

    // Get image metadata
    const metadata = await sharp(processedImage).metadata();

    // Convert to base64 for storage
    const base64 = processedImage.toString('base64');

    // Generate ESC/POS commands for this image
    const escposCommands = await this.generateESCPOSCommands(
      processedImage,
      metadata.width!,
      metadata.height!,
      paperWidth
    );

    return {
      width: metadata.width!,
      height: metadata.height!,
      data: processedImage,
      base64,
      escposCommands
    };
  }

  /**
   * Process image for web display
   */
  private async processForWeb(buffer: Buffer, options: LogoUploadOptions) {
    const processedImage = await sharp(buffer)
      .resize(options.webMaxWidth, options.webMaxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toBuffer();

    const metadata = await sharp(processedImage).metadata();

    // Save web version to disk
    const filename = `web_${Date.now()}.webp`;
    const filepath = path.join(this.uploadDir, filename);
    await fs.writeFile(filepath, processedImage);

    return {
      width: metadata.width!,
      height: metadata.height!,
      url: `/uploads/logos/${filename}`
    };
  }

  /**
   * Generate ESC/POS commands for thermal printing
   */
  private async generateESCPOSCommands(
    imageBuffer: Buffer,
    width: number,
    height: number,
    paperWidth: 58 | 80
  ): Promise<string[]> {
    const commands: string[] = [];

    // Initialize
    commands.push('\\x1B\\x40'); // ESC @ (Initialize)

    // Center the image
    commands.push('\\x1B\\x61\\x01'); // ESC a 1 (Center align)

    // ESC/POS raster image command
    // Convert image to raster data
    const rasterData = await this.convertToRasterBitmap(imageBuffer, width, height);

    // GS v 0 command for raster bitmap
    const widthBytes = Math.ceil(width / 8);
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;

    commands.push(`\\x1D\\x76\\x30\\x00\\x${xL.toString(16).padStart(2, '0')}\\x${xH.toString(16).padStart(2, '0')}\\x${yL.toString(16).padStart(2, '0')}\\x${yH.toString(16).padStart(2, '0')}`);

    // Add raster data
    for (let i = 0; i < rasterData.length; i += 32) {
      const chunk = rasterData.slice(i, i + 32);
      const hexChunk = Array.from(chunk)
        .map(byte => `\\x${byte.toString(16).padStart(2, '0')}`)
        .join('');
      commands.push(hexChunk);
    }

    // Reset alignment
    commands.push('\\x1B\\x61\\x00'); // ESC a 0 (Left align)

    // Add line feed
    commands.push('\\x0A'); // LF

    return commands;
  }

  /**
   * Convert image to 1-bit raster bitmap for thermal printing
   */
  private async convertToRasterBitmap(imageBuffer: Buffer, width: number, height: number): Promise<Uint8Array> {
    // Get raw pixel data
    const { data } = await sharp(imageBuffer)
      .raw()
      .greyscale()
      .toBuffer({ resolveWithObject: true });

    const widthBytes = Math.ceil(width / 8);
    const rasterData = new Uint8Array(widthBytes * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = y * width + x;
        const byteIndex = y * widthBytes + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);

        // Convert pixel to 1-bit (0 = black, 1 = white for thermal printers)
        const pixel = data[pixelIndex];
        const bit = pixel < 128 ? 1 : 0; // Invert for thermal printing

        if (bit) {
          rasterData[byteIndex] |= (1 << bitIndex);
        }
      }
    }

    return rasterData;
  }

  /**
   * Store processed logo in database
   */
  private async storeLogo(logo: ProcessedLogo): Promise<void> {
    await this.prisma.companyLogo.upsert({
      where: { companyId: logo.companyId },
      update: {
        originalName: logo.originalName,
        thermal58Data: logo.thermal58.base64,
        thermal58Width: logo.thermal58.width,
        thermal58Height: logo.thermal58.height,
        thermal58Commands: logo.thermal58.escposCommands,
        thermal80Data: logo.thermal80.base64,
        thermal80Width: logo.thermal80.width,
        thermal80Height: logo.thermal80.height,
        thermal80Commands: logo.thermal80.escposCommands,
        webUrl: logo.web.url,
        webWidth: logo.web.width,
        webHeight: logo.web.height,
        fileSize: logo.fileSize,
        updatedAt: new Date()
      },
      create: {
        id: logo.id,
        companyId: logo.companyId,
        originalName: logo.originalName,
        thermal58Data: logo.thermal58.base64,
        thermal58Width: logo.thermal58.width,
        thermal58Height: logo.thermal58.height,
        thermal58Commands: logo.thermal58.escposCommands,
        thermal80Data: logo.thermal80.base64,
        thermal80Width: logo.thermal80.width,
        thermal80Height: logo.thermal80.height,
        thermal80Commands: logo.thermal80.escposCommands,
        webUrl: logo.web.url,
        webWidth: logo.web.width,
        webHeight: logo.web.height,
        fileSize: logo.fileSize,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get company logo
   */
  async getCompanyLogo(companyId: string): Promise<ProcessedLogo | null> {
    const logoData = await this.prisma.companyLogo.findUnique({
      where: { companyId }
    });

    if (!logoData) return null;

    return {
      id: logoData.id,
      originalName: logoData.originalName,
      companyId: logoData.companyId,
      thermal58: {
        width: logoData.thermal58Width,
        height: logoData.thermal58Height,
        data: Buffer.from(logoData.thermal58Data, 'base64'),
        base64: logoData.thermal58Data,
        escposCommands: logoData.thermal58Commands
      },
      thermal80: {
        width: logoData.thermal80Width,
        height: logoData.thermal80Height,
        data: Buffer.from(logoData.thermal80Data, 'base64'),
        base64: logoData.thermal80Data,
        escposCommands: logoData.thermal80Commands
      },
      web: {
        width: logoData.webWidth,
        height: logoData.webHeight,
        url: logoData.webUrl
      },
      createdAt: logoData.createdAt,
      fileSize: logoData.fileSize
    };
  }

  /**
   * Delete company logo
   */
  async deleteCompanyLogo(companyId: string): Promise<void> {
    const logo = await this.prisma.companyLogo.findUnique({
      where: { companyId }
    });

    if (logo) {
      // Delete web file
      try {
        const webFilePath = path.join(process.cwd(), 'public', logo.webUrl);
        await fs.unlink(webFilePath);
      } catch (error) {
        this.logger.warn('Failed to delete web logo file:', error);
      }

      // Delete from database
      await this.prisma.companyLogo.delete({
        where: { companyId }
      });

      this.logger.log(`Deleted logo for company ${companyId}`);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File, options: LogoUploadOptions): void {
    // Check file size
    if (file.size > options.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${Math.round(options.maxFileSize / 1024 / 1024)}MB`
      );
    }

    // Check file format
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (!options.allowedFormats.includes(ext)) {
      throw new BadRequestException(
        `Invalid file format. Allowed formats: ${options.allowedFormats.join(', ')}`
      );
    }

    // Check if file is actually an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Get logo optimization tips for Jordan market
   */
  getLogoOptimizationTips(): string[] {
    return [
      'Use high contrast designs - thermal printers work best with solid black and white',
      'Avoid gradients and fine details - they may not print clearly on thermal paper',
      'Keep text readable - minimum 12pt font size for thermal receipts',
      'Consider Arabic text compatibility if your logo includes text',
      'Test print your logo on both 58mm and 80mm paper before finalizing',
      'Simple designs print faster and use less paper',
      'Ensure your logo is legible when printed in monochrome',
      'Consider the paper quality used in Jordan - some thermal papers fade quickly'
    ];
  }
}