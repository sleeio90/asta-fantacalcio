import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AstaService } from '../../services/asta.service';
import { NotificationsService } from '../../services/notifications.service';
import { Team } from '../../models/team.model';
import { Calciatore } from '../../models/calciatore.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss']
})
export class TeamDetailComponent implements OnInit, OnChanges, OnDestroy {
  @Input() teamNome: string = '';
  team: Team | null = null;
  ruoli = ['P', 'D', 'C', 'A'];
  displayedColumns: string[] = ['ruolo', 'nome', 'squadra', 'quotazioneAttuale', 'quotazioneIniziale', 'prezzoAcquisto', 'actions'];
  
  private astaSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private astaService: AstaService,
    private notificationsService: NotificationsService
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
    if (changes['teamNome']) {
      this.loadTeam();
    }
  }

  loadTeam(): void {
    if (!this.teamNome) {
      return;
    }

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

  removeCalciatore(calciatore: Calciatore): void {
    this.astaService.rimuoviAssegnazione(calciatore).subscribe({
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

  ngOnDestroy(): void {
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }
  }
}
