import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Student } from './student.entity';

export enum MembershipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Entity('group_memberships')
export class GroupMembership {
  @PrimaryColumn()
  groupId: number;

  @PrimaryColumn()
  userId: string;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.PENDING,
  })
  status: MembershipStatus;

  @CreateDateColumn()
  invitedAt: Date;

  @UpdateDateColumn()
  respondedAt: Date;

  @ManyToOne(() => Group, (group) => group.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  student: Student;
}
