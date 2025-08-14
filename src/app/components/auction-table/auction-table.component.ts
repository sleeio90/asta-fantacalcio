import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AstaService } from '../../services/asta.service';
import { NotificationsService } from '../../services/notifications.service';
import { Asta } from '../../models/asta.model';
import { Team } from '../../models/team.model';
import { Calciatore } from '../../models/calciatore.model';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-auction-table',
  templateUrl: './auction-table.component.html',
  styleUrls: ['./auction-table.component.scss']
})
export class AuctionTableComponent implements OnInit, OnDestroy {
  asta: Asta | null = null;
  teams: Team[] = [];
  selectedTeam: Team | null = null;
  ruoli = ['P', 'D', 'C', 'A'];
  private astaSubscription: Subscription | null = null;

  constructor(
    private astaService: AstaService,
    private notificationsService: NotificationsService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Controlla se c'è un ID asta nell'URL
    this.route.params.subscribe(params => {
      const astaId = params['astaId'];
      
      if (astaId) {
        console.log('Loading specific auction with ID:', astaId);
        // Carica l'asta specifica dall'ID
        this.loadSpecificAuction(astaId);
      } else {
        console.log('Loading current auction from service');
        // Carica l'asta corrente dal servizio (comportamento originale)
        this.loadCurrentAuction();
      }
    });
  }

  private loadSpecificAuction(astaId: string): void {
    // Prima imposta l'asta come corrente, poi caricala
    this.astaService.setCurrentAsta(astaId).subscribe({
      next: () => {
        this.loadCurrentAuction();
      },
      error: (error) => {
        console.error('Errore nel caricare l\'asta specifica:', error);
        this.notificationsService.showError('Errore nel caricare l\'asta');
        this.router.navigate(['/home']);
      }
    });
  }

  private loadCurrentAuction(): void {
    // Assicurati di fare unsubscribe dalla subscription precedente
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }
    
    this.astaSubscription = this.astaService.getAsta()
      .pipe(distinctUntilChanged((prev, curr) => {
        // Compara gli ID per evitare aggiornamenti duplicati
        if (prev === null && curr === null) return true;
        if (prev === null || curr === null) return false;
        return prev.id === curr.id;
      }))
      .subscribe(asta => {
        console.log('Auction table received asta:', asta);
        
        // Ignora il primo valore null che arriva durante il setCurrentAsta
        if (asta === null) {
          console.log('Ignoring null asta value...');
          return;
        }
        
        // Reset completo dello stato quando cambia l'asta
        this.selectedTeam = null;
        this.teams = [];
        
        this.asta = asta;
        if (asta) {
          this.teams = asta.teams;
          console.log('Loaded teams for asta:', this.teams.length);
        } else {
          this.notificationsService.showWarning('Nessuna asta in corso');
          this.router.navigate(['/home']);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }
  }

  // Metodo per forzare il refresh dei dati dell'asta
  refreshAuctionData(): void {
    console.log('Forcing auction data refresh...');
    // Unsubscribe e re-subscribe per forzare l'aggiornamento
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }
    
    this.astaSubscription = this.astaService.getAsta().subscribe(asta => {
      console.log('Refreshed auction data:', asta);
      this.selectedTeam = null;
      this.teams = [];
      this.asta = asta;
      
      if (asta) {
        this.teams = asta.teams;
      } else {
        this.notificationsService.showWarning('Nessuna asta in corso');
        this.router.navigate(['/home']);
      }
    });
  }

  getCalciatoriByRuolo(team: Team, ruolo: string): Calciatore[] {
    switch (ruolo) {
      case 'P': return team.getPortieri();
      case 'D': return team.getDifensori();
      case 'C': return team.getCentrocampisti();
      case 'A': return team.getAttaccanti();
      default: return [];
    }
  }

  getTotaleSpeso(team: Team): number {
    return team.getTotaleSpeso();
  }

  getBudgetRimanente(team: Team): number {
    return team.budget;
  }

  getBudgetClass(team: Team): string {
    const percentuale = (team.budget / team.budgetIniziale) * 100;
    if (percentuale < 10) {
      return 'budget-danger';
    } else if (percentuale < 30) {
      return 'budget-warning';
    } else {
      return 'budget-ok';
    }
  }

  goToTeamDetail(team: Team): void {
    this.router.navigate(['/team', team.nome]);
  }

  goBack(): void {
    this.router.navigate(['/home']);
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

  hasRaggiuntolLimite(team: Team, ruolo: string): boolean {
    return team.haRaggiuntolLimite(ruolo);
  }

  countCalciatori(team: Team, ruolo: string): string {
    const count = this.getCalciatoriByRuolo(team, ruolo).length;
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
  
  getTotaleSpesoPorRuolo(team: Team, ruolo: string): number {
    return team.getTotaleSpesoPorRuolo(ruolo);
  }
}
