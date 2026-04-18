import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoommateInvitationsService } from './roommate-invitations.service';
import { RoommateInvitationsController } from './roommate-invitations.controller';
import {
  RoommateInvitation,
  Student,
  GroupMembership,
  SystemSetting,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoommateInvitation,
      Student,
      GroupMembership,
      SystemSetting,
    ]),
  ],
  controllers: [RoommateInvitationsController],
  providers: [RoommateInvitationsService],
  exports: [RoommateInvitationsService],
})
export class RoommateInvitationsModule {}
