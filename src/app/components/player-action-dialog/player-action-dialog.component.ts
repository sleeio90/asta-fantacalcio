import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Calciatore } from '../../models/calciatore.model';
import { Team } from '../../models/team.model';

export interface PlayerActionDialogData {
  calciatore: Calciatore;
  team: Team;
}

export interface PlayerActionDialogResult {
  action: 'edit' | 'delete' | 'cancel';
  newPrice?: number;
}

@Component({
  selector: 'app-player-action-dialog',
  templateUrl: './player-action-dialog.component.html',
  styleUrls: ['./player-action-dialog.component.scss']
})
export class PlayerActionDialogComponent {
  newPrice: number;

  constructor(
    public dialogRef: MatDialogRef<PlayerActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PlayerActionDialogData
  ) {
    this.newPrice = this.data.calciatore.prezzoAcquisto || 0;
  }

  onEditPrice(): void {
    if (this.newPrice && this.newPrice > 0) {
      this.dialogRef.close({
        action: 'edit',
        newPrice: this.newPrice
      } as PlayerActionDialogResult);
    }
  }

  onDelete(): void {
    this.dialogRef.close({
      action: 'delete'
    } as PlayerActionDialogResult);
  }

  onCancel(): void {
    this.dialogRef.close({
      action: 'cancel'
    } as PlayerActionDialogResult);
  }
}
