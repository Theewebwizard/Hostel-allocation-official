import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsInt } from 'class-validator';
import { StudentGender } from '../../entities';

export class UpdateStudentDto {
  @ApiProperty({ example: '2023CSE001', required: false })
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiProperty({ example: 'BTech CSE', required: false })
  @IsOptional()
  @IsString()
  program?: string;

  @ApiProperty({ enum: StudentGender, required: false })
  @IsOptional()
  @IsEnum(StudentGender)
  gender?: StudentGender;

  @ApiProperty({ example: [1, 2, 3], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  hostelPreferences?: number[];
}
