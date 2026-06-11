import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  empId: string;

  @Column({ type: 'varchar', nullable: true })
  colorTeam: string | null; // 'Red' | 'Yellow' | 'Purple' | 'Blue'

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ default: false })
  isPasswordSet: boolean;

  @Column({ default: 0 })
  points: number;

  @Column({ type: 'int', nullable: true })
  previousRank: number | null;

  @Column({ type: 'varchar', nullable: true })
  setPasswordToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @Column({ default: 'user' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
