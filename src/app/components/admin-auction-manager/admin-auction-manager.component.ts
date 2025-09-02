import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AstaService } from '../../services/asta.service';
import { CalciatoriService } from '../../services/calciatori.service';
import { FirebaseAstaService } from '../../services/firebase-asta.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { AuctionCreatorComponent } from '../auction-creator/auction-creator.component';
import { Asta } from '../../models/asta.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-auction-manager',
  templateUrl: './admin-auction-manager.component.html',
  styleUrls: ['./admin-auction-manager.component.scss']
})
export class AdminAuctionManagerComponent implements OnInit {
  @Output() auctionSelected = new EventEmitter<Asta>();
  
  myAuctions$: Observable<Asta[]> | null = null;
  user: UserProfile | null = null;
  displayedColumns: string[] = ['nome', 'codiceInvito', 'partecipanti', 'stato', 'createdAt', 'actions'];

  constructor(
    private astaService: AstaService,
    private calciatoriService: CalciatoriService,
    private firebaseAstaService: FirebaseAstaService,
    private authService: AuthService,
    private notificationsService: NotificationsService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadMyAuctions();
      }
    });
  }

  loadMyAuctions(): void {
    if (this.user) {
      this.myAuctions$ = this.astaService.getMyAste(this.user.uid);
    }
  }

  onCreateAuction(): void {
    const dialogRef = this.dialog.open(AuctionCreatorComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.notificationsService.showSuccess(`Asta "${result.nome}" creata con successo! Codice invito: ${result.codiceInvito}`);
        this.loadMyAuctions(); // Ricarica la lista
      }
    });
  }

  onDeleteAuction(auction: Asta): void {
    if (confirm(`Sei sicuro di voler eliminare l'asta "${auction.nome}"? Questa azione non può essere annullata.`)) {
      if (auction.id) {
        this.astaService.deleteAsta(auction.id).subscribe({
          next: () => {
            this.notificationsService.showSuccess(`Asta "${auction.nome}" eliminata con successo`);
            this.loadMyAuctions();
          },
          error: (error) => {
            console.error('Errore nell\'eliminazione dell\'asta:', error);
            this.notificationsService.showError('Errore nell\'eliminazione dell\'asta');
          }
        });
      }
    }
  }

  onToggleAuctionStatus(auction: Asta): void {
    auction.isAttiva = !auction.isAttiva;
    this.astaService.updateAsta(auction).subscribe({
      next: () => {
        const status = auction.isAttiva ? 'attivata' : 'disattivata';
        this.notificationsService.showSuccess(`Asta "${auction.nome}" ${status} con successo`);
      },
      error: (error) => {
        console.error('Errore nell\'aggiornamento dell\'asta:', error);
        this.notificationsService.showError('Errore nell\'aggiornamento dell\'asta');
        auction.isAttiva = !auction.isAttiva; // Ripristina lo stato precedente
      }
    });
  }

  getStatusText(auction: Asta): string {
    if (!auction.isAttiva) return 'Inattiva';
    if (auction.partecipantiIscritti >= auction.numeroPartecipanti) return 'Piena';
    return 'Attiva';
  }

  getStatusColor(auction: Asta): string {
    if (!auction.isAttiva) return 'warn';
    if (auction.partecipantiIscritti >= auction.numeroPartecipanti) return 'accent';
    return 'primary';
  }

  onAuctionClick(auction: Asta): void {
    // Verifica che l'asta sia attiva
    if (!auction.isAttiva) {
      this.notificationsService.showError('L\'asta deve essere attiva per poter accedere alla gestione');
      return;
    }

    // Verifica che tutti i partecipanti siano iscritti
    if (auction.partecipantiIscritti < auction.numeroPartecipanti) {
      this.notificationsService.showError(
        `L'asta deve essere completa per iniziare. ` +
        `Partecipanti attuali: ${auction.partecipantiIscritti}/${auction.numeroPartecipanti}`
      );
      return;
    }

    // Se tutte le condizioni sono soddisfatte, procedi con la gestione
    this.auctionSelected.emit(auction);
  }

  async onDownloadCSV(auction: Asta): Promise<void> {
    if (!auction.id) {
      this.notificationsService.showError('Errore: ID asta mancante');
      return;
    }

    try {
      console.log('Inizio download CSV per asta:', auction.nome);
      await this.astaService.downloadRostersCSV(auction.id, auction.nome);
      this.notificationsService.showSuccess('CSV delle rose scaricato con successo!');
    } catch (error) {
      console.error('Errore download CSV:', error);
      this.notificationsService.showError('Errore durante il download del CSV: ' + (error as any).message);
    }
  }
}
