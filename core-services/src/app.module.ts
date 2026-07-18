import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService, BackendService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { GroupsModule } from './groups/groups.module';
import { AdminModule } from './admin/admin.module';
import { AllocationDataModule } from './allocation-data/allocation-data.module';
import { SwapsModule } from './swaps/swaps.module';
import {
  User,
  Student,
  Group,
  GroupMembership,
  Hostel,
  Room,
  AllocationResult,
  AllocationRule,
  AllocationRun,
  AllocationDecision,
  SwapRequest,
  SwapHistory,
  WingParticipationSetting,
  SystemSetting,
  RoommateInvitation,
  AdministrativeAction,
} from './entities';
import { RoommateInvitationsModule } from './roommate-invitations/roommate-invitations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
          User,
          Student,
          Group,
          GroupMembership,
          Hostel,
          Room,
          AllocationResult,
          AllocationRule,
          AllocationRun,
          AllocationDecision,
          SwapRequest,
          SwapHistory,
          WingParticipationSetting,
          SystemSetting,
          RoommateInvitation,
          AdministrativeAction,
        ],
        synchronize: configService.get('NODE_ENV') === 'development', // Auto-sync in dev only
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        migrationsRun: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    StudentsModule,
    GroupsModule,
    AdminModule,
    AllocationDataModule,
    SwapsModule,
    RoommateInvitationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, BackendService],
})
export class AppModule {}
