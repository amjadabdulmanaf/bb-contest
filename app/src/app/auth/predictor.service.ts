import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Team {
  id: string;
  name: string;
  flag: string;
  group: string;
  fifaRanking?: number | null;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position: string;
}

export interface Match {
  id: string;
  matchNumber: number;
  type: string;
  group: string;
  homeTeamId: string;
  awayTeamId: string;
  dateTime: string; // ISO string
  status: string; // 'pending' | 'completed'
  homeScore: number | null;
  awayScore: number | null;
  homeTeam?: Team;
  awayTeam?: Team;
  actualScorers?: string[];
  actualWinnerId?: string | null;
  resolutionTime?: string | null;
}

export interface UserPrediction {
  id?: string;
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedScorerId?: string | null;
  predictedWinnerId?: string | null;
  predictedResolutionTime?: string | null;
}

export interface LeaderboardUser {
  id: string;
  email: string;
  displayName: string;
  empId: string;
  colorTeam: string;
  points: number;
  exactMatches: number;
  goalScorers: number;
  results: number;
  times: number;
  previousRank?: number | null;
  role: string;
}

export interface ColorLeaderboardUser {
  rank: number;
  colorTeam: string;
  employeeCount: number;
  totalPoints: number;
}

@Injectable({
  providedIn: 'root'
})
export class PredictorService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly apiBase = this.isBrowser && window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://apibb.worldcuppredictor.in/api';

  async getSchedule(): Promise<{ teams: Team[]; matches: Match[] }> {
    return firstValueFrom(this.http.get<{ teams: Team[]; matches: Match[] }>(`${this.apiBase}/predictions/schedule`));
  }

  async getMyPredictions(): Promise<UserPrediction[]> {
    return firstValueFrom(this.http.get<UserPrediction[]>(`${this.apiBase}/predictions/my-predictions`));
  }

  async getPlayers(): Promise<Player[]> {
    return firstValueFrom(this.http.get<Player[]>(`${this.apiBase}/predictions/players`));
  }

  async savePredictions(predictions: UserPrediction[]): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.apiBase}/predictions/save`, predictions));
  }

  async getLeaderboard(): Promise<LeaderboardUser[]> {
    return firstValueFrom(this.http.get<LeaderboardUser[]>(`${this.apiBase}/predictions/leaderboard`));
  }

  async getColorLeaderboard(): Promise<ColorLeaderboardUser[]> {
    return firstValueFrom(this.http.get<ColorLeaderboardUser[]>(`${this.apiBase}/predictions/color-leaderboard`));
  }

  async getMatchPredictions(matchId: string): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.apiBase}/predictions/match/${matchId}`));
  }

  // ----------------------------------------
  // Admin Operations (conveniently placed here or separate)
  // ----------------------------------------
  async adminGetTeams(): Promise<Team[]> {
    return firstValueFrom(this.http.get<Team[]>(`${this.apiBase}/admin/teams`));
  }

  async adminCreateTeam(team: any): Promise<Team> {
    return firstValueFrom(this.http.post<Team>(`${this.apiBase}/admin/teams`, team));
  }

  async adminUpdateTeam(id: string, team: any): Promise<Team> {
    return firstValueFrom(this.http.put<Team>(`${this.apiBase}/admin/teams/${id}`, team));
  }

  async adminDeleteTeam(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.apiBase}/admin/teams/${id}`));
  }

  async adminGetFixtures(): Promise<Match[]> {
    return firstValueFrom(this.http.get<Match[]>(`${this.apiBase}/admin/fixtures`));
  }

  async adminCreateFixture(fixture: any): Promise<Match> {
    return firstValueFrom(this.http.post<Match>(`${this.apiBase}/admin/fixtures`, fixture));
  }

  async adminUpdateFixture(id: string, fixture: any): Promise<Match> {
    return firstValueFrom(this.http.put<Match>(`${this.apiBase}/admin/fixtures/${id}`, fixture));
  }

  async adminDeleteFixture(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.apiBase}/admin/fixtures/${id}`));
  }

  async adminUpdateMatchScore(
    id: string,
    homeScore: number,
    awayScore: number,
    actualScorers: string[],
    actualWinnerId?: string,
    resolutionTime?: string
  ): Promise<Match> {
    return firstValueFrom(
      this.http.post<Match>(`${this.apiBase}/admin/fixtures/${id}/score`, {
        homeScore,
        awayScore,
        actualScorers,
        actualWinnerId,
        resolutionTime
      })
    );
  }
}
