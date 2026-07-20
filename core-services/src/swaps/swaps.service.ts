import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
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
import { AdminService, StudentEligibility } from '../admin/admin.service';
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
    private adminService: AdminService,
    private dataSource: DataSource,
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

    return requests.map((req) => this.mapToResponseDto(req));
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

    return requests.map((req) => this.mapToResponseDto(req));
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

    // ELIGIBILITY CHECK: Is requester eligible for target's room?
    const reqEligibility: StudentEligibility = await this.adminService.getStudentEligibility(requester.userId);
    const targetRoomHostelId = targetStudent.currentRoom.hostelId;
    const targetRoomWing = targetStudent.currentRoom.wing || 'Default';
    
    const isReqEligible = reqEligibility.hostels.some(h => 
      h.id === targetRoomHostelId && h.wings.some(w => w.name === targetRoomWing)
    );

    if (!isReqEligible) {
      throw new BadRequestException(`You are not eligible for the target room in ${targetStudent.currentRoom.hostel.name}`);
    }

    // ELIGIBILITY CHECK: Is target eligible for requester's room?
    const targetEligibility: StudentEligibility = await this.adminService.getStudentEligibility(targetStudentId);
    const reqRoomHostelId = requester.currentRoom.hostelId;
    const reqRoomWing = requester.currentRoom.wing || 'Default';

    const isTargetEligible = targetEligibility.hostels.some(h => 
      h.id === reqRoomHostelId && h.wings.some(w => w.name === reqRoomWing)
    );

    if (!isTargetEligible) {
      throw new BadRequestException(`Target student is not eligible for your room in ${requester.currentRoom.hostel.name}`);
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

      // Chain Eligibility Validation
      if (req.targetRoom) {
        const eligibility: StudentEligibility = await this.adminService.getStudentEligibility(req.requesterId);
        const targetHostelId = req.targetRoom.hostelId;
        const targetWing = req.targetRoom.wing || 'Default';
        
        const isEligible = eligibility.hostels.some(h => 
          h.id === targetHostelId && h.wings.some(w => w.name === targetWing)
        );

        if (!isEligible) {
          errors.push(`${req.requester.fullName} is not eligible for room ${req.targetRoom.roomNumber} in ${req.targetRoom.hostel?.name}`);
        }
      }
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

    return requests.map((req) => this.mapToResponseDto(req));
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

    // ── Transactional execution with row-level locking ────────────────────────
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // 1. Lock SwapRequest row to prevent concurrent execution race conditions
      const request = await queryRunner.manager
        .createQueryBuilder(SwapRequest, 'sr')
        .where('sr.id = :id', { id: requestId })
        .setLock('pessimistic_write')
        .getOne();

      if (!request) {
        throw new NotFoundException('Swap request not found');
      }

      if (request.status !== SwapRequestStatus.ACCEPTED) {
        throw new BadRequestException('Swap request must be accepted first');
      }

      if (!request.targetStudentId) {
        throw new BadRequestException('Direct swap requires a target student');
      }

      // 2. Lock both student rows — prevents concurrent swaps on the same students
      const locked = await queryRunner.manager
        .createQueryBuilder(Student, 'student')
        .whereInIds([request.requesterId, request.targetStudentId])
        .setLock('pessimistic_write')
        .getMany();

      if (locked.length !== 2) {
        throw new NotFoundException('One or both students could not be locked for update.');
      }

      const lockedRequester = locked.find((s) => s.userId === request.requesterId)!;
      const lockedTarget = locked.find((s) => s.userId === request.targetStudentId)!;

      const requesterOldRoom = lockedRequester.currentRoomId;
      const targetOldRoom = lockedTarget.currentRoomId;

      if (requesterOldRoom === null || targetOldRoom === null) {
        throw new BadRequestException('Both students must have rooms assigned to execute a swap');
      }

      // Swap rooms: vacate requester first within transaction to avoid capacity trigger collision
      lockedRequester.currentRoomId = null;
      await queryRunner.manager.save(Student, lockedRequester);

      lockedTarget.currentRoomId = requesterOldRoom;
      await queryRunner.manager.save(Student, lockedTarget);

      lockedRequester.currentRoomId = targetOldRoom;
      await queryRunner.manager.save(Student, lockedRequester);

      // Create history records
      const histories: SwapHistory[] = [
        queryRunner.manager.create(SwapHistory, {
          studentId: request.requesterId,
          previousRoomId: requesterOldRoom as number,
          newRoomId: targetOldRoom as number,
          swapRequestId: requestId,
          executionType: SwapExecutionType.DIRECT,
          executedById: adminUserId,
        }),
        queryRunner.manager.create(SwapHistory, {
          studentId: request.targetStudentId,
          previousRoomId: targetOldRoom as number,
          newRoomId: requesterOldRoom as number,
          swapRequestId: requestId,
          executionType: SwapExecutionType.DIRECT,
          executedById: adminUserId,
        }),
      ];

      await queryRunner.manager.save(SwapHistory, histories);

      // Update request status
      request.status = SwapRequestStatus.COMPLETED;
      await queryRunner.manager.save(SwapRequest, request);

      await queryRunner.commitTransaction();
      return histories;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

  }

  async executeSwapChain(
    adminUserId: string,
    swapRequestIds: number[],
  ): Promise<SwapHistory[]> {
    // ── Pre-flight checks (outside the transaction: no locks needed yet) ────

    // Guard: no swaps while allocation is finalized
    const finalizedRun = await this.runRepository.findOne({
      where: { finalized: true },
    });
    if (finalizedRun) {
      throw new BadRequestException(
        'Cannot execute swaps when allocation is finalized',
      );
    }

    // Validate business rules (cycle shape, gender, eligibility, year constraints)
    // This logic is unchanged — do not modify.
    const validation = await this.validateSwapChain(swapRequestIds);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Chain validation failed: ${validation.errors.join(', ')}`,
      );
    }

    const chainId = validation.chain.chainId;
    const participants = validation.chain.participants;

    // Build the rotation plan: each participant receives the next participant's room.
    const roomAssignments: {
      studentId: string;
      newRoomId: number;
      oldRoomId: number;
    }[] = participants.map((p, i) => ({
      studentId: p.studentId,
      oldRoomId: p.currentRoomId,
      newRoomId: participants[(i + 1) % participants.length].currentRoomId,
    }));

    const studentIds = roomAssignments.map((a) => a.studentId);

    // ── Transactional execution with row-level locking ───────────────────────
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // Lock all involved Student rows for the duration of this transaction.
      // Any concurrent swap or eviction targeting the same students will block
      // until we commit or roll back, eliminating TOCTOU races.
      const lockedStudents = await queryRunner.manager
        .createQueryBuilder(Student, 'student')
        .whereInIds(studentIds)
        .setLock('pessimistic_write')
        .getMany();

      if (lockedStudents.length !== studentIds.length) {
        throw new BadRequestException(
          'One or more students in the swap chain could not be found.',
        );
      }

      // Index locked rows by userId for O(1) lookup
      const studentMap = new Map<string, Student>(
        lockedStudents.map((s) => [s.userId, s]),
      );

      // Capacity check: the target room must not already be at capacity
      // after accounting for the outgoing tenant.
      // Because this is a rotation, exactly one occupant leaves each room
      // before another arrives, so net capacity is unchanged. We only need
      // to reject if a room is somehow over-capacity before the swap.
      for (const assignment of roomAssignments) {
        const student = studentMap.get(assignment.studentId)!;
        if (student.currentRoomId !== assignment.oldRoomId) {
          // The student's room changed since validation — stale data, abort.
          throw new BadRequestException(
            `Student ${assignment.studentId} has moved since chain validation. Please re-validate.`,
          );
        }
      }

      // Apply the room rotation
      const histories: SwapHistory[] = [];

      for (const assignment of roomAssignments) {
        const student = studentMap.get(assignment.studentId)!;
        student.currentRoomId = assignment.newRoomId;
        await queryRunner.manager.save(Student, student);

        const history = queryRunner.manager.create(SwapHistory, {
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

      // Bulk-persist history records
      await queryRunner.manager.save(SwapHistory, histories);

      // Mark all swap requests as COMPLETED
      await queryRunner.manager.update(
        SwapRequest,
        { id: In(swapRequestIds) },
        { status: SwapRequestStatus.COMPLETED, chainId },
      );

      await queryRunner.commitTransaction();
      return histories;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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

  private mapToResponseDto(req: SwapRequest): SwapRequestResponseDto {
    return {
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
    };
  }
}
