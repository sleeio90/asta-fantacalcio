import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminPanelService } from '../../services/admin-panel.service';
import { AppConfigService } from '../../services/app-config.service';

@Component({
  selector: 'app-admin-panel-dashboard',
  templateUrl: './admin-panel-dashboard.component.html',
  styleUrls: ['./admin-panel-dashboard.component.scss']
})
export class AdminPanelDashboardComponent implements OnInit {
  sessionInfo: any;
  isSessionExpiring = false;

  constructor(
    private adminPanelService: AdminPanelService,
    private appConfigService: AppConfigService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Verifica autenticazione
    if (!this.adminPanelService.isAuthenticated()) {
      this.router.navigate(['/admin-panel/login']);
      return;
    }

    this.sessionInfo = this.adminPanelService.getSessionInfo();
    this.isSessionExpiring = this.adminPanelService.isSessionExpiringSoon();

    // Controlla periodicamente se la sessione sta per scadere
    setInterval(() => {
      this.isSessionExpiring = this.adminPanelService.isSessionExpiringSoon();
    }, 60000); // Controlla ogni minuto
  }

  logout(): void {
    this.adminPanelService.logout();
    this.router.navigate(['/home']);
  }

  extendSession(): void {
    this.adminPanelService.extendSession();
    this.isSessionExpiring = false;
    this.sessionInfo = this.adminPanelService.getSessionInfo();
  }

  goToSettings(): void {
    this.router.navigate(['/admin-panel/settings']);
  }

  goToMainApp(): void {
    this.router.navigate(['/home']);
  }
}
