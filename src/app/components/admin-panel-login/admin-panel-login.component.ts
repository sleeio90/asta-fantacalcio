import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminPanelService } from '../../services/admin-panel.service';

@Component({
  selector: 'app-admin-panel-login',
  templateUrl: './admin-panel-login.component.html',
  styleUrls: ['./admin-panel-login.component.scss']
})
export class AdminPanelLoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private adminPanelService: AdminPanelService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Se già autenticato, redirect al pannello
    if (this.adminPanelService.isAuthenticated()) {
      this.router.navigate(['/admin-panel/dashboard']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { username, password } = this.loginForm.value;

      try {
        const success = await this.adminPanelService.authenticate(username, password);
        
        if (success) {
          console.log('Accesso al pannello amministrativo riuscito');
          this.router.navigate(['/admin-panel/dashboard']);
        } else {
          this.errorMessage = 'Username o password non corretti';
          this.loginForm.get('password')?.setValue('');
        }
      } catch (error) {
        console.error('Errore durante l\'autenticazione admin:', error);
        this.errorMessage = 'Errore durante l\'autenticazione. Riprova.';
      } finally {
        this.isLoading = false;
      }
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  // Torna all'applicazione principale
  goToMainApp(): void {
    this.router.navigate(['/home']);
  }

  get username() { 
    return this.loginForm.get('username'); 
  }
  
  get password() { 
    return this.loginForm.get('password'); 
  }
}
