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
  OCCUPIED = 'occupied',
}

export enum RoomType {
  SINGLE = 'single',
  DOUBLE = 'double',
  TRIPLE = 'triple',
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

  @Column({
    type: 'enum',
    enum: RoomType,
    default: RoomType.DOUBLE,
  })
  roomType: RoomType;

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
