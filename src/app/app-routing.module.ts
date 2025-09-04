import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { AuctionTableComponent } from './components/auction-table/auction-table.component';
import { TeamDetailComponent } from './components/team-detail/team-detail.component';
import { TeamManagerComponent } from './components/team-manager/team-manager.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { AuthGuard, AdminGuard, LoginGuard } from './guards/auth.guard';

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
    canActivate: [AuthGuard]
  },
  { 
    path: 'auction-table', 
    component: AuctionTableComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'auction-table/:astaId', 
    component: AuctionTableComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'admin/auction/:astaId', 
    component: TeamManagerComponent,
    canActivate: [AdminGuard]
  },
  { 
    path: 'riepilogo', 
    redirectTo: 'auction-table'
  },
  { 
    path: 'team/:nome', 
    component: TeamDetailComponent,
    canActivate: [AuthGuard]
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
