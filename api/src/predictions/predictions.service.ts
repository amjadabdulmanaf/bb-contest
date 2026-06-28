import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Team } from '../teams/team.entity';
import { Match } from '../matches/match.entity';
import { UserPrediction } from './prediction.entity';
import { User } from '../users/user.entity';
import { Player } from '../players/player.entity';

@Injectable()
export class PredictionsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(UserPrediction)
    private predictionRepository: Repository<UserPrediction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
  ) {}

  async getPlayers(): Promise<Player[]> {
    return this.playerRepository.find({ order: { name: 'ASC' } });
  }

  async getSchedule() {
    const teams = await this.teamRepository.find({ order: { group: 'ASC', id: 'ASC' } });
    const matches = await this.matchRepository.find({ order: { dateTime: 'ASC', id: 'ASC' } });
    return { teams, matches };
  }

  async getUserPredictions(userId: string): Promise<UserPrediction[]> {
    return this.predictionRepository.find({ where: { userId } });
  }

  async saveUserPredictions(userId: string, predictionsDto: any[]): Promise<UserPrediction[]> {
    const savedPredictions: UserPrediction[] = [];

    // Validate completeness of predictions before saving
    for (const pred of predictionsDto) {
      const match = await this.matchRepository.findOne({ where: { id: pred.matchId } });
      if (!match) {
        throw new NotFoundException(`Match ${pred.matchId} not found.`);
      }

      if (match.dateTime && new Date() >= new Date(match.dateTime)) {
        continue;
      }

      const hasHome = pred.homeScore !== undefined && pred.homeScore !== null && pred.homeScore !== '';
      const hasAway = pred.awayScore !== undefined && pred.awayScore !== null && pred.awayScore !== '';
      const hasScorer = pred.predictedScorerId !== undefined && pred.predictedScorerId !== null && pred.predictedScorerId !== '';

      const started = hasHome || hasAway || hasScorer;
      if (started) {
        if (!hasHome || !hasAway || !hasScorer) {
          throw new BadRequestException(`Prediction for Match #${match.matchNumber} is incomplete. Please complete all related predictions (scores and goal scorer).`);
        }

        const homeScoreVal = typeof pred.homeScore === 'number' ? pred.homeScore : parseInt(pred.homeScore, 10);
        const awayScoreVal = typeof pred.awayScore === 'number' ? pred.awayScore : parseInt(pred.awayScore, 10);

        if (isNaN(homeScoreVal) || isNaN(awayScoreVal)) {
          throw new BadRequestException(`Prediction scores for Match #${match.matchNumber} must be valid integers.`);
        }

        if (match.type === 'knockout' && homeScoreVal === awayScoreVal) {
          const winnerId = pred.predictedWinnerId;
          if (!winnerId || (winnerId !== match.homeTeamId && winnerId !== match.awayTeamId)) {
            throw new BadRequestException(`Prediction for Match #${match.matchNumber} is incomplete. Please select a valid shootout winner.`);
          }
        }
      }
    }

    for (const pred of predictionsDto) {
      const match = await this.matchRepository.findOne({ where: { id: pred.matchId } });
      if (!match) {
        throw new NotFoundException(`Match ${pred.matchId} not found.`);
      }

      // Lock check: Match datetime must be in the future
      if (match.dateTime && new Date() >= new Date(match.dateTime)) {
        throw new BadRequestException(`Fixture ${match.id} has already started. Predictions are locked.`);
      }

      let prediction = await this.predictionRepository.findOne({
        where: { userId, matchId: pred.matchId }
      });

      if (!prediction) {
        prediction = this.predictionRepository.create({
          userId,
          matchId: pred.matchId,
        });
      }

      prediction.homeScore = pred.homeScore !== undefined && pred.homeScore !== null && pred.homeScore !== '' ? parseInt(pred.homeScore, 10) : null;
      prediction.awayScore = pred.awayScore !== undefined && pred.awayScore !== null && pred.awayScore !== '' ? parseInt(pred.awayScore, 10) : null;
      prediction.predictedScorerId = pred.predictedScorerId !== undefined && pred.predictedScorerId !== null ? pred.predictedScorerId : null;
      prediction.bracketStage = match.type || 'group';

      if (match.type === 'knockout') {
        if (prediction.homeScore !== null && prediction.awayScore !== null) {
          if (prediction.homeScore > prediction.awayScore) {
            prediction.predictedWinnerId = match.homeTeamId;
            prediction.predictedResolutionTime = pred.predictedResolutionTime === 'Extra Time' ? 'Extra Time' : 'Normal Time';
          } else if (prediction.homeScore < prediction.awayScore) {
            prediction.predictedWinnerId = match.awayTeamId;
            prediction.predictedResolutionTime = pred.predictedResolutionTime === 'Extra Time' ? 'Extra Time' : 'Normal Time';
          } else {
            prediction.predictedWinnerId = pred.predictedWinnerId || null;
            prediction.predictedResolutionTime = 'Penalty Shootout';
          }
        } else {
          prediction.predictedWinnerId = null;
          prediction.predictedResolutionTime = null;
        }
      } else {
        prediction.predictedWinnerId = null;
        prediction.predictedResolutionTime = null;
      }

      const saved = await this.predictionRepository.save(prediction);
      savedPredictions.push(saved);
    }

    return savedPredictions;
  }

  async getLeaderboard(): Promise<User[]> {
    // Return users (non-admins) who have predicted at least one match, sorted by points DESC, then displayName ASC
    return this.userRepository.createQueryBuilder('user')
      .where('user.role != :role', { role: 'admin' })
      .andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('1')
          .from(UserPrediction, 'prediction')
          .where('prediction.userId = user.id')
          .andWhere('prediction.homeScore IS NOT NULL')
          .andWhere('prediction.awayScore IS NOT NULL')
          .getQuery();
        return 'EXISTS ' + subQuery;
      })
      .orderBy('user.points', 'DESC')
      .addOrderBy('user.exactMatches', 'DESC')
      .addOrderBy('user.goalScorers', 'DESC')
      .addOrderBy('user.results', 'DESC')
      .addOrderBy('user.times', 'DESC')
      .addOrderBy('user.displayName', 'ASC')
      .getMany();
  }

  async getColorLeaderboard(): Promise<any[]> {
    const result = await this.userRepository.createQueryBuilder('user')
      .select('user.colorTeam', 'colorTeam')
      .addSelect('COUNT(user.id)', 'employeeCount')
      .addSelect('SUM(user.points)', 'totalPoints')
      .where('user.role != :role', { role: 'admin' })
      .andWhere('user.colorTeam IS NOT NULL')
      .andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('1')
          .from(UserPrediction, 'prediction')
          .where('prediction.userId = user.id')
          .andWhere('prediction.homeScore IS NOT NULL')
          .andWhere('prediction.awayScore IS NOT NULL')
          .getQuery();
        return 'EXISTS ' + subQuery;
      })
      .groupBy('user.colorTeam')
      .orderBy('SUM(user.points)', 'DESC')
      .addOrderBy('user.colorTeam', 'ASC')
      .getRawMany();

    const mapped = result.map((row) => ({
      rank: 1,
      colorTeam: row.colorTeam,
      employeeCount: parseInt(row.employeeCount, 10) || 0,
      totalPoints: parseInt(row.totalPoints, 10) || 0,
    }));

    for (let i = 0; i < mapped.length; i++) {
      let rank = i + 1;
      for (let j = i - 1; j >= 0; j--) {
        if (mapped[j].totalPoints === mapped[i].totalPoints) {
          rank = j + 1;
        } else {
          break;
        }
      }
      mapped[i].rank = rank;
    }

    return mapped;
  }

  async getPredictionsByMatch(matchId: string): Promise<UserPrediction[]> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found.`);
    }

    // Lock check: Match datetime must have started
    if (match.dateTime && new Date() < new Date(match.dateTime)) {
      throw new BadRequestException(`Fixture ${match.id} has not started yet. Predictions are locked.`);
    }

    return this.predictionRepository.find({
      where: {
        matchId,
        homeScore: Not(IsNull()),
        awayScore: Not(IsNull()),
      },
      relations: ['user'],
      order: {
        user: {
          displayName: 'ASC',
        },
      },
    });
  }

  async getUserRankAndTrend(userId: string): Promise<{ rank: number | null, trend: 'up' | 'down' | 'stable' | null, previousRank: number | null }> {
    const leaderboard = await this.getLeaderboard();
    const userIndex = leaderboard.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      return {
        rank: null,
        trend: null,
        previousRank: user ? user.previousRank : null,
      };
    }

    let rank = userIndex + 1;
    for (let i = userIndex - 1; i >= 0; i--) {
      if (
        leaderboard[i].points === leaderboard[userIndex].points &&
        leaderboard[i].exactMatches === leaderboard[userIndex].exactMatches &&
        leaderboard[i].goalScorers === leaderboard[userIndex].goalScorers &&
        leaderboard[i].results === leaderboard[userIndex].results &&
        leaderboard[i].times === leaderboard[userIndex].times
      ) {
        rank = i + 1;
      } else {
        break;
      }
    }

    const user = leaderboard[userIndex];
    const previousRank = user.previousRank;
    let trend: 'up' | 'down' | 'stable' | null = null;
    
    if (previousRank !== null && previousRank !== undefined) {
      if (rank < previousRank) {
        trend = 'up';
      } else if (rank > previousRank) {
        trend = 'down';
      } else {
        trend = 'stable';
      }
    } else {
      trend = 'stable';
    }

    return {
      rank,
      trend,
      previousRank,
    };
  }
}

