import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AllocationRunStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AllocationMode {
  GROUP_BASED = 'group_based',
  FCFS = 'fcfs',
  WING_FCFS = 'wing_fcfs',
}

@Entity('allocation_runs')
export class AllocationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  triggeredById: string;

  @Column({
    type: 'enum',
    enum: AllocationRunStatus,
    default: AllocationRunStatus.QUEUED,
  })
  status: AllocationRunStatus;

  @Column({
    type: 'enum',
    enum: AllocationMode,
    default: AllocationMode.GROUP_BASED,
  })
  allocationMode: AllocationMode;

  @Column({ type: 'jsonb', nullable: true })
  rulesSnapshot: object;

  @Column({ default: 0 })
  totalStudents: number;

  @Column({ default: 0 })
  allocatedStudents: number;

  @Column({ type: 'float', default: 0 })
  averageHappiness: number;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: false })
  finalized: boolean;

  @CreateDateColumn()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggeredById' })
  triggeredBy: User;
}
