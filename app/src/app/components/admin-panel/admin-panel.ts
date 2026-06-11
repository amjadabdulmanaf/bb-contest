import { Component, OnInit, inject, signal, computed, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PredictorService, Team, Match, Player } from '../../auth/predictor.service';
import { AuthService } from '../../auth/auth.service';

type AdminTab = 'scoring' | 'teams' | 'fixtures';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanelComponent implements OnInit {
  private readonly predictorService = inject(PredictorService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    effect(() => {
      const match = this.selectedMatch();
      if (match && match.status === 'completed') {
        this.scoreHome.set(match.homeScore);
        this.scoreAway.set(match.awayScore);
        this.selectedActualScorers.set(match.actualScorers || []);
        this.actualWinnerId.set(match.actualWinnerId || '');
        this.resolutionTime.set(match.resolutionTime || 'Normal Time');
      } else {
        this.scoreHome.set(null);
        this.scoreAway.set(null);
        this.selectedActualScorers.set([]);
        this.actualWinnerId.set('');
        this.resolutionTime.set('Normal Time');
      }
    });
  }

  // Lists
  teams = signal<Team[]>([]);
  fixtures = signal<Match[]>([]);
  players = signal<Player[]>([]);

  // Scorer prediction / Actual scoring state
  scorerSearchQuery = signal<string>('');
  selectedActualScorers = signal<string[]>([]);
  showScorerDropdown = signal<boolean>(false);

  // State
  activeTab = signal<AdminTab>('scoring');
  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  statusMsg = signal<{ success: boolean; message: string } | null>(null);

  // Forms Binding Model
  // 1. Scoring
  selectedMatchId = signal<string>('');
  selectedMatch = computed(() => {
    const id = this.selectedMatchId();
    return this.fixtures().find(f => f.id === id) || null;
  });
  isMatchStarted = computed(() => {
    const match = this.selectedMatch();
    if (!match || !match.dateTime) return false;
    return new Date(match.dateTime) <= new Date();
  });
  scoreHome = signal<number | null>(null);
  scoreAway = signal<number | null>(null);
  actualWinnerId = signal<string>('');
  resolutionTime = signal<string>('Normal Time');

  selectedMatchPlayers = computed(() => {
    const match = this.selectedMatch();
    if (!match) return [];
    return this.players().filter(
      p => p.teamId === match.homeTeamId || p.teamId === match.awayTeamId
    );
  });

  // 2. Team Form
  teamForm = {
    id: '',
    name: '',
    flag: '',
    group: '',
    fifaRanking: null as number | null,
    isEdit: false
  };

  // 3. Fixture Form
  fixtureForm = {
    id: '',
    matchNumber: 1,
    type: 'group',
    group: '',
    homeTeamId: '',
    awayTeamId: '',
    dateTime: '',
    isEdit: false
  };

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) return;

    // Lock check: Redirect non-admins
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    await this.loadAdminData();
  }

  async loadAdminData(): Promise<void> {
    try {
      this.loading.set(true);
      const teamsData = await this.predictorService.adminGetTeams();
      const fixturesData = await this.predictorService.adminGetFixtures();
      const playersData = await this.predictorService.getPlayers();

      this.teams.set(teamsData);
      this.fixtures.set(fixturesData);
      this.players.set(playersData);

      if (fixturesData.length > 0) {
        // Select first pending match as default for scoring
        const firstPending = fixturesData.find(f => f.status === 'pending');
        this.selectedMatchId.set(firstPending ? firstPending.id : fixturesData[0].id);
      }

      this.loading.set(false);
    } catch (err) {
      console.error('Failed to load admin panel data:', err);
      this.loading.set(false);
    }
  }

  showMsg(success: boolean, message: string): void {
    this.statusMsg.set({ success, message });
    setTimeout(() => this.statusMsg.set(null), 4000);
  }

  getFilteredScorers(): Player[] {
    const selected = this.selectedActualScorers();
    const query = this.scorerSearchQuery().trim().toLowerCase();
    const matchPlayers = this.selectedMatchPlayers();
    
    const unselected = matchPlayers.filter(p => !selected.includes(p.id));
    if (!query) return unselected;
    return unselected.filter(p => p.name.toLowerCase().includes(query));
  }

  addScorer(playerId: string): void {
    const current = this.selectedActualScorers();
    if (!current.includes(playerId)) {
      this.selectedActualScorers.set([...current, playerId]);
    }
    this.scorerSearchQuery.set('');
    this.showScorerDropdown.set(false);
  }

  removeScorer(playerId: string): void {
    const current = this.selectedActualScorers();
    this.selectedActualScorers.set(current.filter(id => id !== playerId));
  }

  getPlayerName(playerId: string): string {
    const p = this.players().find(x => x.id === playerId);
    return p ? `${p.name} (${p.position})` : playerId;
  }

  getPlayerTeamName(teamId: string): string {
    const t = this.teams().find(x => x.id === teamId);
    return t ? `${t.flag} #${t.fifaRanking || 'N/A'} ${t.name}` : teamId;
  }

  onScorerSearchBlur(): void {
    setTimeout(() => {
      this.showScorerDropdown.set(false);
    }, 250);
  }

  // ----------------------------------------
  // Scoring tab actions
  // ----------------------------------------
  async submitScore(): Promise<void> {
    const matchId = this.selectedMatchId();
    const home = this.scoreHome();
    const away = this.scoreAway();
    const scorers = this.selectedActualScorers();

    if (!matchId || home === null || away === null || home === undefined || away === undefined) {
      this.showMsg(false, 'Please fill out both team scores.');
      return;
    }

    const match = this.selectedMatch();
    const isKnockout = match?.type === 'knockout';
    let winnerId: string | undefined = undefined;
    let resTime: string | undefined = undefined;

    if (isKnockout) {
      if (home === away) {
        winnerId = this.actualWinnerId();
        if (!winnerId) {
          this.showMsg(false, 'Please select the actual winner for a draw knockout match.');
          return;
        }
        resTime = 'Penalty Shootout';
      } else {
        winnerId = home > away ? match.homeTeamId : match.awayTeamId;
        resTime = this.resolutionTime() || 'Normal Time';
      }
    }

    this.actionLoading.set(true);
    try {
      await this.predictorService.adminUpdateMatchScore(matchId, home, away, scorers, winnerId, resTime);
      this.showMsg(true, 'Match completed and scores saved! Points recalculated.');
      this.scoreHome.set(null);
      this.scoreAway.set(null);
      this.selectedActualScorers.set([]);
      this.actualWinnerId.set('');
      this.resolutionTime.set('Normal Time');
      await this.loadAdminData();
    } catch (err: any) {
      this.showMsg(false, err.message || 'Failed to update score.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  // ----------------------------------------
  // Teams tab actions
  // ----------------------------------------
  resetTeamForm(): void {
    this.teamForm = { id: '', name: '', flag: '', group: '', fifaRanking: null, isEdit: false };
  }

  editTeam(team: Team): void {
    this.teamForm = {
      id: team.id,
      name: team.name,
      flag: team.flag,
      group: team.group,
      fifaRanking: team.fifaRanking !== undefined ? team.fifaRanking : null,
      isEdit: true
    };
  }

  async saveTeam(): Promise<void> {
    if (!this.teamForm.id || !this.teamForm.name || !this.teamForm.flag || !this.teamForm.group) {
      this.showMsg(false, 'Please fill out all team fields.');
      return;
    }

    this.actionLoading.set(true);
    try {
      if (this.teamForm.isEdit) {
        await this.predictorService.adminUpdateTeam(this.teamForm.id, {
          name: this.teamForm.name,
          flag: this.teamForm.flag,
          group: this.teamForm.group,
          fifaRanking: this.teamForm.fifaRanking
        });
        this.showMsg(true, 'Team updated successfully.');
      } else {
        await this.predictorService.adminCreateTeam({
          id: this.teamForm.id,
          name: this.teamForm.name,
          flag: this.teamForm.flag,
          group: this.teamForm.group,
          fifaRanking: this.teamForm.fifaRanking
        });
        this.showMsg(true, 'Team added successfully.');
      }
      this.resetTeamForm();
      await this.loadAdminData();
    } catch (err: any) {
      this.showMsg(false, err.message || 'Failed to save team.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  async deleteTeam(id: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete team ${id}?`)) return;

    this.actionLoading.set(true);
    try {
      await this.predictorService.adminDeleteTeam(id);
      this.showMsg(true, 'Team deleted successfully.');
      await this.loadAdminData();
    } catch (err: any) {
      this.showMsg(false, err.message || 'Failed to delete team.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  // ----------------------------------------
  // Fixtures tab actions
  // ----------------------------------------
  resetFixtureForm(): void {
    this.fixtureForm = {
      id: '',
      matchNumber: this.fixtures().length + 1,
      type: 'group',
      group: '',
      homeTeamId: '',
      awayTeamId: '',
      dateTime: '',
      isEdit: false
    };
  }

  editFixture(fixture: Match): void {
    // Format date string for input type="datetime-local" (YYYY-MM-DDTHH:mm)
    let formattedDate = '';
    if (fixture.dateTime) {
      const date = new Date(fixture.dateTime);
      // Offset timezone to keep local ISO string correctly aligned
      const tzOffset = date.getTimezoneOffset() * 60000;
      formattedDate = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    this.fixtureForm = {
      id: fixture.id,
      matchNumber: fixture.matchNumber,
      type: fixture.type,
      group: fixture.group || '',
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      dateTime: formattedDate,
      isEdit: true
    };
  }

  async saveFixture(): Promise<void> {
    const f = this.fixtureForm;
    if (!f.id || !f.homeTeamId || !f.awayTeamId || !f.dateTime) {
      this.showMsg(false, 'Please fill out all fixture fields.');
      return;
    }

    if (f.homeTeamId === f.awayTeamId) {
      this.showMsg(false, 'Home and Away teams cannot be the same.');
      return;
    }

    this.actionLoading.set(true);
    try {
      const payload = {
        id: f.id,
        matchNumber: f.matchNumber,
        type: f.type,
        group: f.group || null,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        dateTime: new Date(f.dateTime)
      };

      if (f.isEdit) {
        await this.predictorService.adminUpdateFixture(f.id, payload);
        this.showMsg(true, 'Fixture updated successfully.');
      } else {
        await this.predictorService.adminCreateFixture(payload);
        this.showMsg(true, 'Fixture added successfully.');
      }
      this.resetFixtureForm();
      await this.loadAdminData();
    } catch (err: any) {
      this.showMsg(false, err.message || 'Failed to save fixture.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  async deleteFixture(id: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete fixture ${id}?`)) return;

    this.actionLoading.set(true);
    try {
      await this.predictorService.adminDeleteFixture(id);
      this.showMsg(true, 'Fixture deleted successfully.');
      await this.loadAdminData();
    } catch (err: any) {
      this.showMsg(false, err.message || 'Failed to delete fixture.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
