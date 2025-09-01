import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Calciatore } from '../models/calciatore.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CalciatoriService {
  private calciatoriSubject = new BehaviorSubject<Calciatore[]>([]);
  public calciatori$ = this.calciatoriSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStaticData();
  }

  private loadStaticData(): void {
    this.http.get<any[]>('assets/calciatori-data.json').subscribe({
      next: (data) => {
        const calciatori = data.map(item => {
          // Crea un'istanza di Calciatore con i dati dal JSON
          const calciatore = new Calciatore(item);
          return calciatore;
        });
        this.calciatoriSubject.next(calciatori);
        console.log(`Caricati ${calciatori.length} calciatori dal file statico`);
      },
      error: (error) => {
        console.error('Errore nel caricamento dei calciatori:', error);
      }
    });
  }

  getCalciatori(): Observable<Calciatore[]> {
    return this.calciatori$;
  }

  clearCalciatori(): void {
    this.calciatoriSubject.next([]);
    // NON cancellare automaticamente da Firebase per evitare problemi
  }

  updateCalciatore(calciatore: Calciatore): void {
    const calciatori = this.calciatoriSubject.value;
    const index = calciatori.findIndex(c => c.id === calciatore.id);
    if (index !== -1) {
      calciatori[index] = calciatore;
      this.calciatoriSubject.next([...calciatori]);
    }
  }

  searchCalciatori(query: string): Calciatore[] {
    // Usa i dati locali per evitare dipendenze circolari con Firebase
    const calciatori = this.calciatoriSubject.value;
    
    if (!query || query.trim() === '') {
      return calciatori;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return calciatori.filter(calciatore => 
      calciatore.nome.toLowerCase().includes(searchTerm) || 
      calciatore.squadra.toLowerCase().includes(searchTerm)
    );
  }

  getCalciatoriByRuolo(ruolo: string): Calciatore[] {
    const calciatori = this.calciatoriSubject.value;
    return calciatori.filter((c: Calciatore) => c.codiceRuolo === ruolo);
  }

  getCalciatoreById(id: number): Calciatore | undefined {
    const calciatori = this.calciatoriSubject.value;
    return calciatori.find((c: Calciatore) => c.id === id);
  }

  // Metodo per ottenere solo i calciatori disponibili (non assegnati)
  getCalciatoriDisponibili(): Calciatore[] {
    return this.calciatoriSubject.value.filter((c: Calciatore) => !c.assegnato);
  }
}
