import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AllocationDataService } from './allocation-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('allocation-data')
@Controller('allocation-data')
export class AllocationDataController {
  constructor(private readonly allocationDataService: AllocationDataService) {}

  @Get()
  @ApiOperation({ summary: 'Get all data needed for allocation' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully' })
  async getAllData() {
    return this.allocationDataService.getAllData();
  }

  @Get('students')
  @ApiOperation({ summary: 'Get all students for allocation' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  async getAllStudents() {
    return this.allocationDataService.getAllStudents();
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all groups for allocation' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  async getAllGroups() {
    return this.allocationDataService.getAllGroups();
  }

  @Get('hostels')
  @ApiOperation({ summary: 'Get all hostels for allocation' })
  @ApiResponse({ status: 200, description: 'Hostels retrieved successfully' })
  async getAllHostels() {
    return this.allocationDataService.getAllHostels();
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get all rooms for allocation' })
  @ApiResponse({ status: 200, description: 'Rooms retrieved successfully' })
  async getAllRooms() {
    return this.allocationDataService.getAllRooms();
  }

  @Get('results')
  @ApiOperation({ summary: 'Get allocation results' })
  @ApiResponse({
    status: 200,
    description: 'Allocation results retrieved successfully',
  })
  async getAllocationResults(@Query('runId') runId?: string) {
    return this.allocationDataService.getAllocationResults(runId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current student allocation result' })
  @ApiResponse({ status: 200, description: 'Result retrieved successfully' })
  async getMyResult(@Request() req) {
    return this.allocationDataService.getStudentResult(req.user.id);
  }
}
