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
  GLOBAL_OPTIMIZATION = 'global_optimization',
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

  @Column({ type: 'jsonb', nullable: true })
  metrics: Record<string, number> | null;

  @Column({ type: 'jsonb', nullable: true })
  targetYears: number[] | null;

  @Column({ type: 'jsonb', nullable: true })
  targetPrograms: string[] | null;

  @CreateDateColumn()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggeredById' })
  triggeredBy: User;
}
