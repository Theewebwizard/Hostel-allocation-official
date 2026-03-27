import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllocationDecision } from '../entities';

@Injectable()
export class DecisionsService {
  constructor(
    @InjectRepository(AllocationDecision)
    private decisionRepository: Repository<AllocationDecision>,
  ) {}

  async saveDecisions(runId: string, decisions: any[]): Promise<void> {
    for (const decision of decisions) {
      const entity = this.decisionRepository.create({
        runId,
        studentId: decision.student_id,
        decisionOrder: decision.decision_order,
        availableRooms: decision.available_rooms,
        constraintsApplied: decision.constraints_applied,
        groupId: decision.group_id,
        groupAllocationStrategy: decision.group_allocation_strategy,
        selectedRoomId: decision.selected_room_id,
        decisionReason: decision.decision_reason,
        happinessScore: decision.happiness_score,
        alternativesConsidered: decision.alternatives_considered,
      });
      await this.decisionRepository.save(entity);
    }
  }

  async getDecisionsByRun(runId: string): Promise<AllocationDecision[]> {
    return this.decisionRepository.find({
      where: { runId },
      relations: ['student', 'selectedRoom', 'group'],
      order: { decisionOrder: 'ASC' },
    });
  }

  async getDecisionByStudent(
    runId: string,
    studentId: string,
  ): Promise<AllocationDecision | null> {
    return this.decisionRepository.findOne({
      where: { runId, studentId },
      relations: ['student', 'selectedRoom', 'group'],
    });
  }
}
