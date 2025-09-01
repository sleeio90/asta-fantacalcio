import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from './services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'asta-fantacalcio';
  user$: Observable<UserProfile | null>;
  authLoading$: Observable<boolean>;
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
    this.authLoading$ = this.authService.authLoading$;
  }

  ngOnInit(): void {
    // Component initialization
  }

  async logout(): Promise<void> {
    console.log('Logout button clicked');
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  navigateToHome(): void {
    console.log('Navigating to home...');
    this.router.navigate(['/home']);
  }
}
