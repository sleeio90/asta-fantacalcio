import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

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
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      displayName: ['', [Validators.required]],
      role: ['player', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
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
      // Il redirect sarà gestito automaticamente dall'observable in ngOnInit
    } catch (error: any) {
      console.error('Login error:', error);
      this.snackBar.open(error.message || 'Login failed', 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      return;
    }

    const { email, password, confirmPassword, displayName, role } = this.registerForm.value;

    if (password !== confirmPassword) {
      this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });
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
      return 'Password is required';
    }
    if (passwordControl?.hasError('minlength')) {
      return 'Password must be at least 6 characters';
    }
    return '';
  }
}
