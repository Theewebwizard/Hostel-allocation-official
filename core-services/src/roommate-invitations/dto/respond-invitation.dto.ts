import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondToInvitationDto {
  @ApiProperty({ enum: ['accepted', 'rejected'] })
  @IsEnum(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}
