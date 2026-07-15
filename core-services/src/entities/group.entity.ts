import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { GroupMembership } from './group-membership.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  creatorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('int', { array: true, default: [] })
  groupPreferences: number[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @OneToMany(() => GroupMembership, (membership) => membership.group)
  memberships: GroupMembership[];
}
