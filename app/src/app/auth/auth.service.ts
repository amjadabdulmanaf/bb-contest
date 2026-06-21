import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  displayName: string;
  empId: string;
  colorTeam: string;
  role: string;
  points: number;
  rank?: number | null;
  trend?: 'up' | 'down' | 'stable' | null;
  previousRank?: number | null;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'wc_custom_session_token';
  private readonly refreshKey = 'wc_custom_refresh_token';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Dynamic API Base URL detection
  private readonly apiBase = this.isBrowser && window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://apibb.worldcuppredictor.in/api';

  // State signals
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticating = signal<boolean>(false);
  readonly currentEmail = signal<string | null>(null); // Cache email between steps

  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  getTeamLogo(colorTeam: string | null | undefined): string | null {
    if (!colorTeam) return null;
    const name = colorTeam.toLowerCase().trim();
    switch (name) {
      case 'red':
        return `${this.apiBase}/uploads/teams/fiery-falcons.png`;
      case 'purple':
        return `${this.apiBase}/uploads/teams/purplections.png`;
      case 'yellow':
        return `${this.apiBase}/uploads/teams/royal-reflectors.png`;
      case 'blue':
        return `${this.apiBase}/uploads/teams/blue-hawks.png`;
      default:
        return null;
    }
  }

  getTeamName(colorTeam: string | null | undefined): string {
    if (!colorTeam) return '';
    const name = colorTeam.toLowerCase().trim();
    switch (name) {
      case 'red':
        return 'Fiery Falcons';
      case 'purple':
        return 'Purplections';
      case 'yellow':
        return 'Royal Reflectors';
      case 'blue':
        return 'Blue Hawks';
      default:
        return colorTeam;
    }
  }

  constructor(private router: Router) {
    this.restoreSession();
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.refreshKey);
  }

  private setTokens(accessToken: string, refreshToken: string, rememberMe: boolean): void {
    if (!this.isBrowser) return;
    if (rememberMe) {
      localStorage.setItem(this.tokenKey, accessToken);
      sessionStorage.removeItem(this.tokenKey);
    } else {
      sessionStorage.setItem(this.tokenKey, accessToken);
      localStorage.removeItem(this.tokenKey);
    }
    // Refresh token is always stored in localStorage to persist sessions
    localStorage.setItem(this.refreshKey, refreshToken);
  }

  private clearTokens(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
  }

  async loginInit(email: string): Promise<{ status: string; message?: string }> {
    this.isAuthenticating.set(true);
    try {
      const trimmedEmail = email.toLowerCase().trim();
      const response = await fetch(`${this.apiBase}/auth/login-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Email not registered.');
      }

      const res = await response.json();
      this.currentEmail.set(trimmedEmail);
      return res;
    } finally {
      this.isAuthenticating.set(false);
    }
  }

  private refreshPromise: Promise<boolean> | null = null;
  private profilePromise: Promise<boolean> | null = null;

  async refreshSession(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      try {
        const response = await fetch(`${this.apiBase}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          throw new Error('Refresh failed');
        }

        const { accessToken, refreshToken: newRefreshToken } = await response.json();
        const hasLocalToken = !!localStorage.getItem(this.tokenKey);
        this.setTokens(accessToken, newRefreshToken, hasLocalToken);
        return true;
      } catch (err) {
        this.clearTokens();
        this.currentUser.set(null);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async login(password: string, rememberMe: boolean): Promise<boolean> {
    this.isAuthenticating.set(true);
    try {
      const email = this.currentEmail();
      if (!email) {
        throw new Error('Email context missing. Please enter your email first.');
      }

      const response = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Incorrect password.');
      }

      const { accessToken, refreshToken, user } = await response.json();
      this.setTokens(accessToken, refreshToken, rememberMe);
      this.currentUser.set(user);
      return true;
    } finally {
      this.isAuthenticating.set(false);
    }
  }

  async setPassword(token: string, password: string): Promise<void> {
    const response = await fetch(`${this.apiBase}/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to configure password.');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await fetch(`${this.apiBase}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to request password reset.');
    }
  }

  logout(): void {
    this.clearTokens();
    this.currentUser.set(null);
    this.currentEmail.set(null);
    this.router.navigate(['/login']);
  }

  async fetchProfile(): Promise<boolean> {
    if (this.profilePromise) {
      return this.profilePromise;
    }

    this.profilePromise = (async () => {
      let token = this.getToken();
      if (!token) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          const refreshed = await this.refreshSession();
          if (refreshed) {
            token = this.getToken();
          }
        }
      }
      if (!token) return false;

      try {
        let response = await fetch(`${this.apiBase}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          const refreshed = await this.refreshSession();
          if (refreshed) {
            token = this.getToken();
            response = await fetch(`${this.apiBase}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          }
        }

        if (!response.ok) {
          throw new Error('Profile retrieval failed');
        }

        const userData: User = await response.json();
        this.currentUser.set(userData);
        return true;
      } catch (err) {
        this.clearTokens();
        this.currentUser.set(null);
        return false;
      } finally {
        this.profilePromise = null;
      }
    })();

    return this.profilePromise;
  }

  private async restoreSession(): Promise<void> {
    const token = this.getToken();
    if (token) {
      await this.fetchProfile();
    } else {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        const refreshed = await this.refreshSession();
        if (refreshed) {
          await this.fetchProfile();
        }
      }
    }
  }
}
