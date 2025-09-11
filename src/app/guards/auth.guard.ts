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
    // Ora AdminGuard è equivalente ad AuthGuard dato che non ci sono più ruoli
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

          // User is already logged in, redirect to dashboard for authenticated users
          this.router.navigate(['/dashboard']);
          return false;
        }
        return true;
      })
    );
  }
}
