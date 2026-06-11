import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Team } from '../teams/team.entity';

@Entity('matches')
export class Match {
  @PrimaryColumn()
  id: string; // Unique match code, e.g., 'M01', 'M02', ...

  @Column()
  matchNumber: number; // Order, e.g., 1, 2, ...

  @Column()
  type: string; // 'group' or 'knockout'

  @Column({ type: 'varchar', nullable: true })
  group: string | null; // Group name if group match (A-L)

  @Column({ type: 'varchar', nullable: true })
  homeTeamId: string | null;

  @Column({ type: 'varchar', nullable: true })
  awayTeamId: string | null;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'homeTeamId' })
  homeTeam: Team | null;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'awayTeamId' })
  awayTeam: Team | null;

  @Column({ type: 'varchar', nullable: true })
  knockoutPathCode: string | null; // Dynamic identifier, e.g., 'W73' (winner of match 73)

  @Column({ type: 'timestamp with time zone', nullable: true })
  dateTime: Date | null;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'completed'

  @Column({ type: 'int', nullable: true })
  homeScore: number | null;

  @Column({ type: 'int', nullable: true })
  awayScore: number | null;

  @Column({ type: 'simple-array', nullable: true })
  actualScorers: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  actualWinnerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  resolutionTime: string | null; // 'Normal Time' | 'Extra Time' | 'Penalty Shootout'
}
