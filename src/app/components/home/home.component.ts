import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  user$: Observable<UserProfile | null>;
  showLoginModal = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  async ngOnInit(): Promise<void> {
    // Se l'utente è già autenticato, reindirizza alla dashboard
    const user = await this.user$.pipe(take(1)).toPromise();
    if (user) {
      console.log('Utente già autenticato, reindirizzamento alla dashboard...');
      this.router.navigate(['/dashboard']);
    }
  }

  openLoginModal(): void {
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  goToRegister(): void {
    this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }

  onLoginSuccess(): void {
    this.closeLoginModal();
    this.router.navigate(['/dashboard']);
  }
}
