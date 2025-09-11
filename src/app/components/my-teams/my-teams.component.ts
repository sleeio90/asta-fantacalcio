import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { AstaService } from '../../services/asta.service';
import { NotificationsService } from '../../services/notifications.service';
import { Asta } from '../../models/asta.model';
import { Team } from '../../models/team.model';
import { take } from 'rxjs/operators';

interface TeamWithAsta {
  team: Team;
  asta: Asta;
}

@Component({
  selector: 'app-my-teams',
  templateUrl: './my-teams.component.html',
  styleUrls: ['./my-teams.component.scss']
})
export class MyTeamsComponent implements OnInit {
  loading = true;
  currentUser: UserProfile | null = null;
  
  // Statistiche
  totalSquadre = 0;
  squadreAttive = 0;
  squadreComplete = 0;
  
  // Dati squadre
  squadre: TeamWithAsta[] = [];
  squadreFiltrate: TeamWithAsta[] = [];
  
  // Filtri
  filtroStato = 'tutte';
  filtroNome = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private astaService: AstaService,
    private notificationsService: NotificationsService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    if (this.currentUser) {
      await this.loadMyTeams();
    }
  }

  private async loadCurrentUser(): Promise<void> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    this.currentUser = user || null;
  }

  private async loadMyTeams(): Promise<void> {
    try {
      this.loading = true;
      
      if (!this.currentUser) {
        return;
      }

      // Carica tutte le aste dell'utente
      const myAuctions = await this.astaService.getMyAste(this.currentUser.uid).pipe(take(1)).toPromise();
      
      if (myAuctions) {
        this.squadre = [];
        
        // Per ogni asta, trova le squadre dell'utente
        for (const asta of myAuctions) {
          const userTeams = asta.teams.filter(team => team.userId === this.currentUser!.uid);
          
          for (const team of userTeams) {
            this.squadre.push({
              team,
              asta
            });
          }
        }
        
        this.calcolaStatistiche();
        this.applicaFiltro();
      }
    } catch (error) {
      console.error('Errore nel caricamento delle squadre:', error);
      this.notificationsService.showError('Errore nel caricamento delle squadre');
    } finally {
      this.loading = false;
    }
  }

  private calcolaStatistiche(): void {
    this.totalSquadre = this.squadre.length;
    this.squadreAttive = this.squadre.filter(item => item.asta.isAttiva).length;
    this.squadreComplete = this.squadre.filter(item => !item.asta.isAttiva).length;
  }

  applicaFiltro(): void {
    let squadreFiltrate = [...this.squadre];
    
    // Filtra per stato
    if (this.filtroStato === 'attive') {
      squadreFiltrate = squadreFiltrate.filter(item => item.asta.isAttiva);
    } else if (this.filtroStato === 'completate') {
      squadreFiltrate = squadreFiltrate.filter(item => !item.asta.isAttiva);
    }
    
    // Filtra per nome
    if (this.filtroNome) {
      const filterText = this.filtroNome.toLowerCase();
      squadreFiltrate = squadreFiltrate.filter(item => 
        item.team.nome.toLowerCase().includes(filterText) ||
        item.asta.nome.toLowerCase().includes(filterText)
      );
    }
    
    this.squadreFiltrate = squadreFiltrate;
  }

  getNumeroCalciatori(team: Team): number {
    return team.calciatori?.length || 0;
  }

  getBudgetRimanente(team: Team): number {
    if (!team.calciatori || team.calciatori.length === 0) {
      return team.budget || 0;
    }
    
    const speso = team.calciatori.reduce((total, cal) => total + (cal.prezzoAcquisto || 0), 0);
    return (team.budget || 0) - speso;
  }

  visualizzaDettagliSquadra(team: Team, asta: Asta): void {
    // Naviga alla pagina di dettaglio della squadra
    this.router.navigate(['/team', team.nome], { 
      queryParams: { 
        astaId: asta.id 
      } 
    });
  }

  vaiAllAsta(asta: Asta): void {
    try {
      console.log('vaiAllAsta chiamato con asta:', asta);
      console.log('Current user:', this.currentUser);
      console.log('Asta amministratore:', asta.amministratore);
      
      if (!this.currentUser) {
        console.log('Utente non trovato');
        this.notificationsService.showError('Utente non autenticato');
        return;
      }

      // Se l'utente è l'amministratore/creatore dell'asta, va alla pagina di gestione
      if (asta.amministratore === this.currentUser.uid) {
        console.log('Navigating to admin auctions with astaId:', asta.id);
        this.router.navigate(['/admin/auctions'], { 
          queryParams: { astaId: asta.id } 
        }).then(success => {
          console.log('Navigation success:', success);
        }).catch(error => {
          console.error('Navigation error:', error);
        });
      } else {
        // Altrimenti va alla pagina di visualizzazione dell'asta
        console.log('Navigating to auction-table with astaId:', asta.id);
        this.router.navigate(['/auction-table', asta.id]).then(success => {
          console.log('Navigation success:', success);
        }).catch(error => {
          console.error('Navigation error:', error);
        });
      }
    } catch (error) {
      console.error('Errore in vaiAllAsta:', error);
      this.notificationsService.showError('Errore durante la navigazione');
    }
  }

  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
