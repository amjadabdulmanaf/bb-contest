import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Match } from '../matches/match.entity';
import { Team } from '../teams/team.entity';

@Entity('user_predictions')
export class UserPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  matchId: string;

  @Column({ type: 'int', nullable: true })
  homeScore: number | null;

  @Column({ type: 'int', nullable: true })
  awayScore: number | null;

  @Column({ type: 'varchar', nullable: true })
  predictedWinnerId: string | null; // Used for knockout stage winners

  @Column({ default: 'group' })
  bracketStage: string; // 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'predictedWinnerId' })
  predictedWinner: Team;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  predictedScorerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  predictedResolutionTime: string | null; // 'Normal Time' | 'Extra Time' | 'Penalty Shootout'
}
