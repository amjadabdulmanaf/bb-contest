import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './set-password.html',
  styleUrl: './set-password.css'
})
export class SetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');

  readonly token = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal<boolean>(false);

  ngOnInit(): void {
    const tokenVal = this.route.snapshot.queryParams['token'];
    if (!tokenVal) {
      this.errorMessage.set('Invalid password setup link. Missing token.');
    } else {
      this.token.set(tokenVal);
    }
  }

  async onSubmit(): Promise<void> {
    const tokenVal = this.token();
    if (!tokenVal) {
      this.errorMessage.set('Token is missing. Cannot set password.');
      return;
    }

    if (!this.password() || this.password().length < 6) {
      this.errorMessage.set('Password must be at least 6 characters long.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      await this.authService.setPassword(tokenVal, this.password());
      this.router.navigate(['/login'], { 
        queryParams: { message: 'Your password has been set successfully. Please log in.' } 
      });
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to set password. Link might be invalid or expired.');
    } finally {
      this.loading.set(false);
    }
  }
}
