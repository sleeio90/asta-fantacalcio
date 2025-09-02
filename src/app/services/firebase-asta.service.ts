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
    console.log('Ricostruzione asta da Firebase:', data);
    
    // Ricostruisci i teams
    const teams: Team[] = Object.keys(data.teams || {}).map(key => {
      const teamData = data.teams[key];
      console.log('Ricostruzione team da Firebase:', key, teamData);
      
      const team = new Team(teamData.nome, teamData.budgetIniziale || 500);
      team.budget = teamData.budget;
      
      // Copia dati aggiuntivi del team
      if (teamData.userId) (team as any).userId = teamData.userId;
      if (teamData.userEmail) (team as any).userEmail = teamData.userEmail;

      // Ricostruisci i calciatori del team
      if (teamData.calciatori) {
        Object.keys(teamData.calciatori).forEach(calcKey => {
          const calcData = teamData.calciatori[calcKey];
          console.log('Ricostruzione calciatore del team:', calcKey, calcData);
          
          if (calcData && calcData.nome && calcData.id && calcData.codiceRuolo) {
            const calciatore = new Calciatore(calcData);
            // Non usare addCalciatore perché il budget è già quello aggiornato da Firebase
            // Aggiungi direttamente il calciatore alla lista senza modificare il budget
            calciatore.assegnato = true;
            calciatore.teamAssegnato = team.nome;
            calciatore.prezzoAcquisto = calcData.prezzoAcquisto || 0;
            team.calciatori.push(calciatore);
          } else {
            console.warn('Calciatore team con dati incompleti ignorato:', calcData);
          }
        });
      }
      
      return team;
    });

    // Non carichiamo più i calciatori da Firebase - verranno caricati dal JSON statico
    // I calciatori assegnati sono già nei team
    const calciatori: Calciatore[] = [];

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

  assegnaCalciatore(calciatore: Calciatore, team: Team, prezzo: number, astaId?: string): Promise<boolean> {
    if (astaId) {
      // Carica l'asta specifica e poi procedi con l'assegnazione
      return new Promise((resolve) => {
        this.getAstaById(astaId).pipe(take(1)).subscribe(asta => {
          if (!asta) {
            console.log('Asta specifica non trovata:', astaId);
            resolve(false);
            return;
          }
          this._assegnaCalciatoreToAsta(calciatore, team, prezzo, asta).then(resolve);
        });
      });
    } else {
      // Usa l'asta corrente
      const asta = this.astaSubject.value;
      if (!asta) {
        return Promise.resolve(false);
      }
      return this._assegnaCalciatoreToAsta(calciatore, team, prezzo, asta);
    }
  }

  private _assegnaCalciatoreToAsta(calciatore: Calciatore, team: Team, prezzo: number, asta: Asta): Promise<boolean> {
    if (!asta.id) {
      return Promise.resolve(false);
    }

    // Trova il team nell'asta
    const targetTeam = asta.teams.find(t => t.nome === team.nome);
    if (!targetTeam) {
      return Promise.resolve(false);
    }

    // Controlla se il team ha raggiunto il limite per il ruolo
    if (targetTeam.haRaggiuntolLimite(calciatore.codiceRuolo)) {
      return Promise.resolve(false);
    }

    // Controlla se il team ha abbastanza budget
    if (targetTeam.budget < prezzo) {
      return Promise.resolve(false);
    }

    // Crea una copia del calciatore per l'assegnazione
    const calciatoreAssegnato = new Calciatore({
      id: calciatore.id,
      nome: calciatore.nome,
      squadra: calciatore.squadra,
      codiceRuolo: calciatore.codiceRuolo,
      ruolo: calciatore.ruolo,
      quotazioneAttuale: calciatore.quotazioneAttuale,
      quotazioneIniziale: calciatore.quotazioneIniziale,
      assegnato: true,
      teamAssegnato: team.nome,
      prezzoAcquisto: prezzo
    });

    // Aggiunge il calciatore al team e aggiorna il budget
    targetTeam.addCalciatore(calciatoreAssegnato, prezzo);

    // Salva su Firebase - aggiorna solo il team specifico
    const updates: any = {};
    const teamIndex = asta.teams.findIndex(t => t.nome === team.nome);
    
    updates[`/aste/${asta.id}/teams/team_${teamIndex}/budget`] = targetTeam.budget;
    updates[`/aste/${asta.id}/teams/team_${teamIndex}/calciatori/calc_${calciatore.id}`] = {
      id: calciatoreAssegnato.id,
      nome: calciatoreAssegnato.nome,
      squadra: calciatoreAssegnato.squadra,
      codiceRuolo: calciatoreAssegnato.codiceRuolo,
      ruolo: calciatoreAssegnato.ruolo,
      quotazioneAttuale: calciatoreAssegnato.quotazioneAttuale,
      quotazioneIniziale: calciatoreAssegnato.quotazioneIniziale,
      assegnato: true,
      teamAssegnato: team.nome,
      prezzoAcquisto: prezzo
    };

    return this.db.object('/').update(updates).then(() => {
      // Aggiorna il subject locale solo se è la stessa asta
      if (this.astaSubject.value && this.astaSubject.value.id === asta.id) {
        this.astaSubject.next(asta);
      }
      return true;
    }).catch(error => {
      console.error('Errore durante l\'assegnazione:', error);
      return false;
    });
  }

  rimuoviAssegnazione(calciatore: Calciatore, astaId?: string): Promise<boolean> {
    console.log('rimuoviAssegnazione chiamato per calciatore:', calciatore, 'astaId:', astaId);
    
    if (astaId) {
      // Carica l'asta specifica e poi procedi con la rimozione
      return new Promise((resolve) => {
        this.getAstaById(astaId).pipe(take(1)).subscribe(asta => {
          if (!asta) {
            console.log('Asta specifica non trovata:', astaId);
            resolve(false);
            return;
          }
          this._rimuoviAssegnazioneFromAsta(calciatore, asta).then(resolve);
        });
      });
    } else {
      // Usa l'asta corrente
      const asta = this.astaSubject.value;
      if (!asta) {
        console.log('Nessuna asta corrente trovata');
        return Promise.resolve(false);
      }
      return this._rimuoviAssegnazioneFromAsta(calciatore, asta);
    }
  }

  private _rimuoviAssegnazioneFromAsta(calciatore: Calciatore, asta: Asta): Promise<boolean> {
    console.log('_rimuoviAssegnazioneFromAsta per asta:', asta.id, 'calciatore:', calciatore.nome);

    if (!asta.id) {
      console.log('ID asta mancante');
      return Promise.resolve(false);
    }

    console.log('Teams nell\'asta:', asta.teams.map(t => ({ nome: t.nome, calciatori: t.calciatori.length })));

    // Trova il team che ha questo calciatore
    const targetTeam = asta.teams.find(t => {
      const found = t.calciatori.some(c => c.id === calciatore.id);
      console.log(`Team ${t.nome}: ha calciatore ${calciatore.nome}? ${found}`);
      return found;
    });
    
    if (!targetTeam) {
      console.log('Team non trovato per il calciatore:', calciatore.nome);
      console.log('Calciatori disponibili negli teams:');
      asta.teams.forEach(team => {
        console.log(`${team.nome}:`, team.calciatori.map(c => `${c.nome}(${c.id})`));
      });
      return Promise.resolve(false);
    }

    console.log('Team trovato:', targetTeam.nome);

    // Trova il calciatore nel team
    const calciatoreIndex = targetTeam.calciatori.findIndex(c => c.id === calciatore.id);
    if (calciatoreIndex === -1) {
      console.log('Calciatore non trovato nel team');
      return Promise.resolve(false);
    }

    const calciatoreAssegnato = targetTeam.calciatori[calciatoreIndex];
    console.log('Calciatore da rimuovere trovato:', calciatoreAssegnato.nome, 'prezzo:', calciatoreAssegnato.prezzoAcquisto);
    
    // Rimuove il calciatore dal team e ripristina il budget
    const budgetPrima = targetTeam.budget;
    const rimossoConSuccesso = targetTeam.removeCalciatore(calciatoreAssegnato);
    console.log('Rimozione dal team:', rimossoConSuccesso, 'Budget prima:', budgetPrima, 'Budget dopo:', targetTeam.budget);

    if (!rimossoConSuccesso) {
      console.log('Errore nella rimozione dal team');
      return Promise.resolve(false);
    }

    // Aggiorna Firebase - rimuove il calciatore dal team
    const updates: any = {};
    const teamIndex = asta.teams.findIndex(t => t.nome === targetTeam.nome);
    console.log('Aggiornamento Firebase per team index:', teamIndex);
    
    updates[`/aste/${asta.id}/teams/team_${teamIndex}/budget`] = targetTeam.budget;
    updates[`/aste/${asta.id}/teams/team_${teamIndex}/calciatori/calc_${calciatore.id}`] = null; // Rimuove il nodo
    
    console.log('Updates da inviare a Firebase:', updates);

    return this.db.object('/').update(updates).then(() => {
      console.log('Aggiornamento Firebase completato con successo');
      // Aggiorna il subject locale solo se è la stessa asta
      if (this.astaSubject.value && this.astaSubject.value.id === asta.id) {
        this.astaSubject.next(asta);
      }
      return true;
    }).catch(error => {
      console.error('Errore durante la rimozione:', error);
      return false;
    });
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
    const asta = new Asta(nome, numeroPartecipanti, creditiPerPartecipante, amministratore, [], []); // Teams e calciatori vuoti
    const astaId = this.db.createPushId();
    asta.id = astaId;
    
    // Converte l'asta in un formato adatto a Firebase - senza calciatori globali
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
      teams: {}
      // Nota: Non salviamo più la lista completa dei calciatori
    };

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

  // Metodo per ottenere un'asta tramite ID
  getAstaById(astaId: string): Observable<Asta | null> {
    console.log('getAstaById chiamato per ID:', astaId);
    return this.db.object(`/aste/${astaId}`).valueChanges().pipe(
      map((astaData: any) => {
        console.log('Dati asta ricevuti da Firebase per ID', astaId, ':', astaData);
        if (!astaData) {
          console.log('Nessun dato trovato per asta ID:', astaId);
          return null;
        }
        const asta = this.reconstructAstaFromFirebase(astaData);
        console.log('Asta ricostruita:', asta);
        return asta;
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

  updateCalciatorePrezzo(astaId: string, teamNome: string, calciatore: Calciatore, nuovoPrezzo: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Non usare getAstaById per evitare loop - lavora direttamente sui dati Firebase
      this.db.object(`/aste/${astaId}`).valueChanges().pipe(take(1)).subscribe(astaData => {
        if (!astaData) {
          reject(new Error('Asta non trovata'));
          return;
        }

        const data = astaData as any;
        
        // Trova il team nei dati Firebase
        const teamKeys = Object.keys(data.teams || {});
        let teamIndex = -1;
        let teamData = null;
        
        for (let i = 0; i < teamKeys.length; i++) {
          const team = data.teams[teamKeys[i]];
          if (team.nome === teamNome) {
            teamIndex = i;
            teamData = team;
            break;
          }
        }

        if (!teamData) {
          reject(new Error('Team non trovato'));
          return;
        }

        // Trova il calciatore nei dati Firebase
        const calciatoreData = teamData.calciatori?.[`calc_${calciatore.id}`];
        if (!calciatoreData) {
          reject(new Error('Calciatore non trovato nel team'));
          return;
        }

        const prezzoVecchio = calciatoreData.prezzoAcquisto || 0;
        const differenza = nuovoPrezzo - prezzoVecchio;

        // Controlla il budget
        if (differenza > teamData.budget) {
          reject(new Error('Budget insufficiente'));
          return;
        }

        // Prepara gli aggiornamenti atomici per Firebase
        const updates: any = {};
        const newBudget = teamData.budget - differenza;
        
        updates[`/aste/${astaId}/teams/team_${teamIndex}/budget`] = newBudget;
        updates[`/aste/${astaId}/teams/team_${teamIndex}/calciatori/calc_${calciatore.id}/prezzoAcquisto`] = nuovoPrezzo;

        // Aggiorna anche l'asta corrente se è la stessa (senza triggering del subject)
        if (this.astaSubject.value && this.astaSubject.value.id === astaId) {
          updates[`/asta/teams/team_${teamIndex}/budget`] = newBudget;
          updates[`/asta/teams/team_${teamIndex}/calciatori/calc_${calciatore.id}/prezzoAcquisto`] = nuovoPrezzo;
        }

        this.db.object('/').update(updates).then(() => {
          console.log('Prezzo calciatore aggiornato con successo');
          resolve(true);
        }).catch(error => {
          console.error('Errore durante l\'aggiornamento del prezzo:', error);
          resolve(false);
        });
      });
    });
  }
}
