import { Calciatore } from './calciatore.model';

export class Team {
  nome: string;
  budget: number;
  budgetIniziale: number;
  calciatori: Calciatore[] = [];
  userId?: string; // ID dell'utente che possiede questo team

  constructor(nome: string, budget: number, userId?: string) {
    this.nome = nome;
    this.budget = budget;
    this.budgetIniziale = budget;
    this.userId = userId;
  }

  getPortieri(): Calciatore[] {
    return this.calciatori.filter(c => c.codiceRuolo === 'P');
  }

  getDifensori(): Calciatore[] {
    return this.calciatori.filter(c => c.codiceRuolo === 'D');
  }

  getCentrocampisti(): Calciatore[] {
    return this.calciatori.filter(c => c.codiceRuolo === 'C');
  }

  getAttaccanti(): Calciatore[] {
    return this.calciatori.filter(c => c.codiceRuolo === 'A');
  }

  getTuttiGiocatori(): Calciatore[] {
    const ordineRuoli = ['P', 'D', 'C', 'A'];
    return this.calciatori.sort((a, b) => {
      const indexA = ordineRuoli.indexOf(a.codiceRuolo);
      const indexB = ordineRuoli.indexOf(b.codiceRuolo);
      return indexA - indexB;
    });
  }

  haRaggiuntolLimite(ruolo: string): boolean {
    switch (ruolo) {
      case 'P': return this.getPortieri().length >= 3;
      case 'D': return this.getDifensori().length >= 8;
      case 'C': return this.getCentrocampisti().length >= 8;
      case 'A': return this.getAttaccanti().length >= 6;
      default: return false;
    }
  }

  addCalciatore(calciatore: Calciatore, prezzo: number): boolean {
    if (this.haRaggiuntolLimite(calciatore.codiceRuolo)) {
      return false;
    }

    if (prezzo > this.budget) {
      return false;
    }

    calciatore.assegnato = true;
    calciatore.teamAssegnato = this.nome;
    calciatore.prezzoAcquisto = prezzo;
    this.calciatori.push(calciatore);
    this.budget -= prezzo;

    return true;
  }

  removeCalciatore(calciatore: Calciatore): boolean {
    const index = this.calciatori.findIndex(c => c.id === calciatore.id);
    if (index === -1) {
      return false;
    }

    const prezzo = calciatore.prezzoAcquisto || 0;
    this.budget += prezzo;
    this.calciatori.splice(index, 1);
    
    calciatore.assegnato = false;
    calciatore.teamAssegnato = undefined;
    calciatore.prezzoAcquisto = undefined;

    return true;
  }

  getTotaleSpeso(): number {
    // Calcola il totale sommando direttamente i prezzi di acquisto dei calciatori
    // Questo è più affidabile del calcolo budgetIniziale - budget per evitare inconsistenze
    return this.calciatori.reduce((total, calciatore) => total + (calciatore.prezzoAcquisto || 0), 0);
  }
  
  getTotaleSpesoPorRuolo(ruolo: string): number {
    let calciatori: Calciatore[] = [];
    switch (ruolo) {
      case 'P': calciatori = this.getPortieri(); break;
      case 'D': calciatori = this.getDifensori(); break;
      case 'C': calciatori = this.getCentrocampisti(); break;
      case 'A': calciatori = this.getAttaccanti(); break;
    }
    
    return calciatori.reduce((total, calciatore) => total + (calciatore.prezzoAcquisto || 0), 0);
  }
}
