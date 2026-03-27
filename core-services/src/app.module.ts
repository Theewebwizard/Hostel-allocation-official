import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
} from './entities';

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
        ],
        synchronize: configService.get('NODE_ENV') === 'development', // Auto-sync in dev only
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    StudentsModule,
    GroupsModule,
    AdminModule,
    AllocationDataModule,
    SwapsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
