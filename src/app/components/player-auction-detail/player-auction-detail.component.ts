import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AstaService } from '../../services/asta.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Asta } from '../../models/asta.model';
import { Team } from '../../models/team.model';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Component({
  selector: 'app-player-auction-detail',
  templateUrl: './player-auction-detail.component.html',
  styleUrls: ['./player-auction-detail.component.scss']
})
export class PlayerAuctionDetailComponent implements OnInit {
  userAuctions$: Observable<Asta[]> | null = null;
  userTeams$: Observable<{[auctionId: string]: Team}> | null = null;
  adminDisplayNames$: Observable<{[auctionId: string]: string}> | null = null;
  participantsDisplayNames$: Observable<{[auctionId: string]: {[userId: string]: string}}> | null = null;
  user: UserProfile | null = null;

  constructor(
    private astaService: AstaService,
    private authService: AuthService,
    private db: AngularFireDatabase,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadUserAuction();
      }
    });
  }

  loadUserAuction(): void {
    if (this.user) {
      // Ottieni TUTTE le aste in cui l'utente partecipa
      this.userAuctions$ = this.astaService.getMyAste(this.user.uid).pipe(
        map(aste => {
          // Filtra tutte le aste in cui l'utente partecipa (non solo la prima)
          return aste.filter(asta => {
            return asta.teams.some(team => {
              return (team as any).userId === this.user!.uid;
            });
          });
        })
      );

      // Carica i team dell'utente per ogni asta
      this.userTeams$ = this.userAuctions$.pipe(
        map(auctions => {
          const teams: {[auctionId: string]: Team} = {};
          auctions.forEach(auction => {
            const userTeam = auction.teams.find(team => (team as any).userId === this.user!.uid);
            if (userTeam && auction.id) {
              teams[auction.id] = userTeam;
            }
          });
          return teams;
        })
      );

      // Carica i displayName degli amministratori per ogni asta
      this.adminDisplayNames$ = this.userAuctions$.pipe(
        switchMap(auctions => {
          if (!auctions.length) return of({});
          
          const adminObservables = auctions.map(auction => 
            this.db.object(`/users/${auction.amministratore}`).valueChanges().pipe(
              map((userData: any) => ({
                auctionId: auction.id || '',
                displayName: userData?.displayName || userData?.email || 'Amministratore'
              }))
            )
          );

          return combineLatest(adminObservables).pipe(
            map(adminData => {
              const result: {[auctionId: string]: string} = {};
              adminData.forEach(data => {
                if (data.auctionId) {
                  result[data.auctionId] = data.displayName;
                }
              });
              return result;
            })
          );
        })
      );

      // Carica i displayName dei partecipanti per ogni asta
      this.participantsDisplayNames$ = this.userAuctions$.pipe(
        switchMap(auctions => {
          if (!auctions.length) return of({});
          
          const auctionParticipants: {[auctionId: string]: {[userId: string]: string}} = {};
          
          const participantObservables = auctions.map(auction => {
            if (!auction.teams.length) {
              return of({ auctionId: auction.id, participants: {} });
            }
            
            const userObservables: Observable<string>[] = [];
            const userIds: string[] = [];
            
            auction.teams.forEach(team => {
              const userId = (team as any).userId;
              if (userId) {
                userIds.push(userId);
                userObservables.push(
                  this.db.object(`/users/${userId}`).valueChanges().pipe(
                    map((userData: any) => userData?.displayName || userData?.email || `User-${userId.slice(-4)}`)
                  )
                );
              }
            });

            if (userObservables.length === 0) {
              return of({ auctionId: auction.id, participants: {} });
            }
            
            return combineLatest(userObservables).pipe(
              map(displayNames => {
                const participants: {[userId: string]: string} = {};
                userIds.forEach((userId, index) => {
                  participants[userId] = displayNames[index];
                });
                return { auctionId: auction.id || '', participants };
              })
            );
          });

          return combineLatest(participantObservables).pipe(
            map(auctionData => {
              const result: {[auctionId: string]: {[userId: string]: string}} = {};
              auctionData.forEach(data => {
                if (data.auctionId) {
                  result[data.auctionId] = data.participants;
                }
              });
              return result;
            })
          );
        })
      );
    }
  }

  getStatusText(auction: Asta): string {
    if (!auction.isAttiva) return 'Asta non attiva';
    if (auction.partecipantiIscritti >= auction.numeroPartecipanti) return 'Asta completa';
    return `In attesa di partecipanti (${auction.partecipantiIscritti}/${auction.numeroPartecipanti})`;
  }

  getStatusColor(auction: Asta): string {
    if (!auction.isAttiva) return 'warn';
    if (auction.partecipantiIscritti >= auction.numeroPartecipanti) return 'primary';
    return 'accent';
  }

  getParticipantDisplayName(team: Team, displayNames: {[userId: string]: string} | null): string {
    if (!displayNames || !(team as any).userId) return '';
    return displayNames[(team as any).userId] || '';
  }

  getAdminDisplayName(auctionId: string, adminNames: {[auctionId: string]: string} | null): string {
    if (!adminNames || !auctionId) return 'Caricamento...';
    return adminNames[auctionId] || 'Amministratore';
  }

  getUserTeam(auctionId: string, teams: {[auctionId: string]: Team} | null): Team | null {
    if (!teams || !auctionId) return null;
    return teams[auctionId] || null;
  }

  getAuctionParticipants(auctionId: string, participants: {[auctionId: string]: {[userId: string]: string}} | null): {[userId: string]: string} | null {
    if (!participants || !auctionId) return null;
    return participants[auctionId] || null;
  }

  trackByAuctionId(index: number, auction: Asta): string {
    return auction.id || index.toString();
  }

  trackByTeam(index: number, team: Team): string {
    return team.nome || index.toString();
  }

  isAuctionAccessible(auction: Asta): boolean {
    // L'asta è accessibile se è attiva e completa (ha tutti i partecipanti)
    return auction.isAttiva && auction.partecipantiIscritti >= auction.numeroPartecipanti;
  }

  accessAuction(auction: Asta): void {
    if (auction.id) {
      console.log('Accessing auction with ID:', auction.id);
      
      // Naviga direttamente alla pagina dell'asta specifica con l'ID come parametro
      this.router.navigate(['/auction-table', auction.id]);
    }
  }
}
