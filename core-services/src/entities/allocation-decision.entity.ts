import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AllocationRun } from './allocation-run.entity';
import { Student } from './student.entity';
import { Room } from './room.entity';
import { Group } from './group.entity';

@Entity('allocation_decisions')
export class AllocationDecision {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  runId: string;

  @Column()
  studentId: string;

  @Column()
  decisionOrder: number; // Sequential order in allocation

  @Column({ type: 'jsonb' })
  availableRooms: {
    roomId: number;
    roomNumber: string;
    hostelName: string;
    wing?: string;
    floor?: number;
    capacity: number;
    currentOccupancy: number;
  }[];

  @Column({ type: 'jsonb' })
  constraintsApplied: {
    type: string; // 'gender', 'year_rule', 'room_type_rule', 'capacity'
    description: string;
    roomsFiltered: number;
  }[];

  @Column({ nullable: true })
  groupId: number;

  @Column({ nullable: true })
  groupAllocationStrategy: string; // 'whole_group', 'split_group', 'individual'

  @Column({ nullable: true })
  selectedRoomId: number;

  @Column()
  decisionReason: string;

  @Column({ default: 50 })
  happinessScore: number;

  @Column({ type: 'jsonb', nullable: true })
  alternativesConsidered: {
    roomId: number;
    reasonNotSelected: string;
  }[];

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => AllocationRun)
  @JoinColumn({ name: 'runId' })
  run: AllocationRun;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId', referencedColumnName: 'userId' })
  student: Student;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'selectedRoomId' })
  selectedRoom: Room;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
