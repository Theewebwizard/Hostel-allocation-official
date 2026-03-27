import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';

@ApiTags('decisions')
@Controller('decisions')
export class DecisionsController {
  constructor(private decisionsService: DecisionsService) {}

  @Get('run/:runId')
  @ApiOperation({ summary: 'Get all decisions for an allocation run' })
  @ApiResponse({ status: 200, description: 'List of decisions' })
  async getRunDecisions(@Param('runId') runId: string) {
    return this.decisionsService.getDecisionsByRun(runId);
  }

  @Get('run/:runId/student/:studentId')
  @ApiOperation({ summary: 'Get decision for a specific student in a run' })
  @ApiResponse({ status: 200, description: 'Decision details' })
  async getStudentDecision(
    @Param('runId') runId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.decisionsService.getDecisionByStudent(runId, studentId);
  }
}
