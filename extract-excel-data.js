const XLSX = require('xlsx');
const fs = require('fs');

// Leggi il file Excel
const workbook = XLSX.readFile('./Quotazioni_Fantacalcio_Stagione_2025_26.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Converti in JSON, saltando la prima riga (headers)
const data = XLSX.utils.sheet_to_json(worksheet, { range: 1 });

console.log('Dati estratti dal file Excel:');
console.log('Numero di record:', data.length);
if (data.length > 0) {
  console.log('Colonne presenti:', Object.keys(data[0]));
  console.log('Primo record:', data[0]);
}

// Processa i dati nello stesso modo del modello Calciatore
const calciatori = data.map((row, index) => {
  return {
    id: parseInt(row.Id) || (index + 1),
    codiceRuolo: row.R || '',
    ruoloMantra: row.RM || '',
    nome: row.Nome || '',
    squadra: row.Squadra || '',
    ruolo: '', // Questo sarà derivato dal codiceRuolo
    quotazioneAttuale: parseFloat(row['Qt.A']) || 0,
    quotazioneIniziale: parseFloat(row['Qt.I']) || 0,
    differenza: parseFloat(row['Diff.']) || 0,
    quotazioneAttualeMercato: parseFloat(row['Qt.A M']) || 0,
    quotazioneInizialeMercato: parseFloat(row['Qt.I M']) || 0,
    differenzaMercato: parseFloat(row['Diff.M']) || 0,
    fairMarketValue: parseFloat(row.FVM) || 0,
    fairMarketValueMercato: parseFloat(row['FVM M']) || 0,
    assegnato: false,
    teamAssegnato: null,
    prezzoAcquisto: null
  };
});

// Filtra i record validi (con nome non vuoto)
const calciatoriValidi = calciatori.filter(c => c.nome && c.nome.trim() !== '');

console.log('Numero di calciatori validi:', calciatoriValidi.length);
console.log('Primo calciatore processato:', calciatoriValidi[0]);

// Salva in un file JSON
fs.writeFileSync('./src/assets/calciatori-data.json', JSON.stringify(calciatoriValidi, null, 2));

console.log('File JSON creato in src/assets/calciatori-data.json');
