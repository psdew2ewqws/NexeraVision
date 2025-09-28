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
  Request,
  HttpStatus,
  HttpCode,
  BadRequestException
} from '@nestjs/common';
import axios from 'axios';
import { TemplateBuilderService } from '../services/template-builder.service';
import { EscposRendererService } from '../services/escpos-renderer.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CompanyGuard } from '../../../common/guards/company.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFilterDto,
  CreateComponentDto,
  UpdateComponentDto,
  GeneratePreviewDto,
  RenderTemplateDto
} from '../dto';

@Controller('template-builder')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class TemplateBuilderController {
  constructor(
    private readonly templateBuilderService: TemplateBuilderService,
    private readonly escposRendererService: EscposRendererService
  ) {}

  // Get all templates with filtering and pagination
  @Get('templates')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getTemplates(@Query() filters: TemplateFilterDto, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.getTemplates(filters, userCompanyId, req.user.role);
  }

  // Get single template
  @Get('templates/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getTemplate(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.getTemplate(id, userCompanyId, req.user.role);
  }

  // Create new template
  @Post('templates')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto, @Request() req) {
    const userCompanyId = req.user.companyId;
    return this.templateBuilderService.createTemplate(createTemplateDto, userCompanyId, req.user.id);
  }

  // Update template
  @Put('templates/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.updateTemplate(id, updateTemplateDto, userCompanyId, req.user.role, req.user.id);
  }

  // Delete template
  @Delete('templates/:id')
  @Roles('super_admin', 'company_owner')
  async deleteTemplate(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.deleteTemplate(id, userCompanyId, req.user.role);
  }

  // Duplicate template
  @Post('templates/:id/duplicate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async duplicateTemplate(
    @Param('id') id: string,
    @Body('name') name: string,
    @Request() req
  ) {
    if (!name) {
      throw new BadRequestException('Template name is required');
    }

    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.duplicateTemplate(id, name, userCompanyId, req.user.role, req.user.id);
  }

  // Get template categories
  @Get('categories')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getCategories() {
    return this.templateBuilderService.getCategories();
  }

  // Component management
  @Get('templates/:templateId/components')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getComponents(@Param('templateId') templateId: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.getComponents(templateId, userCompanyId, req.user.role);
  }

  @Post('components')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async createComponent(@Body() createComponentDto: CreateComponentDto, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.createComponent(createComponentDto, userCompanyId, req.user.role, req.user.id);
  }

  @Put('components/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updateComponent(
    @Param('id') id: string,
    @Body() updateComponentDto: UpdateComponentDto,
    @Request() req
  ) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.updateComponent(id, updateComponentDto, userCompanyId, req.user.role, req.user.id);
  }

  @Delete('components/:id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async deleteComponent(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    return this.templateBuilderService.deleteComponent(id, userCompanyId, req.user.role);
  }

  // Template rendering
  @Post('render')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async renderTemplate(@Body() renderTemplateDto: RenderTemplateDto, @Request() req) {
    const { templateId, data, format, printerId } = renderTemplateDto;

    // Verify template access
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    await this.templateBuilderService.getTemplate(templateId, userCompanyId, req.user.role);

    const result = await this.escposRendererService.renderTemplate(templateId, data, format);

    // If printerId is provided, send to PrinterMaster for actual printing
    if (printerId) {
      // TODO: Integration with PrinterMaster service
      return {
        ...result,
        printJobId: `job-${Date.now()}`
      };
    }

    return result;
  }

  // Generate preview
  @Post('preview')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async generatePreview(@Body() generatePreviewDto: GeneratePreviewDto, @Request() req) {
    const { templateId, sampleData } = generatePreviewDto;

    // Verify template access
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    await this.templateBuilderService.getTemplate(templateId, userCompanyId, req.user.role);

    return this.escposRendererService.generatePreview(templateId, sampleData);
  }

  // Validate template
  @Get('templates/:id/validate')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async validateTemplate(@Param('id') id: string, @Request() req) {
    // Verify template access
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    await this.templateBuilderService.getTemplate(id, userCompanyId, req.user.role);

    return this.escposRendererService.validateTemplate(id);
  }

  // Template analytics
  @Get('templates/:id/analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getTemplateAnalytics(@Param('id') id: string, @Request() req) {
    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    const template = await this.templateBuilderService.getTemplate(id, userCompanyId, req.user.role);

    // Get analytics data (using public method instead of protected prisma)
    const analytics = await this.templateBuilderService.getTemplateAnalytics(id);
    const printJobs = analytics.printJobsCount || 0;

    return {
      template: {
        id: template.id,
        name: template.name,
        usageCount: template.usageCount,
        lastUsedAt: template.lastUsedAt
      },
      analytics
    };
  }

  // Bulk operations
  @Post('templates/bulk-delete')
  @Roles('super_admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  async bulkDeleteTemplates(@Body() body: { templateIds: string[] }, @Request() req) {
    const { templateIds } = body;

    if (!templateIds || templateIds.length === 0) {
      throw new BadRequestException('Template IDs are required');
    }

    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    const results = [];

    for (const templateId of templateIds) {
      try {
        await this.templateBuilderService.deleteTemplate(templateId, userCompanyId, req.user.role);
        results.push({ id: templateId, status: 'deleted' });
      } catch (error) {
        results.push({ id: templateId, status: 'error', error: error.message });
      }
    }

    return {
      success: results.filter(r => r.status === 'deleted').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    };
  }

  @Post('templates/bulk-update-status')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateTemplateStatus(
    @Body() body: { templateIds: string[]; isActive: boolean },
    @Request() req
  ) {
    const { templateIds, isActive } = body;

    if (!templateIds || templateIds.length === 0) {
      throw new BadRequestException('Template IDs are required');
    }

    const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
    const results = [];

    for (const templateId of templateIds) {
      try {
        await this.templateBuilderService.updateTemplate(
          templateId,
          { isActive },
          userCompanyId,
          req.user.role,
          req.user.id
        );
        results.push({ id: templateId, status: 'updated' });
      } catch (error) {
        results.push({ id: templateId, status: 'error', error: error.message });
      }
    }

    return {
      success: results.filter(r => r.status === 'updated').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    };
  }

  // Test print template to physical printer
  @Post('test-print')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  @HttpCode(HttpStatus.OK)
  async testPrint(
    @Body() body: {
      templateId: string;
      printerId?: string;
      sampleData?: any;
      textContent?: string;
      escPosContent?: string;
      contentType?: string;
    },
    @Request() req
  ) {
    const { templateId, printerId, sampleData, textContent, escPosContent, contentType } = body;

    console.log('========================================');
    console.log('[TEMPLATE-BUILDER-CONTROLLER] TEST PRINT REQUEST RECEIVED');
    console.log('========================================');
    console.log('[TEST-PRINT-DEBUG] Request received:', {
      templateId,
      printerId,
      contentType,
      hasTextContent: !!textContent,
      hasEscPosContent: !!escPosContent,
      textContentLength: textContent?.length || 0,
      textContentPreview: textContent?.substring(0, 100) + '...' || 'None'
    });

    if (!templateId) {
      throw new BadRequestException('Template ID is required');
    }

    try {
      // Verify template access
      const userCompanyId = req.user.role === 'super_admin' ? undefined : req.user.companyId;
      const template = await this.templateBuilderService.getTemplate(templateId, userCompanyId, req.user.role);

      // Check if we have thermal text content for physical printing
      if (contentType === 'thermal_text' && textContent) {
        // Send thermal text content to PrinterMaster service
        // This bypasses HTML generation and sends plain text content
        console.log('[UPDATED CONTROLLER] Executing thermal text print path');
        console.log('[UPDATED CONTROLLER] Text content preview:', textContent.substring(0, 200) + '...');

        try {
          // Determine which printer to use
          const targetPrinter = printerId || 'Ricoh-MP-C4503-PDF'; // Use provided printerId or default
          console.log('[UPDATED CONTROLLER] Using printer:', targetPrinter);

          // Add auto-cut ESC/POS commands for thermal printers
          let thermalTextWithCut = textContent;

          // Add minimal spacing (0.5 inch = about 2-3 lines for thermal)
          thermalTextWithCut += '\n\n\n';

          // Use ESC/POS commands that ensure proper spacing and paper advancement
          // ESC d n - Feed n lines to ensure content is past the tear-off point
          thermalTextWithCut += String.fromCharCode(27, 100, 4); // ESC d 4 - Feed 4 lines first

          // Add actual cutting command using GS V 1 (partial cut) - no null bytes
          thermalTextWithCut += String.fromCharCode(29, 86, 1); // GS V 1 - Partial cut (allows easy tear)

          // Alternative: Use GS V 66 for full cut if partial doesn't work
          // thermalTextWithCut += String.fromCharCode(29, 86, 66); // GS V B - Full cut

          console.log('[AUTO-CUT] Added ESC/POS auto-cut commands to thermal content');
          console.log('[HTTP-REQUEST] Sending request to PrinterMaster at http://127.0.0.1:8182/print');
          console.log('[HTTP-REQUEST] Request payload:', {
            printer: targetPrinter,
            textLength: thermalTextWithCut.length,
            id: `template-test-${Date.now()}`
          });

          // Use the PrinterBridge to send thermal text with auto-cut to PrinterMaster
          const printerResponse = await axios.post('http://127.0.0.1:8182/print', {
            printer: targetPrinter,
            text: thermalTextWithCut,
            id: `template-test-${Date.now()}`
          }, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
          });

          console.log('[HTTP-RESPONSE] PrinterMaster responded with status:', printerResponse.status);
          console.log('[HTTP-RESPONSE] Response data:', printerResponse.data);

          if (printerResponse.data?.success) {
            return {
              success: true,
              message: `[UPDATED] Template test print sent successfully to printer: ${targetPrinter}`,
              templateId: templateId,
              contentType: 'thermal_text',
              timestamp: new Date().toISOString(),
              printMethod: 'thermal_escpos',
              printerName: targetPrinter,
              printerResponse: printerResponse.data
            };
          } else {
            throw new Error('Printer rejected the job');
          }
        } catch (printerError) {
          console.error('[HTTP-ERROR] Axios request failed:', printerError.message);
          console.error('[HTTP-ERROR] Full error:', printerError);
          return {
            success: false,
            message: `Printer communication failed: ${printerError.message}`,
            templateId: templateId,
            contentType: 'thermal_text',
            timestamp: new Date().toISOString(),
            printMethod: 'thermal_escpos',
            error: printerError.message
          };
        }
      } else {
        // Fallback to regular preview generation for HTML-based printing
        const previewResult = await this.escposRendererService.generatePreview(templateId, sampleData);

        try {
          // Convert HTML preview to plain text for thermal printing
          const plainText = previewResult.data?.replace(/<[^>]*>/g, '') || 'Template preview test print';

          // Determine which printer to use
          const targetPrinter = printerId || 'Ricoh-MP-C4503-PDF'; // Use provided printerId or default
          console.log('[UPDATED CONTROLLER] HTML path - Using printer:', targetPrinter);

          // Add auto-cut ESC/POS commands for thermal printers
          const ESC = '\x1b';
          const GS = '\x1d';

          // Enhanced thermal text with auto-cut functionality
          let thermalTextWithCut = `Template Preview Test\n${plainText}`;

          // Add proper spacing before cut
          thermalTextWithCut += '\n\n';

          // Add ESC/POS auto-cut command (GS V 0 = Full cut)
          thermalTextWithCut += GS + 'V' + String.fromCharCode(0);

          console.log('[AUTO-CUT] Added auto-cut commands to HTML fallback path');

          const printerResponse = await axios.post('http://127.0.0.1:8182/print', {
            printer: targetPrinter,
            text: thermalTextWithCut, // Send thermal text with auto-cut commands
            id: `template-preview-${Date.now()}`
          }, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
          });

          if (printerResponse.data?.success) {
            return {
              success: true,
              message: `Template preview sent successfully to printer: ${targetPrinter}`,
              templateId: templateId,
              contentType: 'html_converted',
              timestamp: new Date().toISOString(),
              printMethod: 'html_to_thermal',
              printerName: targetPrinter,
              preview: previewResult,
              printerResponse: printerResponse.data
            };
          } else {
            throw new Error('Printer rejected the preview job');
          }
        } catch (printerError) {
          return {
            success: false,
            message: `Template preview print failed: ${printerError.message}`,
            templateId: templateId,
            contentType: 'html',
            timestamp: new Date().toISOString(),
            printMethod: 'html_render',
            preview: previewResult,
            error: printerError.message
          };
        }
      }
    } catch (error) {
      throw new BadRequestException(`Test print failed: ${error.message}`);
    }
  }
}