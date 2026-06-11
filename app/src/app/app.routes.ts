import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';
import { PredictorComponent } from './components/predictor/predictor';
import { SetPasswordComponent } from './components/set-password/set-password';
import { AdminPanelComponent } from './components/admin-panel/admin-panel';
import { TermsComponent } from './components/terms/terms';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'predictor', component: PredictorComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminPanelComponent, canActivate: [authGuard] },
  { path: 'terms', component: TermsComponent, canActivate: [authGuard] },
  { path: 'set-password', component: SetPasswordComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
