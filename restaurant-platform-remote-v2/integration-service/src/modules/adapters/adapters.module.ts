import { Module } from '@nestjs/common';
import { AdapterFactory } from './factories/adapter.factory';
import { CareemAdapter } from './providers/careem.adapter';
import { TalabatAdapter } from './providers/talabat.adapter';

@Module({
  providers: [
    AdapterFactory,
    CareemAdapter,
    TalabatAdapter,
  ],
  exports: [AdapterFactory],
})
export class AdaptersModule {}