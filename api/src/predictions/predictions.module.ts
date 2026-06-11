import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../teams/team.entity';
import { Match } from '../matches/match.entity';
import { UserPrediction } from './prediction.entity';
import { User } from '../users/user.entity';
import { Player } from '../players/player.entity';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, Match, UserPrediction, User, Player]),
  ],
  providers: [PredictionsService],
  controllers: [PredictionsController],
  exports: [PredictionsService],
})
export class PredictionsModule {}
