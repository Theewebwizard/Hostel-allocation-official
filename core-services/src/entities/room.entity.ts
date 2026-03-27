import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Hostel } from './hostel.entity';

export enum RoomStatus {
  AVAILABLE = 'available',
  MAINTENANCE = 'maintenance',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hostelId: number;

  @Column()
  roomNumber: string;

  @Column({ nullable: true })
  floor: number;

  @Column({ nullable: true })
  wing: string;

  @Column()
  capacity: number;

  @Column({ default: 'double' })
  roomType: string;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.AVAILABLE,
  })
  status: RoomStatus;

  @ManyToOne(() => Hostel)
  @JoinColumn({ name: 'hostelId' })
  hostel: Hostel;
}
