import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('template-render')
@Controller('template-builder/render')
export class TemplateRenderController {
  // Rendering-specific endpoints will be implemented here
}