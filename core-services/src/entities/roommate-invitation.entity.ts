import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
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
@Index('UQ_roommate_invitations_sender_accepted', ['senderId'], { unique: true, where: "status = 'accepted'" })
@Index('UQ_roommate_invitations_receiver_accepted', ['receiverId'], { unique: true, where: "status = 'accepted'" })
export class RoommateInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  senderId: string;

  @Column()
  receiverId: string;

  @Column({ nullable: true })
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

  @ManyToOne(() => Group, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
