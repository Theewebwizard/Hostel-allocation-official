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

  @Column({ type: 'varchar', nullable: true })
  roomType: string | null;

  @Column({ type: 'varchar', nullable: true })
  wing: string | null;

  @Column({ default: true })
  isAllowed: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Hostel, { nullable: true })
  @JoinColumn({ name: 'hostelId' })
  hostel: Hostel;
}
