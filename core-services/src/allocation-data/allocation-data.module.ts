import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllocationDataController } from './allocation-data.controller';
import { AllocationDataService } from './allocation-data.service';
import { Student, Group, Hostel, Room, AllocationResult, AllocationRule } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Group, Hostel, Room, AllocationResult, AllocationRule]),
  ],
  controllers: [AllocationDataController],
  providers: [AllocationDataService],
  exports: [AllocationDataService],
})
export class AllocationDataModule {}
