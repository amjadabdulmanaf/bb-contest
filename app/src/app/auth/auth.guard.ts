import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const platformId = inject(PLATFORM_ID);
  
  // If running on the server, allow route to pass through to let the client check authentication
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  // If token or refresh token exists but user profile is not fetched yet, wait for it
  const token = authService.getToken();
  const refreshToken = authService.getRefreshToken();
  if ((token || refreshToken) && !authService.isAuthenticated()) {
    await authService.fetchProfile();
  }

  if (authService.isAuthenticated()) {
    const isAdmin = authService.isAdmin();
    const targetPath = route.routeConfig?.path;

    if (isAdmin) {
      if (targetPath === 'admin') {
        return true;
      } else {
        router.navigate(['/admin']);
        return false;
      }
    } else {
      if (targetPath === 'admin') {
        router.navigate(['/dashboard']);
        return false;
      } else {
        return true;
      }
    }
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const platformId = inject(PLATFORM_ID);
  
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const refreshToken = authService.getRefreshToken();
  if ((token || refreshToken) && !authService.isAuthenticated()) {
    await authService.fetchProfile();
  }

  if (authService.isAuthenticated()) {
    const targetRoute = authService.isAdmin() ? '/admin' : '/dashboard';
    router.navigate([targetRoute]);
    return false;
  }

  return true;
};
