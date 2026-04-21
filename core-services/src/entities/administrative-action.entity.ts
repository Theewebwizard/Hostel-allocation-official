import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ActionType {
  EVICTION = 'EVICTION',
  ALLOCATION = 'ALLOCATION',
}

@Entity('administrative_actions')
export class AdministrativeAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ActionType,
  })
  actionType: ActionType;

  @Column()
  performedBy: string; // Warden ID

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'jsonb' })
  snapshot: {
    [studentId: string]: {
      roomId: number | null;
      applicationStatus: string;
    };
  };

  @Column({ default: false })
  isReverted: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
