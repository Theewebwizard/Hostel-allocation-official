import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { StudentGender } from './hostel.entity';
import { GroupMembership } from './group-membership.entity';
import { Room } from './room.entity';

@Entity('students')
export class Student {
  @PrimaryColumn('uuid')
  userId: string;

  @Column({ unique: true })
  rollNumber: string;

  @Column()
  fullName: string;

  @Column()
  year: number;

  @Column({
    type: 'enum',
    enum: StudentGender,
    default: StudentGender.MALE,
  })
  gender: StudentGender;

  @Column({ nullable: true })
  program: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  applicationTimestamp: Date;

  // Room assigned during initial allocation
  @Column({ nullable: true })
  allocatedRoomId: number;

  // Current room (may differ from allocated after swaps)
  @Column({ nullable: true })
  currentRoomId: number;

  @OneToOne(() => User, (user) => user.student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => GroupMembership, (membership) => membership.student)
  groupMemberships: GroupMembership[];

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'allocatedRoomId' })
  allocatedRoom: Room;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'currentRoomId' })
  currentRoom: Room;
}
