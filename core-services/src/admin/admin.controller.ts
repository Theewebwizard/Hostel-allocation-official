import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AllocationDataService } from '../allocation-data/allocation-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateHostelDto,
  UpdateHostelDto,
  CreateRoomDto,
  UpdateRoomDto,
  CreateRuleDto,
  UpdateRuleDto,
  BulkCreateRoomsDto,
  TriggerAllocationDto,
  UpdateAllocationResultDto,
  SetWingParticipationDto,
  SetAllocationPolicyDto,
} from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly allocationDataService: AllocationDataService,
  ) {}

  // ============ DASHBOARD ============

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ============ HOSTEL MANAGEMENT ============

  @Post('hostels')
  @ApiOperation({ summary: 'Create a new hostel' })
  @ApiResponse({ status: 201, description: 'Hostel created' })
  @ApiResponse({ status: 409, description: 'Hostel name already exists' })
  async createHostel(@Body() createHostelDto: CreateHostelDto) {
    return this.adminService.createHostel(createHostelDto);
  }

  @Get('hostels')
  @ApiOperation({ summary: 'Get all hostels' })
  @ApiResponse({ status: 200, description: 'List of hostels' })
  async getAllHostels() {
    return this.adminService.getAllHostels();
  }

  @Get('hostels/hierarchy')
  @ApiOperation({ summary: 'Get hierarchical hostel structure' })
  @ApiResponse({ status: 200, description: 'Hostel hierarchy' })
  async getHostelHierarchy() {
    return this.adminService.getHostelHierarchy();
  }

  @Get('hostels/:id')
  @ApiOperation({ summary: 'Get hostel by ID' })
  @ApiResponse({ status: 200, description: 'Hostel details' })
  @ApiResponse({ status: 404, description: 'Hostel not found' })
  async getHostelById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getHostelById(id);
  }

  @Patch('hostels/:id')
  @ApiOperation({ summary: 'Update a hostel' })
  @ApiResponse({ status: 200, description: 'Hostel updated' })
  async updateHostel(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHostelDto: UpdateHostelDto,
  ) {
    return this.adminService.updateHostel(id, updateHostelDto);
  }

  @Delete('hostels/:id')
  @ApiOperation({ summary: 'Delete a hostel' })
  @ApiResponse({ status: 200, description: 'Hostel deleted' })
  @ApiResponse({ status: 400, description: 'Hostel has rooms' })
  async deleteHostel(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteHostel(id);
  }

  // ============ ROOM MANAGEMENT ============

  @Post('rooms')
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({ status: 201, description: 'Room created' })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.adminService.createRoom(createRoomDto);
  }

  @Post('rooms/bulk')
  @ApiOperation({ summary: 'Create multiple rooms at once' })
  @ApiResponse({ status: 201, description: 'Rooms created' })
  async bulkCreateRooms(@Body() dto: BulkCreateRoomsDto) {
    return this.adminService.bulkCreateRooms(dto);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, description: 'List of rooms' })
  async getAllRooms(@Query('hostelId') hostelId?: string) {
    return this.adminService.getAllRooms(
      hostelId ? parseInt(hostelId) : undefined,
    );
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiResponse({ status: 200, description: 'Room details' })
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getRoomById(id);
  }

  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Update a room' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.adminService.updateRoom(id, updateRoomDto);
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted' })
  async deleteRoom(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteRoom(id);
  }

  // ============ ALLOCATION RULES ============

  @Post('rules')
  @ApiOperation({ summary: 'Create a new allocation rule' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createRule(@Body() createRuleDto: CreateRuleDto) {
    return this.adminService.createRule(createRuleDto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all allocation rules' })
  @ApiResponse({ status: 200, description: 'List of rules' })
  async getAllRules() {
    return this.adminService.getAllRules();
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get rule by ID' })
  @ApiResponse({ status: 200, description: 'Rule details' })
  async getRuleById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getRuleById(id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update a rule' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRuleDto: UpdateRuleDto,
  ) {
    return this.adminService.updateRule(id, updateRuleDto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete a rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  async deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteRule(id);
  }

  // ============ ALLOCATION RUNS ============

  @Post('allocation/run')
  @ApiOperation({ summary: 'Trigger a new allocation run' })
  @ApiResponse({ status: 201, description: 'Allocation started' })
  async triggerAllocation(
    @Request() req,
    @Body() dto: TriggerAllocationDto = {},
  ) {
    return this.adminService.triggerAllocation(req.user.id, dto.allocationMode);
  }

  @Get('allocation/runs')
  @ApiOperation({ summary: 'Get all allocation runs' })
  @ApiResponse({ status: 200, description: 'List of allocation runs' })
  async getAllocationRuns() {
    return this.adminService.getAllocationRuns();
  }

  @Get('allocation/runs/:id')
  @ApiOperation({ summary: 'Get allocation run by ID' })
  @ApiResponse({ status: 200, description: 'Allocation run details' })
  async getAllocationRunById(@Param('id') id: string) {
    return this.adminService.getAllocationRunById(id);
  }

  @Get('allocation/runs/:id/results')
  @ApiOperation({ summary: 'Get allocation results for a run' })
  @ApiResponse({ status: 200, description: 'Allocation results' })
  async getAllocationResults(@Param('id') id: string) {
    return this.adminService.getAllocationResults(id);
  }

  @Post('allocation/runs/:id/finalize')
  @ApiOperation({ summary: 'Finalize an allocation run' })
  @ApiResponse({ status: 200, description: 'Allocation run finalized' })
  @ApiResponse({ status: 400, description: 'Cannot finalize this run' })
  async finalizeAllocationRun(@Param('id') id: string) {
    return this.adminService.finalizeAllocationRun(id);
  }

  @Post('allocation/runs/:id/commit')
  @ApiOperation({ summary: 'Commit an allocation run to update room status' })
  @ApiResponse({ status: 200, description: 'Allocation run committed' })
  @ApiResponse({ status: 400, description: 'Cannot commit this run' })
  async commitAllocationRun(@Param('id') id: string) {
    return this.adminService.commitAllocationRun(id);
  }

  @Patch('allocation/results/:id')
  @ApiOperation({ summary: 'Update allocation result (manual override)' })
  @ApiResponse({ status: 200, description: 'Allocation result updated' })
  @ApiResponse({
    status: 400,
    description: 'Cannot modify finalized allocation',
  })
  async updateAllocationResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAllocationResultDto,
  ) {
    return this.adminService.updateAllocationResult(id, dto.roomId);
  }

  // ============ WING PARTICIPATION SETTINGS ============

  @Post('wing-participation')
  @ApiOperation({ summary: 'Set wing participation for a year' })
  @ApiResponse({
    status: 200,
    description: 'Wing participation setting updated',
  })
  async setWingParticipation(@Body() dto: SetWingParticipationDto) {
    return this.adminService.setWingParticipation(dto.year, dto.isAllowed);
  }

  @Get('wing-participation')
  @ApiOperation({ summary: 'Get all wing participation settings' })
  @ApiResponse({ status: 200, description: 'Wing participation settings' })
  async getWingParticipationSettings() {
    return this.adminService.getWingParticipationSettings();
  }

  // ============ ALLOCATION POLICY ============

  @Get('policy')
  @UseGuards() // Intentionally overrides class-level JwtAuthGuard — public endpoint
  @ApiOperation({ summary: 'Get the active allocation policy (public)' })
  @ApiResponse({ status: 200, description: 'Current allocation policy' })
  async getAllocationPolicy() {
    const policy = await this.adminService.getAllocationPolicy();
    return { policy };
  }

  @Post('policy')
  @ApiOperation({ summary: 'Set the active allocation policy (admin only)' })
  @ApiResponse({ status: 200, description: 'Policy updated' })
  async setAllocationPolicy(@Body() dto: SetAllocationPolicyDto) {
    return this.adminService.setAllocationPolicy(dto.policy);
  }

  @Get('applications-enabled')
  @ApiOperation({ summary: 'Check if student applications are enabled' })
  @ApiResponse({ status: 200, description: 'Application status' })
  async getApplicationsEnabled() {
    const enabled = await this.adminService.getApplicationsEnabled();
    return { enabled };
  }

  @Post('applications-enabled')
  @ApiOperation({ summary: 'Enable or disable student applications' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async setApplicationsEnabled(@Body() dto: { enabled: boolean }) {
    return this.adminService.setApplicationsEnabled(dto.enabled);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all groups for auditing (admin only)' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  async getAllGroups() {
    return this.allocationDataService.getAllGroups();
  }
}
