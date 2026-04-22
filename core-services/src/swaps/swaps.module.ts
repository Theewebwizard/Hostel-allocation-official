import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SwapRequest,
  SwapHistory,
  Student,
  Room,
  Hostel,
  AllocationRun,
} from '../entities';
import { SwapsService } from './swaps.service';
import { SwapsController } from './swaps.controller';

import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SwapRequest,
      SwapHistory,
      Student,
      Room,
      Hostel,
      AllocationRun,
    ]),
    AdminModule,
  ],
  controllers: [SwapsController],
  providers: [SwapsService],
  exports: [SwapsService],
})
export class SwapsModule {}
