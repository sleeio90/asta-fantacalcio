import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Asta } from '../models/asta.model';
import { Team } from '../models/team.model';
import { Calciatore } from '../models/calciatore.model';
import { AstaJoinRequest, AstaJoinResponse } from '../models/asta-join.model';
import { FirebaseAstaService } from './firebase-asta.service';

@Injectable({
  providedIn: 'root'
})
export class AstaService {
  constructor(private firebaseService: FirebaseAstaService) { }

  createAsta(nome: string, numeroPartecipanti: number, creditiPerPartecipante: number, amministratore: string, calciatori: Calciatore[]): Observable<Asta> {
    return new Observable(observer => {
      // Se ci sono calciatori passati, usali direttamente
      if (calciatori && calciatori.length > 0) {
        this.firebaseService.createNewAsta(nome, numeroPartecipanti, creditiPerPartecipante, amministratore, calciatori).then((asta: Asta) => {
          observer.next(asta);
          observer.complete();
        }).catch((error: any) => {
          observer.error(error);
        });
      } else {
        // Altrimenti carica i calciatori da Firebase
        this.firebaseService.createAstaFromFirebaseData(nome, numeroPartecipanti, creditiPerPartecipante, amministratore).then((asta: Asta) => {
          observer.next(asta);
          observer.complete();
        }).catch((error: any) => {
          observer.error(error);
        });
      }
    });
  }

  joinAsta(joinRequest: AstaJoinRequest): Observable<AstaJoinResponse> {
    return new Observable(observer => {
      this.firebaseService.joinAsta(joinRequest).then((response: AstaJoinResponse) => {
        observer.next(response);
        observer.complete();
      }).catch((error: any) => {
        observer.error(error);
      });
    });
  }

  getAsteDisponibili(): Observable<Asta[]> {
    return this.firebaseService.getAsteDisponibili();
  }

  getAstaByCode(codiceInvito: string): Observable<Asta | null> {
    return this.firebaseService.getAstaByCode(codiceInvito);
  }

  getAstaById(astaId: string): Observable<Asta | null> {
    return this.firebaseService.getAstaById(astaId);
  }

  getMyAste(userId: string): Observable<Asta[]> {
    return this.firebaseService.getMyAste(userId);
  }

  updateAsta(asta: Asta): Observable<void> {
    return new Observable(observer => {
      this.firebaseService.updateAsta(asta).then(() => {
        observer.next();
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  deleteAsta(astaId: string): Observable<void> {
    return new Observable(observer => {
      this.firebaseService.deleteAsta(astaId).then(() => {
        observer.next();
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  loadCalciatoriIntoAsta(astaId: string): Observable<void> {
    return new Observable(observer => {
      this.firebaseService.loadCalciatoriIntoAsta(astaId).then(() => {
        observer.next();
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  getAsta(): Observable<Asta | null> {
    return this.firebaseService.getAsta();
  }

  getCurrentAsta(): Asta | null {
    return this.firebaseService.getCurrentAsta();
  }

  assegnaCalciatore(calciatore: Calciatore, team: Team, prezzo: number, astaId?: string): Observable<boolean> {
    return new Observable(observer => {
      this.firebaseService.assegnaCalciatore(calciatore, team, prezzo, astaId).then(success => {
        observer.next(success);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  rimuoviAssegnazione(calciatore: Calciatore, astaId?: string): Observable<boolean> {
    return new Observable(observer => {
      this.firebaseService.rimuoviAssegnazione(calciatore, astaId).then(success => {
        observer.next(success);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }
  
  rimuoviCalciatore(calciatore: Calciatore, team: Team, astaId?: string): Observable<boolean> {
    return this.rimuoviAssegnazione(calciatore, astaId);
  }

  getTeams(): Team[] {
    return this.firebaseService.getTeams();
  }

  getTeamByNome(nome: string): Team | undefined {
    return this.firebaseService.getTeamByNome(nome);
  }

  resetAsta(): Observable<void> {
    return new Observable(observer => {
      this.firebaseService.resetAsta().then(() => {
        observer.next();
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  setCurrentAsta(astaId: string): Observable<void> {
    return new Observable(observer => {
      this.firebaseService.setCurrentAsta(astaId).then(() => {
        observer.next();
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }
}
