import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Student } from './student.entity';
import { Room } from './room.entity';
import { User } from './user.entity';
import { SwapRequest } from './swap-request.entity';

export enum SwapExecutionType {
  DIRECT = 'direct',
  CHAIN = 'chain',
}

@Entity('swap_history')
export class SwapHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: string;

  @Column()
  previousRoomId: number;

  @Column()
  newRoomId: number;

  @Column({ nullable: true })
  chainId: string;

  @Column({ nullable: true })
  swapRequestId: number;

  @Column({
    type: 'enum',
    enum: SwapExecutionType,
    default: SwapExecutionType.DIRECT,
  })
  executionType: SwapExecutionType;

  @Column({ type: 'jsonb', nullable: true })
  chainDetails: {
    chainLength: number;
    participants: string[];
  };

  @Column()
  executedById: string;

  @CreateDateColumn()
  executedAt: Date;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId', referencedColumnName: 'userId' })
  student: Student;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'previousRoomId' })
  previousRoom: Room;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'newRoomId' })
  newRoom: Room;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'executedById' })
  executedBy: User;

  @ManyToOne(() => SwapRequest, { nullable: true })
  @JoinColumn({ name: 'swapRequestId' })
  swapRequest: SwapRequest;
}
