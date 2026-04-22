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
  PUBLISH_RUN = 'PUBLISH_RUN',
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
  snapshot: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isReverted: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
