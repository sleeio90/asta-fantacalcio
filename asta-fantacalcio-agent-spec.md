% Specifiche per Agent: "AstaFantacalcioFrontEnd"
% Tecnologia: front-end Angular
% Scopo: Creare un'applicazione web per la gestione dell'asta del fantacalcio con interfaccia grafica, solo front-end.

% 1. Pagina introduttiva:
%    - Informazioni su come usare l'applicazione.
%    - Pulsante per caricare la lista dei calciatori tramite file XLSX.
%    - Opzioni per eliminare, modificare o ricaricare la lista caricata.
%    - Visualizzazione del riepilogo dei calciatori caricati, paginata (10 per pagina).
%    - Pulsante "Crea asta" disabilitato finché la lista non è caricata.
%      Al click:
%         - Popup con:
%             * Nome asta
%             * Numero team (da 2 a 20)
%             * Nome di ogni singolo team (input)
%             * Importo budget in crediti per ogni team (es. 1000 crediti)
%
% 2. Caricamento lista calciatori (.xlsx):
%    - Formato XLSX: almeno colonne [Id, R, RM, Nome, Squadra, Ruolo, Qt.A, Qt.I, Diff., Qt.A M, Qt.I M, Diff. M, FMV, FMV M]
%    - Parsing del file
%    - Visualizzazione tabellare delle righe caricate (paginato)
%    - Possibilità di eliminare, modificare, ricaricare la lista
%    - Il file xlsx avrà più pagine, ma basta caricare solo la lista presente nella prima pagina.

% 3. Ricerca calciatori:
%    - Input di ricerca puntuale (onkeyup)
%    - Filtraggio live: mostra solo i calciatori che contengono la stringa inserita
%    - Visualizza tutte le info del calciatore, Ruolo, Nome, Squadra, Quota Attuale.
%    - Selezione del calciatore dopo il completamento del nome

% 4. Assegnazione calciatore a team:
%    - Selezione del team tra quelli disponibili
%    - Inserimento del prezzo di acquisto
%    - Visualizzazione del valore originale del calciatore (dal XLSX)
%    - Conferma assegnazione
%    - Aggiornamento del budget del team (-prezzo acquisto)
%    - Blocco se si supera il limite massimo per ruolo:
%         * 3 portieri
%         * 8 difensori
%         * 8 centrocampisti
%         * 6 attaccanti
%      - Notifica se si raggiunge il limite per ruolo per team

% 5. Riepilogo asta (tab dedicato):
%    - Visualizzazione tabellare di tutti i team:
%         * Colonne: Ruolo | Nome calciatore | Importo budget speso
%         * Ordinamento: Portieri, Difensori, Centrocampisti, Attaccanti
%         * In fondo ad ogni colonna: Importo rimanente per team
%    - Click su singolo team: pagina separata con stesso dettaglio del team selezionato

% 6. Gestione budget:
%    - Ogni team ha un budget iniziale impostato nella creazione dell'asta
%    - Ogni acquisto decrementa il budget del team
%    - Modifica/eliminazione giocatore aggiorna il budget
%    - Visualizzazione budget rimanente in tabella riepilogo e dettaglio team

% 7. Vincoli:
%    - Per ogni team, massimo:
%         * 3 portieri, 8 difensori, 8 centrocampisti, 6 attaccanti
%    - Non è possibile inserire più giocatori per ruolo di quelli previsti
%    - Da 2 a 20 team
%    - Il pulsante "Crea asta" è attivo solo se la lista calciatori è caricata

% 8. Interfaccia utente:
%    - Layout chiaro e responsive
%    - Navigazione tra tab/pagine: Introduzione, Gestione calciatori, Asta, Riepilogo, Dettaglio team
%    - Notifiche per limiti raggiunti, errori di budget, ecc.

% 9. File XLSX esempio:
%    Id, R, RM, Nome, Squadra, Ruolo, Qt.A, Qt.I, Diff., Qt.A M, Qt.I M, Diff. M, FMV, FMV M
%    2428	P	Por	Sommer	Inter	16	16	0	16	16	0	90	90
%	 5513	D	E	Dumfries	Inter	20	20	0	19	19	0	100	94
%    ...
%    in questo caso va considerata solo la colonna R per i ruoli con : P Portiere, D Difensore, C Centrocampista, A Attaccante

% 10. Componenti Angular suggeriti:
%    - XlsxUploaderComponent
%    - CalciatoriTableComponent (con paginazione e ricerca)
%    - TeamManagerComponent (creazione team, gestione budget)
%    - AuctionCreatorComponent (popup creazione asta)
%    - AuctionTableComponent (riepilogo asta per tutti i team)
%    - TeamDetailComponent (dettaglio singolo team)
%    - NotificationsService (gestione messaggi vincoli/budget)

11. Database per persistenza e sincronizzazione tra utenti:
%     - Soluzione semplice, gratuita e cloud: **Firebase Realtime Database**
%     - Permette la sincronizzazione istantanea tra tutti i team/utenti in tempo reale, gratuito fino a una certa soglia.
%     - Modello dati consigliato:
%         /fantasta/
%             /aste/
%                 /[astaId]/
%                     nomeAsta: string
%                     budget: number
%                     teams:
%                         /[teamId]/
%                             nomeTeam: string
%                             budgetRimanente: number
%                             giocatori:
%                                 /[giocatoreId]/
%                                     nome: string
%                     calciatori:
%                         /[giocatoreId]/
%                             nome: string
%                             ruolo: string
%                             prezzoBase: number
%                             prezzoAcquisto: number
%     - Permette:
%         * Visualizzazione e modifica condivisa tra utenti
%         * Aggiornamento istantaneo del riepilogo, del budget e delle rose
%         * Gestione multiutente per l’asta
%     - Consigli:
%         * Usare AngularFire (libreria ufficiale Angular-Firebase) per collegare e sincronizzare i dati
%         * Proteggere la scrittura con regole di sicurezza Firebase

% 12. Alternativa locale (solo per demo/sviluppo singolo utente):
%     - Local Storage (solo per singolo browser, non condiviso tra team)
%     - Modellare la struttura dati come sopra, ma la condivisione tra utenti NON è possibile senza database centrale.

% 13. Documentazione di riferimento:
%     - https://firebase.google.com/products/realtime-database
%     - https://github.com/angular/angularfire