import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
} from 'class-validator';
import { GenderType, RoomStatus, AllocationMode } from '../../entities';

// Hostel DTOs
export class CreateHostelDto {
  @ApiProperty({ example: 'BH-1', description: 'Hostel name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'male',
    enum: GenderType,
    description: 'Gender type for this hostel',
  })
  @IsEnum(GenderType)
  genderType!: GenderType;
}

export class UpdateHostelDto {
  @ApiPropertyOptional({ example: 'BH-1 New' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'male', enum: GenderType })
  @IsOptional()
  @IsEnum(GenderType)
  genderType?: GenderType;
}

// Room DTOs
export class CreateRoomDto {
  @ApiProperty({ example: 1, description: 'Hostel ID' })
  @IsNotEmpty()
  @IsNumber()
  hostelId!: number;

  @ApiProperty({ example: '101', description: 'Room number' })
  @IsNotEmpty()
  @IsString()
  roomNumber!: string;

  @ApiPropertyOptional({ example: 1, description: 'Floor number' })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({ example: 'A', description: 'Wing name' })
  @IsOptional()
  @IsString()
  wing?: string;

  @ApiProperty({ example: 2, description: 'Room capacity (beds)' })
  @IsNotEmpty()
  @IsNumber()
  capacity!: number;

  @ApiPropertyOptional({
    example: 'double',
    description: 'Room type (single/double/triple)',
  })
  @IsOptional()
  @IsString()
  roomType?: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: '101A' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({ example: 'B' })
  @IsOptional()
  @IsString()
  wing?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @ApiPropertyOptional({ example: 'triple' })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiPropertyOptional({ example: 'available', enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}

// Allocation Rule DTOs
export class CreateRuleDto {
  @ApiPropertyOptional({ example: 1, description: 'Hostel ID (optional)' })
  @IsOptional()
  @IsNumber()
  hostelId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Year restriction (optional)',
  })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({
    example: 'single',
    description: 'Room type restriction (optional)',
  })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiPropertyOptional({
    example: 'A',
    description: 'Wing restriction (optional) - e.g., "A", "B", "C"',
  })
  @IsOptional()
  @IsString()
  wing?: string;

  @ApiProperty({
    example: true,
    description: 'Is this combination allowed?',
    default: true,
  })
  @IsBoolean()
  isAllowed!: boolean;

  @ApiProperty({
    example: 0,
    description: 'Priority (higher = more important)',
    default: 0,
  })
  @IsNumber()
  priority!: number;

  @ApiPropertyOptional({
    example: '2nd year students in BH-4',
    description: 'Description of the rule',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRuleDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  hostelId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ example: 'double' })
  @IsOptional()
  @IsString()
  roomType?: string;
  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  wing?: string;
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAllowed?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;
}

// Bulk Room Creation
export class BulkCreateRoomsDto {
  @ApiProperty({ example: 1, description: 'Hostel ID' })
  @IsNotEmpty()
  @IsNumber()
  hostelId!: number;

  @ApiProperty({ example: 'A', description: 'Wing name' })
  @IsNotEmpty()
  @IsString()
  wing!: string;

  @ApiProperty({ example: 1, description: 'Floor number' })
  @IsNotEmpty()
  @IsNumber()
  floor!: number;

  @ApiProperty({ example: 101, description: 'Starting room number' })
  @IsNotEmpty()
  @IsNumber()
  startRoomNumber!: number;

  @ApiProperty({ example: 10, description: 'Number of rooms to create' })
  @IsNotEmpty()
  @IsNumber()
  count!: number;

  @ApiProperty({ example: 2, description: 'Capacity per room' })
  @IsNotEmpty()
  @IsNumber()
  capacity!: number;

  @ApiPropertyOptional({ example: 'double', description: 'Room type' })
  @IsOptional()
  @IsString()
  roomType?: string;
}

// Allocation Trigger DTO
export class TriggerAllocationDto {
  @ApiPropertyOptional({
    example: 'group_based',
    enum: AllocationMode,
    description: 'Allocation mode: group_based (default), fcfs, or wing_fcfs',
  })
  @IsOptional()
  @IsEnum(AllocationMode)
  allocationMode?: AllocationMode;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'Target academic years to allocate (empty = all years)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  targetYears?: number[];

  @ApiPropertyOptional({
    type: [String],
    example: ['CSE', 'ECE'],
    description: 'Target programs to allocate (empty = all programs)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPrograms?: string[];
}

// Update Allocation Result DTO
export class UpdateAllocationResultDto {
  @ApiProperty({ example: 5, description: 'New room ID' })
  @IsNotEmpty()
  @IsNumber()
  roomId!: number;
}

// Wing Participation Settings DTO
export class SetWingParticipationDto {
  @ApiProperty({ example: 2, description: 'Academic year (1-4)' })
  @IsNotEmpty()
  @IsNumber()
  year!: number;

  @ApiProperty({ example: true, description: 'Allow wing participation' })
  @IsNotEmpty()
  @IsBoolean()
  isAllowed!: boolean;
}

// Allocation Policy DTO
export class SetAllocationPolicyDto {
  @ApiProperty({
    example: 'group_based',
    enum: AllocationMode,
    description: 'Global allocation policy: group_based, fcfs, or wing_fcfs',
  })
  @IsNotEmpty()
  @IsEnum(AllocationMode)
  policy!: AllocationMode;
}

export class BulkEvictDto {
  @ApiProperty({
    type: [String],
    example: ['2024CS01', '2024CS02'],
    description: 'List of student roll numbers to evict',
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  rollNumbers!: string[];
}

export class ResetStatusDto {
  @ApiPropertyOptional({ example: 1, description: 'Academic year to reset (optional)' })
  @IsOptional()
  @IsNumber()
  year?: number;
}

export class SaveRulesMatrixDto {
  @ApiProperty({
    example: {
      1: {
        years: { 1: true, 2: false },
        wings: { 'A': { 1: true }, 'B': { 2: true } }
      }
    },
    description: 'Hierarchical matrix of hostelId -> (years and wing-specific years)',
  })
  @IsNotEmpty()
  matrix!: Record<number, {
    years: Record<number, boolean>;
    wings: Record<string, Record<number, boolean>>;
  }>;
}
