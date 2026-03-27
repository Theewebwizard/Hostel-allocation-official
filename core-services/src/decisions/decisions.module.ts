import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllocationDecision } from '../entities';
import { DecisionsService } from './decisions.service';
import { DecisionsController } from './decisions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AllocationDecision])],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
