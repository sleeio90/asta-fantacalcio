import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Asta } from '../models/asta.model';
import { Team } from '../models/team.model';
import { Calciatore } from '../models/calciatore.model';
import { AstaJoinRequest, AstaJoinResponse } from '../models/asta-join.model';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAstaService {
  private astaSubject = new BehaviorSubject<Asta | null>(null);
  public asta$ = this.astaSubject.asObservable();

  constructor(private db: AngularFireDatabase) {
    // Ascolta i cambiamenti in tempo reale dal database
    this.loadAstaFromFirebase();
  }

  private loadAstaFromFirebase(): void {
    this.db.object('/asta').valueChanges().subscribe((data: any) => {
      if (data) {
        // Ricostruisci l'oggetto Asta dai dati Firebase
        const asta = this.reconstructAstaFromFirebase(data);
        this.astaSubject.next(asta);
      } else {
        this.astaSubject.next(null);
      }
    });
  }

  private reconstructAstaFromFirebase(data: any): Asta {
    // Ricostruisci i teams
    const teams = Object.keys(data.teams || {}).map(key => {
      const teamData = data.teams[key];
      const team = new Team(teamData.nome, teamData.budgetIniziale, teamData.userId);
      team.budget = teamData.budget;
      
      // Ricostruisci i calciatori del team
      if (teamData.calciatori) {
        Object.keys(teamData.calciatori).forEach(calcKey => {
          const calcData = teamData.calciatori[calcKey];
          console.log('Ricostruzione calciatore team da Firebase:', calcKey, calcData);
          
          // Verifica che i dati essenziali ci siano
          if (calcData.nome && calcData.id && calcData.codiceRuolo) {
            const calciatore = new Calciatore(calcData);
            team.addCalciatore(calciatore, calcData.prezzoAcquisto || 0);
          } else {
            console.warn('Calciatore team con dati incompleti ignorato:', calcData);
          }
        });
      }
      
      return team;
    });

    // Ricostruisci l'array di tutti i calciatori
    const calciatori: Calciatore[] = Object.keys(data.calciatori || {})
      .map(key => {
        const calcData = data.calciatori[key];
        console.log('Ricostruzione calciatore da Firebase:', key, calcData);
        
        // Verifica che i dati essenziali ci siano
        if (!calcData.nome || !calcData.id || !calcData.codiceRuolo) {
          console.warn('Calciatore con dati incompleti ignorato:', calcData);
          return null;
        }
        
        return new Calciatore(calcData);
      })
      .filter((calc): calc is Calciatore => calc !== null); // Type guard per rimuovere i null

    const asta = new Asta(
      data.nome, 
      data.numeroPartecipanti || 8, 
      data.creditiPerPartecipante || 500, 
      data.amministratore || 'admin',
      teams, 
      calciatori
    );
    
    // Ripristina i dati aggiuntivi
    if (data.id) asta.id = data.id;
    if (data.codiceInvito) asta.codiceInvito = data.codiceInvito;
    // Usa il conteggio salvato su Firebase invece di quello calcolato dal costruttore
    if (data.partecipantiIscritti !== undefined) asta.partecipantiIscritti = data.partecipantiIscritti;
    if (data.isAttiva !== undefined) asta.isAttiva = data.isAttiva;
    if (data.createdAt) asta.createdAt = new Date(data.createdAt);
    
    return asta;
  }

  createAsta(nome: string, numeroPartecipanti: number, creditiPerPartecipante: number, amministratore: string, teams: Team[], calciatori: Calciatore[]): Promise<Asta> {
    const asta = new Asta(nome, numeroPartecipanti, creditiPerPartecipante, amministratore, teams, calciatori);
    
    // Converte l'asta in un formato adatto a Firebase
    const astaData: any = {
      id: asta.id,
      nome: asta.nome,
      numeroPartecipanti: asta.numeroPartecipanti,
      creditiPerPartecipante: asta.creditiPerPartecipante,
      codiceInvito: asta.codiceInvito,
      amministratore: asta.amministratore,
      partecipantiIscritti: asta.partecipantiIscritti,
      isAttiva: asta.isAttiva,
      createdAt: asta.createdAt.toISOString(),
      teams: {},
      calciatori: {}
    };

    // Converte i teams
    teams.forEach((team, index) => {
      astaData.teams[`team_${index}`] = {
        nome: team.nome,
        budget: team.budget,
        budgetIniziale: team.budgetIniziale,
        calciatori: {}
      };
    });

    // Converte i calciatori
    calciatori.forEach((calc, index) => {
      astaData.calciatori[`calc_${calc.id}`] = {
        id: calc.id,
        nome: calc.nome,
        squadra: calc.squadra,
        codiceRuolo: calc.codiceRuolo,
        ruolo: calc.ruolo,
        quotazioneAttuale: calc.quotazioneAttuale,
        quotazioneIniziale: calc.quotazioneIniziale,
        assegnato: calc.assegnato,
        teamAssegnato: calc.teamAssegnato,
        prezzoAcquisto: calc.prezzoAcquisto
      };
    });

    // Salva su Firebase
    return this.db.object('/asta').set(astaData).then(() => {
      this.astaSubject.next(asta);
      return asta;
    });
  }

  getAsta(): Observable<Asta | null> {
    return this.asta$;
  }

  getCurrentAsta(): Asta | null {
    return this.astaSubject.value;
  }

  assegnaCalciatore(calciatore: Calciatore, team: Team, prezzo: number): Promise<boolean> {
    const asta = this.astaSubject.value;
    if (!asta) {
      return Promise.resolve(false);
    }

    const success = asta.assegnaCalciatore(calciatore, team, prezzo);
    if (success) {
      // Aggiorna Firebase
      return this.updateAstaInFirebase(asta).then(() => true);
    }
    return Promise.resolve(false);
  }

  rimuoviAssegnazione(calciatore: Calciatore): Promise<boolean> {
    const asta = this.astaSubject.value;
    if (!asta) {
      return Promise.resolve(false);
    }

    const success = asta.rimuoviAssegnazione(calciatore);
    if (success) {
      // Aggiorna Firebase
      return this.updateAstaInFirebase(asta).then(() => true);
    }
    return Promise.resolve(false);
  }

  private updateAstaInFirebase(asta: Asta): Promise<void> {
    const astaData: any = {
      nome: asta.nome,
      teams: {},
      calciatori: {}
    };

    // Aggiorna teams
    asta.teams.forEach((team, index) => {
      const teamCalciatori: any = {};
      team.calciatori.forEach((calc, calcIndex) => {
        teamCalciatori[`calc_${calc.id}`] = {
          id: calc.id,
          nome: calc.nome,
          squadra: calc.squadra,
          codiceRuolo: calc.codiceRuolo,
          ruolo: calc.ruolo,
          quotazioneAttuale: calc.quotazioneAttuale,
          quotazioneIniziale: calc.quotazioneIniziale,
          assegnato: calc.assegnato,
          teamAssegnato: calc.teamAssegnato,
          prezzoAcquisto: calc.prezzoAcquisto
        };
      });

      astaData.teams[`team_${index}`] = {
        nome: team.nome,
        budget: team.budget,
        budgetIniziale: team.budgetIniziale,
        calciatori: teamCalciatori
      };
    });

    // Aggiorna calciatori
    asta.calciatori.forEach((calc) => {
      astaData.calciatori[`calc_${calc.id}`] = {
        id: calc.id,
        nome: calc.nome,
        squadra: calc.squadra,
        codiceRuolo: calc.codiceRuolo,
        ruolo: calc.ruolo,
        quotazioneAttuale: calc.quotazioneAttuale,
        quotazioneIniziale: calc.quotazioneIniziale,
        assegnato: calc.assegnato,
        teamAssegnato: calc.teamAssegnato,
        prezzoAcquisto: calc.prezzoAcquisto
      };
    });

    return this.db.object('/asta').update(astaData);
  }

  resetAsta(): Promise<void> {
    return this.db.object('/asta').remove().then(() => {
      this.astaSubject.next(null);
    });
  }

  getTeams(): Team[] {
    const asta = this.astaSubject.value;
    return asta ? asta.teams : [];
  }

  getTeamByNome(nome: string): Team | undefined {
    const asta = this.astaSubject.value;
    return asta ? asta.teams.find(t => t.nome === nome) : undefined;
  }

  // Nuovo metodo per salvare solo i calciatori caricati da Excel
  saveCalciatori(calciatori: Calciatore[]): Promise<void> {
    const calciatoriData: any = {};
    
    calciatori.forEach((calc) => {
      calciatoriData[`calc_${calc.id}`] = {
        id: calc.id,
        nome: calc.nome,
        squadra: calc.squadra,
        codiceRuolo: calc.codiceRuolo,
        ruolo: calc.ruolo,
        quotazioneAttuale: calc.quotazioneAttuale,
        quotazioneIniziale: calc.quotazioneIniziale,
        assegnato: calc.assegnato,
        teamAssegnato: calc.teamAssegnato,
        prezzoAcquisto: calc.prezzoAcquisto
      };
    });

    return this.db.object('/calciatori').set(calciatoriData);
  }

  // Metodo per caricare solo i calciatori da Firebase
  getCalciatoriFromFirebase(): Observable<Calciatore[]> {
    return this.db.object('/calciatori').valueChanges().pipe(
      map((data: any) => {
        if (!data) return [];
        
        return Object.keys(data).map(key => {
          return new Calciatore(data[key]);
        });
      })
    );
  }

  // Nuovo metodo per creare un'asta con le nuove proprietà
  createNewAsta(nome: string, numeroPartecipanti: number, creditiPerPartecipante: number, amministratore: string, calciatori: Calciatore[]): Promise<Asta> {
    const asta = new Asta(nome, numeroPartecipanti, creditiPerPartecipante, amministratore, [], calciatori);
    const astaId = this.db.createPushId();
    asta.id = astaId;
    
    // Converte l'asta in un formato adatto a Firebase
    const astaData: any = {
      id: asta.id,
      nome: asta.nome,
      numeroPartecipanti: asta.numeroPartecipanti,
      creditiPerPartecipante: asta.creditiPerPartecipante,
      codiceInvito: asta.codiceInvito,
      amministratore: asta.amministratore,
      partecipantiIscritti: 1, // L'amministratore è sempre il primo partecipante
      isAttiva: asta.isAttiva,
      createdAt: asta.createdAt.toISOString(),
      teams: {},
      calciatori: {}
    };

    // Converte i calciatori
    calciatori.forEach((calc) => {
      astaData.calciatori[`calc_${calc.id}`] = {
        id: calc.id,
        nome: calc.nome,
        squadra: calc.squadra,
        codiceRuolo: calc.codiceRuolo,
        ruolo: calc.ruolo,
        quotazioneAttuale: calc.quotazioneAttuale,
        quotazioneIniziale: calc.quotazioneIniziale,
        assegnato: calc.assegnato,
        teamAssegnato: calc.teamAssegnato,
        prezzoAcquisto: calc.prezzoAcquisto
      };
    });

    return this.db.object(`/aste/${astaId}`).set(astaData).then(() => {
      return asta;
    });
  }

  // Metodo per creare asta da dati Firebase esistenti
  createAstaFromFirebaseData(nome: string, numeroPartecipanti: number, creditiPerPartecipante: number, amministratore: string): Promise<Asta> {
    // Crea l'asta senza calciatori - i calciatori verranno caricati successivamente quando necessario
    return this.createNewAsta(nome, numeroPartecipanti, creditiPerPartecipante, amministratore, []);
  }

  // Metodo per unirsi a un'asta
  joinAsta(joinRequest: AstaJoinRequest): Promise<AstaJoinResponse> {
    return new Promise((resolve, reject) => {
      this.getAstaByCode(joinRequest.codiceInvito).subscribe(asta => {
        if (!asta) {
          resolve({ success: false, message: 'Codice asta non valido' });
          return;
        }

        if (!asta.canJoin()) {
          resolve({ success: false, message: 'Asta piena o non più disponibile' });
          return;
        }

        // Verifica se il nome del team è già in uso
        const teamExists = asta.teams.some(team => team.nome.toLowerCase() === joinRequest.nomeTeam.toLowerCase());
        if (teamExists) {
          resolve({ success: false, message: 'Nome team già in uso' });
          return;
        }

        // Crea il nuovo team
        const newTeam = new Team(joinRequest.nomeTeam, asta.creditiPerPartecipante);
        
        // Aggiorna l'asta su Firebase
        const teamKey = `team_${asta.teams.length}`;
        const updates: any = {};
        updates[`/aste/${asta.id}/teams/${teamKey}`] = {
          nome: newTeam.nome,
          budget: newTeam.budget,
          budgetIniziale: newTeam.budgetIniziale,
          userId: joinRequest.userId,
          userEmail: joinRequest.userEmail,
          calciatori: {}
        };
        
        // Incrementa i partecipanti solo se non è il primo team (che sarebbe l'amministratore)
        const nuovoConteggio = asta.teams.length === 0 ? 1 : asta.partecipantiIscritti + 1;
        updates[`/aste/${asta.id}/partecipantiIscritti`] = nuovoConteggio;

        this.db.object('/').update(updates).then(() => {
          resolve({ success: true, message: 'Iscrizione effettuata con successo', asta: asta });
        }).catch(error => {
          reject(error);
        });
      });
    });
  }

  // Metodo per ottenere un'asta tramite codice
  getAstaByCode(codiceInvito: string): Observable<Asta | null> {
    return this.db.list('/aste', ref => ref.orderByChild('codiceInvito').equalTo(codiceInvito)).valueChanges().pipe(
      map((aste: any[]) => {
        if (aste.length === 0) return null;
        return this.reconstructAstaFromFirebase(aste[0]);
      })
    );
  }

  // Metodo per ottenere tutte le aste disponibili
  getAsteDisponibili(): Observable<Asta[]> {
    return this.db.list('/aste', ref => ref.orderByChild('isAttiva').equalTo(true)).valueChanges().pipe(
      map((aste: any[]) => {
        return aste.map(astaData => this.reconstructAstaFromFirebase(astaData))
                   .filter(asta => asta.canJoin());
      })
    );
  }

  // Metodo per ottenere le aste di un utente
  getMyAste(userId: string): Observable<Asta[]> {
    return this.db.list('/aste').valueChanges().pipe(
      map((aste: any[]) => {
        return aste.map(astaData => this.reconstructAstaFromFirebase(astaData))
                   .filter(asta => asta.amministratore === userId || 
                                  asta.teams.some(team => (team as any).userId === userId));
      })
    );
  }

  // Metodo per aggiornare un'asta
  updateAsta(asta: Asta): Promise<void> {
    if (!asta.id) {
      return Promise.reject(new Error('ID asta mancante'));
    }

    const astaData: any = {
      id: asta.id,
      nome: asta.nome,
      numeroPartecipanti: asta.numeroPartecipanti,
      creditiPerPartecipante: asta.creditiPerPartecipante,
      codiceInvito: asta.codiceInvito,
      amministratore: asta.amministratore,
      partecipantiIscritti: asta.partecipantiIscritti,
      isAttiva: asta.isAttiva,
      createdAt: asta.createdAt.toISOString(),
      teams: {},
      calciatori: {}
    };

    // Converte i teams
    asta.teams.forEach((team, index) => {
      astaData.teams[`team_${index}`] = {
        nome: team.nome,
        budget: team.budget,
        budgetIniziale: team.budgetIniziale,
        userId: (team as any).userId || '',
        userEmail: (team as any).userEmail || '',
        calciatori: {}
      };

      // Aggiungi i calciatori del team se presenti
      team.calciatori.forEach((calc, calcIndex) => {
        astaData.teams[`team_${index}`].calciatori[`calc_${calcIndex}`] = {
          id: calc.id,
          nome: calc.nome,
          squadra: calc.squadra,
          codiceRuolo: calc.codiceRuolo,
          ruolo: calc.ruolo,
          quotazioneAttuale: calc.quotazioneAttuale,
          quotazioneIniziale: calc.quotazioneIniziale,
          assegnato: calc.assegnato,
          teamAssegnato: calc.teamAssegnato,
          prezzoAcquisto: calc.prezzoAcquisto
        };
      });
    });

    // Converte i calciatori
    asta.calciatori.forEach((calc) => {
      astaData.calciatori[`calc_${calc.id}`] = {
        id: calc.id,
        nome: calc.nome,
        squadra: calc.squadra,
        codiceRuolo: calc.codiceRuolo,
        ruolo: calc.ruolo,
        quotazioneAttuale: calc.quotazioneAttuale,
        quotazioneIniziale: calc.quotazioneIniziale,
        assegnato: calc.assegnato,
        teamAssegnato: calc.teamAssegnato,
        prezzoAcquisto: calc.prezzoAcquisto
      };
    });

    return this.db.object(`/aste/${asta.id}`).set(astaData);
  }

  // Metodo per eliminare un'asta
  deleteAsta(astaId: string): Promise<void> {
    return this.db.object(`/aste/${astaId}`).remove();
  }

  // Metodo per caricare i calciatori in un'asta esistente
  loadCalciatoriIntoAsta(astaId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getCalciatoriFromFirebase().subscribe(calciatori => {
        if (calciatori.length === 0) {
          reject(new Error('Nessun calciatore trovato su Firebase. Carica prima la lista dei calciatori.'));
          return;
        }

        // Aggiorna solo la sezione calciatori dell'asta
        const calciatoriData: any = {};
        calciatori.forEach((calc) => {
          calciatoriData[`calc_${calc.id}`] = {
            id: calc.id,
            nome: calc.nome,
            squadra: calc.squadra,
            codiceRuolo: calc.codiceRuolo,
            ruolo: calc.ruolo,
            quotazioneAttuale: calc.quotazioneAttuale,
            quotazioneIniziale: calc.quotazioneIniziale,
            assegnato: calc.assegnato,
            teamAssegnato: calc.teamAssegnato,
            prezzoAcquisto: calc.prezzoAcquisto
          };
        });

        this.db.object(`/aste/${astaId}/calciatori`).set(calciatoriData).then(() => {
          resolve();
        }).catch(reject);
      });
    });
  }

  setCurrentAsta(astaId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Setting current asta to:', astaId);
      
      // Prima controlla se l'asta corrente è già quella richiesta
      this.db.object('/asta').valueChanges().pipe(
        take(1)
      ).subscribe({
        next: (currentAsta: any) => {
          if (currentAsta && currentAsta.id === astaId) {
            console.log('Asta già corrente, nessun aggiornamento necessario');
            resolve();
            return;
          }
          
          // Copia l'asta dal path /aste/{id} al path /asta per renderla corrente
          this.db.object(`/aste/${astaId}`).valueChanges().pipe(
            take(1)
          ).subscribe({
            next: (astaData: any) => {
              if (astaData) {
                // Non pulire prima - aggiorna direttamente per evitare il null
                this.db.object('/asta').set(astaData).then(() => {
                  console.log('Asta set successfully in Firebase');
                  resolve();
                }).catch(reject);
              } else {
                reject(new Error('Asta non trovata'));
              }
            },
            error: reject
          });
        },
        error: reject
      });
    });
  }
}
