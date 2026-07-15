import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import {
  Student,
  Group,
  GroupMembership,
  MembershipStatus,
  Hostel,
  Room,
  AllocationResult,
  AllocationRule,
  RoommateInvitation,
  RoommateInvitationStatus,
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
    @InjectRepository(RoommateInvitation)
    private roommateInvitationRepository: Repository<RoommateInvitation>,
  ) {}

  async getAllStudents() {
    return this.studentRepository.find({
      where: {
        hasSubmitted: true,
      },
      select: [
        'userId',
        'rollNumber',
        'fullName',
        'year',
        'gender',
        'program',
        'applicationTimestamp',
        'currentRoomId',
        'hostelPreferences',
      ],
    });
  }

  async getAllGroups() {
    // Get groups with their memberships that have been accepted
    const groups = await this.groupRepository.find({
      relations: ['memberships', 'memberships.student'],
    });

    // Transform to include only accepted members who have also applied
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      creatorId: group.creatorId,
      groupPreferences: group.groupPreferences,
      members: group.memberships
        .filter((m) => m.status === MembershipStatus.ACCEPTED && m.student.hasSubmitted === true)
        .map((m) => ({
          userId: m.student.userId,
          rollNumber: m.student.rollNumber,
          fullName: m.student.fullName,
          year: m.student.year,
          gender: m.student.gender,
          program: m.student.program,
          applicationTimestamp: m.student.applicationTimestamp,
          currentRoomId: m.student.currentRoomId,
          hostelPreferences: m.student.hostelPreferences,
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
    const [students, groups, hostels, rooms, rules, roommateInvitations] =
      await Promise.all([
      this.getAllStudents(),
      this.getAllGroups(),
      this.getAllHostels(),
      this.getAllRooms(),
      this.getAllRules(),
      this.getAllRoommateInvitations(),
    ]);

    return {
      students,
      groups,
      hostels,
      rooms,
      rules,
      roommateInvitations,
    };
  }

  async getAllRules() {
    return this.ruleRepository.find({
      order: { priority: 'DESC', id: 'ASC' },
    });
  }

  async getAllRoommateInvitations() {
    return this.roommateInvitationRepository.find({
      where: { status: RoommateInvitationStatus.ACCEPTED },
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
        reason: result.reason,
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

  async getStudentResult(userId: string) {
    const result = await this.allocationResultRepository.findOne({
      where: { studentId: userId },
      relations: ['room', 'room.hostel'],
      order: { createdAt: 'DESC' },
    });

    if (!result) return null;

    // If there is no groupId, it was an individual allocation (FCFS or similar)
    // In this case, we return no neighbors as per user request
    if (!result.groupId) {
      return {
        result,
        neighbors: [],
      };
    }

    // Find group members (other students in the same group for the same run)
    const neighbors = await this.allocationResultRepository.find({
      where: {
        runId: result.runId,
        groupId: result.groupId,
      },
      relations: ["student"],
    });

    return {
      result,
      neighbors: neighbors.filter((n) => n.studentId !== userId),
    };
  }
}
