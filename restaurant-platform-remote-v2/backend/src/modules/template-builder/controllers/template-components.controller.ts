import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('template-components')
@Controller('template-builder/components')
export class TemplateComponentsController {
  // Component-specific endpoints will be implemented here
}