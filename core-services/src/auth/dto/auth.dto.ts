import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole, StudentGender } from '../../entities';

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'student', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  // Student-specific fields (required if role is student)
  @ApiProperty({ example: '20BCE1234', required: false })
  @IsOptional()
  rollNumber?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  year?: number;

  @ApiProperty({ example: 'male', enum: StudentGender, required: false })
  @IsEnum(StudentGender)
  @IsOptional()
  gender?: StudentGender;

  @ApiProperty({ example: 'Computer Science', required: false })
  @IsOptional()
  program?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  password: string;
}
