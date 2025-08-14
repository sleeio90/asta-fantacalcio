import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Calciatore } from '../models/calciatore.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class CalciatoriService {
  private calciatoriSubject = new BehaviorSubject<Calciatore[]>([]);
  public calciatori$ = this.calciatoriSubject.asObservable();

  constructor() {}

  loadFromExcel(file: File): Promise<Calciatore[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          /* leggi il workbook */
          const bstr: string = e.target.result;
          const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

          /* prendi il primo foglio */
          const wsname: string = wb.SheetNames[0];
          const ws: XLSX.WorkSheet = wb.Sheets[wsname];

          /* converti in JSON */
          const data = XLSX.utils.sheet_to_json(ws);
          console.log('Dati Excel convertiti in JSON:', data);
          
          // Verifica delle colonne presenti
          if (data.length > 0) {
            console.log('Colonne presenti nel file:', Object.keys(data[0] as object));
          }
          
          const calciatori: Calciatore[] = data.map(row => new Calciatore(row));
          console.log('Calciatori creati:', calciatori);
          
          // Log dettagliato del primo calciatore per debugging
          if (calciatori.length > 0) {
            console.log('Dettaglio primo calciatore:', {
              id: calciatori[0].id,
              codiceRuolo: calciatori[0].codiceRuolo,
              nome: calciatori[0].nome,
              squadra: calciatori[0].squadra,
              quotazioneAttuale: calciatori[0].quotazioneAttuale
            });
          }
          
          this.calciatoriSubject.next(calciatori);
          resolve(calciatori);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsBinaryString(file);
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
