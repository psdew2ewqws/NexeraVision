import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { DatabaseModule } from '../../shared/database/database.module';
import { CommonModule } from '../../shared/common/common.module';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    ScheduleModule.forRoot() // Enable scheduled tasks
  ],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService]
})
export class LicensesModule {}