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
  private joinInProgress = new Set<string>(); // Track ongoing join operations

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
    
    // Ricostruisci i teams mantenendo il mapping con le chiavi Firebase
    const teams: Team[] = Object.keys(data.teams || {})
      .sort() // Ordina le chiavi per garantire coerenza
      .map(key => {
        const teamData = data.teams[key];
        console.log('Ricostruzione team da Firebase:', key, teamData);
        
        const team = new Team(teamData.nome, teamData.budgetIniziale || 500);
        team.budget = teamData.budget;
        
        // Copia dati aggiuntivi del team
        if (teamData.userId) (team as any).userId = teamData.userId;
        if (teamData.userEmail) (team as any).userEmail = teamData.userEmail;
        
        // Mantieni la chiave Firebase per riferimenti futuri
        (team as any).firebaseKey = key;

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

    // Converte i teams usando chiavi uniche
    teams.forEach((team, index) => {
      const teamKey = `team_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`;
      (team as any).firebaseKey = teamKey; // Salva la chiave per riferimenti futuri
      astaData.teams[teamKey] = {
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
    
    // Usa la chiave Firebase originale del team invece di findIndex
    const targetTeamKey = (targetTeam as any).firebaseKey;
    if (!targetTeamKey) {
      console.error('Chiave Firebase del team non trovata');
      return Promise.resolve(false);
    }
    
    updates[`/aste/${asta.id}/teams/${targetTeamKey}/budget`] = targetTeam.budget;
    updates[`/aste/${asta.id}/teams/${targetTeamKey}/calciatori/calc_${calciatore.id}`] = {
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
    
    // Usa la chiave Firebase originale del team invece di findIndex
    const targetTeamKey = (targetTeam as any).firebaseKey;
    if (!targetTeamKey) {
      console.error('Chiave Firebase del team non trovata per rimozione');
      return Promise.resolve(false);
    }
    
    console.log('Aggiornamento Firebase per team key:', targetTeamKey);
    
    updates[`/aste/${asta.id}/teams/${targetTeamKey}/budget`] = targetTeam.budget;
    updates[`/aste/${asta.id}/teams/${targetTeamKey}/calciatori/calc_${calciatore.id}`] = null; // Rimuove il nodo
    
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

    // Aggiorna teams usando le chiavi Firebase originali
    asta.teams.forEach((team) => {
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

      // Usa la chiave Firebase originale se disponibile, altrimenti genera una nuova
      const teamKey = (team as any).firebaseKey || `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      astaData.teams[teamKey] = {
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
    const lockKey = `${joinRequest.codiceInvito}-${joinRequest.userId}`;
    
    // Controlla se c'è già un'operazione di join in corso per questo utente/asta
    if (this.joinInProgress.has(lockKey)) {
      return Promise.resolve({ success: false, message: 'Operazione già in corso, attendere...' });
    }
    
    // Aggiungi il lock
    this.joinInProgress.add(lockKey);
    
    return new Promise((resolve, reject) => {
      // Prima ottieni l'asta tramite codice
      this.getAstaByCode(joinRequest.codiceInvito).subscribe(asta => {
        if (!asta) {
          this.joinInProgress.delete(lockKey); // Rimuovi il lock
          resolve({ success: false, message: 'Codice asta non valido' });
          return;
        }

        if (!asta.isAttiva) {
          this.joinInProgress.delete(lockKey); // Rimuovi il lock
          resolve({ success: false, message: 'Asta non più attiva' });
          return;
        }

        // Fai un controllo diretto su Firebase per ottenere i dati più aggiornati
        this.db.object(`/aste/${asta.id}/teams`).valueChanges().pipe(take(1)).subscribe(teamsData => {
          const teams = teamsData as any;
          const currentTeamCount = teams ? Object.keys(teams).length : 0;
          
          // Verifica se l'utente è già nell'asta
          const userAlreadyJoined = teams && Object.keys(teams).some(key => {
            const team = teams[key];
            return team.userId === joinRequest.userId || team.userEmail === joinRequest.userEmail;
          });
          
          if (userAlreadyJoined) {
            this.joinInProgress.delete(lockKey); // Rimuovi il lock
            resolve({ success: true, message: 'Sei già iscritto a questa asta con successo!', asta: asta });
            return;
          }
          
          // Controlla se l'asta è piena basandosi sui dati reali di Firebase
          if (currentTeamCount >= asta.numeroPartecipanti) {
            this.joinInProgress.delete(lockKey); // Rimuovi il lock
            resolve({ success: false, message: 'Asta piena o non più disponibile' });
            return;
          }
          
          // Verifica se il nome del team è già in uso controllando direttamente Firebase
          const teamExists = teams && Object.keys(teams).some(key => {
            const team = teams[key];
            return team.nome && team.nome.toLowerCase().trim() === joinRequest.nomeTeam.toLowerCase().trim();
          });
          
          if (teamExists) {
            console.log('Nome team già esistente:', joinRequest.nomeTeam);
            resolve({ success: false, message: 'Nome team già in uso' });
            return;
          }

          // Crea il nuovo team
          const newTeam = new Team(joinRequest.nomeTeam, asta.creditiPerPartecipante);
          
          // Aggiorna l'asta su Firebase
          // Genera una chiave unica basata sul timestamp e un numero casuale per evitare collisioni
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          const teamKey = `team_${timestamp}_${random}`;
          
          const updates: any = {};
          updates[`/aste/${asta.id}/teams/${teamKey}`] = {
            nome: newTeam.nome.trim(), // Assicurati di rimuovere spazi
            budget: newTeam.budget,
            budgetIniziale: newTeam.budgetIniziale,
            userId: joinRequest.userId,
            userEmail: joinRequest.userEmail,
            calciatori: {}
          };
          
          // Incrementa i partecipanti
          const nuovoConteggio = currentTeamCount + 1;
          updates[`/aste/${asta.id}/partecipantiIscritti`] = nuovoConteggio;

          this.db.object('/').update(updates).then(() => {
            this.joinInProgress.delete(lockKey); // Rimuovi il lock
            resolve({ success: true, message: 'Iscrizione effettuata con successo', asta: asta });
          }).catch(error => {
            this.joinInProgress.delete(lockKey); // Rimuovi il lock anche in caso di errore
            console.error('Errore durante la creazione del team:', error);
            reject(error);
          });
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
                   .filter(asta => {
                     // Controlla se è admin dell'asta
                     if (asta.amministratore === userId) {
                       return true;
                     }
                     
                     // Per i giocatori, controlla se hanno un team E non sono nella blacklist
                     const hasTeam = asta.teams.some(team => (team as any).userId === userId);
                     if (!hasTeam) {
                       return false;
                     }
                     return true;
                   });
      })
    );
  }

  // Metodo per ottenere SOLO le aste create dall'utente (come amministratore)
  getMyCreatedAste(userId: string): Observable<Asta[]> {
    return this.db.list('/aste').valueChanges().pipe(
      map((aste: any[]) => {
        return aste.map(astaData => this.reconstructAstaFromFirebase(astaData))
                   .filter(asta => asta.amministratore === userId);
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

    // Converte i teams usando le chiavi Firebase originali
    asta.teams.forEach((team) => {
      const teamKey = (team as any).firebaseKey || `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      astaData.teams[teamKey] = {
        nome: team.nome,
        budget: team.budget,
        budgetIniziale: team.budgetIniziale,
        userId: (team as any).userId || '',
        userEmail: (team as any).userEmail || '',
        calciatori: {}
      };

      // Aggiungi i calciatori del team se presenti
      team.calciatori.forEach((calc) => {
        astaData.teams[teamKey].calciatori[`calc_${calc.id}`] = {
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
        let teamKey = null;
        let teamData = null;
        
        for (const key of teamKeys) {
          const team = data.teams[key];
          if (team.nome === teamNome) {
            teamKey = key;
            teamData = team;
            break;
          }
        }

        if (!teamData || !teamKey) {
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
        
        updates[`/aste/${astaId}/teams/${teamKey}/budget`] = newBudget;
        updates[`/aste/${astaId}/teams/${teamKey}/calciatori/calc_${calciatore.id}/prezzoAcquisto`] = nuovoPrezzo;

        // Aggiorna anche l'asta corrente se è la stessa (senza triggering del subject)
        if (this.astaSubject.value && this.astaSubject.value.id === astaId) {
          updates[`/asta/teams/${teamKey}/budget`] = newBudget;
          updates[`/asta/teams/${teamKey}/calciatori/calc_${calciatore.id}/prezzoAcquisto`] = nuovoPrezzo;
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

  // Metodo per generare il CSV delle rose complete
  generateRostersCSV(astaId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.db.object(`/aste/${astaId}`).valueChanges().pipe(take(1)).subscribe(data => {
        if (!data) {
          reject(new Error('Asta non trovata'));
          return;
        }

        const asta = data as any;
        console.log('Generazione CSV per asta:', asta.nome);

        let csvContent = '';
        
        // Aggiungi una riga di separazione iniziale
        csvContent += '$,$,$\n';

        // Per ogni team
        if (asta.teams) {
          const teamKeys = Object.keys(asta.teams).sort(); // Ordina per avere un output consistente
          
          teamKeys.forEach((teamKey, teamIndex) => {
            const team = asta.teams[teamKey];
            
            // Aggiungi i calciatori del team
            if (team.calciatori) {
              Object.keys(team.calciatori).forEach(calcKey => {
                const calciatore = team.calciatori[calcKey];
                if (calciatore.assegnato) {
                  // Formato: Nome Squadra, ID Calciatore, Prezzo
                  csvContent += `${team.nome},${calciatore.id},${calciatore.prezzoAcquisto || 0}\n`;
                }
              });
            }
            
            // Aggiungi separatore tra team (tranne dopo l'ultimo)
            if (teamIndex < teamKeys.length - 1) {
              csvContent += '$,$,$\n';
            }
          });
        }

        resolve(csvContent);
      });
    });
  }

  // Metodo per scaricare il CSV
  async downloadRostersCSV(astaId: string, astaName: string): Promise<void> {
    try {
      const csvContent = await this.generateRostersCSV(astaId);
      
      // Crea un blob con il contenuto CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Crea un link per il download
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `fanta-asta-${astaName.replace(/[^a-zA-Z0-9]/g, '-')}-rosters-${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Download CSV avviato per asta:', astaName);
      }
    } catch (error) {
      console.error('Errore durante il download del CSV:', error);
      throw error;
    }
  }
}
