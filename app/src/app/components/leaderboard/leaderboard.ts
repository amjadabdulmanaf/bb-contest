import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { PredictorService, LeaderboardUser } from '../../auth/predictor.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css'
})
export class LeaderboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly predictorService = inject(PredictorService);

  readonly user = this.authService.currentUser;

  getTeamLogo(colorTeam: string | null | undefined): string | null {
    return this.authService.getTeamLogo(colorTeam);
  }

  getTeamName(colorTeam: string | null | undefined): string {
    return this.authService.getTeamName(colorTeam);
  }
  
  // States
  readonly leaderboard = signal<(LeaderboardUser & { rank: number })[]>([]);
  readonly loading = signal<boolean>(true);
  readonly hasKnockoutStarted = signal<boolean>(false);
  readonly completedMatches = signal<number>(0);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly selectedTeamFilter = signal<string>('All');

  // Sorting
  readonly sortColumn = signal<'rank' | 'player' | 'colorTeam' | 'points' | 'exactMatches' | 'goalScorers' | 'results'>('rank');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly itemsPerPage = signal<number>(10);

  readonly totalPages = computed(() => {
    return Math.ceil(this.sortedLeaderboard().length / this.itemsPerPage());
  });

  readonly paginatedLeaderboard = computed(() => {
    const page = this.currentPage();
    const limit = this.itemsPerPage();
    const start = (page - 1) * limit;
    const end = start + limit;
    return this.sortedLeaderboard().slice(start, end);
  });

  constructor() {
    effect(() => {
      // Reset to page 1 when query, filter, or sorting changes
      this.searchQuery();
      this.selectedTeamFilter();
      this.sortColumn();
      this.sortDirection();
      this.currentPage.set(1);
    });
  }

  // Sorted and Filtered Leaderboard
  readonly sortedLeaderboard = computed(() => {
    const list = [...this.filteredLeaderboard()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const isAsc = dir === 'asc';

    return list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (col) {
        case 'rank':
          valA = a.rank;
          valB = b.rank;
          break;
        case 'player':
          valA = a.displayName.toLowerCase();
          valB = b.displayName.toLowerCase();
          break;
        case 'colorTeam':
          valA = (this.getTeamName(a.colorTeam) || '').toLowerCase();
          valB = (this.getTeamName(b.colorTeam) || '').toLowerCase();
          break;
        case 'points':
          valA = a.points;
          valB = b.points;
          break;
        case 'exactMatches':
          valA = a.exactMatches;
          valB = b.exactMatches;
          break;
        case 'goalScorers':
          valA = a.goalScorers;
          valB = b.goalScorers;
          break;
        case 'results':
          valA = a.results;
          valB = b.results;
          break;
        default:
          return 0;
      }

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;

      // Secondary sort: fall back to rank ascending (default order)
      if (col !== 'rank') {
        return a.rank - b.rank;
      }
      return 0;
    });
  });

  // Filtered Leaderboard
  readonly filteredLeaderboard = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const team = this.selectedTeamFilter();
    let list = this.leaderboard();

    if (query) {
      list = list.filter(
        u => 
          u.displayName.toLowerCase().includes(query) || 
          u.email.toLowerCase().includes(query) ||
          (u.empId && u.empId.toLowerCase().includes(query))
      );
    }

    if (team !== 'All') {
      list = list.filter(u => u.colorTeam === team);
    }

    return list;
  });

  // Unique Color Teams list for filters
  readonly availableTeams = ['All', 'Red', 'Yellow', 'Purple', 'Blue'];

  async ngOnInit(): Promise<void> {
    await this.loadLeaderboardData();
  }

  async loadLeaderboardData(): Promise<void> {
    try {
      this.loading.set(true);

      // Load Leaderboard
      const leaderboardData = await this.predictorService.getLeaderboard();
      const rankedLeaderboard = leaderboardData.map((user, idx) => {
        let rank = idx + 1;
        for (let i = idx - 1; i >= 0; i--) {
          if (
            leaderboardData[i].points === user.points &&
            leaderboardData[i].exactMatches === user.exactMatches &&
            leaderboardData[i].goalScorers === user.goalScorers &&
            leaderboardData[i].results === user.results &&
            leaderboardData[i].times === user.times
          ) {
            rank = i + 1;
          } else {
            break;
          }
        }
        return {
          ...user,
          rank
        };
      });
      this.leaderboard.set(rankedLeaderboard);

      // Check if knockout matches have started
      const { matches } = await this.predictorService.getSchedule();
      const now = new Date();
      const firstKnockout = matches.find(m => m.type === 'knockout');
      if (firstKnockout && firstKnockout.dateTime) {
        this.hasKnockoutStarted.set(now >= new Date(firstKnockout.dateTime));
      } else {
        this.hasKnockoutStarted.set(false);
      }

      // Calculate completed matches count
      const completedCount = matches.filter(m => m.status === 'completed').length;
      this.completedMatches.set(completedCount);

      this.loading.set(false);
    } catch (err) {
      console.error('Failed to load detailed leaderboard data:', err);
      this.loading.set(false);
    }
  }

  isCurrentUser(item: LeaderboardUser): boolean {
    return item.email === this.user()?.email;
  }

  getTeamBadgeClass(team: string | null | undefined): string {
    if (!team) return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    switch (team.toLowerCase()) {
      case 'red':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/15';
      case 'yellow':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/15';
      case 'purple':
        return 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/15';
      case 'blue':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/15';
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  }

  getTeamFilterClass(team: string, isSelected: boolean): string {
    const base = 'inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs border cursor-pointer transition-all duration-200 uppercase tracking-wide shrink-0 ';
    if (isSelected) {
      switch (team.toLowerCase()) {
        case 'all':
          return base + 'bg-white text-slate-950 font-bold border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]';
        case 'red':
          return base + 'bg-rose-500 text-slate-950 font-bold border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)]';
        case 'yellow':
          return base + 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]';
        case 'purple':
          return base + 'bg-fuchsia-500 text-slate-950 font-bold border-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.35)]';
        case 'blue':
          return base + 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)]';
        default:
          return base + 'bg-amber-500 text-slate-950 font-bold border-amber-400';
      }
    } else {
      switch (team.toLowerCase()) {
        case 'all':
          return base + 'bg-white/2 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20';
        case 'red':
          return base + 'bg-white/2 text-gray-300 border-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20';
        case 'yellow':
          return base + 'bg-white/2 text-gray-300 border-white/5 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20';
        case 'purple':
          return base + 'bg-white/2 text-gray-300 border-white/5 hover:bg-fuchsia-500/10 hover:text-fuchsia-400 hover:border-fuchsia-500/20';
        case 'blue':
          return base + 'bg-white/2 text-gray-300 border-white/5 hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/20';
        default:
          return base + 'bg-white/2 text-gray-300 border-white/5 hover:bg-white/5';
      }
    }
  }

  getRankBadgeClass(rank: number): string {
    return 'bg-white/5 text-gray-300 border border-white/5';
  }

  getStartIndex(): number {
    if (this.filteredLeaderboard().length === 0) return 0;
    return (this.currentPage() - 1) * this.itemsPerPage() + 1;
  }

  getEndIndex(): number {
    const total = this.filteredLeaderboard().length;
    const end = this.currentPage() * this.itemsPerPage();
    return end > total ? total : end;
  }

  getVisiblePages(): (number | string)[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const range: (number | string)[] = [];

    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        range.push(i);
      }
      return range;
    }

    // Always include page 1
    range.push(1);

    if (current > 3) {
      range.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (!range.includes(i)) {
        range.push(i);
      }
    }

    if (current < total - 2) {
      range.push('...');
    }

    if (!range.includes(total)) {
      range.push(total);
    }

    return range;
  }

  goToPage(page: number | string): void {
    const targetPage = typeof page === 'number' ? page : parseInt(page, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= this.totalPages()) {
      this.currentPage.set(targetPage);
    }
  }

  toggleSort(column: 'rank' | 'player' | 'colorTeam' | 'points' | 'exactMatches' | 'goalScorers' | 'results'): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      if (['points', 'exactMatches', 'goalScorers', 'results'].includes(column)) {
        this.sortDirection.set('desc');
      } else {
        this.sortDirection.set('asc');
      }
    }
  }
}
