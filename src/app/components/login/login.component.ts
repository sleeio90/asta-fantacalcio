import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, UserProfile } from '../../services/auth.service';
import { AppConfigService } from '../../services/app-config.service';
import { PasswordValidator } from '../../validators/password.validator';
import { EmailValidator } from '../../validators/email.validator';
import { filter, take } from 'rxjs/operators';

interface PasswordStrength {
  score: number;
  feedback: string[];
  label?: string;
  color?: string;
  requirements?: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumeric: boolean;
    hasSpecialChar: boolean;
  };
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  @Input() isModal = false;
  @Output() loginSuccess = new EventEmitter<void>();
  
  isLogin = true;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  loginForm: FormGroup;
  registerForm: FormGroup;
  passwordStrength: PasswordStrength = { score: 0, feedback: [] };
  emailSuggestion: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private appConfigService: AppConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      email: ['', [Validators.required, EmailValidator.strictEmail()]],
      password: ['', [Validators.required, PasswordValidator.strongPassword()]],
      confirmPassword: ['', Validators.required],
      displayName: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit(): void {
    // Controlla i query parameters per impostare la modalità
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'register') {
        this.isLogin = false;
      }
    });

    // Check if user is already authenticated (solo se non è modale)
    if (!this.isModal) {
      this.authService.user$.subscribe(user => {
        if (user) {
          this.router.navigate(['/dashboard']);
        }
      });
    }

    // Listen to password changes for strength indicator
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.passwordStrength = this.checkPasswordStrength(password || '');
    });

    // Listen to email changes for suggestions
    this.registerForm.get('email')?.valueChanges.subscribe(email => {
      this.checkEmailAndSuggest(email);
    });
  }

  // Custom validator for password match
  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      return { passwordsDoNotMatch: true };
    }
    return null;
  }

  // Check password strength
  checkPasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasMinLength) {
      score++;
    } else {
      feedback.push('Minimo 8 caratteri');
    }

    if (hasUpperCase) {
      score++;
    } else {
      feedback.push('Almeno una lettera maiuscola');
    }

    if (hasLowerCase) {
      score++;
    } else {
      feedback.push('Almeno una lettera minuscola');
    }

    if (hasNumeric) {
      score++;
    } else {
      feedback.push('Almeno un numero');
    }

    if (hasSpecialChar) {
      score++;
    } else {
      feedback.push('Almeno un carattere speciale');
    }

    // Determine color and label based on score
    let color = '#f44336'; // red
    let label = 'Molto debole';

    if (score >= 5) {
      color = '#4caf50'; // green
      label = 'Molto forte';
    } else if (score >= 4) {
      color = '#8bc34a'; // light green
      label = 'Forte';
    } else if (score >= 3) {
      color = '#ffc107'; // yellow
      label = 'Media';
    } else if (score >= 2) {
      color = '#ff9800'; // orange
      label = 'Debole';
    }

    return {
      score,
      feedback,
      color,
      label,
      requirements: {
        minLength: hasMinLength,
        hasUpperCase,
        hasLowerCase,
        hasNumeric,
        hasSpecialChar
      }
    };
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
      
      // Aspetta che l'utente sia effettivamente autenticato
      const user = await this.authService.user$.pipe(
        filter((user: UserProfile | null) => user !== null),
        take(1)
      ).toPromise();

      if (user) {
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        
        if (this.isModal) {
          // Se è una modale, emetti l'evento
          this.loginSuccess.emit();
        } else {
          // Controlla se c'è un URL di redirect salvato
          const redirectUrl = localStorage.getItem('redirectUrl');
          if (redirectUrl) {
            localStorage.removeItem('redirectUrl');
            this.router.navigate([redirectUrl]);
          } else {
            // Redirect alla dashboard dopo il login
            this.router.navigate(['/dashboard']);
          }
        }
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

    const { email, password, confirmPassword, displayName } = this.registerForm.value;

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

    // Final email validation
    if (!this.isValidEmail(email)) {
      this.snackBar.open('Inserisci un indirizzo email valido', 'Close', { duration: 5000 });
      return;
    }

    this.loading = true;

    try {
      await this.authService.register(email, password, displayName);
      
      // Controlla se la verifica email è richiesta
      if (this.appConfigService.isEmailVerificationRequired()) {
        this.snackBar.open('Registration successful! Please check your email for verification.', 'Close', { duration: 5000 });
        if (!this.isModal) {
          // Redirect to email verification page
          this.router.navigate(['/email-verification']);
        }
      } else {
        this.snackBar.open('Registration successful! Welcome!', 'Close', { duration: 3000 });
        if (this.isModal) {
          // Se è una modale, emetti l'evento
          this.loginSuccess.emit();
        } else {
          // Redirect to dashboard page
          this.router.navigate(['/dashboard']);
        }
      }
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

  // Email validation and suggestion methods
  checkEmailAndSuggest(email: string): void {
    if (!email || email.length < 3) {
      this.emailSuggestion = null;
      return;
    }

    const suggestion = this.getSuggestedEmail(email);
    this.emailSuggestion = suggestion !== email ? suggestion : null;
  }

  getSuggestedEmail(email: string): string {
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'libero.it', 'alice.it', 'virgilio.it'];
    const parts = email.split('@');
    
    if (parts.length !== 2) return email;
    
    const [username, domain] = parts;
    
    // Check for common typos
    const domainCorrections: { [key: string]: string } = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yahoo.co': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outlook.co': 'outlook.com'
    };

    if (domainCorrections[domain.toLowerCase()]) {
      return `${username}@${domainCorrections[domain.toLowerCase()]}`;
    }

    return email;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  applySuggestedEmail(): void {
    if (this.emailSuggestion) {
      this.registerForm.get('email')?.setValue(this.emailSuggestion);
      this.emailSuggestion = null;
    }
  }

  getEmailErrorMessage(): string {
    const emailControl = this.isLogin ? this.loginForm.get('email') : this.registerForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Email is required';
    }
    if (emailControl?.hasError('invalidEmail')) {
      return emailControl.errors?.['invalidEmail']?.message || 'Email non valida';
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.registerForm.get('password');
    if (passwordControl?.hasError('required')) {
      return 'Password is required';
    }
    if (passwordControl?.hasError('invalidPassword')) {
      return 'Password must meet all requirements';
    }
    return '';
  }

  getConfirmPasswordErrorMessage(): string {
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    if (confirmPasswordControl?.hasError('required')) {
      return 'Please confirm your password';
    }
    if (this.registerForm.hasError('passwordsDoNotMatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  getDisplayNameErrorMessage(): string {
    const displayNameControl = this.registerForm.get('displayName');
    if (displayNameControl?.hasError('required')) {
      return 'Display name is required';
    }
    return '';
  }
}
