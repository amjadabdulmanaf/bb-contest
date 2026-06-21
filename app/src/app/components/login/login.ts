import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

type LoginStep = 'email' | 'first_time_notice' | 'password' | 'forgot_password_notice';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly rememberMe = signal<boolean>(true);
  readonly showPassword = signal<boolean>(false);

  readonly currentStep = signal<LoginStep>('email');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly loading = signal<boolean>(false);

  ngOnInit(): void {
    // If already authenticated, redirect immediately
    if (this.authService.isAuthenticated()) {
      const targetRoute = this.authService.isAdmin() ? '/admin' : '/dashboard';
      this.router.navigate([targetRoute]);
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage.set(params['error']);
      }
      if (params['message']) {
        this.successMessage.set(params['message']);
      }
    });
  }

  async onContinue(): Promise<void> {
    if (!this.email() || !this.email().includes('@')) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loading.set(true);

    try {
      const res = await this.authService.loginInit(this.email());
      if (res.status === 'first_time') {
        this.currentStep.set('first_time_notice');
      } else if (res.status === 'password_required') {
        this.currentStep.set('password');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async onLogin(): Promise<void> {
    if (!this.password()) {
      this.errorMessage.set('Please enter your password.');
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      const success = await this.authService.login(this.password(), this.rememberMe());
      if (success) {
        const targetRoute = this.authService.isAdmin() ? '/admin' : '/dashboard';
        this.router.navigate([targetRoute]);
      } else {
        this.errorMessage.set('Authentication failed.');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Incorrect password.');
    } finally {
      this.loading.set(false);
    }
  }

  async onForgotPassword(): Promise<void> {
    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      await this.authService.forgotPassword(this.email());
      this.currentStep.set('forgot_password_notice');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to request password reset.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.password.set('');
    this.showPassword.set(false);
    this.currentStep.set('email');
  }
}
