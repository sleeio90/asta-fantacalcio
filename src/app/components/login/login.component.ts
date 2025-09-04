import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { PasswordValidator } from '../../validators/password.validator';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLogin = true;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  passwordStrength: any = { score: 0, label: 'Inserisci una password', color: '#ccc' };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, PasswordValidator.strongPassword()]],
      confirmPassword: ['', [Validators.required, PasswordValidator.confirmPassword('password')]],
      displayName: ['', [Validators.required]],
      role: ['player', [Validators.required]]
    });

    // Monitor password changes for strength indicator
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.passwordStrength = PasswordValidator.getPasswordStrength(password || '');
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in - sempre redirect alla home
    this.authService.user$.subscribe(user => {
      if (user) {
        this.router.navigate(['/home']);
      }
    });
  }

  toggleMode(): void {
    this.isLogin = !this.isLogin;
    this.loading = false;
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    try {
      await this.authService.signIn(email, password);
      this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
      
      // Controlla se c'è un URL di redirect salvato
      const redirectUrl = localStorage.getItem('redirectUrl');
      if (redirectUrl) {
        localStorage.removeItem('redirectUrl');
        this.router.navigate([redirectUrl]);
      } else {
        // Redirect normale basato sul ruolo - tutti i giocatori vanno alla home
        this.authService.user$.subscribe(user => {
          if (user) {
            this.router.navigate(['/home']);
          }
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.snackBar.open(error.message || 'Login failed', 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      // Mark all fields as touched to show validation errors
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, password, confirmPassword, displayName, role } = this.registerForm.value;

    // Additional check for password confirmation (redundant with validator but good UX)
    if (password !== confirmPassword) {
      this.snackBar.open('Le password non corrispondono', 'Close', { duration: 3000 });
      return;
    }

    // Check password strength
    if (this.passwordStrength.score < 5) {
      this.snackBar.open('La password non soddisfa tutti i requisiti di sicurezza', 'Close', { duration: 5000 });
      return;
    }

    this.loading = true;

    try {
      await this.authService.register(email, password, displayName, role);
      this.snackBar.open('Registration successful! You can now login.', 'Close', { duration: 3000 });
      this.isLogin = true;
      this.registerForm.reset();
    } catch (error: any) {
      console.error('Registration error:', error);
      this.snackBar.open(error.message || 'Registration failed', 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }

  async resetPassword(): Promise<void> {
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.snackBar.open('Please enter your email address', 'Close', { duration: 3000 });
      return;
    }

    try {
      await this.authService.resetPassword(email);
      this.snackBar.open('Password reset email sent!', 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Password reset error:', error);
      this.snackBar.open(error.message || 'Password reset failed', 'Close', { duration: 5000 });
    }
  }

  getEmailErrorMessage(): string {
    const emailControl = this.isLogin ? this.loginForm.get('email') : this.registerForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Email is required';
    }
    if (emailControl?.hasError('email')) {
      return 'Please enter a valid email';
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.isLogin ? this.loginForm.get('password') : this.registerForm.get('password');
    
    if (passwordControl?.hasError('required')) {
      return 'Password è richiesta';
    }
    
    if (this.isLogin && passwordControl?.hasError('minlength')) {
      return 'Password deve essere di almeno 6 caratteri';
    }
    
    if (!this.isLogin && passwordControl?.hasError('strongPassword')) {
      const errors = passwordControl.errors?.['strongPassword'];
      const missingRequirements = [];
      
      if (!errors.hasMinLength) missingRequirements.push('8 caratteri');
      if (!errors.hasUpperCase) missingRequirements.push('una maiuscola');
      if (!errors.hasLowerCase) missingRequirements.push('una minuscola');
      if (!errors.hasNumeric) missingRequirements.push('un numero');
      if (!errors.hasSpecialChar) missingRequirements.push('un carattere speciale');
      
      return `Password deve contenere: ${missingRequirements.join(', ')}`;
    }
    
    return '';
  }

  getConfirmPasswordErrorMessage(): string {
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    
    if (confirmPasswordControl?.hasError('required')) {
      return 'Conferma password è richiesta';
    }
    
    if (confirmPasswordControl?.hasError('confirmPassword')) {
      return 'Le password non corrispondono';
    }
    
    return '';
  }
}
