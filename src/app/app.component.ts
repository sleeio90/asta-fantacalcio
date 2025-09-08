import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthService, UserProfile } from './services/auth.service';
import { AstaService } from './services/asta.service';
import { AppConfigService } from './services/app-config.service';
import { Observable, combineLatest } from 'rxjs';
import { take, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'asta-fantacalcio';
  user$: Observable<UserProfile | null>;
  authLoading$: Observable<boolean>;
  isEmailVerified = false;
  shouldShowVerificationBanner = true;
  isEmailVerificationRequired$ = this.appConfigService.config$.pipe(
    map(config => config?.requireEmailVerification ?? true)
  );
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private astaService: AstaService,
    private appConfigService: AppConfigService
  ) {
    this.user$ = this.authService.user$;
    this.authLoading$ = this.authService.authLoading$;
  }

  ngOnInit(): void {
    // Pulisci la cache del banner all'avvio
    localStorage.removeItem('emailVerificationBannerDismissed');
    
    // Monitor both user status and email verification requirement
    combineLatest([this.user$, this.isEmailVerificationRequired$]).subscribe(([user, isVerificationRequired]) => {
      console.log('AppComponent - User:', user?.email, 'Email verified:', this.authService.isEmailVerified(), 'Verification required:', isVerificationRequired);
      
      if (user) {
        this.isEmailVerified = this.authService.isEmailVerified();
        
        // If email is verified or verification is not required, clear the dismissed banner flag
        if (this.isEmailVerified || !isVerificationRequired) {
          localStorage.removeItem('emailVerificationBannerDismissed');
          this.shouldShowVerificationBanner = false;
          console.log('Banner nascosto: email verificata o verifica non richiesta');
        } else {
          // Check if banner was dismissed only if email is not verified and verification is required
          const dismissed = localStorage.getItem('emailVerificationBannerDismissed');
          this.shouldShowVerificationBanner = !dismissed;
          console.log('Banner mostrato:', this.shouldShowVerificationBanner, 'Dismissed:', !!dismissed);
        }
      }
    });
  }

  async logout(): Promise<void> {
    console.log('Logout button clicked');
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      console.log('Inizio processo eliminazione account...');
      
      // Ottieni l'utente corrente
      const currentUser = await this.user$.pipe(take(1)).toPromise();
      if (!currentUser) {
        alert('Errore: utente non trovato');
        return;
      }

      console.log('Utente corrente:', currentUser);

      // Controlla se l'utente ha aste in corso
      const userAuctions = await this.astaService.getMyAste(currentUser.uid).pipe(take(1)).toPromise();
      console.log('Aste dell utente:', userAuctions);
      
      if (userAuctions && userAuctions.length > 0) {
        if (currentUser.role === 'admin') {
          // Per gli admin: warning che elimineranno anche le aste
          const asteList = userAuctions.map(asta => '• ' + asta.nome + ' (' + asta.teams.length + ' partecipanti)' + (asta.isAttiva ? ' [ATTIVA]' : ' [NON ATTIVA]')).join('\n');
          const confirmMessage = 
            '⚠️ ATTENZIONE: Aste Rilevate!\n\n' +
            'Hai ' + userAuctions.length + ' asta/e:\n\n' +
            asteList +
            '\n\n❗ Se elimini l\'account, eliminerai anche tutte le aste!\n' +
            '   Tutti i dati delle aste, team e calciatori verranno persi definitivamente!\n\n' +
            'Vuoi continuare comunque?';
          
          console.log('Mostro conferma per aste admin');
          const confirmed = confirm(confirmMessage);
          console.log('Conferma ricevuta:', confirmed);
          
          if (!confirmed) {
            console.log('Eliminazione annullata dall utente');
            return;
          }
        } else {
          // Per i player: non possono eliminare l'account se sono in qualsiasi asta
          console.log('Player con aste - blocco eliminazione');
          const asteList = userAuctions.map(asta => '• ' + asta.nome + (asta.isAttiva ? ' [ATTIVA]' : ' [NON ATTIVA]')).join('\n');
          alert(
            '❌ Non puoi eliminare l\'account!\n\n' +
            'Sei iscritto a ' + userAuctions.length + ' asta/e:\n\n' +
            asteList +
            '\n\n🔧 Per eliminare l\'account devi:\n' +
            '1. Contattare l\'amministratore di ogni asta\n' +
            '2. Farti rimuovere da tutte le aste\n' +
            '3. Poi potrai eliminare l\'account'
          );
          return;
        }
      }

      console.log('Procedo con conferma finale...');
      // Conferma finale per l'eliminazione dell'account
      const finalConfirmed = await this.showDeleteConfirmationDialog();
      console.log('Conferma finale ricevuta:', finalConfirmed);
      
      if (finalConfirmed) {
        try {
          // Se è admin, elimina tutte le sue aste prima di eliminare l'account
          if (currentUser.role === 'admin' && userAuctions) {
            const adminAuctions = userAuctions.filter(asta => asta.amministratore === currentUser.uid);
            
            console.log('Eliminando ' + adminAuctions.length + ' aste dell admin...');
            
            // Elimina ogni asta in sequenza
            for (const asta of adminAuctions) {
              if (asta.id) {
                console.log('Eliminando asta: ' + asta.nome + ' (ID: ' + asta.id + ')');
                try {
                  await this.astaService.deleteAsta(asta.id).pipe(take(1)).toPromise();
                  console.log('Asta eliminata con successo:', asta.id);
                } catch (error) {
                  console.error('Errore eliminazione asta:', asta.id, error);
                  throw error;
                }
              }
            }
            
            console.log('Tutte le aste dell admin sono state eliminate');
          }

          console.log('Procedo con eliminazione account Firebase...');
          // Ora elimina l'account utente
          await this.authService.deleteAccount();
          console.log('Account eliminato con successo');
          this.router.navigate(['/login']);
        } catch (error) {
          console.error('Errore durante l eliminazione dell account:', error);
          
          // Se richiede riautenticazione, informa l'utente
          if ((error as any).message === 'REAUTH_REQUIRED') {
            alert('Per motivi di sicurezza, devi effettuare nuovamente il login prima di eliminare l\'account.\n\nFai logout e accedi di nuovo, poi riprova l\'eliminazione.');
          } else {
            alert('Errore durante l eliminazione dell account: ' + (error as any).message);
          }
        }
      } else {
        console.log('Eliminazione account annullata nella conferma finale');
      }
    } catch (error) {
      console.error('Errore nel controllo delle aste:', error);
      alert('Errore nel controllo delle aste: ' + (error as any).message);
    }
  }

  private async showDeleteConfirmationDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      // Fallback per browser che bloccano confirm()
      try {
        const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
          width: '400px',
          disableClose: true
        });

        dialogRef.afterClosed().subscribe(result => {
          resolve(result === true);
        });
      } catch (error) {
        console.error('Errore apertura dialogo:', error);
        // Fallback al confirm nativo
        const result = confirm(
          'Sei sicuro di voler eliminare il tuo account?\n\n' +
          '⚠️ ATTENZIONE: Questa azione è irreversibile!\n\n' +
          '• Perderai l\'accesso a tutte le tue aste\n' +
          '• Tutti i tuoi dati verranno eliminati permanentemente\n' +
          '• Se sei admin, anche le tue aste verranno eliminate\n' +
          '• Non potrai più recuperare il tuo account\n\n' +
          'Clicca OK per confermare l\'eliminazione.'
        );
        resolve(result);
      }
    });
  }

  navigateToHome(): void {
    console.log('Navigating to home...');
    this.router.navigate(['/home']);
  }

  navigateToAdminSettings(): void {
    console.log('Navigating to admin settings...');
    this.router.navigate(['/admin/settings']);
  }

  goToEmailVerification(): void {
    this.router.navigate(['/email-verification']);
  }

  dismissVerificationBanner(): void {
    this.shouldShowVerificationBanner = false;
    // Save dismissal in localStorage so it doesn't show again until next login
    localStorage.setItem('emailVerificationBannerDismissed', 'true');
  }
}

// Componente per il dialogo di conferma eliminazione
@Component({
  selector: 'confirm-delete-dialog',
  template: `
    <h2 mat-dialog-title>⚠️ Elimina Account</h2>
    <mat-dialog-content>
      <p><strong>Sei sicuro di voler eliminare il tuo account?</strong></p>
      <p class="warning-text">
        <strong>ATTENZIONE: Questa azione è irreversibile!</strong>
      </p>
      <ul>
        <li>Perderai l'accesso a tutte le tue aste</li>
        <li>Tutti i tuoi dati verranno eliminati permanentemente</li>
        <li>Se sei admin, anche le tue aste verranno eliminate</li>
        <li>Non potrai più recuperare il tuo account</li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annulla</button>
      <button mat-button color="warn" (click)="onConfirm()">Elimina Account</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .warning-text {
      color: #f44336;
      font-weight: bold;
      margin: 16px 0;
    }
    ul {
      margin: 16px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
