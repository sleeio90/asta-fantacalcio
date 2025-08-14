import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AstaService } from '../../services/asta.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { AstaJoinRequest } from '../../models/asta-join.model';

@Component({
  selector: 'app-auction-joiner',
  templateUrl: './auction-joiner.component.html',
  styleUrls: ['./auction-joiner.component.scss']
})
export class AuctionJoinerComponent implements OnInit {
  @Output() auctionJoined = new EventEmitter<boolean>();
  
  joinForm: FormGroup;
  isLoading = false;
  user: UserProfile | null = null;

  constructor(
    private fb: FormBuilder,
    private astaService: AstaService,
    private authService: AuthService,
    private notificationsService: NotificationsService
  ) {
    this.joinForm = this.fb.group({
      codiceInvito: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      nomeTeam: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
    });
  }

  onSubmit(): void {
    if (this.joinForm.valid && this.user) {
      this.isLoading = true;
      
      const joinRequest: AstaJoinRequest = {
        codiceInvito: this.joinForm.value.codiceInvito.toUpperCase(),
        nomeTeam: this.joinForm.value.nomeTeam,
        userId: this.user.uid,
        userEmail: this.user.email
      };

      this.astaService.joinAsta(joinRequest).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.notificationsService.showSuccess(response.message);
            this.auctionJoined.emit(true);
            this.joinForm.reset();
          } else {
            this.notificationsService.showError(response.message);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.notificationsService.showError('Errore durante l\'iscrizione all\'asta');
          console.error('Errore join asta:', error);
        }
      });
    }
  }

  get codiceInvito() { return this.joinForm.get('codiceInvito'); }
  get nomeTeam() { return this.joinForm.get('nomeTeam'); }
}
