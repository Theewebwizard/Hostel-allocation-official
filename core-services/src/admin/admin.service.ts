import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Hostel,
  Room,
  RoomStatus,
  RoomType,
  AllocationRule,
  AllocationRun,
  AllocationRunStatus,
  AllocationMode,
  AllocationResult,
  Group,
  GroupMembership,
  MembershipStatus,
  Student,
  WingParticipationSetting,
  SystemSetting,
} from '../entities';
import {
  CreateHostelDto,
  UpdateHostelDto,
  CreateRoomDto,
  UpdateRoomDto,
  CreateRuleDto,
  UpdateRuleDto,
  BulkCreateRoomsDto,
} from './dto/admin.dto';
import { ConfigService } from '@nestjs/config';
import { DecisionsService } from '../decisions/decisions.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(AllocationRule)
    private ruleRepository: Repository<AllocationRule>,
    @InjectRepository(AllocationRun)
    private runRepository: Repository<AllocationRun>,
    @InjectRepository(AllocationResult)
    private resultRepository: Repository<AllocationResult>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMembership)
    private membershipRepository: Repository<GroupMembership>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(WingParticipationSetting)
    private wingParticipationRepository: Repository<WingParticipationSetting>,
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
    private configService: ConfigService,
    private decisionsService: DecisionsService,
    private dataSource: DataSource,
  ) {}

  // ============ HOSTEL MANAGEMENT ============

  async createHostel(createHostelDto: CreateHostelDto): Promise<Hostel> {
    const existing = await this.hostelRepository.findOne({
      where: { name: createHostelDto.name },
    });

    if (existing) {
      throw new ConflictException('Hostel with this name already exists');
    }

    const hostel = this.hostelRepository.create(createHostelDto);
    return this.hostelRepository.save(hostel);
  }

  async getAllHostels(): Promise<Hostel[]> {
    return this.hostelRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getHostelById(id: number): Promise<Hostel> {
    const hostel = await this.hostelRepository.findOne({ where: { id } });
    if (!hostel) {
      throw new NotFoundException('Hostel not found');
    }
    return hostel;
  }

  async updateHostel(
    id: number,
    updateHostelDto: UpdateHostelDto,
  ): Promise<Hostel> {
    const hostel = await this.getHostelById(id);
    Object.assign(hostel, updateHostelDto);
    return this.hostelRepository.save(hostel);
  }

  async deleteHostel(id: number): Promise<{ message: string }> {
    const hostel = await this.getHostelById(id);

    // Check if there are rooms in this hostel
    const roomCount = await this.roomRepository.count({
      where: { hostelId: id },
    });

    if (roomCount > 0) {
      throw new BadRequestException(
        'Cannot delete hostel with rooms. Delete rooms first.',
      );
    }

    await this.hostelRepository.remove(hostel);
    return { message: 'Hostel deleted successfully' };
  }

  // ============ ROOM MANAGEMENT ============

  async createRoom(createRoomDto: CreateRoomDto): Promise<Room> {
    // Verify hostel exists
    await this.getHostelById(createRoomDto.hostelId);

    const existing = await this.roomRepository.findOne({
      where: {
        hostelId: createRoomDto.hostelId,
        roomNumber: createRoomDto.roomNumber,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Room with this number already exists in this hostel',
      );
    }

    const room = this.roomRepository.create({
      ...createRoomDto,
      roomType: (createRoomDto.roomType as RoomType) || RoomType.DOUBLE,
    });
    return this.roomRepository.save(room);
  }

  async bulkCreateRooms(dto: BulkCreateRoomsDto): Promise<Room[]> {
    // Verify hostel exists
    await this.getHostelById(dto.hostelId);

    const rooms: Room[] = [];
    for (let i = 0; i < dto.count; i++) {
      const roomNumber = `${dto.startRoomNumber + i}`;
      const existing = await this.roomRepository.findOne({
        where: { hostelId: dto.hostelId, roomNumber },
      });

      if (!existing) {
        const room = this.roomRepository.create({
          hostelId: dto.hostelId,
          roomNumber,
          wing: dto.wing,
          floor: dto.floor,
          capacity: dto.capacity,
          roomType: (dto.roomType as RoomType) || RoomType.DOUBLE,
        });
        rooms.push(room);
      }
    }

    return this.roomRepository.save(rooms);
  }

  async getAllRooms(hostelId?: number): Promise<Room[]> {
    const where = hostelId ? { hostelId } : {};
    return this.roomRepository.find({
      where,
      relations: ['hostel'],
      order: { hostelId: 'ASC', wing: 'ASC', floor: 'ASC', roomNumber: 'ASC' },
    });
  }

  async getRoomById(id: number): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['hostel'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async updateRoom(id: number, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.getRoomById(id);
    Object.assign(room, updateRoomDto);
    return this.roomRepository.save(room);
  }

  async deleteRoom(id: number): Promise<{ message: string }> {
    const room = await this.getRoomById(id);
    await this.roomRepository.remove(room);
    return { message: 'Room deleted successfully' };
  }

  // ============ ALLOCATION RULES ============

  async createRule(createRuleDto: CreateRuleDto): Promise<AllocationRule> {
    if (createRuleDto.hostelId) {
      await this.getHostelById(createRuleDto.hostelId);
    }

    const rule = this.ruleRepository.create(createRuleDto);
    return this.ruleRepository.save(rule);
  }

  async getAllRules(): Promise<AllocationRule[]> {
    return this.ruleRepository.find({
      relations: ['hostel'],
      order: { priority: 'DESC', id: 'ASC' },
    });
  }

  async getRuleById(id: number): Promise<AllocationRule> {
    const rule = await this.ruleRepository.findOne({
      where: { id },
      relations: ['hostel'],
    });
    if (!rule) {
      throw new NotFoundException('Rule not found');
    }
    return rule;
  }

  async updateRule(
    id: number,
    updateRuleDto: UpdateRuleDto,
  ): Promise<AllocationRule> {
    const rule = await this.getRuleById(id);
    if (updateRuleDto.hostelId) {
      await this.getHostelById(updateRuleDto.hostelId);
    }
    Object.assign(rule, updateRuleDto);
    return this.ruleRepository.save(rule);
  }

  async deleteRule(id: number): Promise<{ message: string }> {
    const rule = await this.getRuleById(id);
    await this.ruleRepository.remove(rule);
    return { message: 'Rule deleted successfully' };
  }

  // ============ ALLOCATION RUNS ============

  async triggerAllocation(
    userId: string,
    allocationMode: AllocationMode = AllocationMode.GROUP_BASED,
  ): Promise<AllocationRun> {
    // Check if there's a finalized allocation run
    const finalizedRun = await this.runRepository.findOne({
      where: { finalized: true },
    });

    if (finalizedRun) {
      throw new BadRequestException(
        'Cannot trigger new allocation. A finalized allocation run already exists.',
      );
    }

    // Get current rules for snapshot
    const rules = await this.getAllRules();

    // Create allocation run record
    const run = this.runRepository.create({
      triggeredById: userId,
      status: AllocationRunStatus.QUEUED,
      allocationMode,
      rulesSnapshot: rules.map((r) => ({
        id: r.id,
        hostelId: r.hostelId,
        year: r.year,
        roomType: r.roomType,
        isAllowed: r.isAllowed,
        priority: r.priority,
        wing: r.wing,
      })),
    });

    await this.runRepository.save(run);

    // Trigger allocation engine asynchronously
    this.callAllocationEngine(run.id, rules, allocationMode).catch((error) => {
      console.error('Allocation engine error:', error);
      this.updateRunStatus(run.id, AllocationRunStatus.FAILED, error.message);
    });

    return run;
  }

  private async callAllocationEngine(
    runId: string,
    rules: AllocationRule[],
    allocationMode: AllocationMode,
  ): Promise<void> {
    const allocationEngineUrl = this.configService.get(
      'ALLOCATION_ENGINE_URL',
      'http://localhost:8000',
    );

    try {
      await this.updateRunStatus(runId, AllocationRunStatus.RUNNING);

      const response = await fetch(`${allocationEngineUrl}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocation_run_id: runId,
          allocation_mode: allocationMode,
          rules: rules.map((r) => ({
            id: r.id,
            hostel_id: r.hostelId,
            year: r.year,
            room_type: r.roomType,
            is_allowed: r.isAllowed,
            priority: r.priority,
            wing: r.wing,
          })),
        }),
      });

      const data = await response.json();

      // The allocation engine runs asynchronously, so we just check it was queued
      if (data.status === 'queued') {
        // Poll for completion (in production, use webhooks or message queue)
        this.pollAllocationStatus(runId, allocationEngineUrl);
      }
    } catch (error: any) {
      await this.updateRunStatus(
        runId,
        AllocationRunStatus.FAILED,
        error.message,
      );
    }
  }

  private async pollAllocationStatus(
    runId: string,
    engineUrl: string,
  ): Promise<void> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${engineUrl}/allocation/${runId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          await this.saveAllocationResults(runId, data);
          await this.updateRunStatus(
            runId,
            AllocationRunStatus.COMPLETED,
            undefined,
            data.total_students,
            data.allocated_students,
          );
        } else if (data.status === 'failed') {
          await this.updateRunStatus(
            runId,
            AllocationRunStatus.FAILED,
            data.error || 'Unknown error',
          );
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          await this.updateRunStatus(
            runId,
            AllocationRunStatus.FAILED,
            'Allocation timeout',
          );
        }
      } catch (error: any) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          await this.updateRunStatus(
            runId,
            AllocationRunStatus.FAILED,
            'Failed to get allocation status',
          );
        }
      }
    };

    setTimeout(poll, 2000); // Start polling after 2 seconds
  }

  private async saveAllocationResults(runId: string, data: any): Promise<void> {
    const allocations = data.allocations || [];
    const decisionLogs = data.decision_logs || [];

    // Save allocation results
    for (const alloc of allocations) {
      const result = this.resultRepository.create({
        runId,
        studentId: alloc.student_id,
        roomId: alloc.room_id,
        hostelName: alloc.hostel_name,
        roomNumber: alloc.room_number,
        wing: alloc.wing,
        floor: alloc.floor,
        groupId: alloc.group_id,
        happiness: alloc.happiness || 50,
      });

      await this.resultRepository.save(result);
    }

    // Save decision logs for transparency
    if (decisionLogs.length > 0) {
      await this.decisionsService.saveDecisions(runId, decisionLogs);
    }
  }

  private async updateRunStatus(
    runId: string,
    status: AllocationRunStatus,
    errorMessage?: string,
    totalStudents?: number,
    allocatedStudents?: number,
  ): Promise<void> {
    const run = await this.runRepository.findOne({ where: { id: runId } });
    if (run) {
      run.status = status;
      if (errorMessage) run.errorMessage = errorMessage;
      if (totalStudents !== undefined) run.totalStudents = totalStudents;
      if (allocatedStudents !== undefined)
        run.allocatedStudents = allocatedStudents;
      if (
        status === AllocationRunStatus.COMPLETED ||
        status === AllocationRunStatus.FAILED
      ) {
        run.endTime = new Date();
      }
      await this.runRepository.save(run);
    }
  }

  async getAllocationRuns(): Promise<AllocationRun[]> {
    return this.runRepository.find({
      relations: ['triggeredBy'],
      order: { startTime: 'DESC' },
    });
  }

  async getAllocationRunById(id: string): Promise<AllocationRun> {
    const run = await this.runRepository.findOne({
      where: { id },
      relations: ['triggeredBy'],
    });
    if (!run) {
      throw new NotFoundException('Allocation run not found');
    }
    return run;
  }

  async finalizeAllocationRun(id: string): Promise<AllocationRun> {
    const run = await this.getAllocationRunById(id);

    if (run.status !== AllocationRunStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed allocation runs can be finalized',
      );
    }

    if (run.finalized) {
      throw new BadRequestException('Allocation run is already finalized');
    }

    run.finalized = true;
    return this.runRepository.save(run);
  }

  async commitAllocationRun(id: string): Promise<{ message: string; count: number }> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Fetch the run
      const run = await manager.findOne(AllocationRun, { where: { id } });
      if (!run) {
        throw new NotFoundException('Allocation run not found');
      }

      // If not finalized, finalize it first
      if (!run.finalized) {
        if (run.status !== AllocationRunStatus.COMPLETED) {
          throw new BadRequestException('Only completed allocation runs can be committed');
        }
        run.finalized = true;
        await manager.save(AllocationRun, run);
      }

      // 2. Get all distinct rooms from allocation results
      const results = await manager.find(AllocationResult, { where: { runId: id } });
      const roomIds = [...new Set(results.map((r) => r.roomId))];

      if (roomIds.length === 0) {
        return { message: 'No rooms to commit', count: 0 };
      }

      // 3. Update all these rooms to occupied
      await manager
        .createQueryBuilder()
        .update(Room)
        .set({ status: RoomStatus.OCCUPIED })
        .whereInIds(roomIds)
        .execute();

      return {
        message: 'Allocation run committed successfully',
        count: roomIds.length,
      };
    });
  }

  async getAllocationResults(runId: string): Promise<AllocationResult[]> {
    return this.resultRepository.find({
      where: { runId },
      relations: ['student', 'room', 'group'],
      order: { happiness: 'DESC' },
    });
  }

  async updateAllocationResult(
    resultId: number,
    newRoomId: number,
  ): Promise<AllocationResult> {
    return await this.dataSource.transaction(async (manager) => {
      const result = await manager.findOne(AllocationResult, {
        where: { id: resultId },
        relations: ['room'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!result) {
        throw new NotFoundException('Allocation result not found');
      }

      // Check if allocation run is finalized
      const run = await manager.findOne(AllocationRun, {
        where: { id: result.runId },
      });

      if (!run) {
        throw new NotFoundException('Allocation run not found');
      }

      if (run.finalized) {
        throw new BadRequestException(
          'Cannot modify allocation results of a finalized run',
        );
      }

      // If room is not changing, no need to validate
      if (result.roomId === newRoomId) {
        return result;
      }

      // Verify new room exists
      const newRoom = await manager.findOne(Room, {
        where: { id: newRoomId },
        relations: ['hostel'],
      });

      if (!newRoom) {
        throw new NotFoundException('Room not found');
      }

      // Check room capacity with pessimistic lock to prevent race condition
      const currentAllocations = await manager
        .createQueryBuilder(AllocationResult, 'ar')
        .where('ar.runId = :runId', { runId: result.runId })
        .andWhere('ar.roomId = :roomId', { roomId: newRoomId })
        .setLock('pessimistic_write')
        .getCount();

      if (currentAllocations >= newRoom.capacity) {
        throw new BadRequestException(
          `Room ${newRoom.roomNumber} is at full capacity (${newRoom.capacity}/${newRoom.capacity})`,
        );
      }

      // Update allocation result
      result.roomId = newRoomId;
      result.hostelName = newRoom.hostel.name;
      result.roomNumber = newRoom.roomNumber;
      result.wing = newRoom.wing;
      result.floor = newRoom.floor;

      return manager.save(AllocationResult, result);
    });
  }

  // ============ DASHBOARD STATS ============

  async getDashboardStats(): Promise<any> {
    const [
      totalStudents,
      totalGroups,
      totalHostels,
      totalRooms,
      totalRules,
      latestRun,
    ] = await Promise.all([
      this.studentRepository.count(),
      this.groupRepository.count(),
      this.hostelRepository.count(),
      this.roomRepository.count(),
      this.ruleRepository.count(),
      this.runRepository
        .find({
          order: { startTime: 'DESC' },
          take: 1,
        })
        .then((runs) => runs[0] || null),
    ]);

    const totalBeds = await this.roomRepository
      .createQueryBuilder('room')
      .select('SUM(room.capacity)', 'total')
      .getRawOne();

    const acceptedMemberships = await this.membershipRepository.count({
      where: { status: MembershipStatus.ACCEPTED },
    });

    return {
      totalStudents,
      totalGroups,
      studentsInGroups: acceptedMemberships,
      totalHostels,
      totalRooms,
      totalBeds: parseInt(totalBeds?.total || '0'),
      totalRules,
      latestAllocationRun: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            startTime: latestRun.startTime,
            endTime: latestRun.endTime,
            totalStudents: latestRun.totalStudents,
            allocatedStudents: latestRun.allocatedStudents,
          }
        : null,
    };
  }

  // ============ WING PARTICIPATION SETTINGS ============

  async setWingParticipation(
    year: number,
    isAllowed: boolean,
  ): Promise<WingParticipationSetting> {
    const existing = await this.wingParticipationRepository.findOne({
      where: { year },
    });

    if (existing) {
      existing.isAllowed = isAllowed;
      return this.wingParticipationRepository.save(existing);
    }

    const setting = this.wingParticipationRepository.create({
      year,
      isAllowed,
    });
    return this.wingParticipationRepository.save(setting);
  }

  async getWingParticipationSettings(): Promise<WingParticipationSetting[]> {
    return this.wingParticipationRepository.find({
      order: { year: 'ASC' },
    });
  }

  async isWingParticipationAllowed(year: number): Promise<boolean> {
    const setting = await this.wingParticipationRepository.findOne({
      where: { year },
    });
    return setting ? setting.isAllowed : true;
  }

  // ============ SYSTEM SETTINGS (ALLOCATION POLICY) ============

  async getAllocationPolicy(): Promise<string> {
    const setting = await this.systemSettingRepository.findOne({
      where: { key: 'allocationPolicy' },
    });
    return setting ? setting.value : 'group_based';
  }

  async setAllocationPolicy(policy: string): Promise<{ policy: string }> {
    const existing = await this.systemSettingRepository.findOne({
      where: { key: 'allocationPolicy' },
    });

    if (existing) {
      existing.value = policy;
      await this.systemSettingRepository.save(existing);
    } else {
      const setting = this.systemSettingRepository.create({
        key: 'allocationPolicy',
        value: policy,
      });
      await this.systemSettingRepository.save(setting);
    }

    return { policy };
  }
}
