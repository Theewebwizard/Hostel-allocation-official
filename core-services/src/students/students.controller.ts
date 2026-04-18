import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiResponse({ status: 200, description: 'List of all students' })
  findAll() {
    return this.studentsService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current student profile' })
  @ApiResponse({ status: 200, description: 'Student profile' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  findMe(@Request() req) {
    return this.studentsService.findOne(req.user.id);
  }

  @Get('eligible-for-swap')
  @ApiOperation({ summary: 'Get students eligible for room swap' })
  @ApiResponse({ status: 200, description: 'List of eligible students' })
  findEligibleForSwap(@Request() req) {
    return this.studentsService.findEligibleForSwap(req.user.id);
  }

  @Get('roll/:rollNumber')
  @ApiOperation({ summary: 'Find student by roll number' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  findByRollNumber(@Param('rollNumber') rollNumber: string) {
    return this.studentsService.findByRollNumber(rollNumber);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current student profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  update(@Request() req, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(req.user.id, updateStudentDto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update student by userId (admin)' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  updateStudent(
    @Param('userId') userId: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(userId, updateStudentDto);
  }
}
