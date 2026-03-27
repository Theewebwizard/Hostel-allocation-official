import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hostel } from './hostel.entity';

@Entity('allocation_rules')
export class AllocationRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  hostelId: number;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true })
  roomType: string;

  @Column({ default: true })
  isAllowed: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Hostel, { nullable: true })
  @JoinColumn({ name: 'hostelId' })
  hostel: Hostel;
}
