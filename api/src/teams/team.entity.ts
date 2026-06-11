import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('teams')
export class Team {
  @PrimaryColumn()
  id: string; // Three-letter country code, e.g., 'USA', 'ARG', 'FRA'

  @Column()
  name: string; // Display name, e.g., 'United States', 'Argentina', 'France'

  @Column()
  group: string; // Group A-L, e.g., 'A', 'B', 'C'

  @Column()
  flag: string; // Emoji representation, e.g., '🇺🇸', '🇦🇷', '🇫🇷'

  @Column({ type: 'int', nullable: true })
  fifaRanking: number | null;
}
