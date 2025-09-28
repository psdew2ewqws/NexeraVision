import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/modules/database/database.module';
import { AITemplateGeneratorService } from './services/ai-template-generator.service';
import { AITemplateController } from './controllers/ai-template.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AITemplateController],
  providers: [AITemplateGeneratorService],
  exports: [AITemplateGeneratorService],
})
export class TemplatesModule {}