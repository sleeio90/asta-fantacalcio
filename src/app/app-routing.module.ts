import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { AuctionTableComponent } from './components/auction-table/auction-table.component';
import { TeamDetailComponent } from './components/team-detail/team-detail.component';
import { TeamManagerComponent } from './components/team-manager/team-manager.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { AdminSettingsComponent } from './components/admin-settings/admin-settings.component';
import { AdminPanelLoginComponent } from './components/admin-panel-login/admin-panel-login.component';
import { AdminPanelDashboardComponent } from './components/admin-panel-dashboard/admin-panel-dashboard.component';
import { AuthGuard, AdminGuard, LoginGuard } from './guards/auth.guard';
import { EmailVerificationGuard } from './guards/email-verification.guard';
import { AdminPanelGuard } from './guards/super-admin.guard';

const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  { 
    path: 'email-verification', 
    component: EmailVerificationComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [AuthGuard, EmailVerificationGuard]
  },
  { 
    path: 'auction-table', 
    component: AuctionTableComponent,
    canActivate: [AuthGuard, EmailVerificationGuard]
  },
  { 
    path: 'auction-table/:astaId', 
    component: AuctionTableComponent,
    canActivate: [AuthGuard, EmailVerificationGuard]
  },
  { 
    path: 'admin/auction/:astaId', 
    component: TeamManagerComponent,
    canActivate: [AdminGuard, EmailVerificationGuard]
  },
  { 
    path: 'admin/settings', 
    component: AdminSettingsComponent,
    canActivate: [AdminGuard],
    data: { role: 'admin' }
  },
  { 
    path: 'riepilogo', 
    redirectTo: 'auction-table'
  },
  { 
    path: 'team/:nome', 
    component: TeamDetailComponent,
    canActivate: [AuthGuard, EmailVerificationGuard]
  },
  // Rotte del pannello amministrativo
  {
    path: 'admin-panel/login',
    component: AdminPanelLoginComponent
  },
  {
    path: 'admin-panel/dashboard',
    component: AdminPanelDashboardComponent,
    canActivate: [AdminPanelGuard]
  },
  {
    path: 'admin-panel/settings',
    component: AdminSettingsComponent,
    canActivate: [AdminPanelGuard]
  },
  {
    path: 'admin-panel',
    redirectTo: '/admin-panel/dashboard',
    pathMatch: 'full'
  },
  { 
    path: '', 
    redirectTo: '/home', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
