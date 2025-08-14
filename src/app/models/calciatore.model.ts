export class Calciatore {
  id: number;
  codiceRuolo: string;  // R (P, D, C, A)
  ruoloMantra?: string; // RM (Por, E, Dd, Ds, Dc, etc.)
  nome: string;
  squadra: string;
  ruolo: string;
  quotazioneAttuale: number;
  quotazioneIniziale: number;
  differenza?: number;
  quotazioneAttualeMercato?: number;
  quotazioneInizialeMercato?: number;
  differenzaMercato?: number;
  fairMarketValue?: number;
  fairMarketValueMercato?: number;
  assegnato: boolean = false;
  teamAssegnato?: string;
  prezzoAcquisto?: number;

  constructor(data: any) {
    console.log('Dati ricevuti per creare calciatore:', data);
    
    // Identifica quale campo contiene l'ID (potrebbe essere "Id" o "Quotazioni Fantacalcio Stagione 2025 26")
    let idField = data.Id !== undefined ? 'Id' : Object.keys(data).find(key => key.startsWith('Quotazioni'));
    
    this.id = idField ? parseInt(data[idField]) || 0 : 0;
    this.codiceRuolo = data.R || data.__EMPTY || '';
    this.ruoloMantra = data.RM || data.__EMPTY_1;
    this.nome = data.Nome || data.__EMPTY_2 || '';
    this.squadra = data.Squadra || data.__EMPTY_3 || '';
    this.ruolo = this.mapCodiceRuoloToRuolo(this.codiceRuolo);
    
    // Cerca le quotazioni nelle varie possibili colonne
    this.quotazioneAttuale = parseFloat(data['Qt.A'] || data.__EMPTY_4) || 0;
    this.quotazioneIniziale = parseFloat(data['Qt.I'] || data.__EMPTY_5) || 0;
    this.differenza = parseFloat(data['Diff.'] || data.__EMPTY_6) || 0;
    this.quotazioneAttualeMercato = parseFloat(data['Qt.A M'] || data.__EMPTY_7) || 0;
    this.quotazioneInizialeMercato = parseFloat(data['Qt.I M'] || data.__EMPTY_8) || 0;
    this.differenzaMercato = parseFloat(data['Diff. M'] || data.__EMPTY_9) || 0;
    this.fairMarketValue = parseFloat(data.FMV || data.__EMPTY_10) || 0;
    this.fairMarketValueMercato = parseFloat(data['FMV M'] || data.__EMPTY_11) || 0;
    this.assegnato = false;
    this.teamAssegnato = '';
    this.prezzoAcquisto = 0;
  }

  private mapCodiceRuoloToRuolo(codice: string): string {
    switch (codice) {
      case 'P': return 'Portiere';
      case 'D': return 'Difensore';
      case 'C': return 'Centrocampista';
      case 'A': return 'Attaccante';
      default: return '';
    }
  }
}
