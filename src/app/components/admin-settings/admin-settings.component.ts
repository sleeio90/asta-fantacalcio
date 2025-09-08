import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AppConfigService, AppConfig } from '../../services/app-config.service';
import { AdminPanelService } from '../../services/admin-panel.service';
import { NotificationsService } from '../../services/notifications.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
  configForm: FormGroup;
  isLoading = false;
  isSaving = false;
  currentConfig: AppConfig | null = null;

  constructor(
    private fb: FormBuilder,
    private appConfigService: AppConfigService,
    private adminPanelService: AdminPanelService,
    private notificationsService: NotificationsService,
    private router: Router
  ) {
    this.configForm = this.fb.group({
      requireEmailVerification: [false],
      maxParticipantsPerAuction: [20],
      enableNotifications: [true]
    });
  }

  ngOnInit(): void {
    // Verifica che l'utente sia autenticato nel pannello admin
    if (!this.adminPanelService.isAuthenticated()) {
      this.notificationsService.showError('Accesso negato. Effettua il login al pannello gestionale.');
      this.router.navigate(['/admin-panel/login']);
      return;
    }

    this.loadConfig();
  }

  private loadConfig(): void {
    this.isLoading = true;
    
    this.appConfigService.config$.subscribe(config => {
      if (config) {
        this.currentConfig = config;
        this.configForm.patchValue(config);
        this.isLoading = false;
      }
    });
  }

  async onSave(): Promise<void> {
    if (!this.adminPanelService.isAuthenticated()) {
      this.notificationsService.showError('Sessione scaduta. Effettua nuovamente il login.');
      this.router.navigate(['/admin-panel/login']);
      return;
    }

    if (this.configForm.valid) {
      this.isSaving = true;
      
      try {
        const formValues = this.configForm.value;
        await this.appConfigService.updateConfig(formValues);
        
        this.notificationsService.showSuccess('Configurazioni salvate con successo!');
        
        // Se è stata disabilitata la verifica email, mostra un avviso
        if (!formValues.requireEmailVerification && this.currentConfig?.requireEmailVerification) {
          this.notificationsService.showWarning('La verifica email è stata disabilitata. Gli utenti potranno accedere senza verificare l\'email.');
        }
        
        // Se è stata abilitata la verifica email, mostra un avviso
        if (formValues.requireEmailVerification && !this.currentConfig?.requireEmailVerification) {
          this.notificationsService.showInfo('La verifica email è stata abilitata. I nuovi utenti dovranno verificare la propria email.');
        }
        
      } catch (error) {
        console.error('Errore durante il salvataggio:', error);
        this.notificationsService.showError('Errore durante il salvataggio delle configurazioni.');
      } finally {
        this.isSaving = false;
      }
    }
  }

  async onResetToDefaults(): Promise<void> {
    if (!this.adminPanelService.isAuthenticated()) {
      this.notificationsService.showError('Sessione scaduta. Effettua nuovamente il login.');
      this.router.navigate(['/admin-panel/login']);
      return;
    }

    if (confirm('Sei sicuro di voler resettare tutte le configurazioni ai valori di default?')) {
      this.isSaving = true;
      
      try {
        await this.appConfigService.resetToDefaults();
        this.notificationsService.showSuccess('Configurazioni resettate ai valori di default!');
      } catch (error) {
        console.error('Errore durante il reset:', error);
        this.notificationsService.showError('Errore durante il reset delle configurazioni.');
      } finally {
        this.isSaving = false;
      }
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/admin-panel/dashboard']);
  }

  // Getter per accesso facile ai controlli del form
  get requireEmailVerification() { 
    return this.configForm.get('requireEmailVerification'); 
  }
  
  get maxParticipantsPerAuction() { 
    return this.configForm.get('maxParticipantsPerAuction'); 
  }
  
  get enableNotifications() { 
    return this.configForm.get('enableNotifications'); 
  }
}
