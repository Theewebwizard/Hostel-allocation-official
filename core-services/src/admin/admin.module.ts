import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DecisionsModule } from '../decisions/decisions.module';
import {
  Hostel,
  Room,
  AllocationRule,
  AllocationRun,
  AllocationResult,
  Group,
  GroupMembership,
  Student,
  WingParticipationSetting,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hostel,
      Room,
      AllocationRule,
      AllocationRun,
      AllocationResult,
      Group,
      GroupMembership,
      Student,
      WingParticipationSetting,
    ]),
    DecisionsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
