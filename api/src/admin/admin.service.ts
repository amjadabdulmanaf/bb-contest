import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../teams/team.entity';
import { Match } from '../matches/match.entity';
import { User } from '../users/user.entity';
import { UserPrediction } from '../predictions/prediction.entity';
import { Player } from '../players/player.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPrediction)
    private predictionRepository: Repository<UserPrediction>,
  ) {}

  // ----------------------------------------
  // Teams CRUD
  // ----------------------------------------
  async findAllTeams(): Promise<Team[]> {
    return this.teamRepository.find({ order: { name: 'ASC' } });
  }

  async createTeam(dto: { id: string; name: string; flag: string; group: string; fifaRanking?: number | null }): Promise<Team> {
    const existing = await this.teamRepository.findOne({ where: { id: dto.id.toUpperCase() } });
    if (existing) {
      throw new BadRequestException(`Team with ID ${dto.id} already exists.`);
    }

    const team = this.teamRepository.create({
      id: dto.id.toUpperCase().trim(),
      name: dto.name.trim(),
      flag: dto.flag.trim(),
      group: dto.group.toUpperCase().trim(),
      fifaRanking: dto.fifaRanking !== undefined ? dto.fifaRanking : null,
    });
    return this.teamRepository.save(team);
  }

  async updateTeam(id: string, dto: { name: string; flag: string; group: string; fifaRanking?: number | null }): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team ${id} not found.`);
    }

    team.name = dto.name.trim();
    team.flag = dto.flag.trim();
    team.group = dto.group.toUpperCase().trim();
    if (dto.fifaRanking !== undefined) {
      team.fifaRanking = dto.fifaRanking;
    }
    return this.teamRepository.save(team);
  }

  async deleteTeam(id: string): Promise<void> {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team ${id} not found.`);
    }
    await this.teamRepository.remove(team);
  }

  // ----------------------------------------
  // Fixtures CRUD
  // ----------------------------------------
  async findAllFixtures(): Promise<Match[]> {
    return this.matchRepository.find({
      relations: ['homeTeam', 'awayTeam'],
      order: { dateTime: 'ASC', id: 'ASC' }
    });
  }

  async createFixture(dto: {
    id: string;
    matchNumber: number;
    type: string;
    group: string | null;
    homeTeamId: string;
    awayTeamId: string;
    dateTime: Date;
  }): Promise<Match> {
    const existing = await this.matchRepository.findOne({ where: { id: dto.id.toUpperCase() } });
    if (existing) {
      throw new BadRequestException(`Fixture with ID ${dto.id} already exists.`);
    }

    const home = await this.teamRepository.findOne({ where: { id: dto.homeTeamId } });
    const away = await this.teamRepository.findOne({ where: { id: dto.awayTeamId } });
    if (!home || !away) {
      throw new BadRequestException('Home team or Away team does not exist.');
    }

    const match = this.matchRepository.create({
      id: dto.id.toUpperCase().trim(),
      matchNumber: dto.matchNumber,
      type: dto.type,
      group: dto.group ? (dto.type === 'knockout' ? dto.group.trim() : dto.group.toUpperCase().trim()) : null,
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      dateTime: new Date(dto.dateTime),
      status: 'pending',
      homeScore: null,
      awayScore: null,
    });
    return this.matchRepository.save(match);
  }

  async updateFixture(id: string, dto: {
    matchNumber: number;
    type: string;
    group: string | null;
    homeTeamId: string;
    awayTeamId: string;
    dateTime: Date;
  }): Promise<Match> {
    const match = await this.matchRepository.findOne({ where: { id } });
    if (!match) {
      throw new NotFoundException(`Fixture ${id} not found.`);
    }

    const home = await this.teamRepository.findOne({ where: { id: dto.homeTeamId } });
    const away = await this.teamRepository.findOne({ where: { id: dto.awayTeamId } });
    if (!home || !away) {
      throw new BadRequestException('Home team or Away team does not exist.');
    }

    match.matchNumber = dto.matchNumber;
    match.type = dto.type;
    match.group = dto.group ? (dto.type === 'knockout' ? dto.group.trim() : dto.group.toUpperCase().trim()) : null;
    match.homeTeamId = dto.homeTeamId;
    match.awayTeamId = dto.awayTeamId;
    match.dateTime = new Date(dto.dateTime);
    return this.matchRepository.save(match);
  }

  async deleteFixture(id: string): Promise<void> {
    const match = await this.matchRepository.findOne({ where: { id } });
    if (!match) {
      throw new NotFoundException(`Fixture ${id} not found.`);
    }
    await this.matchRepository.remove(match);
  }

  // ----------------------------------------
  // Match Completion & Scoring
  // ----------------------------------------
  async completeMatch(
    id: string,
    homeScore: number,
    awayScore: number,
    actualScorers: string[],
    actualWinnerId?: string,
    resolutionTime?: string
  ): Promise<Match> {
    const match = await this.matchRepository.findOne({ where: { id } });
    if (!match) {
      throw new NotFoundException(`Fixture ${id} not found.`);
    }

    const now = new Date();
    if (match.dateTime && new Date(match.dateTime) > now) {
      throw new BadRequestException('Cannot enter score for a fixture that has not started yet.');
    }

    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.actualScorers = actualScorers || [];
    match.status = 'completed';

    if (match.type === 'knockout') {
      if (homeScore > awayScore) {
        match.actualWinnerId = match.homeTeamId;
        match.resolutionTime = resolutionTime === 'Extra Time' ? 'Extra Time' : 'Normal Time';
      } else if (homeScore < awayScore) {
        match.actualWinnerId = match.awayTeamId;
        match.resolutionTime = resolutionTime === 'Extra Time' ? 'Extra Time' : 'Normal Time';
      } else {
        if (!actualWinnerId) {
          throw new BadRequestException('Knockout draw must have a winner selected.');
        }
        match.actualWinnerId = actualWinnerId;
        match.resolutionTime = 'Penalty Shootout';
      }
    } else {
      match.actualWinnerId = null;
      match.resolutionTime = null;
    }

    const savedMatch = await this.matchRepository.save(match);

    // Trigger user points recalculation to prevent drift
    await this.recalculateLeaderboardPoints();

    return savedMatch;
  }

  async recalculateLeaderboardPoints(updatePreviousRank = true): Promise<void> {
    if (updatePreviousRank) {
      // 0. Snapshot current ranks of active users before recalculating
      const activeUsers = await this.userRepository.createQueryBuilder('user')
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

      const activeUserIds = new Set(activeUsers.map(u => u.id));

      for (let i = 0; i < activeUsers.length; i++) {
        let rank = i + 1;
        for (let j = i - 1; j >= 0; j--) {
          if (
            activeUsers[j].points === activeUsers[i].points &&
            activeUsers[j].exactMatches === activeUsers[i].exactMatches &&
            activeUsers[j].goalScorers === activeUsers[i].goalScorers &&
            activeUsers[j].results === activeUsers[i].results &&
            activeUsers[j].times === activeUsers[i].times
          ) {
            rank = j + 1;
          } else {
            break;
          }
        }
        activeUsers[i].previousRank = rank;
        await this.userRepository.save(activeUsers[i]);
      }

      const allUsers = await this.userRepository.find();
      for (const u of allUsers) {
        if (u.role !== 'admin' && !activeUserIds.has(u.id)) {
          if (u.previousRank !== null) {
            u.previousRank = null;
            await this.userRepository.save(u);
          }
        }
      }
    }

    // 1. Fetch all users
    const users = await this.userRepository.find();
    // 2. Fetch all completed matches
    const completedMatches = await this.matchRepository.find({ where: { status: 'completed' } });
    const matchesMap = new Map<string, Match>();
    for (const m of completedMatches) {
      matchesMap.set(m.id, m);
    }

    // 3. For each user, calculate points based on predictions
    for (const user of users) {
      if (user.role === 'admin') continue; // Skip admin

      const predictions = await this.predictionRepository.find({ where: { userId: user.id } });
      let totalPoints = 0;
      let exactMatchesCount = 0;
      let goalScorersCount = 0;
      let resultsCount = 0;
      let timesCount = 0;

      for (const pred of predictions) {
        const match = matchesMap.get(pred.matchId);
        if (!match) continue; // Match not completed or doesn't exist

        const actHome = match.homeScore;
        const actAway = match.awayScore;
        const predHome = pred.homeScore;
        const predAway = pred.awayScore;

        if (actHome === null || actAway === null || predHome === null || predAway === null) {
          continue; // Missing score data
        }

        let isExact = false;
        let isResultCorrect = false;
        let isTimeCorrect = false;
        let isGoalScorerCorrect = false;

        if (match.type === 'knockout') {
          const actWinner = actHome > actAway ? match.homeTeamId : (actHome < actAway ? match.awayTeamId : match.actualWinnerId);
          const predWinner = predHome > predAway ? match.homeTeamId : (predHome < predAway ? match.awayTeamId : pred.predictedWinnerId);

          if (actHome === predHome && actAway === predAway) {
            if (actHome === actAway) {
              if (actWinner && predWinner && actWinner === predWinner) {
                isExact = true;
              }
            } else {
              isExact = true;
            }
          }

          if (isExact) {
            totalPoints += 30;
          } else if (actWinner && predWinner && actWinner === predWinner) {
            totalPoints += 10;
          }

          if (actWinner && predWinner && actWinner === predWinner) {
            isResultCorrect = true;
          }

          // Resolution Time prediction (10 points)
          if (pred.predictedResolutionTime && pred.predictedResolutionTime === match.resolutionTime) {
            totalPoints += 10;
            isTimeCorrect = true;
          }
        } else {
          const actualHomeWin = actHome > actAway;
          const actualAwayWin = actHome < actAway;
          const actualDraw = actHome === actAway;

          const predHomeWin = predHome > predAway;
          const predAwayWin = predHome < predAway;
          const predDraw = predHome === predAway;

          // Correct exact score = 30 points
          if (actHome === predHome && actAway === predAway) {
            totalPoints += 30;
            isExact = true;
            isResultCorrect = true;
          }
          // Correct result only = 10 points
          else if (
            (actualHomeWin && predHomeWin) ||
            (actualAwayWin && predAwayWin) ||
            (actualDraw && predDraw)
          ) {
            totalPoints += 10;
            isResultCorrect = true;
          }
        }

        // Scorer prediction check = 10 points
        if (pred.predictedScorerId) {
          const actualScorersList = match.actualScorers || [];
          if (actHome === 0 && actAway === 0) {
            if (pred.predictedScorerId === 'no-scorer') {
              totalPoints += 10;
              isGoalScorerCorrect = true;
            }
          } else {
            if (actualScorersList.includes(pred.predictedScorerId)) {
              totalPoints += 10;
              isGoalScorerCorrect = true;
            }
          }
        }

        if (isExact) exactMatchesCount++;
        if (isGoalScorerCorrect) goalScorersCount++;
        if (isResultCorrect) resultsCount++;
        if (isTimeCorrect) timesCount++;
      }

      user.points = totalPoints;
      user.exactMatches = exactMatchesCount;
      user.goalScorers = goalScorersCount;
      user.results = resultsCount;
      user.times = timesCount;
      await this.userRepository.save(user);
    }
  }
}
