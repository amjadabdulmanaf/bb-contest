import { Component, inject, OnInit, signal, computed, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { PredictorService, Team, Match, UserPrediction, LeaderboardUser, ColorLeaderboardUser, Player } from '../../auth/predictor.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly predictorService = inject(PredictorService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly user = this.authService.currentUser;
  readonly isAdmin = this.authService.isAdmin;

  // Loaded data
  readonly leaderboard = signal<LeaderboardUser[]>([]);
  readonly colorLeaderboard = signal<ColorLeaderboardUser[]>([]);
  readonly activeLeaderboardTab = signal<'individual' | 'color'>('individual');
  readonly nextMatches = signal<Match[]>([]);
  readonly nextPredictions = signal<UserPrediction[]>([]);
  readonly activeCarouselIndex = signal<number>(0);
  readonly slideDirection = signal<'left' | 'right'>('left');

  // Scorer prediction state
  searchQueries: Record<string, string> = {};
  activeSearchMatchId = '';
  players: Player[] = [];
  teams: Team[] = [];
  touchStartX = 0;
  touchStartY = 0;
  swipeTriggered = false;

  // State flags
  readonly loading = signal<boolean>(true);
  readonly savingPrediction = signal<boolean>(false);
  readonly predictionStatus = signal<{ success: boolean; message: string } | null>(null);
  validatedIncompleteMatchIds = new Set<string>();

  async ngOnInit(): Promise<void> {
    if (this.isBrowser) {
      await this.loadDashboardData();
    }
  }

  async loadDashboardData(): Promise<void> {
    try {
      this.loading.set(true);
      this.validatedIncompleteMatchIds.clear();
      this.activeCarouselIndex.set(0);

      // 1. Load Leaderboard
      const leaderboardData = await this.predictorService.getLeaderboard();
      this.leaderboard.set(leaderboardData);

      const colorLeaderboardData = await this.predictorService.getColorLeaderboard();
      this.colorLeaderboard.set(colorLeaderboardData);

      // 2. Load Schedule & Predictions & Players
      const { teams, matches } = await this.predictorService.getSchedule();
      this.teams = teams;
      this.players = await this.predictorService.getPlayers();
      const myPredictions = await this.predictorService.getMyPredictions();

      // Map teams by ID for quick access
      const teamsMap: Record<string, Team> = {};
      for (const t of teams) {
        teamsMap[t.id] = t;
      }

      // Populate teams inside match objects
      const enrichedMatches = matches.map(m => ({
        ...m,
        homeTeam: teamsMap[m.homeTeamId],
        awayTeam: teamsMap[m.awayTeamId]
      }));

      // Find the next upcoming pending fixture date
      const now = new Date();
      const pendingMatches = enrichedMatches
        .filter(m => m.status === 'pending' && m.dateTime && new Date(m.dateTime) > now)
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

      if (pendingMatches.length > 0) {
        // Helper to get IST date string (YYYY-MM-DD)
        const getISTDateString = (date: Date): string => {
          const tzOffset = 5.5 * 60 * 60 * 1000; // 5h 30m in ms
          const istTime = new Date(date.getTime() + tzOffset);
          return istTime.toISOString().split('T')[0];
        };

        const targetDate = getISTDateString(new Date(pendingMatches[0].dateTime));
        const nextMatches = pendingMatches.filter(m => getISTDateString(new Date(m.dateTime)) === targetDate);
        this.nextMatches.set(nextMatches);

        const predictionsList: UserPrediction[] = nextMatches.map(m => {
          const existing = myPredictions.find(p => p.matchId === m.id);
          const selectedScorerId = existing?.predictedScorerId ?? null;

          if (selectedScorerId) {
            if (selectedScorerId === 'no-scorer') {
              this.searchQueries[m.id] = 'No Goal Scorers (Goalless Draw)';
            } else {
              const p = this.players.find(x => x.id === selectedScorerId);
              this.searchQueries[m.id] = p ? p.name : '';
            }
          } else {
            this.searchQueries[m.id] = '';
          }

          return {
            matchId: m.id,
            homeScore: existing ? existing.homeScore : null,
            awayScore: existing ? existing.awayScore : null,
            predictedScorerId: selectedScorerId,
            predictedWinnerId: existing?.predictedWinnerId ?? null,
            predictedResolutionTime: existing?.predictedResolutionTime ?? null
          };
        });
        this.nextPredictions.set(predictionsList);
      } else {
        this.nextMatches.set([]);
        this.nextPredictions.set([]);
      }

      this.loading.set(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      this.loading.set(false);
    }
  }

  async savePredictions(): Promise<void> {
    const predictions = this.nextPredictions();
    const matches = this.nextMatches();
    if (predictions.length === 0 || matches.length === 0) return;

    // Validate completeness of started predictions
    this.validatedIncompleteMatchIds.clear();
    let hasIncomplete = false;
    for (let idx = 0; idx < predictions.length; idx++) {
      if (this.isPredictionIncomplete(idx)) {
        const match = matches[idx];
        this.validatedIncompleteMatchIds.add(match.id);
        hasIncomplete = true;
      }
    }

    if (hasIncomplete) {
      const firstIncompleteIdx = predictions.findIndex((_, idx) => this.isPredictionIncomplete(idx));
      const firstMatch = matches[firstIncompleteIdx];
      this.predictionStatus.set({ 
        success: false, 
        message: `Please complete all predictions (scores & scorer) for Match #${firstMatch.matchNumber} before saving.` 
      });
      return;
    }

    // Filter out incomplete predictions
    const completePredictions = predictions.filter(
      p => p.homeScore !== null && p.awayScore !== null && p.homeScore !== undefined && p.awayScore !== undefined
    );

    if (completePredictions.length === 0) {
      this.predictionStatus.set({ success: false, message: 'Please enter scores for at least one prediction.' });
      return;
    }

    // Double check time lock locally and construct payload with automatic fields computed
    const now = new Date();
    const payload: UserPrediction[] = [];

    for (const pred of completePredictions) {
      const match = matches.find(m => m.id === pred.matchId);
      if (!match) continue;

      if (now >= new Date(match.dateTime)) {
        this.predictionStatus.set({ success: false, message: `Match #${match.matchNumber} has already started. Prediction locked!` });
        return;
      }

      if (match.type === 'knockout') {
        if (pred.homeScore === pred.awayScore) {
          if (!pred.predictedWinnerId) {
            this.predictionStatus.set({ success: false, message: `Please select the winner for Match #${match.matchNumber} (draw prediction).` });
            return;
          }
          pred.predictedResolutionTime = 'Penalty Shootout';
        } else {
          pred.predictedWinnerId = pred.homeScore! > pred.awayScore! ? match.homeTeamId : match.awayTeamId;
          pred.predictedResolutionTime = pred.predictedResolutionTime || 'Normal Time';
        }
      } else {
        pred.predictedWinnerId = null;
        pred.predictedResolutionTime = null;
      }

      payload.push({
        matchId: pred.matchId,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        predictedScorerId: pred.predictedScorerId || null,
        predictedWinnerId: pred.predictedWinnerId,
        predictedResolutionTime: pred.predictedResolutionTime
      });
    }

    this.savingPrediction.set(true);
    this.predictionStatus.set(null);

    try {
      await this.predictorService.savePredictions(payload);
      this.predictionStatus.set({ success: true, message: 'Predictions saved successfully!' });
      // Reload dashboard details to sync prediction status
      await this.loadDashboardData();
      setTimeout(() => this.predictionStatus.set(null), 4000);
    } catch (err: any) {
      this.predictionStatus.set({ success: false, message: err.message || 'Failed to save predictions.' });
    } finally {
      this.savingPrediction.set(false);
    }
  }

  getTeamState(idx: number, teamSide: 'home' | 'away'): 'winner' | 'loser' | 'draw' | 'none' {
    const pred = this.nextPredictions()[idx];
    if (!pred) return 'none';

    const homeScore = pred.homeScore;
    const awayScore = pred.awayScore;

    if (homeScore === null || awayScore === null || homeScore === undefined || awayScore === undefined) {
      return 'none';
    }

    if (homeScore === awayScore) {
      const match = this.nextMatches()[idx];
      if (match && match.type === 'knockout') {
        const winner = pred.predictedWinnerId;
        if (winner) {
          if (teamSide === 'home') {
            return winner === match.homeTeamId ? 'winner' : 'loser';
          } else {
            return winner === match.awayTeamId ? 'winner' : 'loser';
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

  isPredictionIncomplete(idx: number): boolean {
    const pred = this.nextPredictions()[idx];
    const match = this.nextMatches()[idx];
    if (!pred || !match) return false;

    const hasHome = pred.homeScore !== null && pred.homeScore !== undefined;
    const hasAway = pred.awayScore !== null && pred.awayScore !== undefined;
    const hasScorer = pred.predictedScorerId !== null && pred.predictedScorerId !== undefined && pred.predictedScorerId !== '';

    const started = hasHome || hasAway || hasScorer;
    if (!started) return false;

    if (!hasHome || !hasAway || !hasScorer) return true;

    if (match.type === 'knockout' && pred.homeScore === pred.awayScore) {
      if (!pred.predictedWinnerId) return true;
    }

    return false;
  }

  shouldShowValidationError(idx: number): boolean {
    const match = this.nextMatches()[idx];
    if (!match) return false;
    return this.validatedIncompleteMatchIds.has(match.id) && this.isPredictionIncomplete(idx);
  }

  getFixtureCardClass(idx: number): Record<string, boolean> {
    const pred = this.nextPredictions()[idx];
    const match = this.nextMatches()[idx];
    if (!pred || !match) return {};

    const hasPrediction = pred.homeScore !== null && pred.awayScore !== null;
    const isIncomplete = this.shouldShowValidationError(idx);

    return {
      // Incomplete state warning highlight
      'border-rose-500! border-l-[6px] border-l-rose-500! bg-rose-500/[0.02]! shadow-[0_0_15px_rgba(244,63,94,0.2)]! animate-shake': isIncomplete,

      // Predicted but didn't start (Future & Predicted - Blue)
      'border-l-[6px] border-l-blue-500 border-blue-500/25! bg-blue-500/[0.012]! hover:bg-blue-500/[0.028]!': !isIncomplete && hasPrediction,
      
      // Not predicted but didn't start (Future & Unpredicted - Rose)
      'border-l-[6px] border-l-rose-500 border-rose-500/25! bg-rose-500/[0.012]! hover:bg-rose-500/[0.028]!': !isIncomplete && !hasPrediction
    };
  }

  prevSlide(): void {
    const total = this.nextMatches().length;
    if (total <= 1) return;
    this.activeSearchMatchId = ''; // Close any open search list
    this.slideDirection.set('right');
    const current = this.activeCarouselIndex();
    this.activeCarouselIndex.set((current - 1 + total) % total);
  }

  nextSlide(): void {
    const total = this.nextMatches().length;
    if (total <= 1) return;
    this.activeSearchMatchId = ''; // Close any open search list
    this.slideDirection.set('left');
    const current = this.activeCarouselIndex();
    this.activeCarouselIndex.set((current + 1) % total);
  }

  goToSlide(idx: number): void {
    const current = this.activeCarouselIndex();
    if (idx === current) return;
    this.activeSearchMatchId = ''; // Close any open search list
    this.slideDirection.set(idx > current ? 'left' : 'right');
    this.activeCarouselIndex.set(idx);
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches && event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
      this.swipeTriggered = false;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (this.swipeTriggered || !event.touches || event.touches.length === 0) return;

    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;

    const diffX = touchX - this.touchStartX;
    const diffY = touchY - this.touchStartY;

    const threshold = 50; // px threshold for swipe

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // If horizontal swiping, prevent page scroll
      if (Math.abs(diffX) > 10 && event.cancelable) {
        event.preventDefault();
      }

      if (Math.abs(diffX) > threshold) {
        const target = event.target as HTMLElement;
        if (target && (target.closest('input') || target.closest('select') || target.closest('[data-scorer-container="true"]'))) {
          return; // Do not swipe when using input fields or dropdowns
        }

        this.swipeTriggered = true;
        if (diffX > 0) {
          // Swipe Right (Go to Prev Slide)
          this.prevSlide();
        } else {
          // Swipe Left (Go to Next Slide)
          this.nextSlide();
        }
      }
    }
  }

  onLogout(): void {
    this.authService.logout();
  }

  isCurrentUser(item: LeaderboardUser): boolean {
    return item.email === this.user()?.email;
  }

  getMatchPlayers(fixture: Match): { id: string; name: string; teamId: string; position: string }[] {
    const list = this.players
      .filter(p => p.teamId === fixture.homeTeamId || p.teamId === fixture.awayTeamId)
      .map(p => ({ id: p.id, name: p.name, teamId: p.teamId, position: p.position }));
    
    return [
      { id: 'no-scorer', name: 'No Goal Scorers (Goalless Draw)', teamId: '', position: '' },
      ...list
    ];
  }

  getFilteredPlayers(fixture: Match): { id: string; name: string; teamId: string; position: string }[] {
    const allSelectable = this.getMatchPlayers(fixture);
    const query = (this.searchQueries[fixture.id] || '').trim().toLowerCase();
    if (!query) return allSelectable;
    return allSelectable.filter(p => p.name.toLowerCase().includes(query));
  }

  getPlayerTeamName(teamId: string): string {
    if (!teamId) return '';
    const t = this.teams.find(x => x.id === teamId);
    return t ? `${t.flag} #${t.fifaRanking || 'N/A'} ${t.name}` : teamId;
  }

  selectScorer(fixture: Match, scorer: { id: string; name: string; teamId: string; position: string }, idx: number): void {
    const preds = this.nextPredictions();
    if (preds[idx]) {
      preds[idx].predictedScorerId = scorer.id;
    }
    this.searchQueries[fixture.id] = scorer.name;
    this.activeSearchMatchId = '';
  }

  clearScorer(fixture: Match, idx: number): void {
    const preds = this.nextPredictions();
    if (preds[idx]) {
      preds[idx].predictedScorerId = null;
    }
    this.searchQueries[fixture.id] = '';
  }

  onScorerFocus(fixture: Match): void {
    this.activeSearchMatchId = fixture.id;
  }

  getPlayerName(playerId: string | null | undefined): string {
    if (!playerId) return '-';
    if (playerId === 'no-scorer') return 'No Goal Scorers';
    const p = this.players.find(x => x.id === playerId);
    return p ? `${p.name} (${p.position})` : '-';
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
      const idx = this.nextMatches().findIndex(m => m.id === activeId);
      if (idx !== -1) {
        const preds = this.nextPredictions();
        const selectedId = preds[idx] ? preds[idx].predictedScorerId : null;
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
      }
      this.activeSearchMatchId = '';

      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }
}
