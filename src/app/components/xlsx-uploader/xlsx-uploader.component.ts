import { Component, EventEmitter, Output } from '@angular/core';
import { CalciatoriService } from '../../services/calciatori.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-xlsx-uploader',
  templateUrl: './xlsx-uploader.component.html',
  styleUrls: ['./xlsx-uploader.component.scss']
})
export class XlsxUploaderComponent {
  @Output() fileUploaded = new EventEmitter<boolean>();
  isLoading = false;
  fileName = '';

  constructor(
    private calciatoriService: CalciatoriService,
    private notificationsService: NotificationsService
  ) { }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      const file = element.files[0];
      this.fileName = file.name;
      
      // Verifica che il file sia di tipo xlsx
      if (!file.name.endsWith('.xlsx')) {
        this.notificationsService.showError('Il file deve essere in formato XLSX');
        this.fileUploaded.emit(false);
        return;
      }

      this.isLoading = true;
      this.calciatoriService.loadFromExcel(file)
        .then(calciatori => {
          this.isLoading = false;
          if (calciatori.length > 0) {
            this.fileUploaded.emit(true);
          } else {
            this.notificationsService.showWarning('Il file non contiene calciatori');
            this.fileUploaded.emit(false);
          }
        })
        .catch(error => {
          this.isLoading = false;
          console.error('Errore durante il caricamento del file:', error);
          this.notificationsService.showError('Errore durante il caricamento del file');
          this.fileUploaded.emit(false);
        });
    }
  }
}
