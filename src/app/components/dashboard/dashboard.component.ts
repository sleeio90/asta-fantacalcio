import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AstaService } from '../../services/asta.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { AuctionCreatorComponent } from '../auction-creator/auction-creator.component';
import { Asta } from '../../models/asta.model';
import { Observable } from 'rxjs';
import { take, map } from 'rxjs/operators';

interface UserStats {
  asteCreate: number;
  astePartecipazioni: number;
  squadreCreate: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  selectedAuction: Asta | null = null;
  user$: Observable<UserProfile | null>;
  userStats: UserStats = {
    asteCreate: 0,
    astePartecipazioni: 0,
    squadreCreate: 0
  };

  constructor(
    private astaService: AstaService,
    private authService: AuthService,
    private notificationsService: NotificationsService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.loadUserStats();
  }

  private async loadUserStats(): Promise<void> {
    const user = await this.user$.pipe(take(1)).toPromise();
    if (user) {
      // Calcola le statistiche dell'utente
      try {
        const myAuctions = await this.astaService.getMyAste(user.uid).pipe(take(1)).toPromise();
        if (myAuctions) {
          this.userStats.asteCreate = myAuctions.filter(asta => asta.amministratore === user.uid).length;
          this.userStats.astePartecipazioni = myAuctions.length;
          this.userStats.squadreCreate = myAuctions.reduce((total, asta) => {
            return total + asta.teams.filter(team => team.userId === user.uid).length;
          }, 0);
        }
      } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
      }
    }
  }

  // Pulsante 1: Naviga alla gestione delle aste create
  goToCreateAuctions(): void {
    this.router.navigate(['/admin/auctions']);
  }

  // Pulsante 2: Naviga alla partecipazione alle aste
  goToParticipate(): void {
    this.router.navigate(['/player/auctions']);
  }

  // Pulsante 3: Naviga alla gestione delle squadre
  goToManageTeams(): void {
    this.router.navigate(['/my-teams']);
  }

  // Metodi di compatibilità per eventuali componenti esistenti
  onCreateAuction(): void {
    // Apre il dialog per creare una nuova asta
    this.dialog.open(AuctionCreatorComponent, {
      width: '500px',
      data: {}
    });
  }

  scrollToJoin(): void {
    // Reindirizza alla pagina partecipa
    this.goToParticipate();
  }

  onAuctionSelected(auction: Asta): void {
    this.selectedAuction = auction;
    console.log('Navigazione all\'asta admin:', auction);
    // Naviga alla gestione admin dell'asta specifica
    this.router.navigate(['/admin/auction', auction.id]);
  }

  onAuctionJoined(success: boolean): void {
    if (success) {
      this.notificationsService.showSuccess('Ti sei iscritto all\'asta con successo!');
      // Ricarica le statistiche dopo l'iscrizione
      this.loadUserStats();
    }
  }
}
