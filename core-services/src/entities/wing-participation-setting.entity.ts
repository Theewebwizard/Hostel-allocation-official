import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('wing_participation_settings')
export class WingParticipationSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  year: number;

  @Column({ default: true })
  isAllowed: boolean;
}
