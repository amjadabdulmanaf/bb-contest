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
