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
import { Room } from './room.entity';

export enum SwapRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum SwapType {
  DIRECT = 'direct',
  OPEN = 'open',
  CHAIN = 'chain',
}

@Entity('swap_requests')
export class SwapRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requesterId: string;

  @Column({ nullable: true })
  targetStudentId: string;

  @Column()
  requesterRoomId: number;

  @Column({ nullable: true })
  targetRoomId: number;

  @Column({
    type: 'enum',
    enum: SwapRequestStatus,
    default: SwapRequestStatus.PENDING,
  })
  status: SwapRequestStatus;

  @Column({
    type: 'enum',
    enum: SwapType,
    default: SwapType.DIRECT,
  })
  swapType: SwapType;

  @Column({ nullable: true })
  chainId: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'requesterId', referencedColumnName: 'userId' })
  requester: Student;

  @ManyToOne(() => Student, { nullable: true })
  @JoinColumn({ name: 'targetStudentId', referencedColumnName: 'userId' })
  targetStudent: Student;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'requesterRoomId' })
  requesterRoom: Room;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'targetRoomId' })
  targetRoom: Room;
}
