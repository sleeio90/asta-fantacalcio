import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AstaService } from '../../services/asta.service';
import { FirebaseAstaService } from '../../services/firebase-asta.service';
import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../services/auth.service';
import { Team } from '../../models/team.model';
import { Asta } from '../../models/asta.model';
import { Calciatore } from '../../models/calciatore.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss']
})
export class TeamDetailComponent implements OnInit, OnChanges, OnDestroy {
  @Input() teamNome: string = '';
  @Input() asta: Asta | null = null; // Aggiungiamo l'asta come input
  team: Team | null = null;
  ruoli = ['P', 'D', 'C', 'A'];
  displayedColumns: string[] = ['ruolo', 'nome', 'squadra', 'quotazioneAttuale', 'quotazioneIniziale', 'prezzoAcquisto', 'actions'];
  
  private astaSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private astaService: AstaService,
    private firebaseAstaService: FirebaseAstaService,
    private notificationsService: NotificationsService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Se il nome del team non è fornito come input, cercalo nei parametri della route
    if (!this.teamNome) {
      this.route.params.subscribe(params => {
        if (params['nome']) {
          this.teamNome = params['nome'];
          this.loadTeam();
        }
      });
    } else {
      this.loadTeam();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['teamNome'] || changes['asta']) {
      this.loadTeam();
    }
  }

  loadTeam(): void {
    if (!this.teamNome) {
      return;
    }

    // Se abbiamo l'asta come input, usala direttamente
    if (this.asta) {
      this.team = this.asta.teams.find(t => t.nome === this.teamNome) || null;
      if (!this.team) {
        console.warn(`Team ${this.teamNome} non trovato nell'asta fornita ${this.asta.id}`);
      }
      return;
    }

    // Altrimenti, usa il metodo originale per caricare dall'asta corrente
    // Unsubscribe dalla subscription precedente se esiste
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }

    // Usiamo getAsta() per avere i dati più aggiornati da Firebase
    this.astaSubscription = this.astaService.getAsta().subscribe(asta => {
      if (asta) {
        this.team = asta.teams.find(t => t.nome === this.teamNome) || null;
        if (!this.team) {
          // Non mostrare errore immediato, potrebbe essere un cambio di asta in corso
          console.warn(`Team ${this.teamNome} non trovato nell'asta corrente ${asta.id}`);
          // Torna alla home invece di mostrare errore
          setTimeout(() => {
            if (!this.team) {
              this.router.navigate(['/home']);
            }
          }, 500);
        }
      } else {
        this.team = null;
        // Se non c'è asta, torna alla home
        this.router.navigate(['/home']);
      }
    });
  }

  getCalciatoriByRuolo(ruolo: string): Calciatore[] {
    if (!this.team) {
      return [];
    }

    switch (ruolo) {
      case 'P': return this.team.getPortieri();
      case 'D': return this.team.getDifensori();
      case 'C': return this.team.getCentrocampisti();
      case 'A': return this.team.getAttaccanti();
      default: return [];
    }
  }

  getTotaleSpeso(): number {
    return this.team ? this.team.getTotaleSpeso() : 0;
  }

  getBudgetRimanente(): number {
    return this.team ? this.team.budget : 0;
  }

  getBudgetClass(): string {
    if (!this.team) {
      return '';
    }

    const percentuale = (this.team.budget / this.team.budgetIniziale) * 100;
    if (percentuale < 10) {
      return 'budget-danger';
    } else if (percentuale < 30) {
      return 'budget-warning';
    } else {
      return 'budget-ok';
    }
  }

  getNomeRuolo(codiceRuolo: string): string {
    switch (codiceRuolo) {
      case 'P': return 'Portieri';
      case 'D': return 'Difensori';
      case 'C': return 'Centrocampisti';
      case 'A': return 'Attaccanti';
      default: return '';
    }
  }

  removeCalciatore(calciatore: Calciatore, event?: Event): void {
    // Ferma la propagazione dell'evento per evitare problemi di routing
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Controlla se l'utente può modificare questo team
    if (!this.canManageTeam()) {
      this.notificationsService.showError('Non hai il permesso di modificare questo team');
      return;
    }

    // Mostra conferma prima dell'eliminazione
    const confirmMessage = `Sei sicuro di voler eliminare ${calciatore.nome} dal team ${this.team?.nome}?`;
    if (!confirm(confirmMessage)) {
      return; // L'utente ha cancellato
    }

    // Passa l'ID dell'asta se disponibile
    const astaId = this.asta?.id;
    this.astaService.rimuoviAssegnazione(calciatore, astaId).subscribe({
      next: (success) => {
        if (success) {
          this.notificationsService.showSuccess(`${calciatore.nome} rimosso con successo`);
        } else {
          this.notificationsService.showError(`Impossibile rimuovere ${calciatore.nome}`);
        }
      },
      error: (error) => {
        console.error('Errore nella rimozione:', error);
        this.notificationsService.showError(`Errore durante la rimozione di ${calciatore.nome}`);
      }
    });
  }

  editCalciatore(calciatore: Calciatore, event?: Event): void {
    // Ferma la propagazione dell'evento per evitare problemi di routing
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Controlla se l'utente può modificare questo team
    if (!this.canManageTeam()) {
      this.notificationsService.showError('Non hai il permesso di modificare questo team');
      return;
    }

    const nuovoPrezzo = prompt(`Inserisci il nuovo prezzo per ${calciatore.nome}:`, calciatore.prezzoAcquisto?.toString() || '0');
    
    if (nuovoPrezzo === null) {
      return; // L'utente ha cancellato
    }

    const prezzo = parseInt(nuovoPrezzo);
    if (isNaN(prezzo) || prezzo < 1) {
      this.notificationsService.showError('Inserisci un prezzo valido (maggiore di 0)');
      return;
    }

    this.modificaPrezzocalciatore(calciatore, prezzo);
  }

  private modificaPrezzocalciatore(calciatore: Calciatore, nuovoPrezzo: number): void {
    if (!this.team || !this.asta?.id) {
      this.notificationsService.showError('Errore: team o asta non disponibili');
      return;
    }

    const prezzoVecchio = calciatore.prezzoAcquisto || 0;
    const differenza = nuovoPrezzo - prezzoVecchio;

    // Controlla se il team ha abbastanza budget per l'incremento
    if (differenza > this.team.budget) {
      this.notificationsService.showError(`Budget insufficiente. Disponibile: ${this.team.budget}, richiesto: ${differenza}`);
      return;
    }

    // NON aggiornare localmente - lascia che Firebase si occupi dell'aggiornamento
    // Aggiorna su Firebase
    this.firebaseAstaService.updateCalciatorePrezzo(this.asta.id, this.team.nome, calciatore, nuovoPrezzo).then((success: boolean) => {
      if (success) {
        this.notificationsService.showSuccess(`Prezzo di ${calciatore.nome} aggiornato a ${nuovoPrezzo} crediti`);
      } else {
        this.notificationsService.showError(`Errore durante l'aggiornamento del prezzo di ${calciatore.nome}`);
      }
    }).catch((error: any) => {
      console.error('Errore nell\'aggiornamento:', error);
      this.notificationsService.showError(`Errore durante l'aggiornamento del prezzo di ${calciatore.nome}`);
    });
  }

  getRuoloClass(codiceRuolo: string): string {
    switch (codiceRuolo) {
      case 'P': return 'ruolo-portiere';
      case 'D': return 'ruolo-difensore';
      case 'C': return 'ruolo-centrocampista';
      case 'A': return 'ruolo-attaccante';
      default: return '';
    }
  }

  hasRaggiuntolLimite(ruolo: string): boolean {
    return this.team ? this.team.haRaggiuntolLimite(ruolo) : false;
  }

  countCalciatori(ruolo: string): string {
    if (!this.team) {
      return '0/0';
    }
    
    const count = this.getCalciatoriByRuolo(ruolo).length;
    const max = this.getMaxByRuolo(ruolo);
    return `${count}/${max}`;
  }

  getMaxByRuolo(ruolo: string): number {
    switch (ruolo) {
      case 'P': return 3;
      case 'D': return 8;
      case 'C': return 8;
      case 'A': return 6;
      default: return 0;
    }
  }

  getTotaleSpesoPorRuolo(ruolo: string): number {
    return this.team ? this.team.getTotaleSpesoPorRuolo(ruolo) : 0;
  }

  // Metodo per ordinare i calciatori per ruolo
  getCalciatoriOrdinatiPerRuolo(): Calciatore[] {
    if (!this.team) {
      return [];
    }

    // Ordine dei ruoli: P, D, C, A
    const ordineRuoli: {[key: string]: number} = {
      'P': 1,
      'D': 2,
      'C': 3,
      'A': 4
    };

    // Ordina i calciatori per ruolo
    return [...this.team.calciatori].sort((a, b) => {
      return ordineRuoli[a.codiceRuolo] - ordineRuoli[b.codiceRuolo];
    });
  }

  // Controlla se l'utente corrente può gestire questo team
  canManageTeam(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.team) {
      return false;
    }

    // L'admin può gestire tutti i team
    if (currentUser.role === 'admin') {
      return true;
    }

    // Il proprietario del team può gestirlo
    const teamUserId = (this.team as any).userId;
    return teamUserId === currentUser.uid;
  }

  ngOnDestroy(): void {
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }
  }
}
