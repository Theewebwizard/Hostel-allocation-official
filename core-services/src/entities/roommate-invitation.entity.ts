import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from './student.entity';
import { Group } from './group.entity';

export enum RoommateInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('roommate_invitations')
export class RoommateInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  senderId: string;

  @Column()
  receiverId: string;

  @Column()
  groupId: number;

  @Column({
    type: 'enum',
    enum: RoommateInvitationStatus,
    default: RoommateInvitationStatus.PENDING,
  })
  status: RoommateInvitationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'senderId', referencedColumnName: 'userId' })
  sender: Student;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'receiverId', referencedColumnName: 'userId' })
  receiver: Student;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
