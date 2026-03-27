import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateGroupDto,
  InviteMemberDto,
  RespondInvitationDto,
} from './dto/groups.dto';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 409, description: 'User already has a group' })
  async createGroup(@Request() req, @Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.id, createGroupDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my current group' })
  @ApiResponse({ status: 200, description: 'Returns current group or null' })
  async getMyGroup(@Request() req) {
    return this.groupsService.getMyGroup(req.user.id);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all groups (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all groups' })
  async getAllGroups() {
    return this.groupsService.getAllGroups();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiResponse({ status: 200, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async getGroupById(@Param('id') id: string, @Request() req) {
    return this.groupsService.getGroupById(parseInt(id), req.user.id);
  }

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite a student to the group' })
  @ApiResponse({ status: 200, description: 'Invitation sent' })
  @ApiResponse({ status: 403, description: 'Only creator can invite' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 409, description: 'Student already in a group' })
  async inviteMember(
    @Param('id') id: string,
    @Request() req,
    @Body() inviteDto: InviteMemberDto,
  ) {
    return this.groupsService.inviteMember(
      parseInt(id),
      req.user.id,
      inviteDto,
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the group' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Only creator can remove members' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @Request() req,
  ) {
    return this.groupsService.removeMember(
      parseInt(id),
      memberUserId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  @ApiResponse({ status: 403, description: 'Only creator can delete' })
  async deleteGroup(@Param('id') id: string, @Request() req) {
    return this.groupsService.deleteGroup(parseInt(id), req.user.id);
  }

  @Get('me/invitations')
  @ApiOperation({ summary: 'Get my pending invitations' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async getMyInvitations(@Request() req) {
    return this.groupsService.getMyInvitations(req.user.id);
  }

  @Patch('me/invitations/:groupId')
  @ApiOperation({ summary: 'Respond to an invitation (accept/decline)' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async respondToInvitation(
    @Param('groupId') groupId: string,
    @Request() req,
    @Body() responseDto: RespondInvitationDto,
  ) {
    return this.groupsService.respondToInvitation(
      parseInt(groupId),
      req.user.id,
      responseDto.status,
    );
  }

  @Delete('me/leave')
  @ApiOperation({ summary: 'Leave current group' })
  @ApiResponse({ status: 200, description: 'Left the group' })
  @ApiResponse({ status: 403, description: 'Creator cannot leave' })
  async leaveGroup(@Request() req) {
    return this.groupsService.leaveGroup(req.user.id);
  }
}
