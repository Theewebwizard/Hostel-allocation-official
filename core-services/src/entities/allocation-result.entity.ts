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
import { Group } from './group.entity';

@Entity('allocation_results')
export class AllocationResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  runId: string;

  @Column()
  studentId: string;

  @Column()
  roomId: number;

  @Column()
  hostelName: string;

  @Column()
  roomNumber: string;

  @Column({ nullable: true })
  wing: string;

  @Column({ nullable: true })
  floor: number;

  @Column({ nullable: true })
  groupId: number;

  @Column({ default: 50 })
  happiness: number; // 0-100 satisfaction score

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId', referencedColumnName: 'userId' })
  student: Student;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
