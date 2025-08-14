import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AstaService } from '../../services/asta.service';
import { CalciatoriService } from '../../services/calciatori.service';
import { NotificationsService } from '../../services/notifications.service';
import { Asta } from '../../models/asta.model';
import { Team } from '../../models/team.model';
import { Calciatore } from '../../models/calciatore.model';

@Component({
  selector: 'app-team-manager',
  templateUrl: './team-manager.component.html',
  styleUrls: ['./team-manager.component.scss']
})
export class TeamManagerComponent implements OnInit, OnDestroy {
  asta: Asta | null = null;
  teams: Team[] = [];
  assegnazioneForm: FormGroup;
  selectedCalciatore: Calciatore | null = null;
  searchText = '';
  filteredCalciatori: Calciatore[] = [];
  searchControl = new FormControl('');
  filteredOptions!: Observable<Calciatore[]>;
  
  private astaSubscription: Subscription | null = null;
  selectedRuoloFilter: string | null = null;

  constructor(
    private fb: FormBuilder,
    private astaService: AstaService,
    private calciatoriService: CalciatoriService,
    private notificationsService: NotificationsService
  ) {
    this.assegnazioneForm = this.fb.group({
      calciatoreId: ['', Validators.required],
      teamNome: ['', Validators.required],
      prezzo: [0, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    // Ascolta i cambiamenti dell'asta in tempo reale
    this.astaSubscription = this.astaService.getAsta().subscribe(asta => {
      console.log('Team Manager: Ricevuta asta aggiornata', asta);
      this.asta = asta;
      if (asta) {
        this.teams = asta.teams;
        this.filteredCalciatori = asta.calciatoriDisponibili;
        console.log('Team Manager: Calciatori disponibili:', this.filteredCalciatori.length);
        
        // Reinizializza il filtro dell'autocomplete ogni volta che cambiano i dati
        this.initFilteredOptions();
        
        // Applica il filtro per ruolo se è stato selezionato
        if (this.selectedRuoloFilter) {
          this.onRuoloFilterClick(this.selectedRuoloFilter);
        }
      } else {
        this.teams = [];
        this.filteredCalciatori = [];
        console.log('Team Manager: Nessuna asta trovata');
      }
    });

    // Reagisci ai cambiamenti nel campo di ricerca
    this.assegnazioneForm.get('calciatoreId')?.valueChanges.subscribe(id => {
      this.selectedCalciatore = this.asta?.calciatoriDisponibili.find(c => c.id === id) || null;
      
      if (this.selectedCalciatore) {
        // Imposta il prezzo di default alla quotazione attuale
        this.assegnazioneForm.get('prezzo')?.setValue(this.selectedCalciatore.quotazioneAttuale);
      }
    });
  }

  private initFilteredOptions(): void {
    this.filteredOptions = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCalciatori(value || ''))
    );
  }

  private _filterCalciatori(value: string | Calciatore): Calciatore[] {
    if (!this.asta) {
      return [];
    }
    
    // Se il valore è un oggetto Calciatore, lascia passare e usa il displayFn
    if (value && typeof value === 'object') {
      return [value as Calciatore];
    }
    
    const filterValue = typeof value === 'string' ? value.toLowerCase().trim() : '';
    
    // Applica prima il filtro per ruolo se selezionato
    let calciatoriFiltratiPerRuolo = this.asta.calciatoriDisponibili;
    if (this.selectedRuoloFilter) {
      calciatoriFiltratiPerRuolo = this.asta.calciatoriDisponibili.filter(
        calciatore => calciatore.codiceRuolo === this.selectedRuoloFilter
      );
    }
    
    if (!filterValue) {
      return calciatoriFiltratiPerRuolo.slice(0, 10); // Mostra i primi 10 come default
    }
    
    return calciatoriFiltratiPerRuolo.filter(calciatore => 
      calciatore.nome.toLowerCase().includes(filterValue) || 
      calciatore.squadra.toLowerCase().includes(filterValue)
    ).slice(0, 10); // Limita a 10 risultati per performance
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement)?.value || '';
    this.searchText = query;
    this.searchControl.setValue(query);
  }

  onClearSearch(): void {
    this.searchText = '';
    this.searchControl.setValue('');
    
    // Se il calciatore è selezionato, deselezionalo
    if (this.selectedCalciatore) {
      this.onDeselectCalciatore();
    }
    
    if (this.asta) {
      this.filteredCalciatori = this.asta.calciatoriDisponibili;
    }
    
    // Focus sul campo di input
    setTimeout(() => {
      const input = document.querySelector('input[matInput]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 0);
  }

  onRuoloFilterClick(ruolo: string): void {
    if (this.selectedRuoloFilter === ruolo) {
      // Se clicco sullo stesso ruolo, deseleziono
      this.selectedRuoloFilter = null;
    } else {
      // Altrimenti seleziono il nuovo ruolo
      this.selectedRuoloFilter = ruolo;
    }
    
    // Aggiorna il filtro dell'autocomplete
    this.initFilteredOptions();
    
    // Pulisce la ricerca corrente per mostrare i nuovi risultati
    this.searchControl.setValue('');
  }
  
  onCalciatoreSelected(calciatore: Calciatore): void {
    // Imposta il calciatore selezionato nel form
    this.assegnazioneForm.get('calciatoreId')?.setValue(calciatore.id);
    this.selectedCalciatore = calciatore;
    
    // Svuota immediatamente il campo di ricerca
    this.searchText = '';
    this.searchControl.setValue('');
    
    // Imposta il prezzo del calciatore
    if (this.selectedCalciatore) {
      this.assegnazioneForm.get('prezzo')?.setValue(this.selectedCalciatore.quotazioneAttuale);
    }
  }

  onDeselectCalciatore(): void {
    // Deseleziona il calciatore
    this.selectedCalciatore = null;
    this.assegnazioneForm.get('calciatoreId')?.setValue('');
    this.assegnazioneForm.get('prezzo')?.setValue(0);
    // Reset completo dei campi di ricerca
    this.searchText = '';
    this.searchControl.setValue('');
    // Forza il reset dell'autocomplete
    setTimeout(() => {
      const input = document.querySelector('input[matInput]') as HTMLInputElement;
      if (input) {
        input.blur();
        input.value = '';
      }
    }, 0);
  }

  displayFn(calciatore: Calciatore | string): string {
    if (!calciatore) return '';
    if (typeof calciatore === 'string') return calciatore;
    // Mostra il nome del calciatore nel campo di input
    return `${calciatore.nome} (${calciatore.squadra})`;
  }

  onSubmit(): void {
    if (this.assegnazioneForm.invalid) {
      this.notificationsService.showError('Compila tutti i campi correttamente');
      return;
    }

    const formValue = this.assegnazioneForm.value;
    const calciatoreId = formValue.calciatoreId;
    const teamNome = formValue.teamNome;
    const prezzo = formValue.prezzo;

    const calciatore = this.asta?.calciatoriDisponibili.find(c => c.id === calciatoreId);
    const team = this.asta?.teams.find(t => t.nome === teamNome);

    if (!calciatore || !team) {
      this.notificationsService.showError('Calciatore o team non trovato');
      return;
    }

    // Controlla se il team ha raggiunto il limite per il ruolo
    if (team.haRaggiuntolLimite(calciatore.codiceRuolo)) {
      this.notificationsService.showError(`Il team ${team.nome} ha già raggiunto il limite di ${calciatore.ruolo}`);
      return;
    }

    // Controlla se il team ha abbastanza budget
    if (team.budget < prezzo) {
      this.notificationsService.showError(`Il team ${team.nome} non ha abbastanza budget`);
      return;
    }

    // Assegna il calciatore
    this.astaService.assegnaCalciatore(calciatore, team, prezzo).subscribe({
      next: (success) => {
        if (success) {
          this.notificationsService.showSuccess(`${calciatore.nome} assegnato a ${team.nome} per ${prezzo} crediti`);
          this.assegnazioneForm.reset({
            calciatoreId: '',
            teamNome: '',
            prezzo: 0
          });
          this.selectedCalciatore = null;
          this.searchText = '';
          this.searchControl.setValue('');
        } else {
          this.notificationsService.showError('Errore durante l\'assegnazione del calciatore');
        }
      },
      error: (error) => {
        console.error('Errore nell\'assegnazione:', error);
        this.notificationsService.showError('Errore durante l\'assegnazione del calciatore');
      }
    });
  }

  getRuoloClass(codiceRuolo: string): string {
    switch (codiceRuolo) {
      case 'P': return 'ruolo-portiere';
      case 'D': return 'ruolo-difensore';
      case 'C': return 'ruolo-centrocampista';
      case 'A': return 'ruolo-attaccante';
      default: return '';
    }
  }

  hasRaggiuntolLimite(team: Team, ruolo: string): boolean {
    return team.haRaggiuntolLimite(ruolo);
  }

  getTeamsByRuolo(ruolo: string): Team[] {
    return this.teams.filter(team => !team.haRaggiuntolLimite(ruolo));
  }
  
  onRemoveCalciatore(team: Team, calciatore: Calciatore): void {
    // Chiedi conferma prima di rimuovere
    if (confirm(`Sei sicuro di voler rimuovere ${calciatore.nome} dal team ${team.nome}?`)) {
      this.astaService.rimuoviCalciatore(calciatore, team).subscribe({
        next: (success) => {
          if (success) {
            this.notificationsService.showSuccess(`${calciatore.nome} rimosso dal team ${team.nome}`);
          } else {
            this.notificationsService.showError('Errore durante la rimozione del calciatore');
          }
        },
        error: (error) => {
          console.error('Errore nella rimozione:', error);
          this.notificationsService.showError('Errore durante la rimozione del calciatore');
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }
  }
}
