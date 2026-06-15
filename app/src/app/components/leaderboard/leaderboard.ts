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
  
  // States
  readonly leaderboard = signal<(LeaderboardUser & { rank: number })[]>([]);
  readonly loading = signal<boolean>(true);
  readonly hasKnockoutStarted = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly selectedTeamFilter = signal<string>('All');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly itemsPerPage = signal<number>(10);

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredLeaderboard().length / this.itemsPerPage());
  });

  readonly paginatedLeaderboard = computed(() => {
    const page = this.currentPage();
    const limit = this.itemsPerPage();
    const start = (page - 1) * limit;
    const end = start + limit;
    return this.filteredLeaderboard().slice(start, end);
  });

  constructor() {
    effect(() => {
      // Reset to page 1 when query or filter changes
      this.searchQuery();
      this.selectedTeamFilter();
      this.currentPage.set(1);
    });
  }

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

  getRankBadgeClass(rank: number): string {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 font-black shadow-[0_0_15px_rgba(203,213,225,0.3)]';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-[0_0_15px_rgba(180,83,9,0.3)]';
      default:
        return 'bg-white/5 text-gray-300 border border-white/5';
    }
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

  getPageRange(): number[] {
    const total = this.totalPages();
    const range: number[] = [];
    for (let i = 1; i <= total; i++) {
      range.push(i);
    }
    return range;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
}
