import { Component, OnInit, inject, PLATFORM_ID, signal, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PredictorService, Team, Match, UserPrediction, Player } from '../../auth/predictor.service';
import { AuthService } from '../../auth/auth.service';

interface EnrichedMatch extends Match {
  userPrediction?: UserPrediction;
  isLocked: boolean;
  pointsEarned?: number;
  pointsLabel?: string;
}

@Component({
  selector: 'app-predictor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './predictor.html',
  styleUrl: './predictor.css'
})
export class PredictorComponent implements OnInit {
  private readonly predictorService = inject(PredictorService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  // Tabs
  activeTab: 'fixtures' | 'results' | 'rules' = 'fixtures';

  switchTab(tab: 'fixtures' | 'results' | 'rules'): void {
    this.activeTab = tab;
  }

  getTeamState(fixture: EnrichedMatch, teamSide: 'home' | 'away'): 'winner' | 'loser' | 'draw' | 'none' {
    let homeScore: number | null = null;
    let awayScore: number | null = null;

    if (fixture.status === 'completed') {
      homeScore = fixture.homeScore;
      awayScore = fixture.awayScore;
    } else {
      const scores = this.localScores[fixture.id];
      if (scores) {
        homeScore = scores.homeScore;
        awayScore = scores.awayScore;
      }
    }

    if (homeScore === null || awayScore === null || homeScore === undefined || awayScore === undefined) {
      return 'none';
    }

    if (homeScore === awayScore) {
      if (fixture.type === 'knockout') {
        const winner = fixture.status === 'completed' ? fixture.actualWinnerId : this.localWinners[fixture.id];
        if (winner) {
          if (teamSide === 'home') {
            return winner === fixture.homeTeamId ? 'winner' : 'loser';
          } else {
            return winner === fixture.awayTeamId ? 'winner' : 'loser';
          }
        }
      }
      return 'draw';
    }

    if (teamSide === 'home') {
      return homeScore > awayScore ? 'winner' : 'loser';
    } else {
      return awayScore > homeScore ? 'winner' : 'loser';
    }
  }

  isPredictionIncomplete(fixtureId: string): boolean {
    const scores = this.localScores[fixtureId];
    const scorerId = this.localScorers[fixtureId];
    const winnerId = this.localWinners[fixtureId];

    const hasHome = scores && scores.homeScore !== null && scores.homeScore !== undefined;
    const hasAway = scores && scores.awayScore !== null && scores.awayScore !== undefined;
    const hasScorer = scorerId !== null && scorerId !== undefined && scorerId !== '';

    const started = hasHome || hasAway || hasScorer;
    if (!started) return false;

    if (!hasHome || !hasAway || !hasScorer) return true;

    const fixture = this.fixtures.find(f => f.id === fixtureId);
    if (fixture && fixture.type === 'knockout' && scores.homeScore === scores.awayScore) {
      if (!winnerId) return true;
    }

    return false;
  }

  shouldShowValidationError(fixtureId: string): boolean {
    return this.validatedIncompleteFixtureIds.has(fixtureId) && this.isPredictionIncomplete(fixtureId);
  }

  // Lists
  teams: Team[] = [];
  fixtures: EnrichedMatch[] = [];
  players: Player[] = [];

  // Scorer prediction state
  searchQueries: Record<string, string> = {};
  localScorers: Record<string, string | null> = {};
  activeSearchMatchId = '';

  localWinners: Record<string, string | null> = {};
  localResolutionTimes: Record<string, string | null> = {};

  getMatchPlayers(fixture: EnrichedMatch): { id: string; name: string; teamId: string; position: string }[] {
    const positionOrder: Record<string, number> = { 'FW': 1, 'MF': 2, 'DF': 3, 'GK': 4 };
    const list = this.players
      .filter(p => p.teamId === fixture.homeTeamId || p.teamId === fixture.awayTeamId)
      .map(p => ({ id: p.id, name: p.name, teamId: p.teamId, position: p.position }))
      .sort((a, b) => {
        const orderA = positionOrder[a.position] || 99;
        const orderB = positionOrder[b.position] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
    
    return [
      { id: 'no-scorer', name: 'No Goal Scorers (Goalless Draw)', teamId: '', position: '' },
      ...list
    ];
  }

  getFilteredPlayers(fixture: EnrichedMatch): { id: string; name: string; teamId: string; position: string }[] {
    const allSelectable = this.getMatchPlayers(fixture);
    const query = (this.searchQueries[fixture.id] || '').trim().toLowerCase();
    if (!query) return allSelectable;
    return allSelectable.filter(p => p.name.toLowerCase().includes(query));
  }

  getPlayerTeamName(teamId: string): string {
    if (!teamId) return '';
    const t = this.teams.find(x => x.id === teamId);
    return t ? `${t.flag} ${t.name}` : teamId;
  }

  selectScorer(fixture: EnrichedMatch, scorer: { id: string; name: string; teamId: string; position: string }): void {
    this.localScorers[fixture.id] = scorer.id;
    this.searchQueries[fixture.id] = scorer.name;
    this.activeSearchMatchId = '';
    this.dirtyMatchIds.add(fixture.id);
  }

  clearScorer(fixture: EnrichedMatch): void {
    this.localScorers[fixture.id] = null;
    this.searchQueries[fixture.id] = '';
    this.dirtyMatchIds.add(fixture.id);
  }


  onScorerFocus(fixture: EnrichedMatch): void {
    this.activeSearchMatchId = fixture.id;
  }

  getPlayerName(playerId: string | null | undefined): string {
    if (!playerId) return '-';
    if (playerId === 'no-scorer') return 'No Goal Scorers';
    const p = this.players.find(x => x.id === playerId);
    return p ? `${p.name} (${p.position})` : '-';
  }

  get filteredFixtures(): EnrichedMatch[] {
    if (this.activeTab === 'fixtures') {
      return this.fixtures
        .filter(f => f.status !== 'completed')
        .sort((a, b) => {
          const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
          const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
          return dateA - dateB;
        });
    } else {
      return this.fixtures
        .filter(f => f.status === 'completed')
        .sort((a, b) => {
          const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
          const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
          return dateB - dateA;
        });
    }
  }

  // Temporary local state for modifications (keyed by matchId)
  localScores: Record<string, { homeScore: number | null; awayScore: number | null }> = {};
  dirtyMatchIds = new Set<string>();

  // State flags
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly saveStatus = signal<{ success: boolean; message: string } | null>(null);
  validatedIncompleteFixtureIds = new Set<string>();
  readonly userTimezone = signal<string>('UTC');

  private getUserTimezone(): string {
    try {
      const d = new Date();
      const shortVal = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
        .formatToParts(d)
        .find(p => p.type === 'timeZoneName')?.value;

      if (shortVal && !/[+-:\d]/.test(shortVal)) {
        return shortVal;
      }

      const longVal = new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' })
        .formatToParts(d)
        .find(p => p.type === 'timeZoneName')?.value;

      if (longVal) {
        if (longVal === 'Coordinated Universal Time') return 'UTC';
        const initials = longVal.replace(/GMT[+-]\d+(:\d+)?/, '').match(/\b[A-Z]/g)?.join('');
        if (initials && initials.length >= 2) {
          return initials;
        }
        return longVal;
      }
      return shortVal || 'Local';
    } catch (e) {
      return 'Local';
    }
  }

  onLogout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.userTimezone.set(this.getUserTimezone());
      this.loadPredictorData();
    }
  }

  async loadPredictorData(): Promise<void> {
    try {
      this.loading.set(true);
      this.validatedIncompleteFixtureIds.clear();
      const schedule = await this.predictorService.getSchedule();
      this.teams = schedule.teams;

      const myPredictions = await this.predictorService.getMyPredictions();
      this.players = await this.predictorService.getPlayers();

      // Map team by ID
      const teamsMap: Record<string, Team> = {};
      for (const t of this.teams) {
        teamsMap[t.id] = t;
      }

      const now = new Date();

      // Enrich fixtures
      this.fixtures = schedule.matches.map(match => {
        const homeTeam = teamsMap[match.homeTeamId];
        const awayTeam = teamsMap[match.awayTeamId];
        const pred = myPredictions.find(p => p.matchId === match.id);

        const matchDate = match.dateTime ? new Date(match.dateTime) : null;
        const isLocked = matchDate ? now >= matchDate : true;

        let pointsEarned = 0;
        let pointsLabel = '';

        if (match.status === 'completed' && match.homeScore !== null && match.awayScore !== null && pred && pred.homeScore !== null && pred.awayScore !== null) {
          const actHome = match.homeScore;
          const actAway = match.awayScore;
          const predHome = pred.homeScore;
          const predAway = pred.awayScore;

          const actualHomeWin = actHome > actAway;
          const actualAwayWin = actHome < actAway;
          const actualDraw = actHome === actAway;

          const predHomeWin = predHome > predAway;
          const predAwayWin = predHome < predAway;
          const predDraw = predHome === predAway;

          let scorePoints = 0;
          let resolutionPoints = 0;

          if (match.type === 'knockout') {
            const actWinner = actHome > actAway ? match.homeTeamId : (actHome < actAway ? match.awayTeamId : match.actualWinnerId);
            const predWinner = predHome > predAway ? match.homeTeamId : (predHome < predAway ? match.awayTeamId : pred.predictedWinnerId);

            let isExact = false;
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
              scorePoints = 30;
            } else if (actWinner && predWinner && actWinner === predWinner) {
              scorePoints = 10;
            }

            // Resolution Time prediction (10 points)
            if (pred.predictedResolutionTime && pred.predictedResolutionTime === match.resolutionTime) {
              resolutionPoints = 10;
            }
          } else {
            const actualHomeWin = actHome > actAway;
            const actualAwayWin = actHome < actAway;
            const actualDraw = actHome === actAway;

            const predHomeWin = predHome > predAway;
            const predAwayWin = predHome < predAway;
            const predDraw = predHome === predAway;

            if (actHome === predHome && actAway === predAway) {
              scorePoints = 30;
            } else if (
              (actualHomeWin && predHomeWin) ||
              (actualAwayWin && predAwayWin) ||
              (actualDraw && predDraw)
            ) {
              scorePoints = 10;
            }
          }

          let scorerPoints = 0;
          if (pred.predictedScorerId) {
            const actualScorersList = match.actualScorers || [];
            if (actHome === 0 && actAway === 0) {
              if (pred.predictedScorerId === 'no-scorer') {
                scorerPoints = 10;
              }
            } else {
              if (actualScorersList.includes(pred.predictedScorerId)) {
                scorerPoints = 10;
              }
            }
          }

          pointsEarned = scorePoints + resolutionPoints + scorerPoints;
          const resultPts = scorePoints > 0 ? 10 : 0;
          const exactPts = scorePoints === 30 ? 20 : 0;
          pointsLabel = `${pointsEarned} pts (Result: +${resultPts}, Score: +${exactPts}, Scorer: +${scorerPoints}${match.type === 'knockout' ? `, Time: +${resolutionPoints}` : ''})`;
        } else if (match.status === 'completed') {
          pointsLabel = 'No Prediction (+0 pts)';
        } else if (isLocked) {
          pointsLabel = 'Locked (No points yet)';
        } else {
          pointsLabel = 'Open';
        }

        // Initialize local scores binding
        this.localScores[match.id] = {
          homeScore: pred ? pred.homeScore : null,
          awayScore: pred ? pred.awayScore : null
        };

        // Initialize local winner and resolution time bindings
        this.localWinners[match.id] = pred?.predictedWinnerId ?? null;
        this.localResolutionTimes[match.id] = pred?.predictedResolutionTime ?? null;

        // Initialize local scorer binding
        const selectedScorerId = pred?.predictedScorerId ?? null;
        this.localScorers[match.id] = selectedScorerId;
        if (selectedScorerId) {
          if (selectedScorerId === 'no-scorer') {
            this.searchQueries[match.id] = 'No Goal Scorers (Goalless Draw)';
          } else {
            const p = this.players.find(x => x.id === selectedScorerId);
            this.searchQueries[match.id] = p ? p.name : '';
          }
        } else {
          this.searchQueries[match.id] = '';
        }

        return {
          ...match,
          homeTeam,
          awayTeam,
          userPrediction: pred,
          isLocked,
          pointsEarned,
          pointsLabel
        };
      });

      this.loading.set(false);
    } catch (err) {
      console.error('Failed to load predictor schedules:', err);
      this.loading.set(false);
    }
  }

  onScoreInput(matchId: string): void {
    this.dirtyMatchIds.add(matchId);
  }

  quickFill(): void {
    const unpredictedFixtures = this.fixtures.filter(fixture => {
      const isUnpredicted =
        this.localScores[fixture.id]?.homeScore === null ||
        this.localScores[fixture.id]?.awayScore === null ||
        this.localScores[fixture.id]?.homeScore === undefined ||
        this.localScores[fixture.id]?.awayScore === undefined;
      return !fixture.isLocked && isUnpredicted;
    });

    if (unpredictedFixtures.length === 0) {
      this.saveStatus.set({ success: true, message: 'All open fixtures are already predicted!' });
      setTimeout(() => this.saveStatus.set(null), 3000);
      return;
    }

    const typicalScores = [
      { home: 1, away: 0 },
      { home: 2, away: 1 },
      { home: 1, away: 1 },
      { home: 2, away: 0 },
      { home: 0, away: 0 },
      { home: 1, away: 2 },
      { home: 0, away: 1 },
      { home: 2, away: 2 },
      { home: 3, away: 1 },
      { home: 0, away: 2 },
      { home: 3, away: 2 },
      { home: 1, away: 3 }
    ];

    for (const fixture of unpredictedFixtures) {
      const randomScore = typicalScores[Math.floor(Math.random() * typicalScores.length)];
      this.localScores[fixture.id] = {
        homeScore: randomScore.home,
        awayScore: randomScore.away
      };

      if (fixture.type === 'knockout') {
        if (randomScore.home === randomScore.away) {
          this.localWinners[fixture.id] = Math.random() > 0.5 ? fixture.homeTeamId : fixture.awayTeamId;
          this.localResolutionTimes[fixture.id] = 'Penalty Shootout';
        } else {
          this.localWinners[fixture.id] = randomScore.home > randomScore.away ? fixture.homeTeamId : fixture.awayTeamId;
          this.localResolutionTimes[fixture.id] = Math.random() > 0.5 ? 'Normal Time' : 'Extra Time';
        }
      }

      const selectable = this.getMatchPlayers(fixture);
      let chosenScorerId = 'no-scorer';
      if (randomScore.home > 0 || randomScore.away > 0) {
        const playersOnly = selectable.filter(p => p.id !== 'no-scorer');
        if (playersOnly.length > 0) {
          chosenScorerId = playersOnly[Math.floor(Math.random() * playersOnly.length)].id;
        }
      }
      this.localScorers[fixture.id] = chosenScorerId;
      if (chosenScorerId === 'no-scorer') {
        this.searchQueries[fixture.id] = 'No Goal Scorers (Goalless Draw)';
      } else {
        const p = this.players.find(x => x.id === chosenScorerId);
        this.searchQueries[fixture.id] = p ? p.name : '';
      }

      this.dirtyMatchIds.add(fixture.id);
    }

    this.saveStatus.set({ 
      success: true, 
      message: `Auto-filled ${unpredictedFixtures.length} unpredicted fixtures! Please save your predictions below.` 
    });
    setTimeout(() => this.saveStatus.set(null), 5000);
  }

  async saveAllPredictions(): Promise<void> {
    if (this.dirtyMatchIds.size === 0) {
      this.saveStatus.set({ success: true, message: 'No unsaved predictions.' });
      setTimeout(() => this.saveStatus.set(null), 3000);
      return;
    }

    this.saving.set(true);
    this.saveStatus.set(null);

    // Filter predictions to save
    const payload: UserPrediction[] = [];
    const now = new Date();

    this.validatedIncompleteFixtureIds.clear();
    let hasIncomplete = false;

    for (const matchId of this.dirtyMatchIds) {
      const fixture = this.fixtures.find(f => f.id === matchId);
      if (!fixture) continue;

      // Ensure match hasn't started yet
      if (fixture.dateTime && now >= new Date(fixture.dateTime)) {
        continue; // Skip saving locked prediction
      }

      if (this.isPredictionIncomplete(matchId)) {
        this.validatedIncompleteFixtureIds.add(matchId);
        hasIncomplete = true;
      }
    }

    if (hasIncomplete) {
      const firstIncompleteId = Array.from(this.dirtyMatchIds).find(id => this.isPredictionIncomplete(id));
      const firstFixture = this.fixtures.find(f => f.id === firstIncompleteId);
      this.saveStatus.set({ 
        success: false, 
        message: `Please complete all predictions (scores & scorer) for Match #${firstFixture?.matchNumber} before saving.` 
      });
      this.saving.set(false);
      return;
    }

    for (const matchId of this.dirtyMatchIds) {
      const fixture = this.fixtures.find(f => f.id === matchId);
      if (!fixture) continue;

      if (fixture.dateTime && now >= new Date(fixture.dateTime)) {
        continue;
      }

      const scores = this.localScores[matchId];
      const scorerId = this.localScorers[matchId];
      const winnerId = this.localWinners[matchId];
      const resTime = this.localResolutionTimes[matchId];

      if (scores.homeScore !== null && scores.awayScore !== null && scores.homeScore !== undefined && scores.awayScore !== undefined) {
        payload.push({
          matchId,
          homeScore: scores.homeScore,
          awayScore: scores.awayScore,
          predictedScorerId: scorerId || null,
          predictedWinnerId: fixture.type === 'knockout' ? (scores.homeScore === scores.awayScore ? winnerId : (scores.homeScore > scores.awayScore ? fixture.homeTeamId : fixture.awayTeamId)) : null,
          predictedResolutionTime: fixture.type === 'knockout' ? (scores.homeScore === scores.awayScore ? 'Penalty Shootout' : (resTime || 'Normal Time')) : null
        });
      }
    }

    try {
      if (payload.length > 0) {
        await this.predictorService.savePredictions(payload);
      }
      this.dirtyMatchIds.clear();
      this.saveStatus.set({ success: true, message: 'All predictions saved successfully!' });
      
      // Reload details to sync prediction status
      await this.loadPredictorData();

      setTimeout(() => this.saveStatus.set(null), 4000);
    } catch (err: any) {
      this.saveStatus.set({ success: false, message: err.message || 'Failed to save predictions.' });
    } finally {
      this.saving.set(false);
    }
  }

  getFixtureCardClass(fixture: EnrichedMatch): Record<string, boolean> {
    const scores = this.localScores[fixture.id];
    const hasPrediction = scores && scores.homeScore !== null && scores.awayScore !== null;
    const isIncomplete = !fixture.isLocked && this.shouldShowValidationError(fixture.id);

    return {
      // Completed state (Emerald)
      'border-l-[6px] border-l-emerald-500 border-emerald-500/25! bg-emerald-500/[0.015]! hover:bg-emerald-500/[0.03]!': fixture.status === 'completed',
      
      // Locked state (Pending but past kickoff - Amber)
      'border-l-[6px] border-l-amber-500 border-amber-500/25! bg-amber-500/[0.015]! hover:bg-amber-500/[0.03]! opacity-90': fixture.isLocked && fixture.status !== 'completed',
      
      // Incomplete state warning highlight
      'border-rose-500! border-l-[6px] border-l-rose-500! bg-rose-500/[0.02]! shadow-[0_0_15px_rgba(244,63,94,0.2)]! animate-shake': isIncomplete,

      // Predicted but didn't start (Future & Predicted - Blue)
      'border-l-[6px] border-l-blue-500 border-blue-500/25! bg-blue-500/[0.012]! hover:bg-blue-500/[0.028]!': !fixture.isLocked && hasPrediction && !isIncomplete,
      
      // Not predicted but didn't start (Future & Unpredicted - Rose)
      'border-l-[6px] border-l-rose-500 border-rose-500/25! bg-rose-500/[0.012]! hover:bg-rose-500/[0.028]!': !fixture.isLocked && !hasPrediction && !isIncomplete
    };
  }

  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target && typeof target.closest === 'function') {
      if (target.closest('[data-scorer-container="true"]')) {
        return;
      }
    }

    if (this.activeSearchMatchId) {
      const activeId = this.activeSearchMatchId;
      const selectedId = this.localScorers[activeId];
      if (selectedId) {
        if (selectedId === 'no-scorer') {
          this.searchQueries[activeId] = 'No Goal Scorers (Goalless Draw)';
        } else {
          const p = this.players.find(x => x.id === selectedId);
          this.searchQueries[activeId] = p ? p.name : '';
        }
      } else {
        this.searchQueries[activeId] = '';
      }
      this.activeSearchMatchId = '';

      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }
}
