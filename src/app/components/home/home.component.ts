import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
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
    private dialog: MatDialog,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    // Metodo vuoto, non serve più caricare i calciatori
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
    }
  }
}
