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
import { SwapsService } from './swaps.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateSwapRequestDto,
  RespondSwapRequestDto,
  ExecuteSwapChainDto,
} from './dto/swaps.dto';

@ApiTags('swaps')
@Controller('swaps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  // ============ STUDENT ENDPOINTS ============

  @Post('request')
  @ApiOperation({ summary: 'Create a new swap request' })
  @ApiResponse({ status: 201, description: 'Swap request created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 409, description: 'Already have pending request' })
  async createSwapRequest(@Request() req, @Body() dto: CreateSwapRequestDto) {
    return this.swapsService.createSwapRequest(req.user.id, dto);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my outgoing swap requests' })
  @ApiResponse({ status: 200, description: 'List of swap requests' })
  async getMySwapRequests(@Request() req) {
    return this.swapsService.getMySwapRequests(req.user.id);
  }

  @Get('incoming')
  @ApiOperation({ summary: 'Get incoming swap requests' })
  @ApiResponse({ status: 200, description: 'List of incoming requests' })
  async getIncomingSwapRequests(@Request() req) {
    return this.swapsService.getIncomingSwapRequests(req.user.id);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Accept or reject a swap request' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Not the target of this request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async respondToSwapRequest(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RespondSwapRequestDto,
  ) {
    return this.swapsService.respondToSwapRequest(
      req.user.id,
      parseInt(id),
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a swap request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this request' })
  @ApiResponse({ status: 403, description: 'Not your request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async cancelSwapRequest(@Request() req, @Param('id') id: string) {
    return this.swapsService.cancelSwapRequest(req.user.id, parseInt(id));
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Get my swap history' })
  @ApiResponse({ status: 200, description: 'Swap history' })
  async getMySwapHistory(@Request() req) {
    return this.swapsService.getSwapHistory(req.user.id);
  }

  // ============ ADMIN ENDPOINTS ============

  @Get('admin/all')
  @ApiOperation({ summary: 'Get all swap requests (admin)' })
  @ApiResponse({ status: 200, description: 'All swap requests' })
  async getAllSwapRequests() {
    return this.swapsService.getAllSwapRequests();
  }

  @Get('admin/cycles')
  @ApiOperation({ summary: 'Detect swap cycles (admin)' })
  @ApiResponse({ status: 200, description: 'Detected cycles' })
  async detectCycles() {
    return this.swapsService.detectSwapCycles();
  }

  @Post('admin/execute/:id')
  @ApiOperation({ summary: 'Execute a direct swap (admin)' })
  @ApiResponse({ status: 200, description: 'Swap executed' })
  @ApiResponse({ status: 400, description: 'Swap not ready for execution' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async executeDirectSwap(@Request() req, @Param('id') id: string) {
    return this.swapsService.executeDirectSwap(req.user.id, parseInt(id));
  }

  @Post('admin/execute-chain')
  @ApiOperation({ summary: 'Execute a swap chain (admin)' })
  @ApiResponse({ status: 200, description: 'Chain executed' })
  @ApiResponse({ status: 400, description: 'Chain validation failed' })
  async executeSwapChain(@Request() req, @Body() dto: ExecuteSwapChainDto) {
    return this.swapsService.executeSwapChain(req.user.id, dto.swapRequestIds);
  }

  @Get('admin/history')
  @ApiOperation({ summary: 'Get all swap history (admin)' })
  @ApiResponse({ status: 200, description: 'All swap history' })
  async getAllSwapHistory() {
    return this.swapsService.getSwapHistory();
  }
}
