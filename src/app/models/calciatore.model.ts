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
    // I dati ora arrivano già processati dal JSON
    this.id = data.id || 0;
    this.codiceRuolo = data.codiceRuolo || '';
    this.ruoloMantra = data.ruoloMantra || '';
    this.nome = data.nome || '';
    this.squadra = data.squadra || '';
    this.ruolo = this.mapCodiceRuoloToRuolo(this.codiceRuolo);
    this.quotazioneAttuale = data.quotazioneAttuale || 0;
    this.quotazioneIniziale = data.quotazioneIniziale || 0;
    this.differenza = data.differenza || 0;
    this.quotazioneAttualeMercato = data.quotazioneAttualeMercato || 0;
    this.quotazioneInizialeMercato = data.quotazioneInizialeMercato || 0;
    this.differenzaMercato = data.differenzaMercato || 0;
    this.fairMarketValue = data.fairMarketValue || 0;
    this.fairMarketValueMercato = data.fairMarketValueMercato || 0;
    this.assegnato = data.assegnato || false;
    this.teamAssegnato = data.teamAssegnato || '';
    this.prezzoAcquisto = data.prezzoAcquisto || 0;
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
