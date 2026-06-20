import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './topbar.html'
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;
  readonly isAdmin = this.authService.isAdmin;
  readonly isMenuOpen = signal<boolean>(false);

  getTeamLogo(colorTeam: string | null | undefined): string | null {
    return this.authService.getTeamLogo(colorTeam);
  }

  getTeamName(colorTeam: string | null | undefined): string {
    return this.authService.getTeamName(colorTeam);
  }

  getRankBadgeClass(rank: number | null | undefined): string {
    if (!rank) return 'bg-white/5 text-gray-300 border border-white/10';
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black border border-amber-400/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 font-black border border-slate-300/20 shadow-[0_0_10px_rgba(203,213,225,0.15)]';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black border border-amber-600/20 shadow-[0_0_10px_rgba(180,83,9,0.15)]';
      default:
        return 'bg-white/5 text-gray-300 border border-white/10';
    }
  }

  getTrendBadgeClass(trend: string | null | undefined): string {
    switch (trend) {
      case 'up':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shadow-[0_0_8px_rgba(16,185,129,0.1)]';
      case 'down':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/15 shadow-[0_0_8px_rgba(244,63,94,0.1)]';
      case 'stable':
      default:
        return 'bg-white/5 text-gray-400 border border-white/10';
    }
  }


  toggleMenu(): void {
    this.isMenuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
  }
}
