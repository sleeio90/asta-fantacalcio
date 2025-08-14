import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AstaService } from '../../services/asta.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { AuctionCreatorComponent } from '../auction-creator/auction-creator.component';
import { Asta } from '../../models/asta.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  selectedAuction: Asta | null = null;
  user$: Observable<UserProfile | null>;

  constructor(
    private astaService: AstaService,
    private authService: AuthService,
    private notificationsService: NotificationsService,
    private dialog: MatDialog
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    // Metodo vuoto, non serve più caricare i calciatori
  }

  onAuctionSelected(auction: Asta): void {
    this.selectedAuction = auction;
    this.notificationsService.showInfo(`Asta "${auction.nome}" selezionata per la gestione`);
    // TODO: Navigare alla gestione dell'asta specifica
  }

  onAuctionJoined(success: boolean): void {
    if (success) {
      this.notificationsService.showSuccess('Ti sei iscritto all\'asta con successo!');
    }
  }
}
