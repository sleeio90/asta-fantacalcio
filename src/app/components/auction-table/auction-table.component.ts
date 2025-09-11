import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AstaService } from '../../services/asta.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { Asta } from '../../models/asta.model';
import { Team } from '../../models/team.model';
import { Calciatore } from '../../models/calciatore.model';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, take } from 'rxjs/operators';
import { PlayerActionDialogComponent, PlayerActionDialogData, PlayerActionDialogResult } from '../player-action-dialog/player-action-dialog.component';

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
  viewMode: 'horizontal' | 'vertical' = 'vertical';
  currentUser: UserProfile | null = null;
  private astaSubscription: Subscription | null = null;

  constructor(
    private astaService: AstaService,
    private authService: AuthService,
    private notificationsService: NotificationsService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // Recupera l'utente corrente
    this.authService.user$.pipe(take(1)).subscribe(user => {
      this.currentUser = user;
    });
    
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
    // Carica direttamente l'asta specifica senza usare setCurrentAsta
    console.log('Loading auction directly with ID:', astaId);
    
    this.astaSubscription = this.astaService.getAstaById(astaId).subscribe({
      next: (asta) => {
        console.log('Auction table received specific asta:', asta);
        
        if (asta) {
          // Verifica se l'utente ha i permessi per accedere a questa asta
          this.authService.user$.pipe(take(1)).subscribe((user: UserProfile | null) => {
            if (!user) {
              console.log('Utente non autenticato');
              this.router.navigate(['/login']);
              return;
            }

            // Controlla se l'utente è il creatore dell'asta o partecipa all'asta
            const isCreator = asta.amministratore === user.uid;
            const isParticipant = asta.teams.some(team => (team as any).userId === user.uid);
            
            console.log('Controllo permessi:', {
              userId: user.uid,
              isCreator,
              isParticipant,
              astaAdmin: asta.amministratore,
              teams: asta.teams.map(t => ({ nome: t.nome, userId: (t as any).userId }))
            });
            
            if (!isCreator && !isParticipant) {
              console.log('Utente non autorizzato per questa asta');
              this.notificationsService.showWarning('Non sei autorizzato ad accedere a questa asta');
              this.router.navigate(['/home']);
              return;
            }

            // L'utente ha i permessi, mostra l'asta
            this.asta = asta;
            this.teams = asta.teams;
            console.log('Loaded teams for specific asta:', this.teams.length);
            
            // Log dei calciatori per debug
            this.teams.forEach(team => {
              console.log(`Team ${team.nome} ha ${team.calciatori.length} calciatori:`, team.calciatori.map(c => c.nome));
            });
          });
        } else {
          console.log('Asta non trovata per ID:', astaId);
          this.notificationsService.showWarning('Asta non trovata');
          this.router.navigate(['/home']);
        }
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

  goBackToMyTeams(): void {
    this.router.navigate(['/my-teams']);
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
  
  // Metodo per ottenere le prime 3 lettere del nome team in maiuscolo
  getTeamAbbreviation(teamName: string): string {
    return teamName.substring(0, 3).toUpperCase();
  }
  
  // Metodo per abbreviare il nome della squadra del calciatore
  getSquadraAbbreviation(squadra: string): string {
    const abbreviations: { [key: string]: string } = {
      'Juventus': 'JUV',
      'Inter': 'INT', 
      'Milan': 'MIL',
      'Napoli': 'NAP',
      'Roma': 'ROM',
      'Lazio': 'LAZ',
      'Atalanta': 'ATA',
      'Fiorentina': 'FIO',
      'Bologna': 'BOL',
      'Torino': 'TOR',
      'Genoa': 'GEN',
      'Sampdoria': 'SAM',
      'Sassuolo': 'SAS',
      'Udinese': 'UDI',
      'Verona': 'VER',
      'Spezia': 'SPE',
      'Cagliari': 'CAG',
      'Venezia': 'VEN',
      'Empoli': 'EMP',
      'Salernitana': 'SAL',
      'Cremonese': 'CRE',
      'Lecce': 'LEC',
      'Monza': 'MON',
      'Frosinone': 'FRO'
    };
    
    return abbreviations[squadra] || squadra.substring(0, 3).toUpperCase();
  }
  
  // Gestione cambio visualizzazione
  onViewModeChange(event: any): void {
    this.viewMode = event.value;
  }
  
  // Metodi per la gestione dei calciatori in visualizzazione verticale
  canEditPlayer(team: Team): boolean {
    if (!this.currentUser) return false;
    // Solo il proprietario del team o il creatore dell'asta possono modificare
    return this.currentUser.uid === team.userId || 
           (this.asta?.amministratore === this.currentUser.uid);
  }
  
  onEditPlayer(calciatore: Calciatore, team: Team): void {
    if (!this.canEditPlayer(team)) {
      this.notificationsService.showWarning('Non puoi modificare calciatori di altri team');
      return;
    }
    
    // Implementazione per modificare il prezzo del calciatore
    const newPrice = prompt(`Modifica prezzo per ${calciatore.nome}:`, calciatore.prezzoAcquisto?.toString() || '0');
    if (newPrice !== null && !isNaN(Number(newPrice))) {
      const price = Number(newPrice);
      if (price >= 0) {
        this.updatePlayerPrice(calciatore, team, price);
      } else {
        this.notificationsService.showWarning('Il prezzo deve essere maggiore o uguale a 0');
      }
    }
  }
  
  onRemovePlayer(calciatore: Calciatore, team: Team): void {
    if (!this.canEditPlayer(team)) {
      this.notificationsService.showWarning('Non puoi rimuovere calciatori di altri team');
      return;
    }
    
    if (confirm(`Vuoi davvero rimuovere ${calciatore.nome} dal team ${team.nome}?`)) {
      this.removePlayerFromTeam(calciatore, team);
    }
  }
  
  private removePlayerFromTeam(calciatore: Calciatore, team: Team): void {
    if (!this.asta) return;
    
    // Rimuovi il calciatore dal team
    const index = team.calciatori.findIndex(c => c.id === calciatore.id);
    if (index > -1) {
      team.calciatori.splice(index, 1);
      
      // Restituisci i crediti al team
      if (calciatore.prezzoAcquisto) {
        team.budget += calciatore.prezzoAcquisto;
      }
      
      // Salva le modifiche
      this.astaService.updateAsta(this.asta).subscribe({
        next: () => {
          this.notificationsService.showSuccess(`${calciatore.nome} rimosso dal team ${team.nome}`);
        },
        error: (error) => {
          console.error('Errore rimozione calciatore:', error);
          this.notificationsService.showError('Errore durante la rimozione del calciatore');
          // Ripristina il calciatore in caso di errore
          team.calciatori.splice(index, 0, calciatore);
          if (calciatore.prezzoAcquisto) {
            team.budget -= calciatore.prezzoAcquisto;
          }
        }
      });
    }
  }

  openPlayerDialog(calciatore: Calciatore, team: Team): void {
    const dialogRef = this.dialog.open(PlayerActionDialogComponent, {
      width: '450px',
      data: {
        calciatore: calciatore,
        team: team
      } as PlayerActionDialogData,
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe((result: PlayerActionDialogResult) => {
      if (result && result.action !== 'cancel') {
        if (result.action === 'edit' && result.newPrice) {
          // Modifica prezzo
          this.updatePlayerPrice(calciatore, team, result.newPrice);
        } else if (result.action === 'delete') {
          // Elimina giocatore
          this.onRemovePlayer(calciatore, team);
        }
      }
    });
  }

  private updatePlayerPrice(calciatore: Calciatore, team: Team, newPrice: number): void {
    if (!this.asta) return;

    const oldPrice = calciatore.prezzoAcquisto || 0;
    const priceDifference = newPrice - oldPrice;

    // Verifica se il team ha budget sufficiente per l'aumento
    if (priceDifference > 0 && team.budget < priceDifference) {
      this.notificationsService.showError('Budget insufficiente per questo prezzo');
      return;
    }

    // Aggiorna il prezzo e il budget
    calciatore.prezzoAcquisto = newPrice;
    team.budget -= priceDifference;

    // Salva le modifiche
    this.astaService.updateAsta(this.asta).subscribe({
      next: () => {
        this.notificationsService.showSuccess(`Prezzo di ${calciatore.nome} aggiornato a ${newPrice} crediti`);
      },
      error: (error) => {
        console.error('Errore aggiornamento prezzo:', error);
        this.notificationsService.showError('Errore durante l\'aggiornamento del prezzo');
        // Ripristina i valori in caso di errore
        calciatore.prezzoAcquisto = oldPrice;
        team.budget += priceDifference;
      }
    });
  }
}
