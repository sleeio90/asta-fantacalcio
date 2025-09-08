import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AppConfigService } from '../services/app-config.service';

@Injectable({
  providedIn: 'root'
})
export class EmailVerificationGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private appConfigService: AppConfigService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return combineLatest([
      this.authService.user$,
      this.authService.authLoading$,
      this.appConfigService.config$
    ]).pipe(
      filter(([user, loading, config]) => !loading && config !== null),
      take(1),
      map(([user, loading, config]) => {
        // Se non c'è un utente autenticato, lascia che l'AuthGuard se ne occupi
        if (!user) {
          return true;
        }

        // Se la verifica email non è richiesta dalla configurazione, permetti l'accesso
        if (!config?.requireEmailVerification) {
          return true;
        }

        // Se la verifica email è richiesta ma l'utente non ha verificato l'email
        if (!user.emailVerified) {
          // Salva l'URL corrente per il redirect dopo la verifica
          localStorage.setItem('redirectUrl', state.url);
          this.router.navigate(['/email-verification']);
          return false;
        }

        return true;
      })
    );
  }
}
