import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Aspetta che l'autenticazione si risolva completamente
    return combineLatest([
      this.authService.user$,
      this.authService.authLoading$
    ]).pipe(
      filter(([user, loading]) => !loading), // Aspetta che il loading sia completato
      take(1),
      map(([user, loading]) => {
        if (!user) {
          // User not authenticated, salva l'URL corrente per il redirect dopo login
          localStorage.setItem('redirectUrl', state.url);
          this.router.navigate(['/login']);
          return false;
        }

        // Check if route requires admin role
        const requiredRole = route.data['role'] as string;
        if (requiredRole && requiredRole === 'admin' && user.role !== 'admin') {
          // User is not admin, redirect to home
          this.router.navigate(['/home']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return combineLatest([
      this.authService.user$,
      this.authService.authLoading$
    ]).pipe(
      filter(([user, loading]) => !loading),
      take(1),
      map(([user, loading]) => {
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }

        if (user.role !== 'admin') {
          this.router.navigate(['/home']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return combineLatest([
      this.authService.user$,
      this.authService.authLoading$
    ]).pipe(
      filter(([user, loading]) => !loading),
      take(1),
      map(([user, loading]) => {
        if (user) {
          // Controlla se c'è un URL di redirect salvato
          const redirectUrl = localStorage.getItem('redirectUrl');
          if (redirectUrl) {
            localStorage.removeItem('redirectUrl');
            this.router.navigate([redirectUrl]);
            return false;
          }

          // User is already logged in, redirect to home for everyone
          this.router.navigate(['/home']);
          return false;
        }
        return true;
      })
    );
  }
}
