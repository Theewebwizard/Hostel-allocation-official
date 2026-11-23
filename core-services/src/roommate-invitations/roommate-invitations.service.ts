import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
// CHANGED: added DataSource, EntityManager, QueryFailedError
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import {
  RoommateInvitation,
  RoommateInvitationStatus,
  Student,
  GroupMembership,
  MembershipStatus,
  SystemSetting,
} from '../entities';
import { SendRoommateInvitationDto } from './dto/send-invitation.dto';
import { RespondToInvitationDto } from './dto/respond-invitation.dto';

@Injectable()
export class RoommateInvitationsService {
  constructor(
    @InjectRepository(RoommateInvitation)
    private invitationRepository: Repository<RoommateInvitation>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(GroupMembership)
    private membershipRepository: Repository<GroupMembership>,
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
    // CHANGED: needed to open a transaction
    private dataSource: DataSource,
  ) {}

  async checkFcfsMode() {
    const policy = await this.systemSettingRepository.findOne({
      where: { key: 'active_allocation_policy' },
    });
    if (policy?.value === 'fcfs') {
      throw new BadRequestException(
        'Roommate invitations are disabled in FCFS mode',
      );
    }
  }

  private async checkNotSubmitted(userId: string): Promise<void> {
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (student && student.hasSubmitted) {
      throw new ForbiddenException(
        'You cannot modify your roommate status after submitting your application. Withdraw your application first.',
      );
    }
  }

  // NEW: one reusable check - "does this student already have an accepted roommate?"
  // Looks at BOTH columns (as sender and as receiver).
  private async hasAcceptedRoommate(
    manager: EntityManager,
    studentId: string,
  ): Promise<boolean> {
    const found = await manager.findOne(RoommateInvitation, {
      where: [
        { senderId: studentId, status: RoommateInvitationStatus.ACCEPTED },
        { receiverId: studentId, status: RoommateInvitationStatus.ACCEPTED },
      ],
    });
    return !!found;
  }

  // Unchanged from your original
  async sendInvitation(
    senderId: string,
    dto: SendRoommateInvitationDto,
  ) {
    await this.checkFcfsMode();
    await this.checkNotSubmitted(senderId);

    // 1. Check if sender is in a group
    const senderMembership = await this.membershipRepository.findOne({
      where: { userId: senderId, status: MembershipStatus.ACCEPTED },
    });

    if (!senderMembership) {
      throw new BadRequestException('You must be in a group to send a roommate invitation');
    }

    // 2. Find receiver
    const receiver = await this.studentRepository.findOne({
      where: { rollNumber: dto.receiverRollNumber },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver student not found');
    }

    if (receiver.userId === senderId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // 3. Check if receiver is in the same group
    const receiverMembership = await this.membershipRepository.findOne({
      where: {
        userId: receiver.userId,
        groupId: senderMembership.groupId,
        status: MembershipStatus.ACCEPTED,
      },
    });

    if (!receiverMembership) {
      throw new BadRequestException('Receiver must be in the same group as you');
    }

    // 4. Check if receiver already has an accepted roommate invitation
    const existingAccepted = await this.invitationRepository.findOne({
      where: [
        { senderId: receiver.userId, status: RoommateInvitationStatus.ACCEPTED },
        { receiverId: receiver.userId, status: RoommateInvitationStatus.ACCEPTED },
      ],
    });

    if (existingAccepted) {
      throw new ConflictException('Receiver already has an accepted roommate invitation');
    }

    // 5. Check if sender already has an accepted roommate invitation
    const senderAccepted = await this.invitationRepository.findOne({
      where: [
        { senderId: senderId, status: RoommateInvitationStatus.ACCEPTED },
        { receiverId: senderId, status: RoommateInvitationStatus.ACCEPTED },
      ],
    });

    if (senderAccepted) {
      throw new ConflictException('You already have an accepted roommate invitation');
    }

    // 6. Check for pending invitation
    const existingPending = await this.invitationRepository.findOne({
      where: {
        senderId,
        receiverId: receiver.userId,
        status: RoommateInvitationStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException('Invitation already pending');
    }

    const invitation = this.invitationRepository.create({
      senderId,
      receiverId: receiver.userId,
      groupId: senderMembership.groupId,
      status: RoommateInvitationStatus.PENDING,
    });

    return this.invitationRepository.save(invitation);
  }

  // CHANGED: now just routes to accept or reject
  async respondToInvitation(
    userId: string,
    invitationId: number,
    dto: RespondToInvitationDto,
  ) {
    await this.checkFcfsMode();
    await this.checkNotSubmitted(userId);

    if (dto.status === 'accepted') {
      return this.acceptInvitation(userId, invitationId);
    }
    return this.rejectInvitation(userId, invitationId);
  }

  // Reject: same behaviour as before, moved into its own method
  private async rejectInvitation(userId: string, invitationId: number) {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, receiverId: userId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== RoommateInvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer pending');
    }

    invitation.status = RoommateInvitationStatus.REJECTED;
    return this.invitationRepository.save(invitation);
  }

  // NEW: the fixed accept flow - everything inside ONE transaction, with locks
  private async acceptInvitation(userId: string, invitationId: number) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 1. Read the invitation once, just to learn who the sender is
        const preview = await manager.findOne(RoommateInvitation, {
          where: { id: invitationId, receiverId: userId },
        });

        if (!preview) {
          throw new NotFoundException('Invitation not found');
        }

        const senderId = preview.senderId;

        // 2. Lock BOTH students' rows.
        //    Sorted ids = every request locks in the same order = no deadlock.
        //    A second accept touching either student now has to wait here.
        const ids = [userId, senderId].sort();
        await manager
          .createQueryBuilder(Student, 's')
          .setLock('pessimistic_write')
          .where('s.userId IN (:...ids)', { ids })
          .orderBy('s.userId', 'ASC')
          .getMany();

        // 3. Now that we hold the locks, re-read the invitation (also locked).
        //    If another request already changed it, we see the new status.
        const invitation = await manager
          .createQueryBuilder(RoommateInvitation, 'i')
          .setLock('pessimistic_write')
          .where('i.id = :id', { id: invitationId })
          .andWhere('i.receiverId = :userId', { userId })
          .getOne();

        if (!invitation) {
          throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== RoommateInvitationStatus.PENDING) {
          throw new BadRequestException('Invitation is no longer pending');
        }

        // 4. The missing check: BOTH students must be free, not just the one accepting
        if (await this.hasAcceptedRoommate(manager, userId)) {
          throw new ConflictException('You already have an accepted roommate invitation');
        }
        if (await this.hasAcceptedRoommate(manager, senderId)) {
          throw new ConflictException('The sender already has an accepted roommate');
        }

        // 5. Mark this invitation as accepted
        invitation.status = RoommateInvitationStatus.ACCEPTED;
        const saved = await manager.save(invitation);

        // 6. Cancel every other pending invitation for BOTH students.
        //    (This one is already accepted, so it is not touched.)
        for (const id of [userId, senderId]) {
          await manager.update(
            RoommateInvitation,
            { receiverId: id, status: RoommateInvitationStatus.PENDING },
            { status: RoommateInvitationStatus.CANCELLED },
          );
          await manager.update(
            RoommateInvitation,
            { senderId: id, status: RoommateInvitationStatus.PENDING },
            { status: RoommateInvitationStatus.CANCELLED },
          );
        }

        return saved;
      });
    } catch (err) {
      // Safety net: if the database unique index still rejects the save,
      // return a clean 409 instead of a raw 500 error.
      if (
        err instanceof QueryFailedError &&
        (err as any).driverError?.code === '23505'
      ) {
        throw new ConflictException(
          'A roommate pairing already exists for one of these students',
        );
      }
      throw err;
    }
  }

  // Unchanged from your original
  async getMyInvitations(userId: string) {
    return this.invitationRepository.find({
      where: [
        { senderId: userId },
        { receiverId: userId },
      ],
      relations: ['sender', 'receiver', 'group'],
      order: { createdAt: 'DESC' },
    });
  }
}
