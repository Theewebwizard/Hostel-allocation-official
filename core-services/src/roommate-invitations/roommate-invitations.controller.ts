import {
  Controller,
  Get,
  Post,
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
import { RoommateInvitationsService } from './roommate-invitations.service';
import { SendRoommateInvitationDto } from './dto/send-invitation.dto';
import { RespondToInvitationDto } from './dto/respond-invitation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('roommate-invitations')
@Controller('roommate-invitations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoommateInvitationsController {
  constructor(
    private readonly roommateInvitationsService: RoommateInvitationsService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a roommate invitation' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  send(@Request() req, @Body() dto: SendRoommateInvitationDto) {
    return this.roommateInvitationsService.sendInvitation(req.user.id, dto);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to a roommate invitation' })
  @ApiResponse({ status: 200, description: 'Responded successfully' })
  respond(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RespondToInvitationDto,
  ) {
    return this.roommateInvitationsService.respondToInvitation(
      req.user.id,
      +id,
      dto,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my roommate invitations' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  getMyInvitations(@Request() req) {
    return this.roommateInvitationsService.getMyInvitations(req.user.id);
  }
}
