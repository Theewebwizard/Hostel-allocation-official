import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsInt } from 'class-validator';
import { MembershipStatus } from '../../entities';

export class CreateGroupDto {
  @ApiProperty({ example: 'Study Buddies', description: 'Name of the group' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: [1, 2, 3], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  groupPreferences?: number[];
}

export class InviteMemberDto {
  @ApiProperty({
    example: '20BCE1234',
    description: 'Roll number of student to invite',
  })
  @IsNotEmpty()
  @IsString()
  rollNumber: string;
}

export class RespondInvitationDto {
  @ApiProperty({
    example: 'accepted',
    enum: ['accepted', 'declined'],
    description: 'Response to the invitation',
  })
  @IsEnum(MembershipStatus)
  status: MembershipStatus;
}

export class GroupResponseDto {
  id: number;
  name: string;
  creatorId: string;
  createdAt: Date;
  memberCount: number;
  members: {
    userId: string;
    rollNumber: string;
    fullName: string;
    status: string;
  }[];
}

export class InvitationResponseDto {
  groupId: number;
  groupName: string;
  invitedBy: string;
  invitedAt: Date;
  status: string;
}
