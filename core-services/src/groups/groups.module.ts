import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import {
  Group,
  GroupMembership,
  Student,
  User,
  WingParticipationSetting,
} from '../entities';

import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupMembership,
      Student,
      User,
      WingParticipationSetting,
    ]),
    AdminModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
