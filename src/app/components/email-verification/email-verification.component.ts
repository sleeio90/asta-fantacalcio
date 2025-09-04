import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.component.html',
  styleUrls: ['./email-verification.component.scss']
})
export class EmailVerificationComponent implements OnInit {
  loading = false;
  verificationStatus: 'pending' | 'success' | 'error' = 'pending';
  isResending = false;
  errorMessage = '';
  userEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    // Get current user email
    const currentUser = this.authService.getCurrentUser();
    this.userEmail = currentUser?.email || '';

    // Check if there's an action code in the URL (from email verification link)
    const actionCode = this.route.snapshot.queryParams['oobCode'];
    const mode = this.route.snapshot.queryParams['mode'];

    if (actionCode && mode === 'verifyEmail') {
      this.verifyEmailWithCode(actionCode);
    } else {
      // Check current verification status
      this.checkVerificationStatus();
    }
  }

  async verifyEmailWithCode(actionCode: string): Promise<void> {
    this.loading = true;
    try {
      await this.authService.applyActionCode(actionCode);
      this.verificationStatus = 'success';
      this.notificationsService.showSuccess('Email verificata con successo!');
      
      // Redirect to home after a delay
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 3000);
    } catch (error: any) {
      this.verificationStatus = 'error';
      this.errorMessage = error.message;
      this.notificationsService.showError(error.message);
    } finally {
      this.loading = false;
    }
  }

  async checkVerificationStatus(): Promise<void> {
    this.loading = true;
    try {
      const isVerified = await this.authService.checkEmailVerified();
      if (isVerified) {
        this.verificationStatus = 'success';
        this.notificationsService.showSuccess('Email verificata con successo!');
        // Redirect to home if already verified
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 2000);
      } else {
        this.verificationStatus = 'pending';
        this.notificationsService.showWarning('Email non ancora verificata. Controlla la tua casella di posta.');
      }
    } catch (error) {
      // Error checking verification status - fail silently in production
    } finally {
      this.loading = false;
    }
  }

  async resendVerificationEmail(): Promise<void> {
    this.isResending = true;
    try {
      await this.authService.sendEmailVerification();
      this.notificationsService.showSuccess('Email di verifica inviata nuovamente! Controlla la tua casella di posta.');
      this.verificationStatus = 'pending';
    } catch (error: any) {
      this.verificationStatus = 'error';
      this.errorMessage = error.message;
      this.notificationsService.showError(error.message);
    } finally {
      this.isResending = false;
    }
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
