import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('template-analytics')
@Controller('template-builder/analytics')
export class TemplateAnalyticsController {
  // Analytics-specific endpoints will be implemented here
}