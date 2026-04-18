import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Room } from './room.entity';

export enum GenderType {
  MALE = 'male',
  FEMALE = 'female',
  COED = 'co-ed',
}

export enum StudentGender {
  MALE = 'male',
  FEMALE = 'female',
}

@Entity('hostels')
export class Hostel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: GenderType,
  })
  genderType: GenderType;

  @OneToMany(() => Room, (room) => room.hostel)
  rooms: Room[];
}
