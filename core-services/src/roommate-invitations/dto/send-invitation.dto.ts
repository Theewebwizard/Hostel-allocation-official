import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendRoommateInvitationDto {
  @ApiProperty({ description: 'Roll number of the student to invite' })
  @IsString()
  @IsNotEmpty()
  receiverRollNumber: string;
}
