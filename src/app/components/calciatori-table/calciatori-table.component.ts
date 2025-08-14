import { Component, Input, OnInit, ViewChild, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Calciatore } from '../../models/calciatore.model';
import { CalciatoriService } from '../../services/calciatori.service';
import { AstaService } from '../../services/asta.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-calciatori-table',
  templateUrl: './calciatori-table.component.html',
  styleUrls: ['./calciatori-table.component.scss']
})
export class CalciatoriTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input() searchText: string = '';
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['id', 'codiceRuolo', 'nome', 'squadra', 'quotazioneAttuale', 'quotazioneIniziale', 'differenza'];
  dataSource = new MatTableDataSource<Calciatore>([]);
  astaCreata = false;
  
  private astaSubscription: Subscription | null = null;

  constructor(
    private calciatoriService: CalciatoriService,
    private astaService: AstaService
  ) { }

  ngOnInit(): void {
    // Ascolta i cambiamenti dell'asta per aggiornare la tabella calciatori
    this.astaSubscription = this.astaService.getAsta().subscribe(asta => {
      this.astaCreata = !!asta;
      console.log('Asta creata:', this.astaCreata);
      
      if (asta) {
        // Usa i calciatori dall'asta (che sono sincronizzati con Firebase)
        console.log('Calciatori dall\'asta:', asta.calciatori);
        this.dataSource.data = asta.calciatori;
        
        // Aggiungi la colonna delle azioni se non è già presente
        if (!this.displayedColumns.includes('actions')) {
          this.displayedColumns.push('actions');
        }
      } else {
        // Se non c'è un'asta, usa i calciatori dal servizio locale
        this.calciatoriService.getCalciatori().subscribe(calciatori => {
          console.log('Calciatori ricevuti dal servizio:', calciatori);
          this.dataSource.data = calciatori;
        });
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchText']) {
      this.applyFilter();
    }
  }

  applyFilter(): void {
    if (!this.searchText) {
      this.dataSource.data = this.calciatoriService.searchCalciatori('');
      return;
    }
    
    this.dataSource.data = this.calciatoriService.searchCalciatori(this.searchText);
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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

  ngOnDestroy(): void {
    if (this.astaSubscription) {
      this.astaSubscription.unsubscribe();
    }
  }
}
