import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError, from } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;
  // Attach token if the request targets our local APIs (either relative or absolute)
  if (token && (req.url.startsWith('/api') || req.url.includes('/api/'))) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: any) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/login-init') &&
        !req.url.includes('/auth/refresh')
      ) {
        return from(authService.refreshSession()).pipe(
          switchMap((refreshed: boolean) => {
            if (refreshed) {
              const newToken = authService.getToken();
              if (newToken) {
                const retriedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                return next(retriedReq);
              }
            }
            authService.logout();
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
