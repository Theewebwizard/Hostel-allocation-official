import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  SwapRequest,
  SwapRequestStatus,
  SwapType,
  SwapHistory,
  SwapExecutionType,
  Student,
  Room,
  Hostel,
  AllocationRun,
} from '../entities';
import {
  CreateSwapRequestDto,
  RespondSwapRequestDto,
  SwapRequestResponseDto,
  SwapChainDto,
} from './dto/swaps.dto';

@Injectable()
export class SwapsService {
  constructor(
    @InjectRepository(SwapRequest)
    private swapRequestRepository: Repository<SwapRequest>,
    @InjectRepository(SwapHistory)
    private swapHistoryRepository: Repository<SwapHistory>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
    @InjectRepository(AllocationRun)
    private runRepository: Repository<AllocationRun>,
  ) {}

  // ============ STUDENT ACTIONS ============

  async createSwapRequest(
    userId: string,
    dto: CreateSwapRequestDto,
  ): Promise<SwapRequest> {
    const student = await this.studentRepository.findOne({
      where: { userId },
      relations: ['currentRoom', 'currentRoom.hostel'],
    });

    if (!student || !student.currentRoomId) {
      throw new BadRequestException(
        'You must have an allocated room to request a swap',
      );
    }

    const existingRequest = await this.swapRequestRepository.findOne({
      where: {
        requesterId: userId,
        status: SwapRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new ConflictException('You already have a pending swap request');
    }

    if (dto.targetStudentId) {
      await this.validateDirectSwap(student, dto.targetStudentId);
    }

    const swapRequest = this.swapRequestRepository.create({
      requesterId: userId,
      requesterRoomId: student.currentRoomId!,
      targetStudentId: dto.targetStudentId || undefined,
      targetRoomId: dto.targetRoomId || undefined,
      swapType: dto.targetStudentId ? SwapType.DIRECT : SwapType.OPEN,
      reason: dto.reason,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return this.swapRequestRepository.save(swapRequest);
  }

  async getMySwapRequests(userId: string): Promise<SwapRequestResponseDto[]> {
    const requests = await this.swapRequestRepository.find({
      where: { requesterId: userId },
      relations: [
        'requester',
        'targetStudent',
        'requesterRoom',
        'requesterRoom.hostel',
        'targetRoom',
        'targetRoom.hostel',
      ],
      order: { createdAt: 'DESC' },
    });

    return requests.map(this.mapToResponseDto);
  }

  async getIncomingSwapRequests(
    userId: string,
  ): Promise<SwapRequestResponseDto[]> {
    const requests = await this.swapRequestRepository.find({
      where: {
        targetStudentId: userId,
        status: SwapRequestStatus.PENDING,
      },
      relations: [
        'requester',
        'requesterRoom',
        'requesterRoom.hostel',
        'targetRoom',
        'targetRoom.hostel',
      ],
      order: { createdAt: 'DESC' },
    });

    return requests.map(this.mapToResponseDto);
  }

  async respondToSwapRequest(
    userId: string,
    requestId: number,
    dto: RespondSwapRequestDto,
  ): Promise<SwapRequest> {
    const request = await this.swapRequestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'targetStudent'],
    });

    if (!request) {
      throw new NotFoundException('Swap request not found');
    }

    if (request.targetStudentId !== userId) {
      throw new ForbiddenException(
        'You are not the target of this swap request',
      );
    }

    if (request.status !== SwapRequestStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }

    if (dto.response === 'accepted') {
      request.status = SwapRequestStatus.ACCEPTED;
    } else {
      request.status = SwapRequestStatus.REJECTED;
      if (dto.rejectionReason) {
        request.rejectionReason = dto.rejectionReason;
      }
    }

    return this.swapRequestRepository.save(request);
  }

  async cancelSwapRequest(
    userId: string,
    requestId: number,
  ): Promise<SwapRequest> {
    const request = await this.swapRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Swap request not found');
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status !== SwapRequestStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending requests');
    }

    request.status = SwapRequestStatus.CANCELLED;
    return this.swapRequestRepository.save(request);
  }

  // ============ VALIDATION LOGIC ============

  private async validateDirectSwap(
    requester: Student,
    targetStudentId: string,
  ): Promise<void> {
    const targetStudent = await this.studentRepository.findOne({
      where: { userId: targetStudentId },
      relations: ['currentRoom', 'currentRoom.hostel'],
    });

    if (!targetStudent || !targetStudent.currentRoomId) {
      throw new BadRequestException(
        'Target student not found or has no room assigned',
      );
    }

    const requesterHostel = await this.hostelRepository.findOne({
      where: { id: requester.currentRoom.hostelId },
    });
    const targetHostel = await this.hostelRepository.findOne({
      where: { id: targetStudent.currentRoom.hostelId },
    });

    if (!requesterHostel || !targetHostel) {
      throw new BadRequestException('Hostel information not found');
    }

    // Validate gender constraints
    if (requester.gender !== targetStudent.gender) {
      throw new BadRequestException(
        'Cannot swap with student of different gender',
      );
    }

    // Cross-hostel validation: only 3rd/4th year students
    if (requesterHostel.id !== targetHostel.id) {
      if (requester.year < 3 || targetStudent.year < 3) {
        throw new BadRequestException(
          'Cross-hostel swaps are only allowed for 3rd and 4th year students',
        );
      }

      // Validate hostel gender compatibility
      if (
        requesterHostel.genderType !== 'co-ed' &&
        requesterHostel.genderType !== (targetStudent.gender as string)
      ) {
        throw new BadRequestException(
          'Target hostel does not allow your gender',
        );
      }
      if (
        targetHostel.genderType !== 'co-ed' &&
        targetHostel.genderType !== (requester.gender as string)
      ) {
        throw new BadRequestException(
          'Your hostel does not allow target student gender',
        );
      }
    }
  }

  async validateSwapChain(swapRequestIds: number[]): Promise<{
    isValid: boolean;
    errors: string[];
    chain: SwapChainDto;
  }> {
    const errors: string[] = [];
    const requests = await this.swapRequestRepository.find({
      where: { id: In(swapRequestIds) },
      relations: [
        'requester',
        'targetStudent',
        'requesterRoom',
        'requesterRoom.hostel',
      ],
    });

    if (requests.length !== swapRequestIds.length) {
      errors.push('Some swap requests not found');
    }

    // Build participant list
    const participants: SwapChainDto['participants'] = [];

    for (const req of requests) {
      // Gender validation
      if (
        req.targetStudent &&
        req.requester.gender !== req.targetStudent.gender
      ) {
        errors.push(
          `Gender mismatch: ${req.requester.fullName} and ${req.targetStudent.fullName}`,
        );
      }

      // Check cross-hostel year constraint
      if (req.targetRoom && req.requesterRoom) {
        const reqHostelId = req.requesterRoom.hostelId;
        const targetHostelId = req.targetRoom.hostelId;

        if (reqHostelId !== targetHostelId) {
          if (req.requester.year < 3) {
            errors.push(
              `${req.requester.fullName} is not allowed cross-hostel swap (year < 3)`,
            );
          }
        }
      }

      participants.push({
        studentId: req.requesterId,
        studentName: req.requester?.fullName || 'Unknown',
        currentRoomId: req.requesterRoomId,
        targetRoomId: req.targetRoomId || 0,
      });
    }

    const chainId = uuidv4();

    return {
      isValid: errors.length === 0,
      errors,
      chain: {
        chainId,
        participants,
        canExecute: errors.length === 0,
        validationErrors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  // ============ CYCLE DETECTION (GRAPH ALGORITHM) ============

  async detectSwapCycles(): Promise<SwapChainDto[]> {
    const requests = await this.swapRequestRepository.find({
      where: [
        { status: SwapRequestStatus.PENDING },
        { status: SwapRequestStatus.ACCEPTED },
      ],
      relations: ['requester', 'targetStudent', 'requesterRoom'],
    });

    // Build directed graph: studentId -> targetStudentId
    const graph = new Map<string, string>();
    const nodeData = new Map<string, { roomId: number; requestId: number }>();

    for (const req of requests) {
      if (req.targetStudentId) {
        graph.set(req.requesterId, req.targetStudentId);
        nodeData.set(req.requesterId, {
          roomId: req.requesterRoomId,
          requestId: req.id,
        });
      }
    }

    // Find all cycles using DFS
    const cycles: SwapChainDto[] = [];
    const globalVisited = new Set<string>();

    for (const startNode of graph.keys()) {
      if (globalVisited.has(startNode)) continue;

      const visited = new Set<string>();
      const recStack = new Set<string>();
      const path: string[] = [];

      const cycle = this.findCycleDFS(
        startNode,
        graph,
        visited,
        recStack,
        path,
      );

      // Mark all visited nodes as globally visited
      visited.forEach((node) => globalVisited.add(node));

      if (cycle && cycle.length >= 2) {
        const chainId = uuidv4();
        const participants = await Promise.all(
          cycle.map(async (sid) => {
            const student = await this.studentRepository.findOne({
              where: { userId: sid },
            });
            const data = nodeData.get(sid);
            const targetId = graph.get(sid);
            const targetData = nodeData.get(targetId!);

            return {
              studentId: sid,
              studentName: student?.fullName || 'Unknown',
              currentRoomId: data?.roomId || 0,
              targetRoomId: targetData?.roomId || 0,
            };
          }),
        );

        cycles.push({
          chainId,
          participants,
          canExecute: true,
        });
      }
    }

    return cycles;
  }

  private findCycleDFS(
    node: string,
    graph: Map<string, string>,
    visited: Set<string>,
    recStack: Set<string>,
    path: string[],
  ): string[] | null {
    if (recStack.has(node)) {
      // Found cycle - extract it
      const cycleStart = path.indexOf(node);
      return path.slice(cycleStart);
    }

    if (visited.has(node)) {
      return null;
    }

    visited.add(node);
    recStack.add(node);
    path.push(node);

    const next = graph.get(node);
    if (next) {
      const cycle = this.findCycleDFS(next, graph, visited, recStack, path);
      if (cycle) return cycle;
    }

    recStack.delete(node);
    path.pop();
    return null;
  }

  // ============ ADMIN ACTIONS ============

  async getAllSwapRequests(): Promise<SwapRequestResponseDto[]> {
    const requests = await this.swapRequestRepository.find({
      relations: [
        'requester',
        'targetStudent',
        'requesterRoom',
        'requesterRoom.hostel',
        'targetRoom',
        'targetRoom.hostel',
      ],
      order: { createdAt: 'DESC' },
    });

    return requests.map(this.mapToResponseDto);
  }

  async executeDirectSwap(
    adminUserId: string,
    requestId: number,
  ): Promise<SwapHistory[]> {
    // Check if there's a finalized allocation run
    const finalizedRun = await this.runRepository.findOne({
      where: { finalized: true },
    });

    if (finalizedRun) {
      throw new BadRequestException(
        'Cannot execute swaps when allocation is finalized',
      );
    }

    const request = await this.swapRequestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'targetStudent'],
    });

    if (!request) {
      throw new NotFoundException('Swap request not found');
    }

    if (request.status !== SwapRequestStatus.ACCEPTED) {
      throw new BadRequestException('Swap request must be accepted first');
    }

    if (!request.targetStudentId) {
      throw new BadRequestException('Direct swap requires a target student');
    }

    // Get both students
    const requester = await this.studentRepository.findOne({
      where: { userId: request.requesterId },
    });
    const target = await this.studentRepository.findOne({
      where: { userId: request.targetStudentId },
    });

    if (!requester || !target) {
      throw new NotFoundException('One or both students not found');
    }

    const requesterOldRoom = requester.currentRoomId;
    const targetOldRoom = target.currentRoomId;

    // Swap rooms
    requester.currentRoomId = targetOldRoom;
    target.currentRoomId = requesterOldRoom;

    await this.studentRepository.save([requester, target]);

    // Create history records
    const histories: SwapHistory[] = [];

    histories.push(
      this.swapHistoryRepository.create({
        studentId: request.requesterId,
        previousRoomId: requesterOldRoom,
        newRoomId: targetOldRoom,
        swapRequestId: requestId,
        executionType: SwapExecutionType.DIRECT,
        executedById: adminUserId,
      }),
    );

    histories.push(
      this.swapHistoryRepository.create({
        studentId: request.targetStudentId,
        previousRoomId: targetOldRoom,
        newRoomId: requesterOldRoom,
        swapRequestId: requestId,
        executionType: SwapExecutionType.DIRECT,
        executedById: adminUserId,
      }),
    );

    await this.swapHistoryRepository.save(histories);

    // Update request status
    request.status = SwapRequestStatus.COMPLETED;
    await this.swapRequestRepository.save(request);

    return histories;
  }

  async executeSwapChain(
    adminUserId: string,
    swapRequestIds: number[],
  ): Promise<SwapHistory[]> {
    // Check if there's a finalized allocation run
    const finalizedRun = await this.runRepository.findOne({
      where: { finalized: true },
    });

    if (finalizedRun) {
      throw new BadRequestException(
        'Cannot execute swaps when allocation is finalized',
      );
    }

    // Validate the chain first
    const validation = await this.validateSwapChain(swapRequestIds);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Chain validation failed: ${validation.errors.join(', ')}`,
      );
    }

    const chainId = validation.chain.chainId;
    const histories: SwapHistory[] = [];

    // Get all requests
    const requests = await this.swapRequestRepository.find({
      where: { id: In(swapRequestIds) },
      relations: ['requester'],
    });

    // Build the swap mapping: each student gets the next student's room
    const roomAssignments: {
      studentId: string;
      newRoomId: number;
      oldRoomId: number;
    }[] = [];
    const participants = validation.chain.participants;

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const nextParticipant = participants[(i + 1) % participants.length];

      roomAssignments.push({
        studentId: participant.studentId,
        newRoomId: nextParticipant.currentRoomId,
        oldRoomId: participant.currentRoomId,
      });
    }

    // Execute all swaps
    for (const assignment of roomAssignments) {
      const student = await this.studentRepository.findOne({
        where: { userId: assignment.studentId },
      });

      if (student) {
        student.currentRoomId = assignment.newRoomId;
        await this.studentRepository.save(student);

        const history = this.swapHistoryRepository.create({
          studentId: assignment.studentId,
          previousRoomId: assignment.oldRoomId,
          newRoomId: assignment.newRoomId,
          chainId,
          executionType: SwapExecutionType.CHAIN,
          chainDetails: {
            chainLength: participants.length,
            participants: participants.map((p) => p.studentId),
          },
          executedById: adminUserId,
        });

        histories.push(history);
      }
    }

    await this.swapHistoryRepository.save(histories);

    // Update all request statuses
    await this.swapRequestRepository.update(
      { id: In(swapRequestIds) },
      { status: SwapRequestStatus.COMPLETED, chainId },
    );

    return histories;
  }

  async getSwapHistory(studentId?: string): Promise<SwapHistory[]> {
    const where = studentId ? { studentId } : {};
    return this.swapHistoryRepository.find({
      where,
      relations: [
        'student',
        'previousRoom',
        'previousRoom.hostel',
        'newRoom',
        'newRoom.hostel',
      ],
      order: { executedAt: 'DESC' },
    });
  }

  // ============ HELPERS ============

  private mapToResponseDto = (req: SwapRequest): SwapRequestResponseDto => ({
    id: req.id,
    requesterId: req.requesterId,
    requesterName: req.requester?.fullName || 'Unknown',
    requesterRollNumber: req.requester?.rollNumber || 'Unknown',
    requesterRoom: {
      id: req.requesterRoom?.id,
      roomNumber: req.requesterRoom?.roomNumber,
      hostelName: req.requesterRoom?.hostel?.name || 'Unknown',
      wing: req.requesterRoom?.wing,
      floor: req.requesterRoom?.floor,
    },
    targetStudentId: req.targetStudentId,
    targetStudentName: req.targetStudent?.fullName,
    targetRoom: req.targetRoom
      ? {
          id: req.targetRoom.id,
          roomNumber: req.targetRoom.roomNumber,
          hostelName: req.targetRoom.hostel?.name || 'Unknown',
          wing: req.targetRoom.wing,
          floor: req.targetRoom.floor,
        }
      : undefined,
    status: req.status,
    swapType: req.swapType,
    reason: req.reason,
    createdAt: req.createdAt,
    expiresAt: req.expiresAt,
  });
}
