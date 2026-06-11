import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async findByEmail(email: string): Promise<User | null> {
    // Perform a case-insensitive search by using lower case comparison
    return this.usersRepository.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findBySetPasswordToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { setPasswordToken: token } });
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async findAllUsers(): Promise<User[]> {
    return this.usersRepository.find({ order: { points: 'DESC', displayName: 'ASC' } });
  }
}
