import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Student,
  Group,
  GroupMembership,
  MembershipStatus,
  Hostel,
  Room,
  AllocationResult,
  AllocationRule,
} from '../entities';

@Injectable()
export class AllocationDataService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(AllocationResult)
    private allocationResultRepository: Repository<AllocationResult>,
    @InjectRepository(AllocationRule)
    private ruleRepository: Repository<AllocationRule>,
  ) {}

  async getAllStudents() {
    return this.studentRepository.find({
      select: [
        'userId',
        'rollNumber',
        'fullName',
        'year',
        'gender',
        'program',
        'applicationTimestamp',
      ],
    });
  }

  async getAllGroups() {
    // Get groups with their memberships that have been accepted
    const groups = await this.groupRepository.find({
      relations: ['memberships', 'memberships.student'],
    });

    // Transform to include only accepted members
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      creatorId: group.creatorId,
      members: group.memberships
        .filter((m) => m.status === MembershipStatus.ACCEPTED)
        .map((m) => ({
          userId: m.student.userId,
          rollNumber: m.student.rollNumber,
          fullName: m.student.fullName,
          year: m.student.year,
          gender: m.student.gender,
          program: m.student.program,
          applicationTimestamp: m.student.applicationTimestamp,
        })),
    }));
  }

  async getAllHostels() {
    return this.hostelRepository.find({
      select: ['id', 'name', 'genderType'],
    });
  }

  async getAllRooms() {
    return this.roomRepository.find({
      select: [
        'id',
        'hostelId',
        'roomNumber',
        'floor',
        'wing',
        'capacity',
        'roomType',
        'status',
      ],
    });
  }

  async getAllData() {
    const [students, groups, hostels, rooms, rules] = await Promise.all([
      this.getAllStudents(),
      this.getAllGroups(),
      this.getAllHostels(),
      this.getAllRooms(),
      this.getAllRules(),
    ]);

    return {
      students,
      groups,
      hostels,
      rooms,
      rules,
    };
  }

  async getAllRules() {
    return this.ruleRepository.find({
      order: { priority: 'DESC', id: 'ASC' },
    });
  }

  async saveAllocationResults(runId: string, results: any[]) {
    const allocationResults = results.map((result) =>
      this.allocationResultRepository.create({
        runId,
        studentId: result.student_id,
        roomId: result.room_id,
        hostelName: result.hostel_name,
        roomNumber: result.room_number,
        wing: result.wing,
        floor: result.floor,
        groupId: result.group_id,
        happiness: result.happiness,
      }),
    );

    return this.allocationResultRepository.save(allocationResults);
  }

  async getAllocationResults(runId?: string) {
    if (runId) {
      return this.allocationResultRepository.find({
        where: { runId },
        relations: ['student', 'room', 'group'],
        order: { happiness: 'DESC' },
      });
    }

    return this.allocationResultRepository.find({
      relations: ['student', 'room', 'group'],
      order: { createdAt: 'DESC' },
    });
  }
}
