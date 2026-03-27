import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';

export class CreateSwapRequestDto {
  @ApiPropertyOptional({ description: 'Target student ID (for direct swap)' })
  @IsOptional()
  @IsString()
  targetStudentId?: string;

  @ApiPropertyOptional({ description: 'Target room ID (for open swap)' })
  @IsOptional()
  @IsNumber()
  targetRoomId?: number;

  @ApiPropertyOptional({ description: 'Reason for swap request' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RespondSwapRequestDto {
  @ApiProperty({
    example: 'accepted',
    enum: ['accepted', 'rejected'],
    description: 'Response to swap request',
  })
  @IsEnum(['accepted', 'rejected'])
  response: 'accepted' | 'rejected';

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ExecuteSwapChainDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of swap request IDs to execute as chain',
  })
  @IsNotEmpty()
  @IsArray()
  @IsNumber({}, { each: true })
  swapRequestIds: number[];
}

export interface SwapRequestResponseDto {
  id: number;
  requesterId: string;
  requesterName: string;
  requesterRollNumber: string;
  requesterRoom: {
    id: number;
    roomNumber: string;
    hostelName: string;
    wing?: string;
    floor?: number;
  };
  targetStudentId?: string;
  targetStudentName?: string;
  targetRoom?: {
    id: number;
    roomNumber: string;
    hostelName: string;
    wing?: string;
    floor?: number;
  };
  status: string;
  swapType: string;
  reason?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SwapChainDto {
  chainId: string;
  participants: {
    studentId: string;
    studentName: string;
    currentRoomId: number;
    targetRoomId: number;
  }[];
  canExecute: boolean;
  validationErrors?: string[];
}
