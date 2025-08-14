import { Team } from './team.model';
import { Calciatore } from './calciatore.model';

export class Asta {
  id?: string;
  nome: string;
  numeroPartecipanti: number;
  creditiPerPartecipante: number;
  codiceInvito: string;
  teams: Team[] = [];
  calciatori: Calciatore[] = [];
  calciatoriDisponibili: Calciatore[] = [];
  calciatoriAssegnati: Calciatore[] = [];
  amministratore: string;
  partecipantiIscritti: number = 0;
  isAttiva: boolean = true;
  createdAt: Date;

  constructor(
    nome: string, 
    numeroPartecipanti: number, 
    creditiPerPartecipante: number,
    amministratore: string,
    teams: Team[] = [], 
    calciatori: Calciatore[] = []
  ) {
    this.nome = nome;
    this.numeroPartecipanti = numeroPartecipanti;
    this.creditiPerPartecipante = creditiPerPartecipante;
    this.amministratore = amministratore;
    this.teams = teams;
    this.calciatori = calciatori;
    this.calciatoriDisponibili = [...calciatori];
    this.calciatoriAssegnati = [];
    this.codiceInvito = this.generaCodiceInvito();
    this.createdAt = new Date();
    // L'amministratore conta come primo partecipante
    this.partecipantiIscritti = teams.length > 0 ? teams.length : 1;
  }

  private generaCodiceInvito(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  canJoin(): boolean {
    // Verifica se ci sono ancora posti disponibili e se l'asta è attiva
    return this.partecipantiIscritti < this.numeroPartecipanti && this.isAttiva;
  }

  addTeam(team: Team): boolean {
    if (this.canJoin()) {
      this.teams.push(team);
      // Se è il primo team aggiunto (amministratore), non incrementare perché già conteggiato
      if (this.teams.length > 1) {
        this.partecipantiIscritti++;
      }
      return true;
    }
    return false;
  }

  assegnaCalciatore(calciatore: Calciatore, team: Team, prezzo: number): boolean {
    if (!calciatore || !team) {
      return false;
    }

    // Verifica se il calciatore è già assegnato
    if (calciatore.assegnato) {
      return false;
    }

    // Verifica se il team ha raggiunto il limite per quel ruolo
    if (team.haRaggiuntolLimite(calciatore.codiceRuolo)) {
      return false;
    }

    // Verifica se il team ha abbastanza budget
    if (team.budget < prezzo) {
      return false;
    }

    // Assegna il calciatore al team
    const success = team.addCalciatore(calciatore, prezzo);
    if (success) {
      // Aggiorna le liste di calciatori disponibili e assegnati
      const index = this.calciatoriDisponibili.findIndex(c => c.id === calciatore.id);
      if (index !== -1) {
        this.calciatoriDisponibili.splice(index, 1);
        this.calciatoriAssegnati.push(calciatore);
      }
    }

    return success;
  }

  rimuoviAssegnazione(calciatore: Calciatore): boolean {
    if (!calciatore || !calciatore.assegnato || !calciatore.teamAssegnato) {
      return false;
    }

    // Trova il team a cui è assegnato il calciatore
    const team = this.teams.find(t => t.nome === calciatore.teamAssegnato);
    if (!team) {
      return false;
    }

    // Rimuovi il calciatore dal team
    const success = team.removeCalciatore(calciatore);
    if (success) {
      // Aggiorna le liste di calciatori disponibili e assegnati
      const index = this.calciatoriAssegnati.findIndex(c => c.id === calciatore.id);
      if (index !== -1) {
        this.calciatoriAssegnati.splice(index, 1);
        this.calciatoriDisponibili.push(calciatore);
      }
    }

    return success;
  }

  getCalciatoriByRuolo(ruolo: string): Calciatore[] {
    return this.calciatori.filter(c => c.codiceRuolo === ruolo);
  }

  getCalciatoriDisponibiliByRuolo(ruolo: string): Calciatore[] {
    return this.calciatoriDisponibili.filter(c => c.codiceRuolo === ruolo);
  }

  getCalciatoriAssegnatiByRuolo(ruolo: string): Calciatore[] {
    return this.calciatoriAssegnati.filter(c => c.codiceRuolo === ruolo);
  }

  getCalciatoriAssegnatiByTeam(teamNome: string): Calciatore[] {
    return this.calciatoriAssegnati.filter(c => c.teamAssegnato === teamNome);
  }

  getCalciatoriAssegnatiByTeamAndRuolo(teamNome: string, ruolo: string): Calciatore[] {
    return this.calciatoriAssegnati.filter(c => c.teamAssegnato === teamNome && c.codiceRuolo === ruolo);
  }
}
