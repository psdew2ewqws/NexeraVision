/**
 * Thermal Printer Controller for Jordan Market
 * Handles printer detection, configuration, and logo management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

import { ThermalPrinterDetectionService, ThermalPrinter } from '../services/thermal-printer-detection.service';
import { ThermalLogoProcessorService, ProcessedLogo } from '../services/thermal-logo-processor.service';
import { PrinterConfigurationService, PrinterConfiguration } from '../services/printer-configuration.service';

interface User {
  id: string;
  companyId: string;
  branchId?: string;
  role: string;
}

@ApiTags('Thermal Printer Management')
@Controller('api/v1/thermal-printer')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ThermalPrinterController {
  constructor(
    private readonly printerDetectionService: ThermalPrinterDetectionService,
    private readonly logoProcessorService: ThermalLogoProcessorService,
    private readonly printerConfigService: PrinterConfigurationService
  ) {}

  /**
   * Detect all connected thermal printers
   */
  @Get('detect')
  @ApiOperation({ summary: 'Detect connected thermal printers' })
  @ApiResponse({ status: 200, description: 'List of detected printers' })
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async detectPrinters(): Promise<{
    success: boolean;
    printers: ThermalPrinter[];
    recommendations: any;
  }> {
    const printers = await this.printerDetectionService.detectPrinters();
    const recommendations = this.printerDetectionService.getJordanPrinterRecommendations();

    return {
      success: true,
      printers,
      recommendations
    };
  }

  /**
   * Get printer recommendations for Jordan market
   */
  @Get('recommendations')
  @ApiOperation({ summary: 'Get printer recommendations for Jordan market' })
  @ApiResponse({ status: 200, description: 'Printer recommendations' })
  async getPrinterRecommendations(): Promise<any> {
    return this.printerDetectionService.getJordanPrinterRecommendations();
  }

  /**
   * Upload and process company logo
   */
  @Post('logo/upload')
  @ApiOperation({ summary: 'Upload and process company logo for thermal printing' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Logo processed successfully' })
  @UseInterceptors(FileInterceptor('logo'))
  @Roles('super_admin', 'company_owner')
  async uploadLogo(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|gif|bmp|webp)$/ })
        ]
      })
    )
    file: Express.Multer.File
  ): Promise<{
    success: boolean;
    logo: ProcessedLogo;
    optimizationTips: string[];
  }> {
    const logo = await this.logoProcessorService.processLogo(file, user.companyId);
    const tips = this.logoProcessorService.getLogoOptimizationTips();

    return {
      success: true,
      logo,
      optimizationTips: tips
    };
  }

  /**
   * Get company logo
   */
  @Get('logo')
  @ApiOperation({ summary: 'Get company logo' })
  @ApiResponse({ status: 200, description: 'Company logo data' })
  async getCompanyLogo(@CurrentUser() user: User): Promise<{
    success: boolean;
    logo: ProcessedLogo | null;
  }> {
    const logo = await this.logoProcessorService.getCompanyLogo(user.companyId);

    return {
      success: true,
      logo
    };
  }

  /**
   * Delete company logo
   */
  @Delete('logo')
  @ApiOperation({ summary: 'Delete company logo' })
  @ApiResponse({ status: 200, description: 'Logo deleted successfully' })
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'company_owner')
  async deleteCompanyLogo(@CurrentUser() user: User): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.logoProcessorService.deleteCompanyLogo(user.companyId);

    return {
      success: true,
      message: 'Logo deleted successfully'
    };
  }

  /**
   * Create or update printer configuration
   */
  @Post('configuration')
  @ApiOperation({ summary: 'Create or update printer configuration' })
  @ApiResponse({ status: 201, description: 'Configuration saved successfully' })
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async savePrinterConfiguration(
    @CurrentUser() user: User,
    @Body() configData: {
      printerInfo: ThermalPrinter;
      paperSettings?: any;
      printSettings?: any;
      jordanSettings?: any;
      templates?: any;
      isDefault?: boolean;
    }
  ): Promise<{
    success: boolean;
    configuration: PrinterConfiguration;
    guidelines: string[];
  }> {
    // Create default configuration if not provided
    let config = this.printerConfigService.createDefaultJordanConfiguration(
      user.companyId,
      configData.printerInfo,
      user.branchId
    );

    // Apply user customizations
    if (configData.paperSettings) config.paperSettings = { ...config.paperSettings, ...configData.paperSettings };
    if (configData.printSettings) config.printSettings = { ...config.printSettings, ...configData.printSettings };
    if (configData.jordanSettings) config.jordanSettings = { ...config.jordanSettings, ...configData.jordanSettings };
    if (configData.templates) config.templates = { ...config.templates, ...configData.templates };
    if (configData.isDefault !== undefined) config.isDefault = configData.isDefault;

    const savedConfig = await this.printerConfigService.savePrinterConfiguration(config);
    const guidelines = this.printerConfigService.getJordanPrintingGuidelines();

    return {
      success: true,
      configuration: savedConfig,
      guidelines
    };
  }

  /**
   * Get printer configuration
   */
  @Get('configuration/:printerId')
  @ApiOperation({ summary: 'Get printer configuration' })
  @ApiResponse({ status: 200, description: 'Printer configuration' })
  async getPrinterConfiguration(
    @CurrentUser() user: User,
    @Param('printerId') printerId: string
  ): Promise<{
    success: boolean;
    configuration: PrinterConfiguration | null;
  }> {
    const configuration = await this.printerConfigService.getPrinterConfiguration(
      user.companyId,
      printerId
    );

    return {
      success: true,
      configuration
    };
  }

  /**
   * Get all printer configurations for company
   */
  @Get('configurations')
  @ApiOperation({ summary: 'Get all printer configurations for company' })
  @ApiResponse({ status: 200, description: 'List of printer configurations' })
  async getCompanyPrinterConfigurations(
    @CurrentUser() user: User
  ): Promise<{
    success: boolean;
    configurations: PrinterConfiguration[];
  }> {
    const configurations = await this.printerConfigService.getCompanyPrinterConfigurations(
      user.companyId
    );

    return {
      success: true,
      configurations
    };
  }

  /**
   * Get receipt templates for Jordan market
   */
  @Get('templates/jordan')
  @ApiOperation({ summary: 'Get receipt templates for Jordan market' })
  @ApiResponse({ status: 200, description: 'Jordan receipt templates' })
  async getJordanReceiptTemplates(
    @Query('paperWidth') paperWidth: string = '80'
  ): Promise<{
    success: boolean;
    templates: any;
  }> {
    const width = paperWidth === '58' ? 58 : 80;
    const templates = this.printerConfigService.getJordanReceiptTemplates(width);

    return {
      success: true,
      templates
    };
  }

  /**
   * Get printing guidelines for Jordan
   */
  @Get('guidelines/jordan')
  @ApiOperation({ summary: 'Get printing guidelines for Jordan market' })
  @ApiResponse({ status: 200, description: 'Jordan printing guidelines' })
  async getJordanPrintingGuidelines(): Promise<{
    success: boolean;
    guidelines: string[];
  }> {
    const guidelines = this.printerConfigService.getJordanPrintingGuidelines();

    return {
      success: true,
      guidelines
    };
  }

  /**
   * Test printer configuration
   */
  @Post('test/:printerId')
  @ApiOperation({ summary: 'Test printer configuration with sample receipt' })
  @ApiResponse({ status: 200, description: 'Test print sent successfully' })
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async testPrinterConfiguration(
    @CurrentUser() user: User,
    @Param('printerId') printerId: string,
    @Body() testData?: {
      includeArabic?: boolean;
      includeLogo?: boolean;
      receiptType?: 'restaurant' | 'cafe' | 'fastFood' | 'delivery';
    }
  ): Promise<{
    success: boolean;
    message: string;
    testData: any;
  }> {
    const configuration = await this.printerConfigService.getPrinterConfiguration(
      user.companyId,
      printerId
    );

    if (!configuration) {
      throw new Error('Printer configuration not found');
    }

    // Generate test receipt data
    const testReceiptData = this.generateTestReceiptData(
      configuration,
      testData?.receiptType || 'restaurant',
      testData?.includeArabic || true,
      testData?.includeLogo || true
    );

    // Here you would send the test data to the actual printer
    // For now, we'll return the formatted test data

    return {
      success: true,
      message: 'Test print data generated successfully',
      testData: testReceiptData
    };
  }

  /**
   * Generate test receipt data
   */
  private generateTestReceiptData(
    config: PrinterConfiguration,
    receiptType: string,
    includeArabic: boolean,
    includeLogo: boolean
  ): any {
    const testData = {
      company: {
        name: 'مطعم الأردن الأصيل | Jordan Authentic Restaurant',
        nameEn: 'Jordan Authentic Restaurant',
        nameAr: 'مطعم الأردن الأصيل',
        address: 'شارع الرينبو، عمان، الأردن | Rainbow Street, Amman, Jordan',
        phone: '+962 6 123 4567',
        email: 'info@jordanrestaurant.com',
        taxNumber: 'TAX123456789'
      },
      receipt: {
        number: 'RCP-20250917-001',
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        cashier: 'أحمد محمد | Ahmad Mohammad',
        table: receiptType === 'restaurant' ? '15' : undefined
      },
      items: [
        {
          name: includeArabic ? 'منسف أردني | Jordanian Mansaf' : 'Jordanian Mansaf',
          quantity: 1,
          price: 12.500, // JOD
          modifiers: includeArabic ? ['إضافي لبن | Extra Yogurt'] : ['Extra Yogurt']
        },
        {
          name: includeArabic ? 'كنافة نابلسية | Nabulsi Kunafa' : 'Nabulsi Kunafa',
          quantity: 2,
          price: 3.750,
          modifiers: []
        },
        {
          name: includeArabic ? 'شاي أردني | Jordanian Tea' : 'Jordanian Tea',
          quantity: 3,
          price: 0.500,
          modifiers: []
        }
      ],
      totals: {
        subtotal: 17.750,
        taxRate: config.jordanSettings.taxRate,
        taxAmount: 2.840, // 16% VAT
        deliveryFee: receiptType === 'delivery' ? 2.000 : 0,
        total: receiptType === 'delivery' ? 22.590 : 20.590
      },
      customer: receiptType === 'delivery' ? {
        name: includeArabic ? 'فاطمة أحمد | Fatima Ahmad' : 'Fatima Ahmad',
        phone: '+962 79 123 4567',
        address: includeArabic ? 'جبل عمان، عمان | Jabal Amman, Amman' : 'Jabal Amman, Amman'
      } : undefined,
      footer: {
        thankYou: includeArabic ? 'شكراً لزيارتكم | Thank you for your visit!' : 'Thank you for your visit!',
        website: 'www.jordanrestaurant.com',
        social: '@JordanRestaurant'
      }
    };

    return testData;
  }
}