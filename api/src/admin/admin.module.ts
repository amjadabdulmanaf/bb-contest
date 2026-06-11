import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../teams/team.entity';
import { Match } from '../matches/match.entity';
import { User } from '../users/user.entity';
import { UserPrediction } from '../predictions/prediction.entity';
import { Player } from '../players/player.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, Match, User, UserPrediction, Player]),
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
