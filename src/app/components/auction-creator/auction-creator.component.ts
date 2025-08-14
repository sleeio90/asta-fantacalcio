import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CalciatoriService } from '../../services/calciatori.service';
import { AstaService } from '../../services/asta.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-auction-creator',
  templateUrl: './auction-creator.component.html',
  styleUrls: ['./auction-creator.component.scss']
})
export class AuctionCreatorComponent implements OnInit {
  astaForm!: FormGroup;
  minPartecipanti = 2;
  maxPartecipanti = 20;
  user: UserProfile | null = null;

  constructor(
    private fb: FormBuilder,
    private calciatoriService: CalciatoriService,
    private astaService: AstaService,
    private authService: AuthService,
    private notificationsService: NotificationsService,
    private dialogRef: MatDialogRef<AuctionCreatorComponent>
  ) { }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
    });

    this.astaForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      numeroPartecipanti: [8, [Validators.required, Validators.min(this.minPartecipanti), Validators.max(this.maxPartecipanti)]],
      creditiPerPartecipante: [500, [Validators.required, Validators.min(1)]],
      nomeTeamAmministratore: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  onSubmit(): void {
    if (this.astaForm.invalid) {
      this.notificationsService.showError('Compila tutti i campi obbligatori');
      return;
    }

    if (!this.user) {
      this.notificationsService.showError('Utente non autenticato');
      return;
    }

    const formValue = this.astaForm.value;
    const nome = formValue.nome;
    const numeroPartecipanti = formValue.numeroPartecipanti;
    const creditiPerPartecipante = formValue.creditiPerPartecipante;
    const nomeTeamAmministratore = formValue.nomeTeamAmministratore;
    
    // Crea l'asta usando i calciatori da Firebase (il servizio li caricherà automaticamente)
    this.astaService.createAsta(nome, numeroPartecipanti, creditiPerPartecipante, this.user!.uid, []).subscribe({
      next: (asta) => {
        // Dopo aver creato l'asta, aggiungi automaticamente il team dell'amministratore
        this.astaService.joinAsta({
          codiceInvito: asta.codiceInvito,
          nomeTeam: nomeTeamAmministratore,
          userId: this.user!.uid,
          userEmail: this.user!.email
        }).subscribe({
          next: (joinResponse) => {
            if (joinResponse.success) {
              this.notificationsService.showSuccess(`Asta "${nome}" creata con successo! Codice invito: ${asta.codiceInvito}. Team "${nomeTeamAmministratore}" aggiunto automaticamente.`);
            } else {
              this.notificationsService.showWarning(`Asta creata ma errore nell'aggiungere il team: ${joinResponse.message}`);
            }
            this.dialogRef.close(asta);
          },
          error: (error) => {
            console.error('Errore nell\'aggiungere il team amministratore:', error);
            this.notificationsService.showWarning(`Asta creata ma errore nell'aggiungere il team amministratore`);
            this.dialogRef.close(asta);
          }
        });
      },
      error: (error) => {
        console.error('Errore nella creazione dell\'asta:', error);
        this.notificationsService.showError('Errore nella creazione dell\'asta');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
